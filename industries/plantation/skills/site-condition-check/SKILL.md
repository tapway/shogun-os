---
name: site-condition-check
description: "Use when assessing structural condition of staff quarters from a photo. Input: image file. Output: structural condition of walls, ceiling, windows, lighting, ventilation + safety hazards. Does NOT count furniture. Does NOT assess cleanliness. Does NOT store."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, site-condition, vision, assessment, staff-quarters]
---

# Site Condition Check

Assess the structural condition of plantation staff quarters from a photo via the vision model. One function: structural condition and safety assessment only.

Does NOT count furniture (that's `furniture-count`). Does NOT assess cleanliness (that's `cleanliness-check`). Does NOT store the report (that's `site-inspection-storage`).

## When to Load

- User sends a photo of a room and needs structural condition assessed
- Inspection pipeline calls this skill as one of three parallel checks
- User says "check the condition" / "any damage?" / "is it safe?"

## Input

Image file (local path, downloaded from Telegram, or uploaded via portal).

## Output

JSON object — structural condition + safety only:
```json
{
  "site_condition": {
    "walls": "intact",
    "ceiling": "intact, fan working",
    "windows": "2, functional",
    "lighting": "functional",
    "ventilation": "adequate"
  },
  "safety_hazards": ["none visible"],
  "overall_rating": "acceptable",
  "priority_actions": ["Replace broken window latch"]
}
```

## Vision Analysis

Use `vision_analyze` tool with this question:

```
Analyze this image of plantation staff quarters. Focus ONLY on structural condition and safety.

Assess each:
- Walls: intact / cracks / water damage / structural issues
- Ceiling: intact / leaks / missing panels / not visible
- Windows: present & functional / broken / missing / not visible
- Lighting: functional / partial / none / not visible
- Ventilation: adequate / poor (check windows, vents, fan)

SAFETY HAZARDS:
- List any visible: exposed wiring, broken glass, structural damage, fire hazards
- If none, state "None visible"

OVERALL:
- Habitability: good / acceptable / needs maintenance / uninhabitable
- Priority structural actions: list top issues (max 3)

Return ONLY the structural condition and safety assessment. Do not count furniture or assess cleanliness.
```

## Habitability Scale

| Rating | Criteria |
|--------|---------|
| Good | All structures intact, no hazards, good ventilation |
| Acceptable | Minor wear, no major hazards, ventilation adequate |
| Needs Maintenance | Cracks, leaks, broken windows, or minor safety issues |
| Uninhabitable | Structural damage, major safety hazards, no ventilation |

## Multi-Image Handling

If multiple photos are provided:
- Analyze each separately via `vision_analyze`
- Take the **worst** rating across photos for each structural element
- Collect all unique safety hazards across photos
- Note which photo showed each issue

## Pitfalls

- ❌ Counting furniture — that's `furniture-count`'s job
- ❌ Assessing dirt/cleanliness — that's `cleanliness-check`'s job (wall stains = cleanliness; wall cracks = structural)
- ❌ Storing the report — that's `site-inspection-storage`'s job
- ❌ Ignoring safety hazards — always scan for exposed wiring, broken glass, structural damage
- ❌ Rating "good" without checking ventilation — poor ventilation affects habitability
