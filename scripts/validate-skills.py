#!/usr/bin/env python3
"""
Validate every SKILL.md in the Shogun OS repo has a required `departments` field.

This is the backstop enforcement layer — regardless of how a skill was created
(/shogunify, subagent, hand-written, copied), this script catches missing or
invalid department tags before the skill reaches main branch.

Exit codes:
  0 = all skills valid
  1 = some skills have missing/invalid departments

Usage:
  python3 scripts/validate-skills.py                  # validate all
  python3 scripts/validate-skills.py --fix shared     # auto-fix missing fields
  python3 scripts/validate-skills.py --report         # markdown report
  python3 scripts/validate-skills.py --json            # JSON output for CI
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: pyyaml is required. Install: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

# ─── Constants ───────────────────────────────────────────────────────────────

REPO = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO / "skills"

# Valid department slugs — must match the onboarding wizard's department catalog.
# Shared = installed to ALL departments. Others = installed to that department only.
VALID_DEPARTMENTS = {
    # Shared tier
    "shared",
    # Shared departments (every company gets these)
    "hr",
    "finance",
    "procurement",
    "crm",
    "marketing",
    "compliance",
    "customer-support",
    "coding",
    # Cross-industry add-on
    "e-commerce",
    # Manufacturing industry
    "production",
    "quality",
    "maintenance",
    "warehouse",
    "hse",
    # Retail industry
    "stores",
    "merchandising",
    "crm-loyalty",
    "supply-chain",
    "visual-merchandising",
    # Plantation industry
    "facility",
}

# ─── Helpers ─────────────────────────────────────────────────────────────────


def parse_frontmatter(text: str) -> tuple[dict | None, str | None]:
    """Extract YAML frontmatter from SKILL.md text.

    Returns (parsed_dict, error_message). If successful, error_message is None.
    """
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return None, "no YAML frontmatter block found"

    try:
        fm = yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        return None, f"YAML parse error: {e}"

    if not fm:
        return None, "empty frontmatter"

    return fm, None


def find_skill_md_files() -> list[Path]:
    """Find all SKILL.md files under skills/, sorted by path."""
    if not SKILLS_DIR.is_dir():
        return []
    return sorted(SKILLS_DIR.rglob("SKILL.md"))


def get_skill_name(fm: dict, path: Path) -> str:
    """Get skill name from frontmatter, fallback to directory name."""
    return fm.get("name", path.parent.name)


def insert_departments_field(path: Path, default_value: str = "shared") -> bool:
    """Insert a departments field into a SKILL.md file that's missing it.

    Inserts right after the `name:` line (or `description:` if no name field).
    Returns True on success.
    """
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return False

    fm_text = match.group(1)

    # Find a good insertion point — after name, or after description, or at the top
    lines = fm_text.split("\n")
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("name:") or line.strip().startswith("description:"):
            insert_idx = i + 1

    indent = "  "
    new_line = f"departments: [{default_value}]"

    # Insert after the name/description line
    lines.insert(insert_idx, new_line)
    new_fm = "\n".join(lines)

    new_text = text[: match.start(1)] + new_fm + text[match.end(1) :]
    path.write_text(new_text, encoding="utf-8")
    return True


# ─── Core validation ──────────────────────────────────────────────────────────


def validate_skill(path: Path) -> dict:
    """Validate a single SKILL.md file.

    Returns a dict with:
      - path: relative path
      - name: skill name
      - valid: bool
      - departments: list of department slugs (or None if missing)
      - errors: list of error messages
    """
    try:
        rel_path = str(path.relative_to(REPO)).replace("\\", "/")
    except ValueError:
        rel_path = str(path)
    result = {
        "path": rel_path,
        "name": path.parent.name,
        "valid": True,
        "departments": None,
        "errors": [],
    }

    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        result["valid"] = False
        result["errors"].append(f"cannot read file: {e}")
        return result

    fm, err = parse_frontmatter(text)
    if err:
        result["valid"] = False
        result["errors"].append(err)
        return result

    name = get_skill_name(fm, path)
    result["name"] = name

    # Check departments field exists
    depts = fm.get("departments")

    if depts is None:
        result["valid"] = False
        result["errors"].append("MISSING 'departments' field — add `departments: [shared]` or a specific department slug")
        return result

    if not isinstance(depts, list):
        result["valid"] = False
        result["errors"].append(f"'departments' must be a list, got {type(depts).__name__} — use [shared] or [finance] etc.")
        return result

    if len(depts) == 0:
        result["valid"] = False
        result["errors"].append("'departments' is empty — use [shared] if unsure, or a specific department slug")
        return result

    # Check all department slugs are valid
    invalid = [d for d in depts if d not in VALID_DEPARTMENTS]
    if invalid:
        result["valid"] = False
        result["errors"].append(f"invalid department slug(s): {invalid} — valid options: {sorted(VALID_DEPARTMENTS)}")
        return result

    result["departments"] = depts
    return result


def validate_all() -> list[dict]:
    """Validate all SKILL.md files. Returns list of result dicts."""
    files = find_skill_md_files()
    results = []
    for f in files:
        results.append(validate_skill(f))
    return results


# ─── Output formatters ───────────────────────────────────────────────────────


def print_human(results: list[dict], verbose: bool = False) -> int:
    """Print human-readable output. Returns exit code."""
    total = len(results)
    valid = [r for r in results if r["valid"]]
    invalid = [r for r in results if not r["valid"]]

    # Print valid skills (compact)
    for r in valid:
        depts = ", ".join(r["departments"])
        print(f"  ✅ {r['name']:<40} departments: [{depts}]")

    # Print invalid skills (detailed)
    if invalid:
        print(f"\n{'=' * 70}")
        print(f"  ❌ {len(invalid)} INVALID SKILL(S)")
        print(f"{'=' * 70}")
        for r in invalid:
            print(f"\n  {r['path']}")
            for err in r["errors"]:
                print(f"    → {err}")

    # Summary
    print(f"\n{'─' * 70}")
    print(f"  Total skills checked: {total}")
    print(f"  ✅ Valid:             {len(valid)}")
    print(f"  ❌ Invalid:           {len(invalid)}")
    print(f"{'─' * 70}")

    if invalid:
        print(f"\n  Fix: Add `departments: [shared]` (or a specific slug) to each SKILL.md")
        print(f"  Or run: python3 scripts/validate-skills.py --fix shared")
        return 1

    print(f"\n  All skills valid ✅")
    return 0


def print_json(results: list[dict]) -> int:
    """Print JSON output for CI integration. Returns exit code."""
    total = len(results)
    invalid = [r for r in results if not r["valid"]]
    output = {
        "total": total,
        "valid": total - len(invalid),
        "invalid": len(invalid),
        "errors": [
            {"skill": r["name"], "path": r["path"], "errors": r["errors"]}
            for r in invalid
        ],
    }
    print(json.dumps(output, indent=2))
    return 1 if invalid else 0


def print_markdown_report(results: list[dict]) -> int:
    """Print a markdown report suitable for PR comments. Returns exit code."""
    total = len(results)
    valid = [r for r in results if r["valid"]]
    invalid = [r for r in results if not r["valid"]]

    print(f"# Skill Validation Report\n")
    print(f"| Metric | Count |")
    print(f"|--------|-------|")
    print(f"| Total skills | {total} |")
    print(f"| ✅ Valid | {len(valid)} |")
    print(f"| ❌ Invalid | {len(invalid)} |")

    if invalid:
        print(f"\n## ❌ Skills with missing/invalid `departments` field\n")
        print(f"| Skill | Path | Error |")
        print(f"|-------|------|-------|")
        for r in invalid:
            err = "; ".join(r["errors"])
            print(f"| {r['name']} | `{r['path']}` | {err} |")

    # Department distribution
    dept_count: dict[str, int] = {}
    for r in valid:
        for d in r["departments"]:
            dept_count[d] = dept_count.get(d, 0) + 1

    print(f"\n## Department Distribution\n")
    print(f"| Department | Skills |")
    print(f"|------------|--------|")
    for dept in sorted(dept_count):
        print(f"| {dept} | {dept_count[dept]} |")

    return 1 if invalid else 0


# ─── Main ────────────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Validate every SKILL.md has a required 'departments' field.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Valid department slugs:
  shared, hr, finance, procurement, crm, marketing, compliance,
  customer-support, coding, e-commerce, production, quality, maintenance,
  warehouse, hse, stores, merchandising, crm-loyalty, supply-chain,
  visual-merchandising, facility
        """,
    )
    ap.add_argument(
        "--fix",
        metavar="DEPT",
        nargs="?",
        const="shared",
        default=None,
        help="Auto-fix missing departments fields by inserting `departments: [DEPT]` (default: shared)",
    )
    ap.add_argument(
        "--json",
        action="store_true",
        help="Output JSON (for CI integration)",
    )
    ap.add_argument(
        "--report",
        action="store_true",
        help="Output markdown report (for PR comments)",
    )
    ap.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show all skills (not just invalid ones)",
    )
    args = ap.parse_args()

    # ─── Fix mode ───
    if args.fix is not None:
        if args.fix not in VALID_DEPARTMENTS:
            print(f"ERROR: --fix value '{args.fix}' is not a valid department slug")
            print(f"Valid options: {sorted(VALID_DEPARTMENTS)}")
            return 2

        files = find_skill_md_files()
        fixed = 0
        already_ok = 0
        for f in files:
            text = f.read_text(encoding="utf-8")
            fm, err = parse_frontmatter(text)
            if err or fm is None:
                print(f"  ⚠️  Cannot parse: {f}")
                continue
            if fm.get("departments") is not None:
                already_ok += 1
                continue
            if insert_departments_field(f, args.fix):
                print(f"  ✅ Fixed: {f.parent.name} → departments: [{args.fix}]")
                fixed += 1
            else:
                print(f"  ❌ Failed to fix: {f}")

        print(f"\n  Fixed: {fixed} | Already valid: {already_ok} | Total: {len(files)}")
        return 0

    # ─── Validate mode ───
    results = validate_all()

    if not results:
        print("No SKILL.md files found under skills/")
        return 0

    if args.json:
        return print_json(results)
    elif args.report:
        return print_markdown_report(results)
    else:
        return print_human(results, args.verbose)


if __name__ == "__main__":
    raise SystemExit(main())
