#!/usr/bin/env python3
"""
hse_incident.py — Health, Safety, and Environment incident management:
report incidents, safety metrics dashboards, investigation workflow,
and regulatory report generation.

Consolidates 4 scripts (hse-report, hse-investigate, hse-dashboard,
hse-metrics) into one file with subcommands.

Usage:
    python hse_incident.py log --type near_miss --description "Slippery floor near line 3"
        --location "Plant A, Line 3" --reporter "John Doe"
    python hse_incident.py metrics --from 2026-01-01 --to 2026-01-31 [--plant plant-01]
    python hse_incident.py report --incident-id INC-2026-001 [--format osha]
    python hse_incident.py investigate INC-2026-001 --root-cause "Inadequate training"
    python hse_incident.py --help

Environment:
    HSE_DATA_PATH, HSE_REPORTING_HOURS, HSE_LTI_BASE_HOURS,
    HSE_AUTO_ESCALATE_DAYS, HSE_ESCALATION_CONTACTS, HSE_REGULATORY_BODY

Note: Interface contract — returns empty-safe structure.
Wire to live data source in production.

Returns:
    {"success": bool, "data": any, "error": str|None}
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

# ── Config ─────────────────────────────────────────────────────────────
HSE_DATA_PATH = os.environ.get("HSE_DATA_PATH", "./data/hse/")
HSE_REPORTING_HOURS = int(os.environ.get("HSE_REPORTING_HOURS", "24"))
HSE_LTI_BASE_HOURS = int(os.environ.get("HSE_LTI_BASE_HOURS", "200000"))
HSE_AUTO_ESCALATE_DAYS = int(os.environ.get("HSE_AUTO_ESCALATE_DAYS", "7"))
HSE_ESCALATION_CONTACTS = os.environ.get("HSE_ESCALATION_CONTACTS", "hse_manager,plant_manager,regional_hse").split(",")
HSE_REGULATORY_BODY = os.environ.get("HSE_REGULATORY_BODY", "OSHA")

INCIDENT_TYPES = ["near_miss", "first_aid", "medical_treatment", "restricted_work", "lti", "fatality", "environmental", "property_damage"]
SEVERITIES = ["low", "medium", "high", "critical"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _gen_incident_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"INC-{ts}"


# ── Subcommand: log ─────────────────────────────────────────────────────
def cmd_log(args) -> dict:
    """Report new incidents with type, severity, location, and description."""
    inc_type = args.type.lower()
    if inc_type not in INCIDENT_TYPES:
        return _err(f"Invalid type '{args.type}'. Must be one of: {', '.join(INCIDENT_TYPES)}")

    incident_id = _gen_incident_id()
    # Default severity by type
    default_severity = {
        "near_miss": "low", "first_aid": "low", "medical_treatment": "medium",
        "restricted_work": "medium", "lti": "high", "fatality": "critical",
        "environmental": "medium", "property_damage": "medium",
    }.get(inc_type, "medium")

    incident = {
        "incident_id": incident_id,
        "type": inc_type,
        "severity": args.severity or default_severity,
        "description": args.description,
        "location": args.location,
        "reporter": args.reporter,
        "plant": args.plant,
        "status": "reported",
        "lifecycle": ["reported"],
        "regulatory_body": HSE_REGULATORY_BODY,
        "reporting_deadline_hours": HSE_REPORTING_HOURS,
        "reportable": inc_type in ("medical_treatment", "restricted_work", "lti", "fatality", "environmental"),
        "investigation_required": inc_type in ("lti", "fatality", "environmental", "property_damage"),
        "immediate_actions": [],
        "corrective_actions": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_path": HSE_DATA_PATH,
    }
    return _ok(incident)


# ── Subcommand: metrics ─────────────────────────────────────────────────
def cmd_metrics(args) -> dict:
    """Calculate and report HSE KPIs by period and plant."""
    date_from = args.date_from
    date_to = args.date_to
    plant = args.plant

    metrics = {
        "filter": {"from": date_from, "to": date_to, "plant": plant},
        "lagging_indicators": {
            "trir": 0.0,
            "ltif": 0.0,
            "lti_base_hours": HSE_LTI_BASE_HOURS,
            "total_recordable": 0,
            "lti_count": 0,
            "first_aid_count": 0,
            "near_miss_count": 0,
            "fatality_count": 0,
            "total_hours_worked": 0,
        },
        "leading_indicators": {
            "near_miss_reporting_rate": 0.0,
            "safety_training_completion_pct": 0.0,
            "safety_observation_count": 0,
            "hazard_closure_rate": 0.0,
        },
        "by_type": {t: 0 for t in INCIDENT_TYPES},
        "by_severity": {s: 0 for s in SEVERITIES},
        "trend": [],
        "regulatory_body": HSE_REGULATORY_BODY,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(metrics)


# ── Subcommand: report ─────────────────────────────────────────────────
def cmd_report(args) -> dict:
    """Generate regulatory or internal incident report."""
    incident_id = args.incident_id
    fmt = args.format

    report = {
        "incident_id": incident_id,
        "format": fmt,
        "regulatory_body": HSE_REGULATORY_BODY,
        "reporting_hours_deadline": HSE_REPORTING_HOURS,
        "reportable": False,
        "submitted": False,
        "submission_deadline": None,
        "sections": {
            "incident_details": None,
            "immediate_causes": [],
            "root_cause": None,
            "corrective_actions": [],
            "preventive_actions": [],
            "regulatory_references": [],
        },
        "attachments": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(report)


# ── Subcommand: investigate ────────────────────────────────────────────
def cmd_investigate(args) -> dict:
    """Investigation workflow with root cause, corrective actions, and closure."""
    investigation = {
        "incident_id": args.incident_id,
        "root_cause": args.root_cause,
        "method": "5_whys",
        "status": "investigation_complete",
        "lifecycle": ["reported", "investigated"],
        "escalation_days": HSE_AUTO_ESCALATE_DAYS,
        "escalation_contacts": HSE_ESCALATION_CONTACTS,
        "immediate_causes": [],
        "contributing_factors": [],
        "corrective_actions": [],
        "preventive_actions": [],
        "investigator": None,
        "closure_required": True,
        "closed": False,
        "investigated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(investigation)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="HSE incident management: log, metrics, report, investigate."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # log
    p_log = sub.add_parser("log", help="Report a new incident")
    p_log.add_argument("--type", required=True, help="Incident type (near_miss, first_aid, medical_treatment, restricted_work, lti, fatality, environmental, property_damage)")
    p_log.add_argument("--description", required=True, help="Incident description")
    p_log.add_argument("--location", required=True, help="Incident location")
    p_log.add_argument("--reporter", required=True, help="Reporter name/ID")
    p_log.add_argument("--plant", default=None, help="Plant ID")
    p_log.add_argument("--severity", default=None, help="Override severity (low, medium, high, critical)")

    # metrics
    p_metrics = sub.add_parser("metrics", help="HSE KPI metrics")
    p_metrics.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_metrics.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")
    p_metrics.add_argument("--plant", default=None, help="Filter by plant ID")

    # report
    p_report = sub.add_parser("report", help="Generate incident report")
    p_report.add_argument("--incident-id", required=True, help="Incident ID")
    p_report.add_argument("--format", default="osha", help="Report format (osha, internal, summary)")

    # investigate
    p_inv = sub.add_parser("investigate", help="Investigate an incident")
    p_inv.add_argument("incident_id", help="Incident ID")
    p_inv.add_argument("--root-cause", required=True, help="Root cause summary")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "log": cmd_log,
        "metrics": cmd_metrics,
        "report": cmd_report,
        "investigate": cmd_investigate,
    }

    handler = dispatch_map.get(args.command)
    if not handler:
        print(json.dumps(_err(f"Unknown command: {args.command}")))
        sys.exit(1)

    result = handler(args)
    print(json.dumps(result, indent=2, default=str))
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
