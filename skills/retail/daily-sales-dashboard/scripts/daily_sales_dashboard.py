#!/usr/bin/env python3
"""
daily_sales_dashboard.py — Multi-platform daily sales consolidation with GP%,
top sellers, channel breakdown, and day-over-day comparisons.

Usage:
    python daily_sales_dashboard.py generate --date YYYY-MM-DD [--sku-match]
    python daily_sales_dashboard.py deliver <date-spec> <channel> [--slack-channel CHANNEL]
    python daily_sales_dashboard.py --help

Environment:
    SALES_SHOPEE_API_KEY, SALES_LAZADA_API_KEY, SALES_TIKTOK_API_KEY,
    SALES_WEBSITE_DB_URL, SALES_MASTER_STORE_PATH,
    SALES_CURRENCY, SALES_SLACK_TOKEN, SALES_TELEGRAM_BOT_TOKEN

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
from datetime import datetime, timedelta, timezone
from typing import Any


# ── Config ─────────────────────────────────────────────────────────────
DEFAULT_CURRENCY = os.environ.get("SALES_CURRENCY", "MYR")
DEFAULT_MASTER_STORE = os.environ.get("SALES_MASTER_STORE_PATH", "")
DEFAULT_CHANNELS = ["shopee", "lazada", "tiktok", "website"]


def _ok(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def _err(msg: str) -> dict:
    return {"success": False, "data": None, "error": msg}


def _parse_date(date_spec: str) -> str:
    """Parse date specification (yesterday, today, or YYYY-MM-DD)."""
    if date_spec == "yesterday":
        return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_spec == "today":
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    else:
        # Validate YYYY-MM-DD format
        try:
            datetime.strptime(date_spec, "%Y-%m-%d")
            return date_spec
        except ValueError:
            raise ValueError(f"Invalid date format: {date_spec}. Use YYYY-MM-DD, 'yesterday', or 'today'")


# ── Subcommand: generate ───────────────────────────────────────────────
def cmd_generate(args) -> dict:
    """Generate daily sales dashboard with multi-platform consolidation."""
    date = args.date
    sku_match = args.sku_match

    # In production, queries Shopee/Lazada/TikTok APIs + Website DB
    # Merges by SKU, computes GP% from cost data in master store
    
    result = {
        "date": date,
        "currency": DEFAULT_CURRENCY,
        "summary": {
            "revenue": 0.0,
            "units": 0,
            "orders": 0,
            "gross_profit_pct": 0.0,
            "dod_revenue_change_pct": 0.0,
            "dod_units_change_pct": 0.0,
        },
        "channel_breakdown": [],
        "top_sellers": [],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return _ok(result)


# ── Subcommand: deliver ────────────────────────────────────────────────
def cmd_deliver(args) -> dict:
    """Deliver daily sales report to Slack or Telegram."""
    date_spec = args.date_spec
    channel = args.channel
    slack_channel = args.slack_channel

    try:
        date = _parse_date(date_spec)
    except ValueError as e:
        return _err(str(e))

    # Generate the dashboard first
    gen_result = cmd_generate(argparse.Namespace(date=date, sku_match=False))
    if not gen_result["success"]:
        return gen_result

    data = gen_result["data"]
    
    # Format the message
    summary = data["summary"]
    dod_sign = "+" if summary["dod_revenue_change_pct"] >= 0 else ""
    
    message = f"""📊 *Daily Sales Report — {date}*

💰 *Revenue:* {DEFAULT_CURRENCY} {summary['revenue']:,.0f}
📦 *Units:* {summary['units']:,} | 🛒 *Orders:* {summary['orders']:,}
📈 *GP%:* {summary['gross_profit_pct']:.1f}%
📊 *DoD:* {dod_sign}{summary['dod_revenue_change_pct']:.1f}%

*Top Seller:* {data['top_sellers'][0]['sku'] if data['top_sellers'] else 'N/A'} 
  ({data['top_sellers'][0]['units'] if data['top_sellers'] else 0} units, {DEFAULT_CURRENCY} {data['top_sellers'][0]['revenue'] if data['top_sellers'] else 0:,.0f})

*Channel Mix:*
{chr(10).join(f"  • {ch['channel'].title()}: {ch['revenue_pct']:.1f}%" for ch in data['channel_breakdown']) if data['channel_breakdown'] else '  • No data'}
"""

    # In production, sends to Slack/Telegram via API
    delivery = {
        "date": date,
        "channel_type": channel,
        "destination": slack_channel if channel == "slack" else "default",
        "message_preview": message[:200] + "...",
        "delivered_at": datetime.now(timezone.utc).isoformat(),
        "status": "simulated" if channel not in ["slack", "telegram"] else "pending",
    }

    return _ok({"delivery": delivery, "report": data})


# ── CLI ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Daily sales dashboard: multi-platform consolidation, GP%, top sellers, DoD comparisons."
    )
    sub = parser.add_subparsers(dest="command", help="Operation to perform")

    # generate
    p_gen = sub.add_parser("generate", help="Generate daily sales dashboard")
    p_gen.add_argument("--date", required=True, help="Date (YYYY-MM-DD)")
    p_gen.add_argument("--sku-match", action="store_true", help="Enable strict SKU matching across platforms")

    # deliver
    p_del = sub.add_parser("deliver", help="Deliver report to Slack or Telegram")
    p_del.add_argument("date_spec", help="Date spec (yesterday, today, or YYYY-MM-DD)")
    p_del.add_argument("channel", choices=["slack", "telegram"], help="Delivery channel")
    p_del.add_argument("--slack-channel", default="#retail-daily", help="Slack channel (default: #retail-daily)")

    args = parser.parse_args()

    if args.command == "generate":
        result = cmd_generate(args)
    elif args.command == "deliver":
        result = cmd_deliver(args)
    else:
        parser.print_help()
        sys.exit(0)

    print(json.dumps(result, indent=2))
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
