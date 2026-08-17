"""Tests for VLM prompt builder and JSON parser."""
import json
import os
import sys
import pytest

SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills", "quarters-inspection", "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from assess_media_prompt import build_assessment_prompt, parse_observations_json

SAMPLE_PACK_PATH = os.path.join(os.path.dirname(__file__), "..", "examples", "quarters-inspection", "plantation-pack.sample.json")


def load_sample_pack():
    with open(SAMPLE_PACK_PATH, encoding="utf-8") as f:
        return json.load(f)


class TestBuildAssessmentPrompt:
    def test_prompt_contains_inventory_labels(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack, "Block-A-12")
        assert "Bed" in prompt
        assert "Cupboard" in prompt
        assert "Ceiling fan" in prompt

    def test_prompt_contains_expected_counts(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack)
        assert "expected_count=2" in prompt  # bed, mattress
        assert "expected_count=1" in prompt  # cupboard, fan, table, chair

    def test_prompt_contains_checklist_labels(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack)
        assert "Floors free of litter" in prompt
        assert "No visible mold" in prompt
        assert "No exposed wiring" in prompt

    def test_prompt_contains_unit_id(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack, "Block-A-99")
        assert "Block-A-99" in prompt

    def test_prompt_contains_json_instruction(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack)
        assert "```json" in prompt
        assert '"inventory"' in prompt
        assert '"checklist"' in prompt
        assert '"observed"' in prompt
        assert '"status": "pass|fail"' in prompt

    def test_prompt_contains_all_inventory_ids(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack)
        for item in pack["inventory"]:
            assert item["id"] in prompt, f"Missing inventory id '{item['id']}' in prompt"

    def test_prompt_contains_all_checklist_ids(self):
        pack = load_sample_pack()
        prompt = build_assessment_prompt(pack)
        for item in pack["checklist"]:
            assert item["id"] in prompt, f"Missing checklist id '{item['id']}' in prompt"


class TestParseObservationsJson:
    def test_raw_json(self):
        text = '{"inventory": [{"id": "bed", "observed": 2}], "checklist": []}'
        result = parse_observations_json(text)
        assert result["inventory"][0]["observed"] == 2

    def test_json_in_code_fence(self):
        text = 'Here is my assessment:\n```json\n{"inventory": [], "checklist": []}\n```\nDone.'
        result = parse_observations_json(text)
        assert result == {"inventory": [], "checklist": []}

    def test_json_in_plain_code_fence(self):
        text = '```\n{"inventory": [], "checklist": [{"id": "no_mold", "status": "fail"}]}\n```'
        result = parse_observations_json(text)
        assert result["checklist"][0]["status"] == "fail"

    def test_json_with_leading_text(self):
        text = 'I see 2 beds and 1 cupboard.\n{"inventory": [{"id": "bed", "observed": 2}], "checklist": []}'
        result = parse_observations_json(text)
        assert result["inventory"][0]["observed"] == 2

    def test_empty_response_raises(self):
        with pytest.raises(ValueError, match="Empty response"):
            parse_observations_json("")

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            parse_observations_json("This is just text with no JSON at all.")

    def test_full_response(self):
        """Realistic VLM response with fenced JSON."""
        text = '''I have assessed the quarters photos.

```json
{
  "inventory": [
    {"id": "bed", "observed": 2, "notes": "Two single beds, both in good condition"},
    {"id": "mattress", "observed": 2, "notes": "Both mattresses present and clean"},
    {"id": "cupboard", "observed": 0, "notes": "No cupboard visible"},
    {"id": "fan", "observed": 1, "notes": "Ceiling fan present"},
    {"id": "table", "observed": 1, "notes": "Small study table"},
    {"id": "chair", "observed": 1, "notes": "Plastic chair"}
  ],
  "checklist": [
    {"id": "floors_clean", "status": "pass", "notes": "Floor swept"},
    {"id": "no_mold", "status": "fail", "notes": "Black spots near window"},
    {"id": "furniture_undamaged", "status": "pass"},
    {"id": "bedding_clean", "status": "pass"},
    {"id": "walls_intact", "status": "pass"},
    {"id": "lighting_functional", "status": "pass"},
    {"id": "ventilation_adequate", "status": "pass"},
    {"id": "no_safety_hazards", "status": "pass"}
  ],
  "cleanliness_summary": "Generally clean except for mold near window.",
  "site_condition_summary": "Structurally sound, mold issue near window.",
  "confidence": "high"
}
```

The cupboard is missing which is a required item.'''
        result = parse_observations_json(text)
        assert result["inventory"][2]["id"] == "cupboard"
        assert result["inventory"][2]["observed"] == 0
        assert result["checklist"][1]["status"] == "fail"
        assert result["confidence"] == "high"
