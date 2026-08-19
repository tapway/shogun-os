#!/usr/bin/env python3
"""
quality_capa.py — Corrective and Preventive Action lifecycle: create CAPAs,
5 Whys root cause analysis, effectiveness tracking, and dashboard.

Consolidates 4 scripts (capa-create, capa-5whys, capa-dashboard,
capa-effectiveness) into one file with subcommands.

Usage:
    python quality_capa.py create --source ncr --source-id NCR-001
        --severity major --description "Recurring dimension defect"
    python quality_capa.py 5whys CAPA-2026-0001 [--interactive]
    python quality_capa.py effectiveness CAPA-2026-0001 --status effective --verified-by QA_MGR
    python quality_capa.py dashboard [--aging] [--closure-rate] [--by-department]
    python quality_capa.py --help

Environment:
    CAPA_DATA_PATH, CAPA_AUTO_ESCALATE_DAYS, CAPA_ESCALATION_LEVELS,
    CAPA_EFFECTIVENESS_WAIT_DAYS, CAPA_CLOSURE_TARGET_DAYS,
    CAPA_5WHYS_TEMPLATE_PATH

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
CAPA_DATA_PATH = os.environ.get("CAPA_DATA_PATH", "./data/capa/")
CAPA_AUTO_ESCALATE_DAYS = int(os.environ.get("CAPA_AUTO_ESCALATE_DAYS", "21"))
CAPA_ESCALATION_LEVELS = os.environ.get("CAPA_ESCALATION_LEVELS", "quality_manager,plant_manager,quality_director").split(",")
CAPA_EFFECTIVENESS_WAIT_DAYS = int(os.environ.get("CAPA_EFFECTIVENESS_WAIT_DAYS", "90"))
CAPA_CLOSURE_TARGET_DAYS = int(os.environ.get("CAPA_CLOSURE_TARGET_DAYS", "60"))
CAPA_5WHYS_TEMPLATE_PATH = os.environ.get("CAPA_5WHYS_TEMPLATE_PATH", "./templates/5whys-template.md")

SEVERITIES = ["critical", "major", "minor", "observation"]
PHASES = ["open", "investigation", "action_plan", "implementation", "effectiveness_check", "closed"]
CLOSURE_TARGETS = {"critical": 14, "major": 30, "minor": 60, "observation": 90}


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _gen_capa_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"CAPA-{ts}"


# ── Subcommand: create ──────────────────────────────────────────────────
def cmd_create(args) -> dict:
    """Create CAPA with source linkage, severity, and initial investigation assignment."""
    severity = args.severity.lower()
    if severity not in SEVERITIES:
        return _err(f"Invalid severity '{args.severity}'. Must be one of: {', '.join(SEVERITIES)}")

    capa_id = _gen_capa_id()
    closure_target = CLOSURE_TARGETS.get(severity, CAPA_CLOSURE_TARGET_DAYS)

    capa = {
        "capa_id": capa_id,
        "source": args.source,
        "source_id": args.source_id,
        "severity": severity,
        "description": args.description,
        "phase": "open",
        "lifecycle": ["open"],
        "owner": None,
        "investigator": None,
        "action_plan": [],
        "root_cause": None,
        "effectiveness_check": None,
        "closure_target_days": closure_target,
        "due_date": None,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_path": CAPA_DATA_PATH,
    }
    return _ok(capa)


# ── Subcommand: 5whys ───────────────────────────────────────────────────
def cmd_5whys(args) -> dict:
    """Interactive 5 Whys analysis with guided questioning and root cause capture."""
    capa_id = args.capa_id

    whys = {
        "capa_id": capa_id,
        "method": "5_whys",
        "interactive": args.interactive,
        "template_path": CAPA_5WHYS_TEMPLATE_PATH,
        "problem_statement": None,
        "whys": [
            {"level": i, "question": None, "answer": None}
            for i in range(1, 6)
        ],
        "root_cause": None,
        "completed": False,
        "conducted_by": None,
        "conducted_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(whys)


# ── Subcommand: effectiveness ───────────────────────────────────────────
def cmd_effectiveness(args) -> dict:
    """Track effectiveness check results with pass/fail rate by action type."""
    capa_id = args.capa_id
    status = args.status.lower()
    valid_statuses = ["effective", "ineffective", "pending"]
    if status not in valid_statuses:
        return _err(f"Invalid status '{args.status}'. Must be one of: {', '.join(valid_statuses)}")

    effectiveness = {
        "capa_id": capa_id,
        "check_status": status,
        "verified_by": args.verified_by,
        "wait_period_days": CAPA_EFFECTIVENESS_WAIT_DAYS,
        "verification_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "sample_size": 0,
        "recurrence_detected": status == "ineffective",
        "follow_up_required": status == "ineffective",
        "next_steps": "Reopen CAPA for new action plan" if status == "ineffective" else "Close CAPA",
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(effectiveness)


# ── Subcommand: dashboard ───────────────────────────────────────────────
def cmd_dashboard(args) -> dict:
    """Dashboard showing aging distribution, closure rate by severity, and department performance."""
    dashboard = {
        "flags": {
            "aging": args.aging,
            "closure_rate": args.closure_rate,
            "by_department": args.by_department,
        },
        "phase_distribution": {p: 0 for p in PHASES},
        "severity_distribution": {s: 0 for s in SEVERITIES},
        "aging": {
            "buckets": {"0-14": 0, "15-30": 0, "31-60": 0, "61-90": 0, "90+": 0},
            "auto_escalate_days": CAPA_AUTO_ESCALATE_DAYS,
            "requires_escalation": 0,
        },
        "closure_rate": {
            "by_severity": {s: {"total": 0, "closed": 0, "rate": 0.0} for s in SEVERITIES},
            "overall_rate": 0.0,
            "target_days": CAPA_CLOSURE_TARGET_DAYS,
        },
        "by_department": {},
        "escalation_levels": CAPA_ESCALATION_LEVELS,
        "summary": {
            "total_capas": 0,
            "open_capas": 0,
            "closed_capas": 0,
            "overdue": 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(dashboard)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Quality CAPA: create, 5 Whys, effectiveness, dashboard."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # create
    p_create = sub.add_parser("create", help="Create a new CAPA")
    p_create.add_argument("--source", required=True, help="Source type (ncr, complaint, audit, incident)")
    p_create.add_argument("--source-id", required=True, help="Source record ID")
    p_create.add_argument("--severity", required=True, help="Severity (critical, major, minor, observation)")
    p_create.add_argument("--description", required=True, help="CAPA description")

    # 5whys
    p_5whys = sub.add_parser("5whys", help="Run 5 Whys root cause analysis")
    p_5whys.add_argument("capa_id", help="CAPA ID")
    p_5whys.add_argument("--interactive", action="store_true", help="Interactive mode")

    # effectiveness
    p_eff = sub.add_parser("effectiveness", help="Record effectiveness check")
    p_eff.add_argument("capa_id", help="CAPA ID")
    p_eff.add_argument("--status", required=True, help="Status (effective, ineffective, pending)")
    p_eff.add_argument("--verified-by", required=True, help="Verifier ID")

    # dashboard
    p_dash = sub.add_parser("dashboard", help="CAPA dashboard")
    p_dash.add_argument("--aging", action="store_true", help="Include aging breakdown")
    p_dash.add_argument("--closure-rate", action="store_true", help="Include closure rate")
    p_dash.add_argument("--by-department", action="store_true", help="Break down by department")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "create": cmd_create,
        "5whys": cmd_5whys,
        "effectiveness": cmd_effectiveness,
        "dashboard": cmd_dashboard,
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
