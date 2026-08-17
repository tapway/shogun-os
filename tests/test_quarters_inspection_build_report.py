"""Tests for the deterministic report builder."""
import json
import os
import sys
import pytest

SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills", "quarters-inspection", "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from build_report import build_report, render_report_markdown

SAMPLE_PACK_PATH = os.path.join(os.path.dirname(__file__), "..", "examples", "quarters-inspection", "plantation-pack.sample.json")


def load_sample_pack():
    with open(SAMPLE_PACK_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_all_pass():
    """All inventory matches, all checklist pass → overall pass, no failed items."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            {"id": "mattress", "observed": 2},
            {"id": "cupboard", "observed": 1},
            {"id": "fan", "observed": 1},
            {"id": "table", "observed": 1},
            {"id": "chair", "observed": 1},
        ],
        "checklist": [
            {"id": "floors_clean", "status": "pass"},
            {"id": "no_mold", "status": "pass"},
            {"id": "furniture_undamaged", "status": "pass"},
            {"id": "bedding_clean", "status": "pass"},
            {"id": "walls_intact", "status": "pass"},
            {"id": "lighting_functional", "status": "pass"},
            {"id": "ventilation_adequate", "status": "pass"},
            {"id": "no_safety_hazards", "status": "pass"},
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345", "media_count": 3}
    report = build_report(pack, obs, meta)

    assert report["overall_status"] == "pass"
    assert report["failed_items"] == []
    assert len(report["inventory_results"]) == 6
    assert len(report["checklist_results"]) == 8


def test_cupboard_missing():
    """Cupboard observed=0 → fail, failed_items contains cupboard."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            {"id": "mattress", "observed": 2},
            {"id": "cupboard", "observed": 0},  # FAIL — expected 1
            {"id": "fan", "observed": 1},
            {"id": "table", "observed": 1},
            {"id": "chair", "observed": 1},
        ],
        "checklist": [
            {"id": "floors_clean", "status": "pass"},
            {"id": "no_mold", "status": "pass"},
            {"id": "furniture_undamaged", "status": "pass"},
            {"id": "bedding_clean", "status": "pass"},
            {"id": "walls_intact", "status": "pass"},
            {"id": "lighting_functional", "status": "pass"},
            {"id": "ventilation_adequate", "status": "pass"},
            {"id": "no_safety_hazards", "status": "pass"},
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345"}
    report = build_report(pack, obs, meta)

    assert report["overall_status"] == "fail"
    assert "cupboard" in report["failed_items"]
    assert len(report["failed_items"]) == 1


def test_checklist_fail():
    """Checklist item fails → overall fail, failed_items contains the id."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            {"id": "mattress", "observed": 2},
            {"id": "cupboard", "observed": 1},
            {"id": "fan", "observed": 1},
            {"id": "table", "observed": 1},
            {"id": "chair", "observed": 1},
        ],
        "checklist": [
            {"id": "floors_clean", "status": "pass"},
            {"id": "no_mold", "status": "fail", "notes": "Black spots near window"},
            {"id": "furniture_undamaged", "status": "pass"},
            {"id": "bedding_clean", "status": "pass"},
            {"id": "walls_intact", "status": "pass"},
            {"id": "lighting_functional", "status": "pass"},
            {"id": "ventilation_adequate", "status": "pass"},
            {"id": "no_safety_hazards", "status": "pass"},
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345"}
    report = build_report(pack, obs, meta)

    assert report["overall_status"] == "fail"
    assert "no_mold" in report["failed_items"]
    # Check notes are preserved
    cl = [c for c in report["checklist_results"] if c["id"] == "no_mold"][0]
    assert cl["notes"] == "Black spots near window"


def test_markdown_render_has_failed_section():
    """Markdown render includes ## Failed Items section with the failed id."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            {"id": "mattress", "observed": 2},
            {"id": "cupboard", "observed": 0},
            {"id": "fan", "observed": 1},
            {"id": "table", "observed": 1},
            {"id": "chair", "observed": 1},
        ],
        "checklist": [
            {"id": "floors_clean", "status": "pass"},
            {"id": "no_mold", "status": "pass"},
            {"id": "furniture_undamaged", "status": "pass"},
            {"id": "bedding_clean", "status": "pass"},
            {"id": "walls_intact", "status": "pass"},
            {"id": "lighting_functional", "status": "pass"},
            {"id": "ventilation_adequate", "status": "pass"},
            {"id": "no_safety_hazards", "status": "pass"},
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345"}
    report = build_report(pack, obs, meta)
    md = render_report_markdown(report)

    assert "## Failed Items" in md
    assert "cupboard" in md


def test_markdown_render_no_failed_items():
    """Markdown render shows 'No failed items' when all pass."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            {"id": "mattress", "observed": 2},
            {"id": "cupboard", "observed": 1},
            {"id": "fan", "observed": 1},
            {"id": "table", "observed": 1},
            {"id": "chair", "observed": 1},
        ],
        "checklist": [
            {"id": cl["id"], "status": "pass"}
            for cl in pack["checklist"]
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345"}
    report = build_report(pack, obs, meta)
    md = render_report_markdown(report)

    assert "No failed items" in md
    assert "✅" in md


def test_missing_observations_default_to_fail():
    """When VLM doesn't return an inventory item, it defaults to observed=0 → fail."""
    pack = load_sample_pack()
    obs = {
        "inventory": [
            {"id": "bed", "observed": 2},
            # mattress, cupboard, fan, table, chair missing → observed=0
        ],
        "checklist": [
            {"id": cl["id"], "status": "pass"}
            for cl in pack["checklist"]
        ],
    }
    meta = {"unit_id": "Block-A-12", "submitter": "telegram:12345"}
    report = build_report(pack, obs, meta)

    assert report["overall_status"] == "fail"
    # mattress (required, expected 2) and cupboard (required, expected 1) should fail
    assert "mattress" in report["failed_items"]
    assert "cupboard" in report["failed_items"]
