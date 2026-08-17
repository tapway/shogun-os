#!/usr/bin/env python3
"""
work_order_tracking.py — Work order lifecycle from release to completion:
WIP reporting, backlog analysis, and on-time delivery rate.

Consolidates 4 scripts (wo-list, wo-create, wo-otd, wo-backlog) into one
file with subcommands.

Usage:
    python work_order_tracking.py create --product PROD-A --quantity 100 --due 2026-01-10
    python work_order_tracking.py list --status in_progress [--plant plant-01] [--limit 20]
    python work_order_tracking.py backlog --days 7 [--sort due_date]
    python work_order_tracking.py otd --from 2026-01-01 --to 2026-01-31
    python work_order_tracking.py --help

Environment:
    WO_ERP_ADAPTER, WO_DATA_PATH, WO_DEFAULT_PLANT,
    WO_OTD_TARGET, WO_BACKLOG_WARNING_DAYS

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
WO_ERP_ADAPTER = os.environ.get("WO_ERP_ADAPTER", "manual")
WO_DATA_PATH = os.environ.get("WO_DATA_PATH", "./data/work-orders/")
WO_DEFAULT_PLANT = os.environ.get("WO_DEFAULT_PLANT", "plant-01")
WO_OTD_TARGET = float(os.environ.get("WO_OTD_TARGET", "95"))
WO_BACKLOG_WARNING_DAYS = int(os.environ.get("WO_BACKLOG_WARNING_DAYS", "3"))

WO_STATUSES = ["released", "in_progress", "hold", "completed", "closed"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _gen_wo_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"WO-{ts}"


# ── Subcommand: create ──────────────────────────────────────────────────
def cmd_create(args) -> dict:
    """Create new work order with product, quantity, due date, and routing."""
    wo_id = _gen_wo_id()
    plant = args.plant or WO_DEFAULT_PLANT

    wo = {
        "wo_id": wo_id,
        "product": args.product,
        "quantity": int(args.quantity),
        "due_date": args.due,
        "plant": plant,
        "line": args.line,
        "status": "released",
        "released_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "priority": args.priority or "normal",
        "routing": [],
        "material_requirements": [],
        "operations": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "erp_adapter": WO_ERP_ADAPTER,
    }
    return _ok(wo)


# ── Subcommand: list ────────────────────────────────────────────────────
def cmd_list(args) -> dict:
    """List and filter work orders by status, plant, and date range."""
    status = args.status
    plant = args.plant
    limit = int(args.limit)

    listing = {
        "filter": {"status": status, "plant": plant, "limit": limit},
        "work_orders": [],
        "total_count": 0,
        "status_breakdown": {s: 0 for s in WO_STATUSES},
        "plant_breakdown": {},
        "erp_adapter": WO_ERP_ADAPTER,
        "data_path": WO_DATA_PATH,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(listing)


# ── Subcommand: backlog ─────────────────────────────────────────────────
def cmd_backlog(args) -> dict:
    """Identify backlogged orders with aging analysis and escalation."""
    days = int(args.days)
    sort_by = args.sort or "due_date"

    backlog = {
        "filter": {"days": days, "sort": sort_by},
        "backlogged_orders": [],
        "warning_threshold_days": WO_BACKLOG_WARNING_DAYS,
        "summary": {
            "total_backlogged": 0,
            "past_due": 0,
            "critical_past_due": 0,
            "oldest_days_past_due": 0,
            "by_status": {s: 0 for s in WO_STATUSES},
            "by_plant": {},
        },
        "escalation_recommendations": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(backlog)


# ── Subcommand: otd ─────────────────────────────────────────────────────
def cmd_otd(args) -> dict:
    """Calculate on-time delivery rate over a date range with trend."""
    date_from = args.date_from
    date_to = args.date_to

    otd = {
        "filter": {"from": date_from, "to": date_to},
        "target_rate": WO_OTD_TARGET,
        "on_time_count": 0,
        "late_count": 0,
        "total_completed": 0,
        "on_time_rate": 0.0,
        "meets_target": False,
        "average_late_days": 0.0,
        "trend": [],
        "by_plant": {},
        "by_product": {},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return _ok(otd)


# ── CLI ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Work order tracking: create, list, backlog, on-time delivery."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # create
    p_create = sub.add_parser("create", help="Create a new work order")
    p_create.add_argument("--product", required=True, help="Product ID")
    p_create.add_argument("--quantity", required=True, help="Order quantity")
    p_create.add_argument("--due", required=True, help="Due date (YYYY-MM-DD)")
    p_create.add_argument("--plant", default=None, help="Plant ID")
    p_create.add_argument("--line", default=None, help="Production line ID")
    p_create.add_argument("--priority", default=None, help="Priority (low, normal, high, urgent)")

    # list
    p_list = sub.add_parser("list", help="List work orders")
    p_list.add_argument("--status", default=None, help="Filter by status (released, in_progress, hold, completed, closed)")
    p_list.add_argument("--plant", default=None, help="Filter by plant ID")
    p_list.add_argument("--limit", default="20", help="Max results")

    # backlog
    p_backlog = sub.add_parser("backlog", help="Backlog report with aging")
    p_backlog.add_argument("--days", default="7", help="Days window")
    p_backlog.add_argument("--sort", default="due_date", help="Sort field (due_date, days_past_due, priority)")

    # otd
    p_otd = sub.add_parser("otd", help="On-time delivery rate")
    p_otd.add_argument("--from", dest="date_from", required=True, help="Start date (YYYY-MM-DD)")
    p_otd.add_argument("--to", dest="date_to", required=True, help="End date (YYYY-MM-DD)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "create": cmd_create,
        "list": cmd_list,
        "backlog": cmd_backlog,
        "otd": cmd_otd,
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