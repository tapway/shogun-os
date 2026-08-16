#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seed-qbo-assets.py — Populate QBO sandbox with comprehensive asset data.

1. Creates missing QBO accounts (Petty Cash, PPE sub-accounts, etc.)
2. Creates journal entries to fill ALL asset sub-sections with data
3. Builds 12-month trend by fetching historical balance sheets

Usage:
    python scripts/seed-qbo-assets.py [--dry-run]
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BRIDGE = Path.home() / ".hermes" / "scripts" / "accounting" / "acct-bridge.py"
VENV_PY = REPO / "venv" / "Scripts" / "python.exe"

# ── Accounts to create in QBO (name, account_type, account_sub_type) ──
# These fill the sub-sections that QBO sandbox doesn't have
NEW_ACCOUNTS = [
    # Current Asset sub-sections
    ("Petty Cash", "Other Current Asset", "Cash"),
    ("Short-Term Deposits", "Other Current Asset", "Cash"),
    ("Accrued Income", "Other Current Asset", "PrepaidExpenses"),
    ("Staff Advances", "Other Current Asset", "PrepaidExpenses"),
    ("Security Deposits", "Other Current Asset", "PrepaidExpenses"),
    ("Other Receivables", "Other Current Asset", "OtherCurrentAssets"),
    # Inventory sub-sections
    ("Work in Progress", "Other Current Asset", "Inventory"),
    ("Finished Goods", "Other Current Asset", "Inventory"),
    ("Stock-in-Trade", "Other Current Asset", "Inventory"),
    # PPE sub-sections
    ("Renovation and Fit-Out", "Fixed Asset", "OtherFixedAssets"),
    ("Motor Vehicles", "Fixed Asset", "Vehicles"),
    ("Computer Hardware", "Fixed Asset", "OtherFixedAssets"),
    ("Software Licenses Capitalized", "Fixed Asset", "OtherFixedAssets"),
    # Intangible Assets
    ("Capitalized Software", "Other Current Asset", "OtherCurrentAssets"),
    ("Trademarks", "Other Current Asset", "OtherCurrentAssets"),
    ("Development Costs", "Other Current Asset", "OtherCurrentAssets"),
    # Deferred Tax
    ("Deferred Tax Assets", "Other Current Asset", "OtherCurrentAssets"),
]

# ── Journal entries to create (debit account, credit account, amount, description) ──
# Each entry debits an asset account and credits Opening Balance Equity
# This gives every sub-section a realistic balance
JOURNAL_ENTRIES = [
    # Current Assets — Cash sub-sections
    ("Petty Cash", 15000, "Petty cash float"),
    ("Short-Term Deposits", 80000, "Short-term FD placement"),
    ("Savings", 350000, "Payroll account balance"),  # Savings already exists
    # Trade and Other Receivables sub-sections
    ("Accrued Income", 45000, "Accrued service revenue"),
    ("Staff Advances", 15000, "Staff salary advance"),
    ("Security Deposits", 25000, "Rental security deposit"),
    ("Other Receivables", 12000, "Sundry receivables"),
    # Inventory sub-sections
    ("Work in Progress", 120000, "WIP - ongoing projects"),
    ("Finished Goods", 95000, "Finished goods inventory"),
    ("Stock-in-Trade", 30000, "Trading stock"),
    # Prepayments (Prepaid Expenses already exists as id=3)
    # PPE sub-sections
    ("Renovation and Fit-Out", 350000, "Office renovation"),
    ("Motor Vehicles", 280000, "Company vehicles"),
    ("Computer Hardware", 150000, "Computers and servers"),
    ("Software Licenses Capitalized", 120000, "Capitalized software licenses"),
    # Intangible Assets
    ("Capitalized Software", 100000, "Developed software"),
    ("Trademarks", 50000, "Registered trademarks"),
    ("Development Costs", 75000, "R&D development costs"),
    # Deferred Tax
    ("Deferred Tax Assets", 60000, "Deferred tax from losses"),
]


def load_env() -> dict:
    env_file = Path.home() / ".hermes" / "profiles" / "finance-manager" / ".env"
    env = {}
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            if k.startswith("ACCT_"):
                env[k.strip()] = v.strip()
    return env


