#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seed-qbo-sandbox.py — Populate QBO sandbox with 12 months of realistic data.

Creates:
  - Sales invoices (12 months, ~10-15 per month) across multiple customers
  - Purchase bills (12 months, ~8-12 per month) across multiple vendors
  - Uses existing QBO sandbox customers, vendors, and accounts

Usage:
    python scripts/seed-qbo-sandbox.py [--dry-run] [--months 12]

Environment:
    Reads ACCT_* from ~/.hermes/profiles/finance-manager/.env
"""
import argparse
import json
import os
import random
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BRIDGE = Path.home() / ".hermes" / "scripts" / "accounting" / "acct-bridge.py"
VENV_PY = REPO / "venv" / "Scripts" / "python.exe"

# ── QBO Sandbox Customers (id, name) ──
CUSTOMERS = [
    ("1", "Amy's Bird Sanctuary"),
    ("2", "Bill's Windsurf Shop"),
    ("3", "Cool Cars"),
    ("5", "Dukes Basketball Camp"),
    ("8", "Freeman Sporting Goods"),
    ("10", "Geeta Kalapatapu"),
    ("11", "Gevelber Photography"),
    ("12", "Jeff's Jalopies"),
    ("13", "John Melton"),
    ("14", "Kate Whelan"),
    ("15", "Kookies by Kathy"),
    ("16", "Mark Cho"),
    ("17", "Paulsen Medical Supplies"),
    ("18", "Pye's Cakes"),
    ("19", "Rago Travel Agency"),
    ("20", "Red Rock Diner"),
]

# ── QBO Sandbox Vendors (id, name) — need to fetch ──
VENDORS = [
    ("21", "Bob's Burger Joint"),  # placeholder IDs — will fetch live
]

# ── QBO Revenue Accounts (account_id, name) — for invoice line items ──
REVENUE_ACCOUNTS = [
    ("48", "Fountains and Garden Lighting"),
    ("49", "Plants and Soil"),
    ("50", "Sprinklers and Drip Systems"),
    ("52", "Installation"),
    ("53", "Maintenance and Repair"),
    ("54", "Pest Control Services"),
    ("79", "Sales of Product Income"),
    ("1", "Services"),
    ("82", "Design income"),
    ("45", "Landscaping Services"),
    ("46", "Job Materials"),
    ("51", "Labor"),
]

# ── QBO Expense Accounts (account_id, name) — for bill line items ──
EXPENSE_ACCOUNTS = [
    ("7", "Advertising"),
    ("56", "Fuel"),
    ("62", "Equipment Rental"),
    ("11", "Insurance"),
    ("69", "Accounting"),
    ("71", "Lawyer"),
    ("75", "Equipment Repairs"),
    ("17", "Rent or Lease"),
    ("76", "Gas and Electric"),
    ("77", "Telephone"),
    ("14", "Miscellaneous"),
    ("15", "Office Expenses"),
    ("13", "Meals and Entertainment"),
    ("20", "Supplies"),
    ("24", "Utilities"),
    ("10", "Dues & Subscriptions"),
    ("19", "Stationery & Printing"),
    ("22", "Travel"),
]

# ── QBO Service Items (ItemRef for invoices) — only Service type, not Inventory ──
# Inventory items (5, 11, 16, 17) have start date restrictions — avoid them.
SERVICE_ITEMS = [
    ("1", "Services"),
    ("2", "Hours"),
    ("3", "Concrete"),
    ("4", "Design"),
    ("6", "Gardening"),
    ("7", "Installation"),
    ("8", "Lighting"),
    ("9", "Maintenance & Repair"),
    ("10", "Pest Control"),
    ("12", "Refunds & Allowances"),
    ("13", "Rocks"),
    ("14", "Sod"),
    ("15", "Soil"),
    ("18", "Trimming"),
]


def load_env() -> dict:
    """Load ACCT_* env vars from finance-manager .env."""
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


def call_qbo(tool_name: str, args: dict, env: dict) -> dict:
    """Call the QBO bridge via subprocess."""
    request = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": tool_name, "arguments": args},
    })
    full_env = os.environ.copy()
    full_env.update(env)

    try:
        result = subprocess.run(
            [str(VENV_PY), str(BRIDGE)],
            input=request, capture_output=True, text=True, timeout=30, env=full_env,
        )
        if result.returncode != 0:
            print(f"  ERROR: {result.stderr.strip()[:150]}", file=sys.stderr)
            return {}
        for line in result.stdout.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            resp = json.loads(line)
            content = resp.get("content", [])
            if content and content[0].get("type") == "text":
                return json.loads(content[0]["text"])
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as e:
        print(f"  ERROR: {e}", file=sys.stderr)
    return {}


def fetch_vendors(env: dict) -> list:
    """Fetch vendor IDs from QBO."""
    result = call_qbo("acct_list_contacts", {"type": "supplier", "limit": 20}, env)
    vendors = []
    for c in result.get("contacts", []):
        vendors.append((c.get("id", ""), c.get("name", "")))
    return vendors


def generate_invoices_for_month(year: int, month: int) -> list:
    """Generate 10-15 invoices for a given month."""
    num_invoices = random.randint(10, 15)
    invoices = []
    for i in range(num_invoices):
        customer = random.choice(CUSTOMERS)
        day = random.randint(1, 28)
        inv_date = f"{year}-{month:02d}-{day:02d}"

        # 1-3 line items per invoice
        num_items = random.randint(1, 3)
        form_items = []
        for _ in range(num_items):
            acct = random.choice(REVENUE_ACCOUNTS)
            qty = random.choice([1, 2, 3, 5, 10])
            price = round(random.uniform(50, 5000), 2)
            form_items.append({
                "account_id": acct[0],
                "description": f"{acct[1]} - {random.choice(['Project', 'Service', 'Consultation', 'Installation', 'Maintenance'])}",
                "product_id": random.choice(SERVICE_ITEMS)[0],
                "quantity": qty,
                "unit_price": price,
            })

        total = sum(fi["quantity"] * fi["unit_price"] for fi in form_items)
        invoices.append({
            "contact_id": customer[0],
            "date": inv_date,
            "payment_mode": "credit",
            "status": "ready",
            "tax_mode": "exclusive",
            "number2": f"INV-{year}{month:02d}-{i+1:03d}",
            "form_items": form_items,
            "_customer": customer[1],
            "_total": total,
        })
    return invoices


def generate_bills_for_month(year: int, month: int, vendors: list) -> list:
    """Generate 8-12 bills for a given month."""
    num_bills = random.randint(8, 12)
    bills = []
    for i in range(num_bills):
        vendor = random.choice(vendors) if vendors else ("1", "Unknown Vendor")
        day = random.randint(1, 28)
        bill_date = f"{year}-{month:02d}-{day:02d}"

        # 1-3 line items per bill
        num_items = random.randint(1, 3)
        form_items = []
        for _ in range(num_items):
            acct = random.choice(EXPENSE_ACCOUNTS)
            qty = random.choice([1, 2, 5, 10])
            price = round(random.uniform(30, 2000), 2)
            form_items.append({
                "account_id": acct[0],
                "description": f"{acct[1]} - {random.choice(['Monthly', 'Quarterly', 'Project', 'General', 'Reimbursement'])}",
                "quantity": qty,
                "unit_price": price,
            })

        total = sum(fi["quantity"] * fi["unit_price"] for fi in form_items)
        bills.append({
            "contact_id": vendor[0],
            "date": bill_date,
            "payment_mode": "credit",
            "status": "ready",
            "tax_mode": "exclusive",
            "number2": f"BILL-{year}{month:02d}-{i+1:03d}",
            "form_items": form_items,
            "_vendor": vendor[1],
            "_total": total,
        })
    return bills


def main():
    parser = argparse.ArgumentParser(description="Seed QBO sandbox with 12 months of data")
    parser.add_argument("--months", type=int, default=12, help="Number of months to generate (default: 12)")
    parser.add_argument("--dry-run", action="store_true", help="Generate but don't post to QBO")
    parser.add_argument("--start-year", type=int, default=2025, help="Start year (default: 2025)")
    parser.add_argument("--start-month", type=int, default=9, help="Start month (default: 9 = Sep)")
    args = parser.parse_args()

    env = load_env()
    if not env.get("ACCT_PROVIDER"):
        print("ERROR: No ACCT_PROVIDER configured", file=sys.stderr)
        return 1

    print(f"QBO Sandbox Seeding")
    print(f"  Provider: {env.get('ACCT_PROVIDER')}")
    print(f"  Sandbox: {env.get('ACCT_SANDBOX')}")
    print(f"  Company ID: {env.get('ACCT_COMPANY_ID')}")
    print(f"  Months: {args.months} (starting {args.start_year}-{args.start_month:02d})")
    print(f"  Dry run: {args.dry_run}")
    print()

    # Fetch vendors
    print("Fetching vendors from QBO...")
    vendors = fetch_vendors(env)
    print(f"  Found {len(vendors)} vendors")
    for v in vendors[:5]:
        print(f"    {v[0]}: {v[1]}")
    print()

    # Generate data
    all_invoices = []
    all_bills = []
    for i in range(args.months):
        # Calculate year/month
        total_months = (args.start_year * 12 + args.start_month - 1) + i
        year = total_months // 12
        month = (total_months % 12) + 1

        invoices = generate_invoices_for_month(year, month)
        bills = generate_bills_for_month(year, month, vendors)
        all_invoices.extend(invoices)
        all_bills.extend(bills)

        total_inv = sum(inv["_total"] for inv in invoices)
        total_bill = sum(bill["_total"] for bill in bills)
        print(f"  {year}-{month:02d}: {len(invoices)} invoices (RM {total_inv:,.0f}) + {len(bills)} bills (RM {total_bill:,.0f})")

    total_inv_amount = sum(inv["_total"] for inv in all_invoices)
    total_bill_amount = sum(bill["_total"] for bill in all_bills)
    print(f"\nTotal: {len(all_invoices)} invoices (RM {total_inv_amount:,.0f}) + {len(all_bills)} bills (RM {total_bill_amount:,.0f})")

    if args.dry_run:
        print("\n[DRY RUN] No data posted to QBO. Remove --dry-run to post.")
        return 0

    # Post invoices
    print(f"\nPosting {len(all_invoices)} invoices to QBO...")
    inv_ok = 0
    inv_fail = 0
    for i, inv in enumerate(all_invoices):
        # Remove metadata fields before posting
        payload = {k: v for k, v in inv.items() if not k.startswith("_")}
        result = call_qbo("acct_create_sales_invoice", payload, env)
        if result and "error" not in result:
            inv_ok += 1
        else:
            inv_fail += 1
            if inv_fail <= 3:
                print(f"  FAILED invoice {i+1}: {result.get('error', 'unknown')}")
        if (i + 1) % 50 == 0:
            print(f"  ... {i+1}/{len(all_invoices)} posted ({inv_ok} ok, {inv_fail} failed)")

    print(f"  Invoices: {inv_ok} ok, {inv_fail} failed")

    # Post bills
    print(f"\nPosting {len(all_bills)} bills to QBO...")
    bill_ok = 0
    bill_fail = 0
    for i, bill in enumerate(all_bills):
        payload = {k: v for k, v in bill.items() if not k.startswith("_")}
        result = call_qbo("acct_create_purchase_bill", payload, env)
        if result and "error" not in result:
            bill_ok += 1
        else:
            bill_fail += 1
            if bill_fail <= 3:
                print(f"  FAILED bill {i+1}: {result.get('error', 'unknown')}")
        if (i + 1) % 50 == 0:
            print(f"  ... {i+1}/{len(all_bills)} posted ({bill_ok} ok, {bill_fail} failed)")

    print(f"  Bills: {bill_ok} ok, {bill_fail} failed")

    print(f"\n✅ Done! Posted {inv_ok} invoices + {bill_ok} bills to QBO sandbox.")
    print("  Refresh the finance dashboard to see the new data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
