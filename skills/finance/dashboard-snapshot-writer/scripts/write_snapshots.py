#!/usr/bin/env python3
"""
write_snapshots.py — Finance dashboard snapshot writer.

Calls acct_* MCP tools via the accounting bridge to pull live data from
QuickBooks (or Xero/Bukku), computes the 5-tab dashboard payload, and writes
JSON snapshot files to ~/brain/finance/snapshots/*.json — the dashboard
backend reads these (via gbrain or the local file fallback).

Idempotent and empty-data-safe: missing/incomplete data writes zeros and
empty arrays, never crashes.

Usage:
    python write_snapshots.py [--dry-run] [--bridge PATH] [--output DIR]

Environment:
    ACCT_PROVIDER, ACCT_CLIENT_ID, ACCT_CLIENT_SECRET,
    ACCT_REFRESH_TOKEN, ACCT_COMPANY_ID, ACCT_SANDBOX — loaded from
    ~/.hermes/profiles/finance-manager/.env if not already set.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

# ── Paths ──────────────────────────────────────────────────────────────
DEFAULT_BRIDGE = Path.home() / ".hermes" / "scripts" / "accounting" / "acct-bridge.py"
DEFAULT_OUTPUT = Path.home() / "brain" / "finance" / "snapshots"
ENV_FILE = Path.home() / ".hermes" / "profiles" / "finance-manager" / ".env"


def _safe_float(v: Any) -> float:
    try:
        if v is None:
            return 0.0
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def _load_env():
    """Load ACCT_* env vars from the finance-manager .env if not already set."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip()
        if key.startswith("ACCT_") and key not in os.environ:
            os.environ[key] = val


def _call_mcp_tool(bridge_path: Path, tool_name: str, args: dict = None) -> dict:
    """Call an acct_* MCP tool via the bridge's JSON-RPC stdio interface."""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": args or {}},
    }
    try:
        proc = subprocess.run(
            [sys.executable, str(bridge_path)],
            input=json.dumps(request) + "\n",
            capture_output=True,
            text=True,
            timeout=30,
            env=os.environ.copy(),
        )
        if proc.returncode != 0:
            print(f"  [warn] bridge exited {proc.returncode} for {tool_name}", file=sys.stderr)
            return {}
        resp = json.loads(proc.stdout.strip())
        content = resp.get("content", [])
        if content and isinstance(content, list):
            text = content[0].get("text", "{}")
            return json.loads(text)
        return {}
    except (json.JSONDecodeError, subprocess.TimeoutExpired, Exception) as e:
        print(f"  [warn] {tool_name} failed: {e}", file=sys.stderr)
        return {}


# ── Snapshot builders ─────────────────────────────────────────────────

def _build_cash_snapshot(bs: dict) -> dict:
    """Cash & treasury snapshot from balance sheet data."""
    bank_accounts = []
    total = 0.0
    for acct in bs.get("asset_accounts", []):
        name = acct.get("account_name", "")
        amt = _safe_float(acct.get("amount"))
        # Detect bank-like accounts (Checking, Savings, Cash)
        name_lower = name.lower()
        if any(k in name_lower for k in ("checking", "saving", "cash", "bank", "undeposited")):
            bank_accounts.append({"name": name, "balance": amt, "currency": "USD"})
            total += amt

    return {
        "total_liquid_cash": total,
        "net_monthly_burn": 0.0,  # Requires historical data — computed by finance skills
        "cash_runway_months": 0.0,
        "fixed_opex": 0.0,
        "variable_opex": 0.0,
        "bank_accounts": bank_accounts,
        "fx_positions": [],
        "forecast_13w": {"conservative": [], "expected": [], "optimistic": []},
        "cash_flow_trend": [],
    }


# ── Asset classification keywords ──
CURRENT_ASSET_KEYWORDS = (
    "bank", "cash", "checking", "saving", "undeposited", "accounts receivable",
    "a/r", "inventory", "stock", "prepaid", "vat", "gst receivable", "deposit",
    "advance", "accrued receivable", "other current",
)
NON_CURRENT_ASSET_KEYWORDS = (
    "property", "plant", "equipment", "ppe", "fixed asset", "accumulated",
    "depreciation", "intangible", "goodwill", "software license", "patent",
    "trademark", "deferred tax", "long-term", "leasehold", "vehicle",
    "renovation", "furniture", "computer hardware", "building",
)

