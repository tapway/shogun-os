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

### 2. Inspect Unit (Telegram)

```
inspect <site_id> <unit_id> [pack_id]
<photo attachments>
```

The agent:
1. Loads the pack (or uses defaults)
2. Builds VLM prompt via `assess_media_prompt.py`
3. Calls the 3 atomic skills per photo:
   - `furniture-count` → counts items vs pack inventory
   - `cleanliness-check` → assesses surfaces vs checklist
   - `site-condition-check` → assesses structure + safety
4. Parses VLM JSON via `parse_observations_json()`
5. Builds report via `build_report.py` (deterministic pass/fail)
6. Renders markdown report
7. Replies with structured report + failed flags

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
