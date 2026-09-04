# Pack Format

## Schema

See `schema/quarters-inspection/pack.schema.json` for the formal JSON Schema.

## Structure

```json
{
  "id": "plantation-type-a-v1",
  "site_id": "estate-demo",
  "room_type": "type_a",
  "title": "Plantation Staff Quarter — Type A",
  "version": 1,
  "inventory": [
    {
      "id": "bed",
      "label": "Bed",
      "expected_count": 2,
      "required": true
    }
  ],
  "checklist": [
    {
      "id": "floors_clean",
      "label": "Floors free of litter and standing water",
      "category": "cleanliness",
      "severity": "major"
    }
  ]
}
```

## Inventory Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique item identifier |
| `label` | string | ✅ | Human-readable label |
| `expected_count` | int ≥ 0 | ✅ | How many should be present |
| `required` | bool | optional | If true, missing = fail (default: true) |

## Checklist Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique checklist identifier |
| `label` | string | ✅ | Human-readable label |
| `category` | enum | ✅ | `cleanliness`, `site_condition`, `furniture`, `safety` |
| `severity` | enum | ✅ | `critical`, `major`, `minor` |

## Validation

```python
from validate_pack import load_pack, validate_pack
pack = load_pack("path/to/pack.json")  # validates on load
# or
validate_pack(pack_dict)  # raises PackValidationError on failure
```
