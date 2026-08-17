---
name: quarters-inspection
description: "Use when inspecting staff quarters photos against an inventory + checklist pack. Orchestrates furniture-count, cleanliness-check, and site-condition-check skills. Returns structured pass/fail report. Works via web portal and Telegram."
version: 1.0.0
author: Shogun OS
category: plantation
departments: [facility]
tags: [plantation, facility, quarters, inspection, pack, vision, vlm, telegram]
---

# Quarters Inspection

Orchestrator skill: assess staff quarters photos against a user-supplied inventory + checklist pack. Wraps three atomic VLM skills (`furniture-count`, `cleanliness-check`, `site-condition-check`) and produces a structured pass/fail report.

Does NOT directly call the VLM — it builds the prompt, delegates to the atomic skills, and assembles the report. Does NOT store to gbrain (that's the backend endpoint's job).

## When to Load

- User sends photos of staff quarters via Telegram or web portal
- Facility dashboard assess endpoint calls this skill
- Trigger phrases: "quarters inspection", "furniture count", "cleanliness check", "site condition"

## Prerequisites

- A validated inspection pack (see `references/pack-format.md`)
- Photos of staff quarters (JPEG/PNG)
- VLM model available (Qwen-VL via Hermes gateway)

## Workflows

### 1. Configure Pack

User supplies an inspection pack (JSON or YAML) defining:
- **Inventory**: items expected in the room (bed: 2, cupboard: 1, fan: 1)
- **Checklist**: conditions to verify (floors clean, no mold, walls intact)

```
inspect pack plantation-type-a-v1
```

If no pack supplied, default rubrics from the atomic skills are used.

### 2. Inspect Unit (Telegram — pack-driven flow)

```
inspect <site_id> <unit_id> [pack_id]
<photo attachments>
```

The agent:
1. Loads the pack (or uses defaults)
2. Builds a single VLM prompt via `assess_media_prompt.py` from the pack's inventory + checklist
3. Sends photos + prompt to the VLM (Qwen-VL)
4. Parses VLM JSON response via `parse_observations_json()` — expects shape: `{inventory: [{id, observed}], checklist: [{id, status}], summaries, confidence}`
5. Builds report via `build_report.py` (deterministic pass/fail)
6. Renders markdown report

### 2b. Inspect Unit (Web portal — atomic skills flow)

The web portal uses a **separate path** that calls 3 atomic skills independently per photo:
- `furniture-count` → emits `{furniture: [{item, quantity, condition}], total_items, summary}`
- `cleanliness-check` → emits `{cleanliness: {floor, walls, bedding, surfaces, overall}, summary}`
- `site-condition-check` → emits `{site_condition: {...}, safety_hazards: [...], overall_rating, priority_actions: [...]}`

These atomic skill outputs are stored directly in `merged_assessment.per_photo[]` — they do **not** go through `build_report.py`. The two flows are separate:
- **Telegram/pack-driven**: `assess_media_prompt.py` → VLM → `parse_observations_json()` → `build_report.py` → structured pass/fail report
- **Web portal/atomic**: 3 separate VLM calls → per-photo JSON stored in DB → displayed in dashboard UI

The agent replies with a structured report + failed flags.

### 3. Inspect Unit (Web Portal)

Web portal calls `POST /api/departments/facility/dashboard/site-units/{id}/assess` which runs the same pipeline server-side.

### 4. Offline Submit

User captures photos on device while offline. When online, sends photos with the same caption (`inspect <site_id> <unit_id>`). No custom offline queue in v1.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate_pack.py` | Validate an inspection pack JSON |
| `scripts/validate_report.py` | Validate a generated report JSON |
| `scripts/build_report.py` | Build deterministic pass/fail report from pack + observations |
| `scripts/assess_media_prompt.py` | Build VLM prompt from pack + parse VLM JSON response |

## Output

Structured report (see `references/report-format.md`):
- `inventory_results`: pass/fail per item (observed vs expected count)
- `checklist_results`: pass/fail per checklist item
- `failed_items`: list of all failed IDs
- `overall_status`: pass iff no failures
- Markdown render with ## Failed Items section

## Pitfalls

- ❌ Calling VLM without a pack — always load pack first or use defaults
- ❌ Accepting VLM observations without parsing JSON — use `parse_observations_json()`
- ❌ Skipping validation — always run `validate_report()` on the final report
- ❌ Resident identity/face recognition — not in scope, do not attempt
- ❌ Auto work orders — v1 only reports, does not create maintenance tickets
- ⚠️ **Fail-closed checklist**: unassessed checklist items default to "fail" — this is intentional (safety-critical). If the VLM can't see an item, the report flags it for manual follow-up rather than silently passing.
- ⚠️ **Two separate flows**: Telegram (pack-driven → `build_report.py`) and web portal (atomic skills → per-photo JSON in DB) produce different output shapes. See workflow sections 2 and 2b above.