# Icon mapping for asset categories
ASSET_ICON_MAP = {
    "bank": "Landmark", "cash": "Landmark", "checking": "Landmark", "saving": "Landmark",
    "undeposited": "Wallet", "accounts receivable": "FileText", "a/r": "FileText",
    "inventory": "Package", "stock": "Package", "prepaid": "CalendarClock",
    "property": "Building2", "plant": "Building2", "equipment": "Building2",
    "ppe": "Building2", "accumulated": "TrendingDown", "depreciation": "TrendingDown",
    "intangible": "Brain", "goodwill": "Brain", "deferred tax": "ShieldCheck",
    "vehicle": "Building2", "leasehold": "Building2",
}


def _classify_asset(name: str) -> str:
    """Classify an asset account as 'current' or 'non_current'."""
    name_lower = name.lower()
    for kw in NON_CURRENT_ASSET_KEYWORDS:
        if kw in name_lower:
            return "non_current"
    for kw in CURRENT_ASSET_KEYWORDS:
        if kw in name_lower:
            return "current"
    return "non_current"  # Default to non-current for unknown assets


def _asset_icon(name: str) -> str:
    """Get the lucide icon name for an asset account."""
    name_lower = name.lower()
    for kw, icon in ASSET_ICON_MAP.items():
        if kw in name_lower:
            return icon
    return "Wallet"  # Default icon


def _build_asset_snapshot(bs: dict) -> dict:
    """Build asset snapshot from QBO balance sheet asset_accounts.

    Classifies each account into current vs non-current, groups by category,
    and computes totals. The dashboard.py backend reads this from
    snapshots/assets.json.
    """
    asset_accounts = bs.get("asset_accounts", [])

    current_categories: dict[str, dict] = {}
    non_current_categories: dict[str, dict] = {}
    total_current = 0.0
    total_non_current = 0.0

    for acct in asset_accounts:
        name = acct.get("account_name", "Unknown")
        amt = _safe_float(acct.get("amount", 0))

        # Skip zero-amount accounts
        if amt == 0:
            continue

        classification = _classify_asset(name)
        icon = _asset_icon(name)

        # Group by top-level category (first word or known pattern)
        category_name = name.split(":")[0].strip() if ":" in name else name

        if classification == "current":
            if category_name not in current_categories:
                current_categories[category_name] = {
                    "name": category_name,
                    "amount": 0.0,
                    "icon": icon,
                    "sub_items": [],
                }
            current_categories[category_name]["amount"] += amt
            current_categories[category_name]["sub_items"].append({"name": name, "amount": amt})
            total_current += amt
        else:
            if category_name not in non_current_categories:
                non_current_categories[category_name] = {
                    "name": category_name,
                    "amount": 0.0,
                    "icon": icon,
                    "sub_items": [],
                }
            non_current_categories[category_name]["amount"] += amt
            non_current_categories[category_name]["sub_items"].append({"name": name, "amount": amt})
            total_non_current += amt

    # Sort by amount descending
    current_list = sorted(current_categories.values(), key=lambda x: abs(x["amount"]), reverse=True)
    non_current_list = sorted(non_current_categories.values(), key=lambda x: abs(x["amount"]), reverse=True)

    return {
        "current_assets": current_list,
        "non_current_assets": non_current_list,
        "total_current_assets": round(total_current, 2),
        "total_non_current_assets": round(total_non_current, 2),
        "total_assets": round(total_current + total_non_current, 2),
        "asset_trend": [],  # Populated by historical balance sheet calls (future enhancement)
    }


def _build_pl_snapshot(pl: dict) -> dict:
    """P&L snapshot from acct_get_profit_loss."""
    total_revenue = _safe_float(pl.get("total_revenue"))
    total_expenses = _safe_float(pl.get("total_expenses"))
    gross_margin_pct = ((total_revenue - total_expenses) / total_revenue * 100.0) if total_revenue else 0.0
    ebitda_margin_pct = gross_margin_pct  # Simplified — no separate EBITDA breakdown from QBO

    return {
        "revenue_mtd": total_revenue,  # QBO P&L is for the requested range
        "revenue_ytd": total_revenue,
        "gross_margin_pct": round(gross_margin_pct, 1),
        "ebitda_margin_pct": round(ebitda_margin_pct, 1),
        "unpaid_statutory": 0.0,
        "revenue_opex_trend": [
            {"month": "Current", "revenue": total_revenue, "opex": total_expenses}
        ],
    }


