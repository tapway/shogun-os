![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain Compliance

> Standards and validation for Gbrain-compliant brain pages — mandatory to load whenever writing, editing, or creating brain files.

## What It Does

Enforces consistent frontmatter, filename conventions, wikilink format, and orphan prevention across all brain pages. Acts as a three-layer quality gate (agent, pre-commit hook, batch audit) so every page written by humans, agents, or cron jobs meets the same structural standards. Without it, search breaks, graph links fail, and the brain score degrades.

## Quick Example

```bash
# Validate a single person page
python3 ~/.hermes/skills/brain-compliance/scripts/validate-brain-page.py ~/brain/people/alice-wong.md

# Batch scan an entire folder
python3 ~/.hermes/skills/brain-compliance/scripts/validate-brain-page.py ~/brain/deals/ --batch

# Or use gbrain-native validation after put_page
mcp_gbrain_schema_lint(pack="active")
mcp_gbrain_get_health()
```

## When to Use / When NOT To

**Use when:**
- Creating or editing any brain page (person, company, deal, meeting, etc.)
- Running cron jobs that write brain files
- Auditing existing pages for compliance drift
- Building scripts that generate brain content

**Don't use for:**
- Reading/querying brain pages (use `gbrain-query` instead)
- Non-brain file operations
- Pure operational tasks (docker, server management)

## Prerequisites

- [ ] gbrain initialized (`gbrain doctor` passes)
- [ ] Brain repo cloned at `~/brain/`
- [ ] Pre-commit hook installed at `~/brain/.git/hooks/pre-commit`
- [ ] Validator script available at skill path

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (auto-loaded on brain writes) |
| Related Skills | [frontmatter-guard](../frontmatter-guard/), [brain-link-campaign](../brain-link-campaign/), [brain-e2e-tests](../brain-e2e-tests/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-07-08 | Added orphan prevention helper, category→index mapping, gbrain-native validation |
| 1.0.0 | 2026-06-01 | Initial release — frontmatter standards, validator script, pre-commit hook |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
