#!/usr/bin/env python3
"""
maintenance_downtime.py — Unplanned downtime event logging, Pareto analysis,
MTBF/MTTR metrics, and downtime cost estimation.

Consolidates 4 scripts (downtime-log, downtime-pareto, downtime-metrics,
downtime-cost) into one file with subcommands.

Usage:
    python maintenance_downtime.py log --equipment EQ-001 --reason mechanical_failure
        --start "2026-01-15 08:30" --end "2026-01-15 09:45" --shift morning --operator OPR-001
    python maintenance_downtime.py metrics --equipment EQ-001 --from 2026-01-01 --to 2026-01-31
    python maintenance_downtime.py cost --from 2026-01-01 --to 2026-01-31 [--plant plant-01]
    python maintenance_downtime.py pareto --from 2026-01-01 --to 2026-01-31 [--group-by equipment]
    python maintenance_downtime.py --help

Environment:
    DT_DATA_PATH, DT_COST_PER_HOUR, DT_PLANT_CURRENCY,
    DT_REASON_CODES_PATH, DT_AUTO_CLOSE_DAYS

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
DT_DATA_PATH = os.environ.get("DT_DATA_PATH", "./data/maintenance/downtime/")
DT_COST_PER_HOUR = float(os.environ.get("DT_COST_PER_HOUR", "1000"))
DT_PLANT_CURRENCY = os.environ.get("DT_PLANT_CURRENCY", "USD")
DT_REASON_CODES_PATH = os.environ.get("DT_REASON_CODES_PATH", "./config/downtime-reasons.yaml")
DT_AUTO_CLOSE_DAYS = int(os.environ.get("DT_AUTO_CLOSE_DAYS", "7"))

REASON_CATEGORIES = ["equipment", "process", "supply", "labor", "quality"]
GROUP_BY_OPTIONS = ["equipment", "reason", "shift", "operator"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _parse_duration_hours(start_str: str, end_str: str) -> float:
    """Parse 'YYYY-MM-DD HH:MM' start/end into duration hours. Returns 0.0 on error."""
    try:
        fmt = "%Y-%m-%d %H:%M"
        start = datetime.strptime(start_str, fmt)
        end = datetime.strptime(end_str, fmt)
        delta = (end - start).total_seconds()
        return max(0.0, delta / 3600.0)
    except (ValueError, TypeError):
        return 0.0


# ── Subcommand: log ─────────────────────────────────────────────────────
def cmd_log(args) -> dict:
    """Log downtime events with start/end time, equipment, reason, and shift."""
    duration_hours = _parse_duration_hours(args.start, args.end)
    estimated_cost = duration_hours * DT_COST_PER_HOUR

    event = {
        "equipment": args.equipment,
        "reason": args.reason,
        "start": args.start,
        "end": args.end,
        "duration_hours": round(duration_hours, 3),
        "shift": args.shift,
        "operator": args.operator,
        "plant": args.plant,
        "estimated_cost": round(estimated_cost, 2),
        "currency": DT_PLANT_CURRENCY,
        "status": "logged",
        "auto_close_days": DT_AUTO_CLOSE_DAYS,
        "reason_codes_path": DT_REASON_CODES_PATH,
        "logged_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(event)


# ── Subcommand: metrics ─────────────────────────────────────────────────
def cmd_metrics(args) -> dict:
    """Calculate MTBF, MTTR, and availability by equipment over a date range."""
    equipment = args.equipment
    date_from = args.date_from
    date_to = args.date_to

    metrics = {
        "filter": {
            "equipment": equipment,
            "from": date_from,
            "to": date_to,
        },
        "mtbf_hours": 0.0,
        "mttr_hours": 0.0,
        "availability": 0.0,
        "total_failures": 0,
        "total_repair_time_hours": 0.0,
        "total_operating_time_hours": 0.0,
        "planned_production_time_hours": 0.0,
        "downtime_events": [],
        "formulas": {
            "mtbf": "total_operating_time / number_of_failures",
            "mttr": "total_repair_time / number_of_repairs",
            "availability": "run_time / planned_production_time",
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(metrics)


# ── Subcommand: cost ────────────────────────────────────────────────────
def cmd_cost(args) -> dict:
    """Estimate downtime cost with breakdown by reason category."""
    date_from = args.date_from
    date_to = args.date_to
    plant = args.plant

    cost = {
        "filter": {"from": date_from, "to": date_to, "plant": plant},
        "cost_per_hour": DT_COST_PER_HOUR,
        "currency": DT_PLANT_CURRENCY,
        "total_downtime_hours": 0.0,
        "total_estimated_cost": 0.0,
        "by_reason_category": {cat: {"hours": 0.0, "cost": 0.0} for cat in REASON_CATEGORIES},
        "by_equipment": {},
        "by_shift": {},
        "summary": {
            "total_events": 0,
            "average_cost_per_event": 0.0,
            "highest_cost_equipment": None,
            "highest_cost_reason": None,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(cost)


# ── Subcommand: pareto ──────────────────────────────────────────────────
def cmd_pareto(args) -> dict:
    """Pareto analysis by equipment, reason, shift, or operator."""
    group_by = args.group_by
    if group_by not in GROUP_BY_OPTIONS:
        return _err(f"Invalid group-by '{group_by}'. Must be one of: {', '.join(GROUP_BY_OPTIONS)}")

    pareto = {
        "filter": {"from": args.date_from, "to": args.date_to, "group_by": group_by},
        "group_by": group_by,
        "pareto": [],
        "cumulative": [],
        "summary": {
            "total_events": 0,
            "total_downtime_hours": 0.0,
            "vital_few_count": 0,
            "vital_few_pct_of_total": 0.0,
            "top_contributor": None,
        },
        "reason_codes_path": DT_REASON_CODES_PATH,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(pareto)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Maintenance downtime: log, metrics, cost, pareto."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # log
    p_log = sub.add_parser("log", help="Log a downtime event")
    p_log.add_argument("--equipment", required=True, help="Equipment ID")
    p_log.add_argument("--reason", required=True, help="Reason code (e.g. mechanical_failure)")
    p_log.add_argument("--start", required=True, help="Start time (YYYY-MM-DD HH:MM)")
    p_log.add_argument("--end", required=True, help="End time (YYYY-MM-DD HH:MM)")
    p_log.add_argument("--shift", default=None, help="Shift (morning, afternoon, night)")
    p_log.add_argument("--operator", default=None, help="Operator ID")
    p_log.add_argument("--plant", default=None, help="Plant ID")

    # metrics
    p_metrics = sub.add_parser("metrics", help="MTBF/MTTR metrics")
    p_metrics.add_argument("--equipment", required=True, help="Equipment ID")
    p_metrics.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_metrics.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")

    # cost
    p_cost = sub.add_parser("cost", help="Downtime cost estimation")
    p_cost.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_cost.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")
    p_cost.add_argument("--plant", default=None, help="Filter by plant ID")

    # pareto
    p_pareto = sub.add_parser("pareto", help="Downtime Pareto analysis")
    p_pareto.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_pareto.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")
    p_pareto.add_argument("--group-by", default="equipment", help="Group by (equipment, reason, shift, operator)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "log": cmd_log,
        "metrics": cmd_metrics,
        "cost": cmd_cost,
        "pareto": cmd_pareto,
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