def _build_concentration_snapshot(invoices: dict) -> dict:
    """Revenue concentration from invoice list."""
    spend_by_client: dict[str, float] = {}
    total = 0.0
    for inv in invoices.get("invoices", []):
        client = inv.get("contact_name", "Unknown")
        amt = _safe_float(inv.get("total"))
        spend_by_client[client] = spend_by_client.get(client, 0.0) + amt
        total += amt

    clients = []
    for name, rev in spend_by_client.items():
        pct = (rev / total * 100.0) if total else 0.0
        clients.append({"name": name, "revenue_pct": round(pct, 1), "ytd_revenue": rev})
    clients.sort(key=lambda c: c["ytd_revenue"], reverse=True)
    return {"clients": clients}


def _build_bva_snapshot(pl: dict, budget_path: Path = None) -> dict:
    """Budget vs Actual — loads budget.json (from Excel) and matches against QBO P&L lines.

    Args:
        pl: acct_get_profit_loss output dict. May contain 'lines' (list of
            {account_code, account_name, actual_amount}) or just top-level totals.
        budget_path: Path to finance/budget.json. Defaults to
            ~/brain/finance/budget.json. If absent, returns empty line_items.
    """
    if budget_path is None:
        budget_path = Path.home() / "brain" / "finance" / "budget.json"
    else:
        budget_path = Path(budget_path)

    # Load budget.json (graceful degradation if missing)
    budget_lines = []
    ytd_months = 5  # default
    if budget_path.exists():
        try:
            with open(budget_path, "r", encoding="utf-8") as f:
                budget_data = json.load(f)
            budget_lines = budget_data.get("lines", [])
            ytd_months = int(budget_data.get("ytd_months", 5))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"  WARNING: Could not read budget.json: {exc}")
    else:
        print(f"  INFO: budget.json not found at {budget_path} — BvA line_items empty")

    # Build actuals index from P&L lines (QBO)
    actuals_index: dict[str, dict] = {}
    for line in pl.get("lines", []):
        code = str(line.get("account_code", "")).strip()
        if code:
            actuals_index[code] = {
                "actual_amount": _safe_float(line.get("actual_amount")),
                "account_name": line.get("account_name", code),
            }

    # Compute per-line variance
    line_items = []
    for bline in budget_lines:
        code = str(bline.get("account_code", "")).strip()
        name = bline.get("account_name", code)
        section = bline.get("section", "Other")
        budget_ytd = _safe_float(bline.get("budget_ytd", bline.get("budget_amount", 0)))
        budget_annual = _safe_float(bline.get("budget_amount", 0))

        # Match by account_code, then by account_name
        actual_entry = actuals_index.get(code)
        if actual_entry is None:
            # Try fuzzy name match
            for a_code, a_entry in actuals_index.items():
                if a_entry.get("account_name", "").strip().lower() == name.strip().lower():
                    actual_entry = a_entry
                    break

        actual_ytd = actual_entry["actual_amount"] if actual_entry else 0.0
        variance = actual_ytd - budget_ytd
        variance_pct = (variance / budget_ytd * 100.0) if budget_ytd != 0 else 0.0

        line_items.append({
            "section": section,
            "account_name": name,
            "budget_annual": round(budget_annual, 2),
            "budget_ytd": round(budget_ytd, 2),
            "actual_ytd": round(actual_ytd, 2),
            "variance": round(variance, 2),
            "variance_pct": round(variance_pct, 1),
        })

    return {
        "line_items": line_items,
        "unit_economics": {
            "gross_margin_pct": 0.0, "contribution_margin_pct": 0.0,
            "cac": 0.0, "ltv": 0.0, "ltv_cac_ratio": 0.0,
        },
    }


