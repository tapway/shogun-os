![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain E2E Tests

> Comprehensive E2E test suite for brain compliance, timeline, cron validation, and HR migration — run after any brain infrastructure change.

## What It Does

Runs 26 automated checks across six categories (validator, pre-commit hook, timeline, cron config, script validation, HR migration) to verify that brain infrastructure is wired correctly. Catches regressions when you modify the validator, add new cron jobs, migrate folders, or update the pre-commit hook. Expected result: 22 passed, 0 failed.

## Quick Example

```bash
# Run the full test suite
python3 ~/.hermes/skills/gbrain/brain-e2e-tests/SKILL.md

# Or from standalone script
python3 /tmp/brain-e2e-tests.py

# Expected output:
# 22 passed, 0 failed
```

## When to Use / When NOT To

**Use when:**
- After modifying `validate-brain-page.py`
- After wiring new cron jobs that write brain pages
- After folder migrations (HR/ → hr/, people/ → persons/)
- After timeline injection campaigns
- After updating the pre-commit hook

**Don't use for:**
- Routine daily operations (tests are for infrastructure changes)
- Validating individual brain pages (use `brain-compliance` instead)

## Prerequisites

- [ ] gbrain initialized and brain repo present
- [ ] Pre-commit hook installed
- [ ] At least one brain-writing cron job configured
- [ ] Python 3 available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (manual/ci trigger) |
| Related Skills | [brain-compliance](../brain-compliance/), [timeline-inject-v2](../timeline-inject-v2/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-15 | Initial release — 26 checks across 6 categories |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
