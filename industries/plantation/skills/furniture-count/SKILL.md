---
name: furniture-count
description: "Use when counting furniture items in a photo of staff quarters. Input: image file. Output: furniture inventory with item, quantity, condition. Does NOT assess cleanliness. Does NOT assess site condition. Does NOT store."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, furniture, vision, assessment, staff-quarters]
---

# Furniture Count

Count and catalog furniture items in a photo of plantation staff quarters via the vision model. One function: furniture inventory only.

Does NOT assess cleanliness (that's `cleanliness-check`). Does NOT assess site condition (that's `site-condition-check`). Does NOT store the report (that's `site-inspection-storage`).

## When to Load

- User sends a photo of a room and needs furniture counted
- Inspection pipeline calls this skill as one of three parallel checks
- User says "count the furniture" / "what furniture is in this room"

## Input

Image file (local path, downloaded from Telegram, or uploaded via portal).

## Output

JSON object — furniture inventory only:
```json
{
  "furniture": [
    {"item": "single bed", "quantity": 2, "condition": "fair"},
    {"item": "study table", "quantity": 1, "condition": "good"},
    {"item": "chair", "quantity": 2, "condition": "fair"},
    {"item": "locker", "quantity": 1, "condition": "good"}
  ],
  "total_items": 6,
  "summary": "2 beds, 1 table, 2 chairs, 1 locker — overall fair condition"
}
```

## Vision Analysis

Use `vision_analyze` tool with this question:

```
Analyze this image of plantation staff quarters. Focus ONLY on furniture.

List every visible piece of furniture with:
- Item name (bed, table, chair, locker, etc.)
- Quantity (how many visible)
- Condition (good / fair / poor)

Standard items to look for: bed, mattress, study table, chair, locker/wardrobe, ceiling fan, shelf.

If a furniture type is not visible, do not include it.
If furniture count is uncertain from the angle, note "at least N".

Return ONLY the furniture inventory. Do not assess cleanliness or structural condition.
```

## Multi-Image Handling

If multiple photos are provided:
- Analyze each separately via `vision_analyze`
- Merge counts (deduplicate if the same item is visible across overlapping shots)
- Take the worst condition rating if the same item appears in multiple photos with different conditions

## Pitfalls

- ❌ Assessing cleanliness — that's `cleanliness-check`'s job
- ❌ Assessing walls/ceiling/structural condition — that's `site-condition-check`'s job
- ❌ Storing the report — that's `site-inspection-storage`'s job
- ❌ Guessing count from a single angle — note "at least N" if uncertain
- ❌ Including non-furniture items (windows, doors are structural, not furniture — use `site-condition-check`)
