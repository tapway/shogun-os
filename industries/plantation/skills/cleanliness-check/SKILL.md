---
name: cleanliness-check
description: "Use when assessing cleanliness of staff quarters from a photo. Input: image file. Output: cleanliness rating per surface + overall. Does NOT count furniture. Does NOT assess structural condition. Does NOT store."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, cleanliness, vision, assessment, staff-quarters]
---

# Cleanliness Check

Assess the cleanliness of plantation staff quarters from a photo via the vision model. One function: cleanliness assessment only.

Does NOT count furniture (that's `furniture-count`). Does NOT assess structural condition (that's `site-condition-check`). Does NOT store the report (that's `site-inspection-storage`).

## When to Load

- User sends a photo of a room and needs cleanliness rated
- Inspection pipeline calls this skill as one of three parallel checks
- User says "how clean is this room" / "check the cleanliness"

## Input

Image file (local path, downloaded from Telegram, or uploaded via portal).

## Output

JSON object — cleanliness assessment only:
```json
{
  "cleanliness": {
    "floor": "needs sweeping",
    "walls": "clean",
    "bedding": "present, needs changing",
    "surfaces": "dusty",
    "overall": "moderate"
  },
  "summary": "Floor needs sweeping, bedding needs changing — overall moderate cleanliness"
}
```

## Vision Analysis

Use `vision_analyze` tool with this question:

```
Analyze this image of plantation staff quarters. Focus ONLY on cleanliness.

Assess each surface:
- Floor: clean / needs sweeping / dirty / not visible
- Walls: clean / marks / stains / not visible
- Bedding: fresh & clean / present, needs changing / dirty / absent / not visible
- Surfaces (tables, shelves): clean / dusty / dirty / not visible
- Overall cleanliness: good / moderate / poor

Return ONLY the cleanliness assessment. Do not count furniture or assess structural condition.
```

## Cleanliness Scale

| Rating | Floor | Walls | Bedding | Surfaces |
|--------|-------|-------|---------|----------|
| Good | Swept/mopped, no stains | Clean, no marks | Fresh sheets, clean | Wiped, no dust |
| Moderate | Needs sweeping | Minor marks | Sheets present, need changing | Slight dust |
| Poor | Visible dirt/debris | Stains/marks | Dirty or no sheets | Thick dust/stains |

## Multi-Image Handling

If multiple photos are provided:
- Analyze each separately via `vision_analyze`
- Take the **worst** rating across photos for each surface
- Note which photo showed each issue

## Pitfalls

- ❌ Counting furniture — that's `furniture-count`'s job
- ❌ Assessing walls/ceiling structural condition — that's `site-condition-check`'s job (cleanliness is about dirt, not cracks)
- ❌ Storing the report — that's `site-inspection-storage`'s job
- ❌ Rating cleanliness without seeing the floor — state "floor not visible" if so
- ❌ Confusing structural damage with cleanliness — stains on walls = cleanliness; cracks = structural
