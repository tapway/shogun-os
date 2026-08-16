---
name: site-condition-assessment
description: "Use when assessing a photo or video of staff quarters via vision model. Input: image/video file. Output: structured assessment (furniture, cleanliness, condition, safety). Does NOT store."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, vision, assessment, staff-quarters]
---

# Site Condition Assessment

Analyze a photo or video of plantation staff quarters via the vision model. One function: assessment only.

Produces a structured assessment with furniture count, cleanliness rating, site condition, and safety hazards.

Does NOT store the report (that's `site-inspection-storage`).

## When to Load

- User sends a photo or video via Telegram of a room, building, or site
- User says "inspect this quarter" / "check the condition" / "assess furniture"
- User sends multiple photos of the same location from different angles

## Input

Image or video file (local path, downloaded from Telegram, or uploaded via portal).

## Output

Structured assessment:
```json
{
  "furniture": [
    {"item": "single bed", "quantity": 2, "condition": "fair"},
    {"item": "study table", "quantity": 1, "condition": "good"},
    {"item": "chair", "quantity": 2, "condition": "fair"},
    {"item": "locker", "quantity": 1, "condition": "good"}
  ],
  "cleanliness": {
    "floor": "needs sweeping",
    "walls": "clean",
    "bedding": "present, needs changing",
    "overall": "moderate"
  },
  "site_condition": {
    "walls": "intact",
    "ceiling": "intact, fan working",
    "windows": "2, functional",
    "lighting": "functional",
    "ventilation": "adequate"
  },
  "safety_hazards": ["none visible"],
  "overall_rating": "acceptable",
  "priority_actions": [
    "Sweep and mop floors",
    "Change bed sheets",
    "General wipe-down of surfaces"
  ]
}
```

## Vision Analysis

Use `vision_analyze` tool with this question:

```
Analyze this image of plantation staff quarters. Provide:

1. FURNITURE INVENTORY
   - List each visible piece of furniture with quantity
   - Note condition of each (good/fair/poor)

2. CLEANLINESS ASSESSMENT
   - Floor: clean / needs sweeping / dirty
   - Walls: clean / marks / damage
   - Bedding/sheets: present & clean / present & dirty / absent
   - Overall cleanliness: good / moderate / poor

3. SITE CONDITION
   - Walls: intact / cracks / water damage / structural issues
   - Ceiling: intact / leaks / missing panels
   - Windows: present & functional / broken / missing
   - Lighting: functional / partial / none
   - Ventilation: adequate / poor

4. SAFETY HAZARDS
   - List any visible hazards (exposed wiring, broken glass, etc.)
   - If none, state "None visible"

5. OVERALL ASSESSMENT
   - Habitability: good / acceptable / needs maintenance / uninhabitable
   - Priority actions: list top 3 issues to address
```

## Rubric

See `references/assessment-rubric.md` for the cleanliness and habitability scales.

## Multi-Image Handling

If user sends multiple photos:
- Analyze each separately via `vision_analyze`
- Merge furniture counts (deduplicate if same item visible in multiple shots)
- Take the worst cleanliness/condition rating across photos
- Note which photo each issue was visible in

## Video Handling

If user sends a video:
- qwen3.5-plus supports video input natively
- Use `vision_analyze` with the video file
- Prompt: "This is a video tour of staff quarters. Describe each room/area visible, the furniture in each, and the overall condition."
- Structure the response by room/area

## Pitfalls

- ❌ Storing the report — that's `site-inspection-storage`'s job
- ❌ Guessing furniture count from a single angle — note "at least N" if uncertain
- ❌ Rating cleanliness without seeing the floor — state "floor not visible" if so
- ❌ Ignoring safety hazards — always scan for exposed wiring, broken glass, structural damage
- ❌ Long paragraphs — use bullet points for Telegram readability
