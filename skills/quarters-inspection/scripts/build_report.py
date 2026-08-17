"""Deterministic report builder for quarters inspection.

Given a validated pack + structured observations from VLM, produce a validated
inspection report with pass/fail per item, failed_items list, and overall_status.

No VLM calls — pure deterministic logic.

Usage:
    from build_report import build_report, render_report_markdown
    report = build_report(pack, observations, meta)
    markdown = render_report_markdown(report)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Import validators from sibling module
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from validate_pack import validate_pack
from validate_report import validate_report


def build_report(
    pack: Dict[str, Any],
    observations: Dict[str, Any],
    meta: Dict[str, Any],
) -> Dict[str, Any]:
    """Build a validated inspection report from a pack + VLM observations.

    Args:
        pack: Validated inspection pack dict (inventory + checklist).
        observations: VLM output with structure:
            {
                "inventory": [{"id": "bed", "observed": 2, "notes": "..."}, ...],
                "checklist": [{"id": "floors_clean", "status": "pass", "notes": "..."}, ...],
                "cleanliness_summary": "...",
                "site_condition_summary": "...",
            }
        meta: {"unit_id": "Block-A-12", "submitter": "telegram:12345", "media_count": 4}

    Returns:
        Validated report dict matching report.schema.json.
    """
    # Ensure pack is valid
    validate_pack(pack)

    pack_inv = {item["id"]: item for item in pack["inventory"]}
    pack_cl = {item["id"]: item for item in pack["checklist"]}

    # Safely build observation lookups — guard against malformed VLM output
    # (VLM may return non-dict items like ["bed", "mattress"] or [42])
    obs_inv: Dict[str, Dict[str, Any]] = {}
    for item in observations.get("inventory", []):
        if isinstance(item, dict) and "id" in item and isinstance(item["id"], str):
            obs_inv[item["id"]] = item
        else:
            logger.debug("Dropping malformed inventory observation: %r", item)

    obs_cl: Dict[str, Dict[str, Any]] = {}
    for item in observations.get("checklist", []):
        if isinstance(item, dict) and "id" in item and isinstance(item["id"], str):
            obs_cl[item["id"]] = item
        else:
            logger.debug("Dropping malformed checklist observation: %r", item)

    # Build inventory_results
    inventory_results: List[Dict[str, Any]] = []
    for inv_id, inv_item in pack_inv.items():
        expected = inv_item["expected_count"]
        obs = obs_inv.get(inv_id, {})
        observed = obs.get("observed", 0) if isinstance(obs, dict) else 0
        required = inv_item.get("required", True)
        if required:
            status = "pass" if observed >= expected else "fail"
        else:
            # Optional items: report status but never contribute to failed_items
            # Use expected as threshold so missing optional items are flagged as informational
            status = "pass" if observed >= expected else "fail"
        inventory_results.append({
            "id": inv_id,
            "label": inv_item.get("label", inv_id),
            "expected": expected,
            "observed": observed,
            "status": status,
            "notes": obs.get("notes", ""),
        })

    # Build checklist_results
    # Fail-closed policy: absent checklist items (VLM didn't assess them, e.g. blocked
    # camera angle) default to "fail". This is stricter than inventory handling but
    # ensures safety-critical checks (no mold, no exposed wiring) are never silently
    # skipped. Documented in SKILL.md and report-format.md.
    checklist_results: List[Dict[str, Any]] = []
    for cl_id, cl_item in pack_cl.items():
        obs = obs_cl.get(cl_id, {})
        if not isinstance(obs, dict):
            obs = {}
        status = obs.get("status", "fail")  # fail-closed: unassessed = fail
        if status not in ("pass", "fail"):
            status = "fail"  # sanitize invalid statuses
        checklist_results.append({
            "id": cl_id,
            "label": cl_item.get("label", cl_id),
            "status": status,
            "notes": obs.get("notes", ""),
        })

    # Derive failed_items — only from required inventory items + checklist items
    # Optional inventory items that fail are reported but don't contribute to overall_status
    failed_items: List[str] = []
    for item in inventory_results:
        if item["status"] == "fail":
            # Only required items contribute to failed_items / overall_status
            pack_item = pack_inv.get(item["id"], {})
            if pack_item.get("required", True):
                failed_items.append(item["id"])
    for item in checklist_results:
        if item["status"] == "fail":
            failed_items.append(item["id"])

    overall_status = "fail" if failed_items else "pass"

    report: Dict[str, Any] = {
        "pack_id": pack["id"],
        "site_id": pack.get("site_id", ""),
        "unit_id": meta.get("unit_id", ""),
        "inspected_at": meta.get("inspected_at", datetime.now(timezone.utc).isoformat()),
        "submitter": meta.get("submitter", ""),
        "media_count": meta.get("media_count", 0),
        "inventory_results": inventory_results,
        "checklist_results": checklist_results,
        "cleanliness_summary": observations.get("cleanliness_summary", ""),
        "site_condition_summary": observations.get("site_condition_summary", ""),
        "failed_items": failed_items,
        "overall_status": overall_status,
        "confidence": observations.get("confidence", "medium"),
        "model_notes": observations.get("model_notes", "VLM assessment; counts approximate"),
    }

    # Validate the report before returning
    validate_report(report)
    return report


def render_report_markdown(report: Dict[str, Any]) -> str:
    """Render a report dict as a markdown string."""
    lines: List[str] = []
    status_emoji = "✅" if report["overall_status"] == "pass" else "❌"
    lines.append(f"# Inspection Report — {report['unit_id']}")
    lines.append("")
    lines.append(f"**Overall Status:** {status_emoji} {report['overall_status'].upper()}")
    lines.append(f"**Pack:** {report['pack_id']}")
    lines.append(f"**Inspected:** {report['inspected_at']}")
    lines.append(f"**Submitter:** {report['submitter']}")
    if report.get("media_count"):
        lines.append(f"**Photos:** {report['media_count']}")
    lines.append("")

    # Failed items
    if report["failed_items"]:
        lines.append("## Failed Items")
        for fid in report["failed_items"]:
            lines.append(f"- ❌ {fid}")
        lines.append("")
    else:
        lines.append("## Failed Items")
        lines.append("No failed items. ✅")
        lines.append("")

    # Inventory results
    lines.append("## Inventory Results")
    lines.append("| Item | Expected | Observed | Status |")
    lines.append("|------|----------|----------|--------|")
    for item in report["inventory_results"]:
        emoji = "✅" if item["status"] == "pass" else "❌"
        lines.append(f"| {item.get('label', item['id'])} | {item['expected']} | {item['observed']} | {emoji} {item['status']} |")
    lines.append("")

    # Checklist results
    lines.append("## Checklist Results")
    lines.append("| Check | Status | Notes |")
    lines.append("|-------|--------|-------|")
    for item in report["checklist_results"]:
        emoji = "✅" if item["status"] == "pass" else "❌"
        notes = item.get("notes", "")
        lines.append(f"| {item.get('label', item['id'])} | {emoji} {item['status']} | {notes} |")
    lines.append("")

    # Summaries
    if report.get("cleanliness_summary"):
        lines.append("## Cleanliness Summary")
        lines.append(report["cleanliness_summary"])
        lines.append("")
    if report.get("site_condition_summary"):
        lines.append("## Site Condition Summary")
        lines.append(report["site_condition_summary"])
        lines.append("")

    if report.get("model_notes"):
        lines.append(f"_Model notes: {report['model_notes']}_")

    return "\n".join(lines)
