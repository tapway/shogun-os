#!/usr/bin/env python3
"""
production_oee.py — Overall Equipment Effectiveness calculation, daily OEE
reports with trend analysis, and top loss identification.

Consolidates 3 scripts (calculate-oee, generate-oee-report, top-losses) into
one file with subcommands.

Usage:
    python production_oee.py calculate --shift morning --date 2026-01-15
    python production_oee.py report --date 2026-01-15 [--plant plant-01] [--line line-01]
    python production_oee.py top-losses --date 2026-01-15 [--limit 5]
    python production_oee.py --help

Environment:
    OEE_TARGET, OEE_DATA_SOURCE, OEE_DATA_PATH, OEE_REPORT_PATH,
    OEE_SHIFT_CALENDAR, OEE_PLANT_IDS

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
OEE_TARGET = float(os.environ.get("OEE_TARGET", "85"))
OEE_DATA_SOURCE = os.environ.get("OEE_DATA_SOURCE", "csv")
OEE_DATA_PATH = os.environ.get("OEE_DATA_PATH", "./data/oee/")
OEE_REPORT_PATH = os.environ.get("OEE_REPORT_PATH", "./reports/oee/")
OEE_SHIFT_CALENDAR = os.environ.get("OEE_SHIFT_CALENDAR", "./config/shifts.yaml")
OEE_PLANT_IDS = os.environ.get("OEE_PLANT_IDS", "plant-01").split(",")

LOSS_CATEGORIES = ["breakdown", "setup", "idling", "speed_loss", "defects"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


# ── Subcommand: calculate ───────────────────────────────────────────────
def cmd_calculate(args) -> dict:
    """Calculate OEE for a shift: Availability × Performance × Quality."""
    shift = args.shift
    date = args.date
    plant = args.plant or OEE_PLANT_IDS[0]

    # Empty-data-safe placeholders (production reads from OEE_DATA_SOURCE)
    calc = {
        "filter": {"shift": shift, "date": date, "plant": plant},
        "components": {
            "availability": {
                "planned_production_time_min": 0.0,
                "run_time_min": 0.0,
                "downtime_min": 0.0,
                "rate": 0.0,
            },
            "performance": {
                "ideal_cycle_time_sec": 0.0,
                "total_count": 0,
                "run_time_min": 0.0,
                "rate": 0.0,
            },
            "quality": {
                "total_count": 0,
                "good_count": 0,
                "defect_count": 0,
                "rate": 0.0,
            },
        },
        "oee": 0.0,
        "target": OEE_TARGET,
        "meets_target": False,
        "data_source": OEE_DATA_SOURCE,
        "data_path": OEE_DATA_PATH,
        "shift_calendar": OEE_SHIFT_CALENDAR,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(calc)


# ── Subcommand: report ──────────────────────────────────────────────────
def cmd_report(args) -> dict:
    """Generate OEE report with charts for availability, performance, quality, trend."""
    date = args.date
    plant = args.plant or OEE_PLANT_IDS[0]
    line = args.line

    report = {
        "filter": {"date": date, "plant": plant, "line": line},
        "daily_oee": {
            "availability": 0.0,
            "performance": 0.0,
            "quality": 0.0,
            "oee": 0.0,
            "target": OEE_TARGET,
            "gap_to_target": OEE_TARGET,
            "meets_target": False,
        },
        "by_shift": [],
        "by_line": [],
        "trend": [],
        "loss_summary": {cat: {"minutes": 0.0, "percentage": 0.0} for cat in LOSS_CATEGORIES},
        "report_path": OEE_REPORT_PATH,
        "data_source": OEE_DATA_SOURCE,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(report)


# ── Subcommand: top-losses ─────────────────────────────────────────────
def cmd_top_losses(args) -> dict:
    """Identify top loss categories (breakdown, setup, idling, speed loss, defects)."""
    date = args.date
    limit = int(args.limit)

    top = {
        "filter": {"date": date, "limit": limit},
        "top_losses": [],
        "loss_categories": {
            cat: {
                "minutes_lost": 0.0,
                "percentage_of_total": 0.0,
                "events": 0,
                "top_reason": None,
            }
            for cat in LOSS_CATEGORIES
        },
        "pareto": [],
        "cumulative": [],
        "summary": {
            "total_loss_minutes": 0.0,
            "vital_few_count": 0,
            "vital_few_pct": 0.0,
            "top_loss_category": None,
        },
        "data_source": OEE_DATA_SOURCE,
        "data_path": OEE_DATA_PATH,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(top)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Production OEE: calculate, report, top-losses."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # calculate
    p_calc = sub.add_parser("calculate", help="Calculate OEE for a shift")
    p_calc.add_argument("--shift", required=True, help="Shift ID (morning, afternoon, night)")
    p_calc.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_calc.add_argument("--plant", default=None, help="Plant ID")

    # report
    p_report = sub.add_parser("report", help="Generate daily OEE report")
    p_report.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_report.add_argument("--plant", default=None, help="Plant ID")
    p_report.add_argument("--line", default=None, help="Production line ID")

    # top-losses
    p_losses = sub.add_parser("top-losses", help="Identify top OEE loss categories")
    p_losses.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_losses.add_argument("--limit", default="5", help="Number of top losses to show")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "calculate": cmd_calculate,
        "report": cmd_report,
        "top-losses": cmd_top_losses,
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