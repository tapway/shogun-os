---
name: site-inspection-storage
description: "Use when storing a site inspection report to gbrain. Input: assessment + source. Output: gbrain page path. Does NOT assess."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, storage, gbrain, persist]
---

# Site Inspection Storage

Persist a site inspection report to gbrain at the correct path with proper frontmatter. One function: storage only.

Does NOT assess the photo/video (that's `site-condition-assessment`).

## When to Load

- After `site-condition-assessment` has produced a structured assessment
- User says "save this inspection" / "record this"

## Input

JSON object:
```json
{
  "assessment": { ... from site-condition-assessment ... },
  "source": "telegram://file_id",
  "location": "Block A, Room 12"
}
```

## Output

gbrain page path: `references/inspections/<date>-<location>.md`

## Storage Path Convention

```
references/inspections/
└── 2026-08-15-block-a-room-12.md
```

If location not identifiable: `2026-08-15-unspecified.md`

## Page Template

```yaml
---
title: "Inspection: [location] — [date]"
type: reference
tags: [plantation, inspection, staff-quarters]
source: "telegram://file_id"
inspected: "2026-08-15"
location: "Block A, Room 12"
overall_rating: acceptable
---

## Furniture Inventory
- 2× Single bed (fair)
- 1× Study table (good)
- 2× Chair (fair)
- 1× Locker (good)

## Cleanliness
- Floor: needs sweeping
- Walls: clean
- Bedding: present, needs changing
- Overall: moderate

## Site Condition
- Walls: intact
- Ceiling: intact, fan working
- Windows: 2, functional
- Lighting: functional
- Ventilation: adequate

## Safety
None visible

## Overall: Acceptable — needs cleaning

## Priority Actions
1. Sweep and mop floors
2. Change bed sheets
3. General wipe-down of surfaces
```

## How to Store

Use the gbrain MCP tool:

```
mcp_gbrain_put_page(
  path="references/inspections/2026-08-15-block-a-room-12.md",
  content="[page content from template above]"
)
```

## Pitfalls

- ❌ Assessing the photo — that's `site-condition-assessment`'s job
- ❌ Missing the source field — can't trace back to the original photo
- ❌ Missing the overall_rating in frontmatter — can't filter by rating later
- ❌ Wrong path — inspections go in `inspections/`, not with documents
