#!/usr/bin/env python3
"""
store_sales_dashboard.py — Daily sales by store, hourly trends, staff performance,
and sales vs budget variance analysis.

Consolidates 4 scripts (generate-dashboard, hourly-trends, budget-variance,
staff-performance) into one file with subcommands.

Usage:
    python store_sales_dashboard.py dashboard --date YYYY-MM-DD [--store STORE_ID] [--region REGION]
    python store_sales_dashboard.py hourly --date YYYY-MM-DD [--store STORE_ID]
    python store_sales_dashboard.py budget-variance --period monthly --date YYYY-MM [--store STORE_ID]
    python store_sales_dashboard.py staff-perf --date YYYY-MM-DD [--store STORE_ID]
    python store_sales_dashboard.py --help

Environment:
    SALES_DB_URL, SALES_DASHBOARD_PORT, SALES_REFRESH_INTERVAL,
    SALES_BUDGET_FILE, SALES_STORE_IDS, SALES_CURRENCY, SALES_REPORT_PATH

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
DEFAULT_CURRENCY = os.environ.get("SALES_CURRENCY", "MYR")
DEFAULT_STORE_IDS = os.environ.get("SALES_STORE_IDS", "store-01,store-02").split(",")
DEFAULT_REFRESH = int(os.environ.get("SALES_REFRESH_INTERVAL", "300"))


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}

def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


# ── Subcommand: dashboard ───────────────────────────────────────────────
def cmd_dashboard(args) -> dict:
    """Generate daily dashboard with sales metrics."""
    date = args.date
    store_id = args.store
    region = args.region

    result = {
        "date": date,
        "store_id": store_id or "all",
        "region": region or "all",
        "metrics": {
            "gross_sales": 0.0,
            "net_sales": 0.0,
            "discounts": 0.0,
            "returns": 0.0,
            "customer_count": 0,
            "avg_basket_size": 0.0,
            "conversion_rate": 0.0,
        },
        "currency": DEFAULT_CURRENCY,
        "data_freshness_mins": 5,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return _ok(result)


# ── Subcommand: hourly ─────────────────────────────────────────────────
def cmd_hourly(args) -> dict:
    """Generate hourly sales breakdown with comparison to prior periods."""
    date = args.date
    store_id = args.store

    result = {
        "date": date,
        "store_id": store_id or "all",
        "hourly_breakdown": [{"hour": h, "sales": 0.0, "transactions": 0} for h in range(24)],
        "peak_hour": None,
        "prior_period_comparison": {},
        "currency": DEFAULT_CURRENCY,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return _ok(result)


# ── Subcommand: budget-variance ────────────────────────────────────────
def cmd_budget_variance(args) -> dict:
    """Calculate sales vs budget variance with drill-down."""
    period = args.period
    date = args.date
    store_id = args.store

    result = {
        "period": period,
        "date": date,
        "store_id": store_id or "all",
        "budget": 0.0,
        "actual": 0.0,
        "variance": 0.0,
        "variance_pct": 0.0,
        "drilldown": {
            "by_department": [],
            "by_category": [],
        },
        "flagged_stores": [],
        "currency": DEFAULT_CURRENCY,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return _ok(result)


# ── Subcommand: staff-perf ────────────────────────────────────────────
def cmd_staff_perf(args) -> dict:
    """Per-staff sales metrics including total sales, transactions, basket size."""
    date = args.date
    store_id = args.store

    result = {
        "date": date,
        "store_id": store_id or "all",
        "staff_metrics": [],
        "top_performers": [],
        "avg_sales_per_staff": 0.0,
        "avg_basket_per_staff": 0.0,
        "currency": DEFAULT_CURRENCY,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return _ok(result)


# ── CLI ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Store sales dashboard: daily, hourly, budget variance, staff performance."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # dashboard
    p_dash = sub.add_parser("dashboard", help="Generate daily dashboard")
    p_dash.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_dash.add_argument("--store", default=None, help="Store ID")
    p_dash.add_argument("--region", default=None, help="Region")

    # hourly
    p_hr = sub.add_parser("hourly", help="Hourly sales trends")
    p_hr.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_hr.add_argument("--store", default=None, help="Store ID")

    # budget-variance
    p_bv = sub.add_parser("budget-variance", help="Sales vs budget variance")
    p_bv.add_argument("--period", default="monthly", help="Period (daily, weekly, monthly)")
    p_bv.add_argument("--date", required=True, help="Date (YYYY-MM-DD or YYYY-MM)")
    p_bv.add_argument("--store", default=None, help="Store ID")

    # staff-perf
    p_sp = sub.add_parser("staff-perf", help="Staff performance summary")
    p_sp.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_sp.add_argument("--store", default=None, help="Store ID")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch_map = {
        "dashboard": cmd_dashboard,
        "hourly": cmd_hourly,
        "budget-variance": cmd_budget_variance,
        "staff-perf": cmd_staff_perf,
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
