"""Tests for quarters inspection report validation."""
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "skills", "quarters-inspection", "scripts"))
from validate_report import validate_report, ReportValidationError


def valid_report(**overrides):
    """Return a valid report dict, with overrides applied."""
    r = {
        "pack_id": "plantation-type-a-v1",
        "site_id": "estate-demo",
        "unit_id": "Block-A-12",
        "inspected_at": "2026-08-14T10:00:00+08:00",
        "submitter": "telegram:12345",
        "media_count": 4,
        "inventory_results": [
            {"id": "bed", "label": "Bed", "expected": 2, "observed": 2, "status": "pass"},
            {"id": "cupboard", "label": "Cupboard", "expected": 1, "observed": 0, "status": "fail"},
        ],
        "checklist_results": [
            {"id": "floors_clean", "status": "pass"},
            {"id": "no_mold", "status": "fail", "notes": "Black spots near window"},
        ],
        "failed_items": ["cupboard", "no_mold"],
        "overall_status": "fail",
        "confidence": "medium",
        "model_notes": "VLM assessment; counts approximate",
    }
    r.update(overrides)
    return r


class TestValidReport:
    def test_valid_report_passes(self):
        validate_report(valid_report())  # should not raise

    def test_valid_all_pass(self):
        r = valid_report(
            inventory_results=[{"id": "bed", "expected": 2, "observed": 2, "status": "pass"}],
            checklist_results=[{"id": "floors_clean", "status": "pass"}],
            failed_items=[],
            overall_status="pass",
        )
        validate_report(r)


class TestMissingKeys:
    def test_missing_pack_id(self):
        r = valid_report()
        del r["pack_id"]
        with pytest.raises(ReportValidationError, match="Missing required key: 'pack_id'"):
            validate_report(r)

    def test_missing_overall_status(self):
        r = valid_report()
        del r["overall_status"]
        with pytest.raises(ReportValidationError, match="Missing required key: 'overall_status'"):
            validate_report(r)


class TestFailedItemsCrossCheck:
    def test_failed_item_missing_from_failed_items(self):
        r = valid_report()
        r["failed_items"] = ["no_mold"]  # cupboard is also fail but missing
        with pytest.raises(ReportValidationError, match="'cupboard' has status 'fail' but is missing"):
            validate_report(r)

    def test_overall_status_pass_with_fails(self):
        r = valid_report(overall_status="pass")
        with pytest.raises(ReportValidationError, match="overall_status is 'pass' but there are"):
            validate_report(r)

    def test_overall_status_fail_with_no_fails(self):
        r = valid_report(
            inventory_results=[{"id": "bed", "expected": 2, "observed": 2, "status": "pass"}],
            checklist_results=[{"id": "floors_clean", "status": "pass"}],
            failed_items=[],
            overall_status="fail",
        )
        with pytest.raises(ReportValidationError, match="overall_status is 'fail' but there are no"):
            validate_report(r)


class TestStatusEnum:
    def test_invalid_inventory_status(self):
        r = valid_report()
        r["inventory_results"][0]["status"] = "maybe"
        with pytest.raises(ReportValidationError, match="status must be 'pass' or 'fail'"):
            validate_report(r)

    def test_invalid_checklist_status(self):
        r = valid_report()
        r["checklist_results"][0]["status"] = "unknown"
        with pytest.raises(ReportValidationError, match="status must be 'pass' or 'fail'"):
            validate_report(r)

    def test_invalid_overall_status(self):
        r = valid_report(overall_status="maybe")
        with pytest.raises(ReportValidationError, match="overall_status"):
            validate_report(r)


class TestDuplicateIds:
    def test_duplicate_inventory_ids(self):
        r = valid_report()
        r["inventory_results"][1]["id"] = r["inventory_results"][0]["id"]
        with pytest.raises(ReportValidationError, match="Duplicate inventory_results id"):
            validate_report(r)

    def test_duplicate_checklist_ids(self):
        r = valid_report()
        r["checklist_results"][1]["id"] = r["checklist_results"][0]["id"]
        with pytest.raises(ReportValidationError, match="Duplicate checklist_results id"):
            validate_report(r)
