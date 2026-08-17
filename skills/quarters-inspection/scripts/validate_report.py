"""Validate a quarters inspection report.

Usage:
    from validate_report import validate_report, ReportValidationError
    validate_report(report_dict)

Stdlib-only — no external dependencies.
"""

from __future__ import annotations

from typing import Any, Dict, List


class ReportValidationError(ValueError):
    """Raised when a report fails validation."""


def validate_report(report: Dict[str, Any]) -> None:
    """Validate a report dict. Raises ReportValidationError on failure."""
    if not isinstance(report, dict):
        raise ReportValidationError("Report must be a JSON object")

    required_keys = [
        "pack_id", "unit_id", "inspected_at", "submitter",
        "inventory_results", "checklist_results",
        "failed_items", "overall_status",
    ]
    for key in required_keys:
        if key not in report:
            raise ReportValidationError(f"Missing required key: '{key}'")

    # pack_id: non-empty string
    if not isinstance(report["pack_id"], str) or not report["pack_id"].strip():
        raise ReportValidationError("'pack_id' must be a non-empty string")

    # unit_id: non-empty string
    if not isinstance(report["unit_id"], str) or not report["unit_id"].strip():
        raise ReportValidationError("'unit_id' must be a non-empty string")

    # inspected_at: non-empty string
    if not isinstance(report["inspected_at"], str) or not report["inspected_at"].strip():
        raise ReportValidationError("'inspected_at' must be a non-empty string")

    # submitter: non-empty string
    if not isinstance(report["submitter"], str) or not report["submitter"].strip():
        raise ReportValidationError("'submitter' must be a non-empty string")

    # overall_status: must be pass or fail
    if report["overall_status"] not in ("pass", "fail"):
        raise ReportValidationError(
            f"'overall_status' must be 'pass' or 'fail', got '{report['overall_status']}'"
        )

    # inventory_results: list of objects with id, expected, observed, status
    inv = report["inventory_results"]
    if not isinstance(inv, list):
        raise ReportValidationError("'inventory_results' must be an array")
    inv_ids: set[str] = set()
    for i, item in enumerate(inv):
        if not isinstance(item, dict):
            raise ReportValidationError(f"inventory_results[{i}] must be an object")
        for key in ("id", "expected", "observed", "status"):
            if key not in item:
                raise ReportValidationError(f"inventory_results[{i}] missing key: '{key}'")
        if not isinstance(item["id"], str) or not item["id"].strip():
            raise ReportValidationError(f"inventory_results[{i}].id must be a non-empty string")
        if item["id"] in inv_ids:
            raise ReportValidationError(f"Duplicate inventory_results id: '{item['id']}'")
        inv_ids.add(item["id"])
        if not isinstance(item["expected"], int) or item["expected"] < 0:
            raise ReportValidationError(f"inventory_results[{i}].expected must be an integer >= 0")
        if not isinstance(item["observed"], int) or item["observed"] < 0:
            raise ReportValidationError(f"inventory_results[{i}].observed must be an integer >= 0")
        if item["status"] not in ("pass", "fail"):
            raise ReportValidationError(
                f"inventory_results[{i}].status must be 'pass' or 'fail', got '{item['status']}'"
            )

    # checklist_results: list of objects with id, status
    cl = report["checklist_results"]
    if not isinstance(cl, list):
        raise ReportValidationError("'checklist_results' must be an array")
    cl_ids: set[str] = set()
    for i, item in enumerate(cl):
        if not isinstance(item, dict):
            raise ReportValidationError(f"checklist_results[{i}] must be an object")
        for key in ("id", "status"):
            if key not in item:
                raise ReportValidationError(f"checklist_results[{i}] missing key: '{key}'")
        if not isinstance(item["id"], str) or not item["id"].strip():
            raise ReportValidationError(f"checklist_results[{i}].id must be a non-empty string")
        if item["id"] in cl_ids:
            raise ReportValidationError(f"Duplicate checklist_results id: '{item['id']}'")
        cl_ids.add(item["id"])
        if item["status"] not in ("pass", "fail"):
            raise ReportValidationError(
                f"checklist_results[{i}].status must be 'pass' or 'fail', got '{item['status']}'"
            )

    # failed_items: list of strings — must contain all failed inventory + checklist ids
    failed = report["failed_items"]
    if not isinstance(failed, list):
        raise ReportValidationError("'failed_items' must be an array")
    for i, fid in enumerate(failed):
        if not isinstance(fid, str):
            raise ReportValidationError(f"failed_items[{i}] must be a string")

    # Cross-check: every id in failed_items must actually have status=fail
    # (but not every fail must be in failed_items — optional items may fail
    #  without contributing to failed_items / overall_status)
    all_fail_ids: set[str] = set()
    for item in inv:
        if item["status"] == "fail":
            all_fail_ids.add(item["id"])
    for item in cl:
        if item["status"] == "fail":
            all_fail_ids.add(item["id"])

    # Every id in failed_items must actually be a fail
    for fid in failed:
        if fid not in all_fail_ids:
            raise ReportValidationError(
                f"'{fid}' is in failed_items but has no corresponding fail status"
            )

    # Cross-check: overall_status must match failed_items
    has_fails = len(failed) > 0
    if has_fails and report["overall_status"] != "fail":
        raise ReportValidationError(
            f"overall_status is '{report['overall_status']}' but there are {len(failed)} failed items"
        )
    if not has_fails and report["overall_status"] != "pass":
        raise ReportValidationError(
            f"overall_status is '{report['overall_status']}' but there are no failed items"
        )

    # Validate optional schema-constrained fields (keep in sync with report.schema.json)
    if "confidence" in report:
        if report["confidence"] not in ("low", "medium", "high"):
            raise ReportValidationError(
                f"'confidence' must be 'low', 'medium', or 'high', got '{report['confidence']}'"
            )
    if "media_count" in report:
        if not isinstance(report["media_count"], int) or report["media_count"] < 0:
            raise ReportValidationError(
                f"'media_count' must be a non-negative integer, got {report.get('media_count')!r}"
            )
