#!/usr/bin/env python3
"""
quality_ncr.py — Non-Conformance Report management: create NCRs, defect
Pareto analysis, aging reports, and closure rate tracking.

Consolidates 4 scripts (ncr-create, ncr-pareto, ncr-aging, ncr-closure-rate)
into one file with subcommands.

Usage:
    python quality_ncr.py create --product PROD-A --defect DIM-001 --quantity 5
        --disposition rework --source inspection
    python quality_ncr.py pareto --from 2026-01-01 --to 2026-01-31 [--plant plant-01]
    python quality_ncr.py aging --days-open 7 [--department dept_name]
    python quality_ncr.py closure-rate [--from 2026-01-01] [--to 2026-01-31]
    python quality_ncr.py --help

Environment:
    NCR_DATA_PATH, NCR_AUTO_ESCALATE_DAYS, NCR_ESCALATION_LEVELS,
    NCR_DEFECT_CODES_PATH, NCR_CLOSURE_TIMEOUT_DAYS

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
NCR_DATA_PATH = os.environ.get("NCR_DATA_PATH", "./data/ncr/")
NCR_AUTO_ESCALATE_DAYS = int(os.environ.get("NCR_AUTO_ESCALATE_DAYS", "14"))
NCR_ESCALATION_LEVELS = os.environ.get("NCR_ESCALATION_LEVELS", "supervisor,manager,director").split(",")
NCR_DEFECT_CODES_PATH = os.environ.get("NCR_DEFECT_CODES_PATH", "./config/defect-codes.yaml")
NCR_CLOSURE_TIMEOUT_DAYS = int(os.environ.get("NCR_CLOSURE_TIMEOUT_DAYS", "30"))

DISPOSITIONS = ["use-as-is", "rework", "scrap", "rtv"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _gen_ncr_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"NCR-{ts}"


# ── Subcommand: create ──────────────────────────────────────────────────
def cmd_create(args) -> dict:
    """Create NCR with defect details, disposition, and containment actions."""
    ncr_id = _gen_ncr_id()
    disposition = args.disposition
    if disposition not in DISPOSITIONS:
        return _err(f"Invalid disposition '{disposition}'. Must be one of: {', '.join(DISPOSITIONS)}")

    ncr = {
        "ncr_id": ncr_id,
        "product": args.product,
        "defect_code": args.defect,
        "quantity": int(args.quantity),
        "disposition": disposition,
        "source": args.source,
        "plant": args.plant,
        "status": "open",
        "lifecycle": ["identified"],
        "priority": args.priority or "normal",
        "containment_actions": [],
        "corrective_actions": [],
        "responsible": None,
        "due_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_path": NCR_DATA_PATH,
    }
    return _ok(ncr)


# ── Subcommand: pareto ──────────────────────────────────────────────────
def cmd_pareto(args) -> dict:
    """Generate Pareto chart by defect code, product, line, or shift."""
    date_from = args.date_from
    date_to = args.date_to
    plant = args.plant

    pareto = {
        "filter": {"from": date_from, "to": date_to, "plant": plant},
        "group_by": "defect_code",
        "defect_codes": [],
        "pareto": [],
        "cumulative_percentage": [],
        "summary": {
            "total_ncrs": 0,
            "total_defects": 0,
            "top_defect_code": None,
            "top_defect_count": 0,
            "vital_few_count": 0,
        },
        "defect_codes_path": NCR_DEFECT_CODES_PATH,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(pareto)


# ── Subcommand: aging ────────────────────────────────────────────────────
def cmd_aging(args) -> dict:
    """Age analysis showing NCRs grouped by days open, with escalation recommendations."""
    days_open = int(args.days_open)
    department = args.department

    aging = {
        "filter": {"days_open": days_open, "department": department},
        "buckets": {
            "0-7": [],
            "8-14": [],
            "15-30": [],
            "31-60": [],
            "60+": [],
        },
        "auto_escalate_days": NCR_AUTO_ESCALATE_DAYS,
        "closure_timeout_days": NCR_CLOSURE_TIMEOUT_DAYS,
        "escalation_levels": NCR_ESCALATION_LEVELS,
        "summary": {
            "total_open": 0,
            "past_closure_target": 0,
            "requires_escalation": 0,
            "oldest_days_open": 0,
            "average_days_open": 0.0,
        },
        "escalation_recommendations": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(aging)


# ── Subcommand: closure-rate ────────────────────────────────────────────
def cmd_closure_rate(args) -> dict:
    """Calculate closure rate by disposition type and average closure time by department."""
    date_from = args.date_from
    date_to = args.date_to

    closure = {
        "filter": {"from": date_from, "to": date_to},
        "closure_target_days": NCR_CLOSURE_TIMEOUT_DAYS,
        "by_disposition": {d: {"total": 0, "closed": 0, "rate": 0.0, "avg_days_to_close": 0.0} for d in DISPOSITIONS},
        "by_department": {},
        "summary": {
            "total_ncrs": 0,
            "total_closed": 0,
            "closure_rate": 0.0,
            "average_closure_days": 0.0,
            "meets_target": False,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(closure)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Quality NCR: create, pareto, aging, closure rate."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # create
    p_create = sub.add_parser("create", help="Create a new NCR")
    p_create.add_argument("--product", required=True, help="Product ID")
    p_create.add_argument("--defect", required=True, help="Defect code (e.g. DIM-001)")
    p_create.add_argument("--quantity", required=True, help="Defect quantity")
    p_create.add_argument("--disposition", required=True, help="Disposition (use-as-is, rework, scrap, rtv)")
    p_create.add_argument("--source", required=True, help="Detection source (inspection, process, customer)")
    p_create.add_argument("--plant", default=None, help="Plant ID")
    p_create.add_argument("--priority", default=None, help="Priority (low, normal, high)")

    # pareto
    p_pareto = sub.add_parser("pareto", help="Defect Pareto analysis")
    p_pareto.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_pareto.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")
    p_pareto.add_argument("--plant", default=None, help="Filter by plant ID")

    # aging
    p_aging = sub.add_parser("aging", help="NCR aging report")
    p_aging.add_argument("--days-open", default="7", help="Days open threshold")
    p_aging.add_argument("--department", default=None, help="Filter by department")

    # closure-rate
    p_closure = sub.add_parser("closure-rate", help="Closure rate report")
    p_closure.add_argument("--from", dest="date_from", default=None, help="Start date (YYYY-MM-DD)")
    p_closure.add_argument("--to", dest="date_to", default=None, help="End date (YYYY-MM-DD)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "create": cmd_create,
        "pareto": cmd_pareto,
        "aging": cmd_aging,
        "closure-rate": cmd_closure_rate,
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
