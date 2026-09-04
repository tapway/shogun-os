# Report Format

## Schema

See `schema/quarters-inspection/report.schema.json` for the formal JSON Schema.

## Structure

```json
{
  "pack_id": "plantation-type-a-v1",
  "site_id": "estate-demo",
  "unit_id": "Block-A-12",
  "inspected_at": "2026-08-14T10:00:00+08:00",
  "submitter": "telegram:12345",
  "media_count": 4,
  "inventory_results": [
    {
      "id": "bed",
      "label": "Bed",
      "expected": 2,
      "observed": 2,
      "status": "pass",
      "notes": ""
    },
    {
      "id": "cupboard",
      "label": "Cupboard",
      "expected": 1,
      "observed": 0,
      "status": "fail",
      "notes": "No cupboard visible"
    }
  ],
  "checklist_results": [
    {
      "id": "floors_clean",
      "label": "Floors free of litter",
      "status": "pass",
      "notes": ""
    },
    {
      "id": "no_mold",
      "label": "No visible mold",
      "status": "fail",
      "notes": "Black spots near window"
    }
  ],
  "cleanliness_summary": "Generally clean except for mold near window.",
  "site_condition_summary": "Structurally sound, mold issue near window.",
  "failed_items": ["cupboard", "no_mold"],
  "overall_status": "fail",
  "confidence": "high",
  "model_notes": "VLM assessment; counts approximate"
}
```

## Overall Status Rule

- `overall_status: "pass"` — iff no `fail` in inventory_results or checklist_results
- `overall_status: "fail"` — if any item fails (missing required inventory = fail)

## Fail-Closed Policy

Checklist items not assessed by the VLM (e.g. blocked camera angle, item not visible) default to `status: "fail"`. This is **stricter than inventory handling** (where missing items default to observed=0) because checklist items are safety-critical (no mold, no exposed wiring). A checklist item the VLM couldn't assess is treated as a failure requiring follow-up, not silently skipped.

## Markdown Render

The `render_report_markdown()` function produces:

```markdown
# Inspection Report — Block-A-12

**Overall Status:** ❌ FAIL
**Pack:** plantation-type-a-v1

## Failed Items
- ❌ cupboard
- ❌ no_mold

## Inventory Results
| Item | Expected | Observed | Status |
|------|----------|----------|--------|
| Bed | 2 | 2 | ✅ pass |
| Cupboard | 1 | 0 | ❌ fail |

## Checklist Results
| Check | Status | Notes |
|-------|--------|-------|
| Floors free of litter | ✅ pass | |
| No visible mold | ❌ fail | Black spots near window |
```
