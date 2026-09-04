![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Frontmatter Guard

> Validate YAML frontmatter on every brain write — gate malformed YAML, missing required fields, incorrect types, and null bytes before they corrupt pages.

## What It Does

Acts as a pre-write validation gate that catches corrupted frontmatter before it reaches the brain database. Checks YAML parsability, required fields per page type, slug hygiene, date formats, tag structure, and null byte presence. Corrupted frontmatter silently breaks search, rendering, and embedding — this guard prevents that class of bugs entirely. Includes a batch null-byte scanner for imported repos.

## Quick Example

```python
# Before every mcp_gbrain_put_page call:
# 1. Parse frontmatter with yaml.safe_load
# 2. Check: title present, type valid, tags are list, date is ISO
# 3. No null bytes, no tabs, no duplicate keys
# 4. If any check fails → FIX before writing

# Batch scan for null bytes in imported content:
# python3 ~/.hermes/skills/gbrain/gbrain-frontmatter-guard/scripts/scan_null_bytes.py \
#   --path ~/brain --git-only --fix
```

## When to Use / When NOT To

**Use when:**
- Before ANY `mcp_gbrain_put_page` call
- When importing external markdown repos into the brain
- When syncing git-tracked markdown that may contain null bytes
- As part of CI/pre-commit hooks

**Don't use for:**
- Reading existing pages (validation is write-time only)
- Non-YAML content
- Pages already validated by brain-compliance post-write check

## Prerequisites

- [ ] Python 3 with PyYAML available
- [ ] Null-byte scanner script deployed
- [ ] Knowledge of required fields per page type (see SKILL.md table)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (pre-write gate) |
| Related Skills | [brain-compliance](../brain-compliance/), [gbrain-brain-ops](../gbrain-brain-ops/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-15 | Initial release — YAML validation, null-byte scanner, required field checks |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