def qbo_api(method: str, path: str, env: dict, data=None, params=None) -> dict:
    """Call QBO API directly via the quickbooks plugin."""
    # Set env vars before importing (quickbooks module reads them at call time)
    for k, v in env.items():
        os.environ[k] = v
    sys.path.insert(0, str(Path.home() / ".hermes" / "scripts" / "accounting"))
    sys.path.insert(0, str(Path.home() / ".hermes" / "scripts" / "accounting" / "plugins"))
    from quickbooks import _api
    return _api(method, path, data=data, params=params)


def get_account_id_by_name(accounts: list, name: str) -> str:
    """Find QBO account ID by name."""
    for a in accounts:
        if a.get("Name", "").lower() == name.lower():
            return a.get("Id", "")
    return ""


def create_account(env: dict, name: str, acct_type: str, sub_type: str) -> dict:
    """Create a QBO account."""
    payload = {
        "Name": name,
        "AccountType": acct_type,
        "AccountSubType": sub_type,
    }
    return qbo_api("POST", "/account", env, data=payload)


def create_journal_entry(env: dict, date_str: str, lines: list) -> dict:
    """Create a QBO journal entry with multiple lines.

    lines: [(account_id, debit, credit, description), ...]
    """
    payload_lines = []
    for account_id, debit, credit, desc in lines:
        payload_lines.append({
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "AccountRef": {"value": str(account_id)},
                "PostingType": "Debit" if debit > 0 else "Credit",
            },
            "Amount": float(debit if debit > 0 else credit),
            "Description": desc,
        })
    payload = {
        "Line": payload_lines,
        "TxnDate": date_str,
        "PrivateNote": "Opening balance entries for asset sub-sections",
    }
    return qbo_api("POST", "/journalentry", env, data=payload)


def fetch_all_accounts(env: dict) -> list:
    """Fetch all QBO accounts."""
    data = qbo_api("GET", "/query", env,
                   params={"query": "SELECT * FROM Account MAXRESULTS 200", "minorversion": "65"})
    return data.get("QueryResponse", {}).get("Account", [])


def fetch_balance_sheet(env: dict, as_of: str) -> dict:
    """Fetch balance sheet via bridge for a specific date."""
    request = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": "acct_get_balance_sheet", "arguments": {"as_of_date": as_of}},
    })
    full_env = os.environ.copy()
    full_env.update(env)
    try:
        result = subprocess.run(
            [str(VENV_PY), str(BRIDGE)],
            input=request, capture_output=True, text=True, timeout=30, env=full_env,
        )
        for line in result.stdout.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            resp = json.loads(line)
            content = resp.get("content", [])
            if content and content[0].get("type") == "text":
                return json.loads(content[0]["text"])
    except Exception as e:
        print(f"  ERROR fetching BS for {as_of}: {e}", file=sys.stderr)
    return {}


