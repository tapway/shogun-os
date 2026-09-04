"""
Skill Enhance Backend — enhance/modify existing skills with git tracking and rollback.

Provides:
- get_enhance_context(skill_id) → loads SKILL.md + README.md + metadata
- apply_enhancement(skill_id, skill_md, readme_md, description, user) → git commit
- rollback_enhancement(skill_id) → git revert last enhance commit
- get_enhance_history(skill_id) → list of past enhance commits
"""

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SKILLS_DIR = REPO_ROOT / "skills"
HISTORY_FILENAME = ".enhance-history.json"


def _find_skill_dir(skill_id: str) -> Optional[Path]:
    """Find the directory containing a skill's SKILL.md by name."""
    for skill_md in SKILLS_DIR.rglob("SKILL.md"):
        if skill_md.parent.name.lower() == skill_id.lower():
            return skill_md.parent
    return None


def _read_history(skill_dir: Path) -> List[Dict[str, Any]]:
    """Read enhancement history from .enhance-history.json."""
    history_path = skill_dir / HISTORY_FILENAME
    if not history_path.exists():
        return []
    try:
        data = json.loads(history_path.read_text(encoding="utf-8"))
        return data.get("history", [])
    except (json.JSONDecodeError, KeyError):
        return []


def _write_history(skill_dir: Path, history: List[Dict[str, Any]]) -> None:
    """Write enhancement history to .enhance-history.json."""
    history_path = skill_dir / HISTORY_FILENAME
    history_path.write_text(
        json.dumps({"history": history}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _git_run(args: List[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess:
    """Run a git command and return the result."""
    return subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=30,
    )


def get_enhance_context(skill_id: str) -> Dict[str, Any]:
    """Load full context for enhancing a skill: SKILL.md, README.md, metadata."""
    skill_dir = _find_skill_dir(skill_id)
    if not skill_dir:
        raise ValueError(f"Skill '{skill_id}' not found")

    skill_md_path = skill_dir / "SKILL.md"
    readme_md_path = skill_dir / "README.md"

    skill_md = skill_md_path.read_text(encoding="utf-8", errors="replace") if skill_md_path.exists() else ""
    readme_md = readme_md_path.read_text(encoding="utf-8", errors="replace") if readme_md_path.exists() else ""

    # Parse frontmatter for metadata
    version = "1.0.0"
    departments = []
    description = ""
    if skill_md.startswith("---"):
        end = skill_md.find("---", 3)
        if end > 0:
            fm = skill_md[3:end].strip()
            for line in fm.split("\n"):
                line = line.strip()
                if line.startswith("version:"):
                    version = line.split(":", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("description:"):
                    description = line.split(":", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("departments:"):
                    dept_str = line.split(":", 1)[1].strip().strip("[]")
                    departments = [d.strip().strip("'\"") for d in dept_str.split(",")]

    # Get relative path from repo root
    rel_path = str(skill_dir.relative_to(REPO_ROOT))

    # Load history
    history = _read_history(skill_dir)

    return {
        "skill_id": skill_id,
        "skill_dir": rel_path,
        "skill_md": skill_md,
        "readme_md": readme_md,
        "version": version,
        "departments": departments,
        "description": description,
        "history": history,
        "has_readme": readme_md_path.exists(),
    }


def apply_enhancement(
    skill_id: str,
    skill_md: str,
    readme_md: str,
    description: str,
    user_name: str = "Unknown",
) -> Dict[str, Any]:
    """Apply changes to SKILL.md and README.md, then git commit.

    Returns dict with commit SHA, files changed, and validation status.
    """
    skill_dir = _find_skill_dir(skill_id)
    if not skill_dir:
        raise ValueError(f"Skill '{skill_id}' not found")

    files_changed = []

    # Write SKILL.md
    skill_md_path = skill_dir / "SKILL.md"
    old_skill_md = skill_md_path.read_text(encoding="utf-8", errors="replace") if skill_md_path.exists() else ""
    if skill_md != old_skill_md:
        skill_md_path.write_text(skill_md, encoding="utf-8")
        files_changed.append("SKILL.md")

    # Write README.md
    readme_md_path = skill_dir / "README.md"
    old_readme_md = readme_md_path.read_text(encoding="utf-8", errors="replace") if readme_md_path.exists() else ""
    if readme_md != old_readme_md:
        readme_md_path.write_text(readme_md, encoding="utf-8")
        files_changed.append("README.md")

    if not files_changed:
        return {"ok": True, "commit": None, "files_changed": [], "message": "No changes detected"}

    # Stage files
    for f in files_changed:
        _git_run(["add", str(skill_dir / f)])

    # Also stage history file if it exists
    history_path = skill_dir / HISTORY_FILENAME
    if history_path.exists():
        _git_run(["add", str(history_path)])

    # Parse new version from updated SKILL.md
    new_version = "unknown"
    if skill_md.startswith("---"):
        end = skill_md.find("---", 3)
        if end > 0:
            for line in skill_md[3:end].split("\n"):
                if line.strip().startswith("version:"):
                    new_version = line.split(":", 1)[1].strip().strip('"').strip("'")

    # Commit
    commit_msg = f"enhance(skill): {skill_id} → v{new_version}\n\nUser-requested enhancement via web portal.\nUser: {user_name}\nChanges: {description}"
    result = _git_run(["commit", "-m", commit_msg])

    if result.returncode != 0:
        return {"ok": False, "error": f"Git commit failed: {result.stderr}", "files_changed": files_changed}

    # Get commit SHA
    sha_result = _git_run(["rev-parse", "HEAD"])
    commit_sha = sha_result.stdout.strip()[:7] if sha_result.returncode == 0 else "unknown"

    # Update history
    history = _read_history(skill_dir)
    history.insert(0, {
        "commit": commit_sha,
        "version": new_version,
        "description": description,
        "user": user_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "files_changed": files_changed,
    })
    _write_history(skill_dir, history)

    # Stage and commit history update
    _git_run(["add", str(history_path)])
    _git_run(["commit", "--amend", "--no-edit"])

    # Re-get SHA after amend
    sha_result = _git_run(["rev-parse", "HEAD"])
    commit_sha = sha_result.stdout.strip()[:7] if sha_result.returncode == 0 else commit_sha

    return {
        "ok": True,
        "commit": commit_sha,
        "files_changed": files_changed,
        "version": new_version,
        "message": f"Enhancement applied and committed as {commit_sha}",
    }


def rollback_enhancement(skill_id: str) -> Dict[str, Any]:
    """Revert the last enhancement commit for a skill.

    Uses git revert to create a new commit that undoes the last enhance.
    """
    skill_dir = _find_skill_dir(skill_id)
    if not skill_dir:
        raise ValueError(f"Skill '{skill_id}' not found")

    history = _read_history(skill_dir)
    if not history:
        return {"ok": False, "error": "No enhancement history found for this skill"}

    last_entry = history[0]
    commit_sha = last_entry.get("commit", "")

    if not commit_sha:
        return {"ok": False, "error": "No commit SHA in history"}

    # Find the full SHA
    full_sha_result = _git_run(["rev-parse", commit_sha])
    if full_sha_result.returncode != 0:
        return {"ok": False, "error": f"Commit {commit_sha} not found in git history"}

    full_sha = full_sha_result.stdout.strip()

    # Revert the commit
    result = _git_run(["revert", "--no-edit", full_sha])
    if result.returncode != 0:
        return {"ok": False, "error": f"Git revert failed: {result.stderr}"}

    # Get new commit SHA
    new_sha_result = _git_run(["rev-parse", "HEAD"])
    new_sha = new_sha_result.stdout.strip()[:7] if new_sha_result.returncode == 0 else "unknown"

    # Remove the rolled-back entry from history
    history.pop(0)
    _write_history(skill_dir, history)

    # Amend the revert commit to include history update
    history_path = skill_dir / HISTORY_FILENAME
    if history_path.exists():
        _git_run(["add", str(history_path)])
        _git_run(["commit", "--amend", "--no-edit"])
        new_sha_result = _git_run(["rev-parse", "HEAD"])
        new_sha = new_sha_result.stdout.strip()[:7] if new_sha_result.returncode == 0 else new_sha

    return {
        "ok": True,
        "rollback_commit": new_sha,
        "reverted_commit": commit_sha,
        "message": f"Rolled back {commit_sha} → new commit {new_sha}",
    }


def get_enhance_history(skill_id: str) -> List[Dict[str, Any]]:
    """Get enhancement history for a skill."""
    skill_dir = _find_skill_dir(skill_id)
    if not skill_dir:
        return []
    return _read_history(skill_dir)
