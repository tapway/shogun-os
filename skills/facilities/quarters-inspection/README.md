![Facilities](https://img.shields.io/badge/dept-Facilities-brown)

# Quarters Inspection

> Assess staff quarters photos against an inventory + checklist pack — returns structured pass/fail inspection reports.

## What It Does

Orchestrates AI-powered inspection of staff quarters by comparing photos against a user-supplied inventory and checklist pack. Delegates to three atomic VLM skills (furniture-count, cleanliness-check, site-condition-check), parses observations, and builds a deterministic pass/fail report. Works via Telegram commands and web portal API.

## Quick Example

```
Input:  inspect SITE-A UNIT-12 plantation-type-a-v1
        [3 photo attachments]

Output:
  ## Quarters Inspection — SITE-A / UNIT-12
  Pack: plantation-type-a-v1

  ✅ Inventory: bed (2/2), cupboard (1/1), fan (1/1)
  ❌ Checklist: floor-clean FAIL (stains observed), walls-intact PASS
  ⚠️  Safety: mold detected near window

  Failed Items: floor-clean, mold-check
  Overall: FAIL — 2 items require attention
```

## When to Use / When NOT To

**Use when:**
- User sends quarters photos via Telegram with `inspect` command
- Facility dashboard triggers an assessment endpoint
- Routine or ad-hoc staff quarters compliance checks

**Don't use for:**
- Resident identity or face recognition (out of scope)
- Auto-creating maintenance work orders (v1 reports only)
- Inspections without photos (VLM requires visual input)

## Prerequisites

- [ ] Validated inspection pack (JSON/YAML) or use default rubrics
- [ ] Photos of staff quarters (JPEG/PNG)
- [ ] VLM model available (Qwen-VL via Hermes gateway)
- [ ] Scripts: `validate_pack.py`, `assess_media_prompt.py`, `build_report.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Facilities |
| Owning Profile | facility-manager / plantation-manager |
| Slash Command | `/quarters-inspection` |
| Related Skills | furniture-count, cleanliness-check, site-condition-check (atomic VLM skills) |

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Pack format | JSON/YAML inspection pack | See `references/pack-format.md` |
| Fail-closed | Unassessed checklist items default to FAIL | Yes (safety-critical) |
| Two flows | Telegram (pack-driven) vs Web portal (atomic skills) | Separate output shapes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — pack-driven + atomic flows, Telegram + web portal support |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