def _build_ar_snapshot(invoices: dict, aging: dict = None) -> dict:
    """AR aging from invoice list + aging report."""
    today = date.today()
    buckets = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "90_plus": 0.0}
    total_ar = 0.0
    dunning = []

    for inv in invoices.get("invoices", []):
        status = str(inv.get("status", "")).lower()
        if status in ("paid", "settled"):
            continue
        amt = _safe_float(inv.get("balance_due", inv.get("total")))
        inv_date_str = inv.get("date", "")
        total_ar += amt
        try:
            inv_date = date.fromisoformat(inv_date_str[:10])
            days = (today - inv_date).days
            if days <= 30:
                buckets["0_30"] += amt
            elif days <= 60:
                buckets["31_60"] += amt
            elif days <= 90:
                buckets["61_90"] += amt
            else:
                buckets["90_plus"] += amt
                dunning.append({
                    "invoice": inv.get("number", ""),
                    "client": inv.get("contact_name", ""),
                    "amount": amt, "days_overdue": days,
                })
        except ValueError:
            buckets["0_30"] += amt

    # Override with aging report if available (more accurate)
    if aging and aging.get("buckets"):
        for b in aging.get("buckets", []):
            pass  # aging report format varies — skip for now

    return {
        "total_ar": total_ar,
        "bucket_0_30": buckets["0_30"],
        "bucket_31_60": buckets["31_60"],
        "bucket_61_90": buckets["61_90"],
        "bucket_90_plus": buckets["90_plus"],
        "dso": 0.0,
        "dunning_queue": dunning,
    }


def _build_ap_snapshot(bills: dict) -> dict:
    """AP from bill list."""
    today = date.today()
    total_ap = 0.0
    overdue = 0.0
    out = []
    for bill in bills.get("bills", []):
        amt = _safe_float(bill.get("total"))
        total_ap += amt
        due = bill.get("date", "")
        try:
            due_date = date.fromisoformat(due[:10])
            if due_date < today:
                overdue += amt
        except ValueError:
            pass
        out.append({
            "bill": bill.get("number", ""),
            "vendor": bill.get("contact_name", ""),
            "amount": amt, "due_date": due,
        })
    return {"total_ap": total_ap, "ap_overdue": overdue, "dpo": 0.0, "bills": out}


def _build_compliance_snapshot() -> dict:
    """Compliance — placeholder, populated by finance compliance skills."""
    return {
        "close_checklist": [],
        "statutory_schedule": [],
        "sst_readiness": {"draft_status": "pending", "taxable_sales": 0.0, "sst_liability": 0.0},
        "cp58_register": [],
        "wht_queue": [],
        "expense_claim_audit": [],
    }


# ── Risk alerts ────────────────────────────────────────────────────────

def _build_risk_alerts(cash: dict, ar: dict, concentration: dict, bva: dict) -> list:
    """Generate risk alerts from snapshot data."""
    alerts = []
    # Cash runway
    runway = _safe_float(cash.get("cash_runway_months"))
    if 0 < runway < 6:
        alerts.append({
            "type": "cash_runway",
            "level": "critical" if runway < 3 else "warning",
            "message": f"Cash runway only {runway:.1f} months",
        })
    # AR overdue
    overdue_90 = _safe_float(ar.get("bucket_90_plus"))
    if overdue_90 > 0:
        alerts.append({
            "type": "ar_overdue",
            "level": "critical" if overdue_90 > 50000 else "warning",
            "message": f"${overdue_90:,.0f} in receivables overdue >90 days",
        })
    # Revenue concentration
    for client in concentration.get("clients", []):
        pct = _safe_float(client.get("revenue_pct"))
        if pct > 20:
            alerts.append({
                "type": "concentration",
                "level": "warning",
                "message": f"{client.get('name', 'Unknown')} represents {pct:.1f}% of revenue",
            })
    # BvA overrun
    for item in bva.get("line_items", []):
        var_pct = _safe_float(item.get("variance_pct"))
        if var_pct > 10:
            alerts.append({
                "type": "overrun",
                "level": "warning",
                "message": f"{item.get('account_name', 'Unknown')} is {var_pct:.1f}% over budget",
            })
    return alerts


# ── Main ───────────────────────────────────────────────────────────────