def main():
    parser = argparse.ArgumentParser(description="Seed QBO with comprehensive asset data")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-accounts", action="store_true", help="Skip account creation")
    parser.add_argument("--skip-je", action="store_true", help="Skip journal entries")
    parser.add_argument("--skip-trend", action="store_true", help="Skip trend building")
    args = parser.parse_args()

    env = load_env()
    if not env.get("ACCT_PROVIDER"):
        print("ERROR: No ACCT_PROVIDER configured", file=sys.stderr)
        return 1

    print("QBO Asset Data Seeding")
    print(f"  Provider: {env.get('ACCT_PROVIDER')}")
    print(f"  Sandbox: {env.get('ACCT_SANDBOX')}")
    print()

    # Fetch existing accounts
    print("Fetching existing QBO accounts...")
    accounts = fetch_all_accounts(env)
    print(f"  Found {len(accounts)} accounts")

    # ── 1. Create missing accounts ──
    if not args.skip_accounts and not args.dry_run:
        print(f"\nCreating {len(NEW_ACCOUNTS)} missing asset accounts...")
        created = 0
        for name, atype, sub in NEW_ACCOUNTS:
            if get_account_id_by_name(accounts, name):
                print(f"  SKIP {name} (already exists)")
                continue
            result = create_account(env, name, atype, sub)
            if "error" in result:
                print(f"  FAILED {name}: {result.get('error', '')[:80]}")
            else:
                created += 1
                print(f"  ✅ Created {name}")
        print(f"  Created {created} new accounts")

        # Re-fetch accounts to get new IDs
        print("\nRe-fetching accounts...")
        accounts = fetch_all_accounts(env)
        print(f"  Now {len(accounts)} accounts")
    elif args.dry_run:
        print(f"\n[DRY RUN] Would create {len(NEW_ACCOUNTS)} accounts")

    # ── 2. Create journal entries ──
    if not args.skip_je and not args.dry_run:
        print(f"\nCreating {len(JOURNAL_ENTRIES)} journal entries...")
        # Get Opening Balance Equity account ID for crediting
        equity_id = get_account_id_by_name(accounts, "Opening Balance Equity") or "34"

        je_ok = 0
        je_fail = 0
        for account_name, amount, desc in JOURNAL_ENTRIES:
            acct_id = get_account_id_by_name(accounts, account_name)
            if not acct_id:
                print(f"  SKIP {account_name} (account not found)")
                continue

            # Create JE: debit asset, credit equity
            result = create_journal_entry(env, "2025-09-01", [
                (acct_id, amount, 0, desc),
                (equity_id, 0, amount, f"Opening balance for {account_name}"),
            ])
            if "error" in result:
                print(f"  FAILED {account_name}: {str(result.get('error', ''))[:80]}")
                je_fail += 1
            else:
                je_ok += 1
                print(f"  ✅ {account_name}: {amount:>10,.0f}")
        print(f"  Journal entries: {je_ok} ok, {je_fail} failed")

    # ── 3. Build 12-month trend ──
    if not args.skip_trend:
        print("\nBuilding 12-month asset trend...")
        # Fetch BS for each month-end for the past 12 months
        trend = []
        today = date(2026, 8, 12)
        for i in range(12):
            # Last day of each month, going back
            month_end = date(today.year, today.month, 1) - timedelta(days=1 - i * 0)
            # Calculate month-end: go back i months from this month
            total_months = (today.year * 12 + today.month - 1) - i
            y = total_months // 12
            m = (total_months % 12) + 1
            if m == 12:
                last_day = 31
            elif m in [4, 6, 9, 11]:
                last_day = 30
            elif m == 2:
                last_day = 29 if y % 4 == 0 else 28
            else:
                last_day = 31
            as_of = f"{y}-{m:02d}-{last_day:02d}"
            month_name = date(y, m, 1).strftime("%b")

            if args.dry_run:
                trend.append({"month": month_name, "current": 0, "non_current": 0})
                continue

            bs = fetch_balance_sheet(env, as_of)
            total_current = 0.0
            total_non_current = 0.0
            for a in bs.get("asset_accounts", []):
                name = a.get("account_name", "")
                amt = float(a.get("amount", 0) or 0)
                # Classify
                nl = name.lower()
                is_non_current = any(kw in nl for kw in ["original cost", "truck", "depreciation", "fixed",
                    "renovation", "motor vehicles", "computer hardware", "software licenses",
                    "capitalized software", "trademarks", "development costs", "deferred tax"])
                if is_non_current:
                    total_non_current += amt
                else:
                    total_current += amt

            trend.append({"month": month_name, "current": round(total_current, 2), "non_current": round(total_non_current, 2)})
            print(f"  {month_name} {y}: current={total_current:>12,.0f}  non_current={total_non_current:>12,.0f}")

        # Save trend to finance/asset-trend.json
        trend_path = REPO / "finance" / "asset-trend.json"
        if not args.dry_run:
            with open(trend_path, "w", encoding="utf-8") as f:
                json.dump({"trend": trend}, f, indent=2)
            print(f"\n✅ Saved trend to {trend_path}")

        print("\nTrend data:")
        for t in trend:
            print(f"  {t['month']}: current={t['current']:>12,.0f}  non_current={t['non_current']:>12,.0f}")

    if args.dry_run:
        print("\n[DRY RUN] No changes made.")
    else:
        print("\n✅ Done! Refresh the finance dashboard to see populated asset data.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