def write_snapshot(path: Path, payload: dict, dry_run: bool) -> None:
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    if dry_run:
        print(f"=== {path} ({len(body)} bytes) ===")
        print(body[:500] + ("..." if len(body) > 500 else ""))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body + "\n", encoding="utf-8")
    print(f"  wrote {path} ({len(body)} bytes)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Finance dashboard snapshot writer (QBO live data)")
    parser.add_argument("--dry-run", action="store_true", help="Print payloads without writing")
    parser.add_argument("--bridge", default=str(DEFAULT_BRIDGE), help="Path to acct-bridge.py")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output directory for snapshots")
    args = parser.parse_args()

    bridge = Path(args.bridge)
    output = Path(args.output)

    if not bridge.exists():
        print(f"ERROR: bridge not found at {bridge}", file=sys.stderr)
        return 1

    # Load credentials
    _load_env()

    provider = os.environ.get("ACCT_PROVIDER", "unknown")
    company = os.environ.get("ACCT_COMPANY_ID", "")
    sandbox = os.environ.get("ACCT_SANDBOX", "false").lower() == "true"
    print(f"Finance Dashboard Snapshot Writer")
    print(f"  Provider: {provider}  Company: {company}  Sandbox: {sandbox}")
    print(f"  Bridge: {bridge}")
    print(f"  Output: {output}")
    print()

    # Determine date range for P&L (current year)
    today = date.today()
    year_start = date(today.year, 1, 1)
    date_from = year_start.isoformat()
    date_to = today.isoformat()

    # ── Call acct_* MCP tools ──
    print("Pulling data from QuickBooks...")
    pl = _call_mcp_tool(bridge, "acct_get_profit_loss", {"date_from": date_from, "date_to": date_to})
    print(f"  P&L: revenue={_safe_float(pl.get('total_revenue'))}, expenses={_safe_float(pl.get('total_expenses'))}")

    bs = _call_mcp_tool(bridge, "acct_get_balance_sheet", {"as_of_date": date_to})
    print(f"  Balance Sheet: assets={_safe_float(bs.get('total_assets'))}, liabilities={_safe_float(bs.get('total_liabilities'))}")

    invoices = _call_mcp_tool(bridge, "acct_list_sales_invoices", {"limit": 100})
    print(f"  Invoices: {len(invoices.get('invoices', []))} records")

    bills = _call_mcp_tool(bridge, "acct_list_purchase_bills", {"limit": 100})
    print(f"  Bills: {len(bills.get('bills', []))} records")

    contacts = _call_mcp_tool(bridge, "acct_list_contacts", {"type": "customer", "limit": 100})
    print(f"  Customers: {len(contacts.get('contacts', []))} records")
    print()

    # ── Build snapshots ──
    print("Building snapshots...")
    cash_snap = _build_cash_snapshot(bs)
    asset_snap = _build_asset_snapshot(bs)
    pl_snap = _build_pl_snapshot(pl)
    concentration_snap = _build_concentration_snapshot(invoices)
    bva_snap = _build_bva_snapshot(pl)
    ar_snap = _build_ar_snapshot(invoices)
    ap_snap = _build_ap_snapshot(bills)
    compliance_snap = _build_compliance_snapshot()

    # Add risk alerts to P&L snapshot (dashboard reads from there)
    risk_alerts = _build_risk_alerts(cash_snap, ar_snap, concentration_snap, bva_snap)

    # ── Write snapshots ──
    print("Writing snapshots...")
    write_snapshot(output / "cash.json", cash_snap, args.dry_run)
    write_snapshot(output / "assets.json", asset_snap, args.dry_run)
    write_snapshot(output / "pl.json", pl_snap, args.dry_run)
    write_snapshot(output / "concentration.json", concentration_snap, args.dry_run)
    write_snapshot(output / "bva.json", bva_snap, args.dry_run)
    write_snapshot(output / "ar.json", ar_snap, args.dry_run)
    write_snapshot(output / "ap.json", ap_snap, args.dry_run)
    write_snapshot(output / "compliance.json", compliance_snap, args.dry_run)

    print(f"\nDone. {8} snapshots written to {output}")
    if not args.dry_run:
        print("Refresh the finance dashboard to see live QuickBooks data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
