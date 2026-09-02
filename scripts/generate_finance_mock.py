"""generate_finance_mock.py — Rebuild examples/finance-budget.json dashboard_mock
as ONE internally-aligned fictional ledger (no QBO, no gbrain dependency).

Design: a single set of per-budget-line attainment factors drives EVERYTHING,
so all dashboard tabs reconcile with each other:

  BvA actuals  = budget_ytd(line) × attainment(line)
  monthly P&L  = Σ monthly_budget[m] × attainment(line)   (Jan..Aug 2026)
  revenueYTD   = Σ revenue-line actuals      revenueMTD = August revenue
  expensesYTD  = Σ COGS + OPEX actuals
  cash trend   = opening cash + cumulative net profit
  runway/burn  = liquid cash ÷ average monthly expenses
  AR invoices  → aging buckets → totalAR → balance-sheet receivables
  AP bills     → aging-by-target → totalAP → balance-sheet payables
  BS identity  = assets == liabilities + equity (asserted)

Cross-dashboard alignment (demo branch):
  • AR customers   = companies from examples/crm-mock.json
  • AP vendors     = vendors from examples/procurement-mock.json
  • Inventory      = procurement totalInventoryValuation (RM 1,850,000)
  • Finance staff  = HR seed names (Henry Koh, Grace Lim, Tina Low)

Budget baseline (budget_baseline + lines + monthly_budget) comes from the
real 2026 Budget Excel and is PRESERVED untouched — only dashboard_mock is
rewritten.

Usage:
    python scripts/generate_finance_mock.py [--check]
    --check  validate invariants without writing
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET = REPO_ROOT / "examples" / "finance-budget.json"

# Demo data vintage — all aging/due dates computed against this date.
ANCHOR = date(2026, 8, 31)
YTD_DAYS = 243  # 2026-01-01 .. 2026-08-31
YTD_MONTHS = 8
MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]

OPENING_CASH = 1_200_000          # cash & equivalents on 2026-01-01
PROCUREMENT_INVENTORY = 1_850_000  # == procurement-mock totalInventoryValuation

# Per-account attainment vs YTD budget (drives BvA + monthly trends).
ATTAINMENT = {
    # Revenue
    "Hardware": 1.04, "Software Subscription": 0.92, "Professional Services": 1.01,
    "Services (OTC)": 0.97, "Maintenance": 0.99,
    # Cost of Sales
    "Cloud & Software Cost": 0.98, "Hardware Costs": 0.96, "Freight and delivery": 0.95,
    "Sales Commission": 1.03, "Subcontracted Services": 0.99,
    # Other Income
    "Grant": 0.90, "MV car instalment": 1.00,
    # Expenses
    "Total Advertisement and promotions": 1.12, "Total Business Development Costs": 0.90,
    "Depreciation": 1.00, "Total for Employee Benefits": 0.96,
    "Total for Finance costs": 1.15, "Total for Human Resources": 0.94,
    "Total for Insurance": 0.97, "Total for Interest costs": 1.18,
    "Total for Office Expenses": 0.93, "Total for Payroll": 0.99,
    "Total for Professional Fees": 0.95, "Total for Rent, Utilities & Phone": 0.98,
    "Subscription fees": 1.00, "Total for Taxes": 0.92, "Attestation fees": 1.00,
    "Auditors' remuneration": 0.96, "Software and Hosting": 0.97,
    "Exchange Gain or Loss": 0.85,
}
# "Software (OTC)" appears in both Revenue and Cost of Sales sections.
ATTAINMENT_BY_SECTION = {
    ("Revenue", "Software (OTC)"): 0.94,
    ("Cost of Sales", "Software (OTC)"): 0.93,
}
DEFAULT_ATTAINMENT = 0.95

# ── Fictional counterparties (aligned with crm-mock / procurement-mock) ──
AR_INVOICES = [
    # (invoice_no, customer, due_date, amount)
    ("INV-2026-1041", "Apex Retail Group Group",          "2026-08-22", 186_000),
    ("INV-2026-1052", "Global Logistics Corp Sdn Bhd",    "2026-08-18", 148_000),
    ("INV-2026-1058", "Lima Apparel Bhd",               "2026-08-25", 118_000),
    ("INV-2026-1063", "Teras Elektronik",               "2026-08-27",  88_000),
    ("INV-2026-1066", "Jejak Runcit Sdn Bhd",           "2026-08-29",  34_000),
    ("INV-2026-1018", "Lebuhraya Sentosa Sdn Bhd",      "2026-07-24", 135_000),
    ("INV-2026-1027", "Apex Retail Group Group",          "2026-07-15",  92_000),
    ("INV-2026-1033", "Teras Elektronik",               "2026-07-08",  58_000),
    ("INV-2026-0984", "Pelabuhan Timur Berhad",         "2026-06-19", 104_000),
    ("INV-2026-0992", "Nadi Holdings",                  "2026-06-27",  36_000),
    ("INV-2026-0947", "Nadi Holdings",                  "2026-05-12",  42_000),
]

AP_BILLS = [
    # (bill_no, vendor, due_date, amount)
    # Current (not yet due)
    ("BILL-2026-0781", "Master Textile & Apparel Ltd",                "2026-09-12", 312_000),
    ("BILL-2026-0758", "Telekom Malaysia Berhad (Unifi Biz)",         "2026-09-05",   4_200),
    ("BILL-2026-0760", "Tenaga Nasional Berhad",                      "2026-09-07",   9_800),
    ("BILL-2026-0745", "Menara Sentosa Property (Office Rent)",       "2026-09-01",   6_100),
    # 1-30 DPD (slightly overdue - pending approval)
    ("BILL-2026-0776", "Apex Tech OEM Corporation",                   "2026-08-18", 198_500),
    ("BILL-2026-0769", "PackPro Logistics & Packaging",               "2026-08-05",  68_500),
    # 31-60 DPD (moderately overdue - PO mismatch)
    ("BILL-2026-0731", "Syarikat Air Selangor",                       "2026-07-27",   2_100),
    ("BILL-2026-0720", "Nadi Holdings (Logistics Services)",         "2026-07-15",  28_000),
    # 61-90 DPD (severely overdue - missing GRN, on hold)
    ("BILL-2026-0702", "Crowe Audit & Assurance (FY26 Interim Fee)",  "2026-06-30",   7_040),
    ("BILL-2026-0695", "Pelabuhan Timur Berhad (Port Charges)",      "2026-06-15",  45_000),
    # 90+ DPD (critical - legal action risk)
    ("BILL-2026-0651", "Teras Elektronik Sdn Bhd (IT Equipment)",     "2026-05-01",  38_500),
    ("BILL-2026-0638", "Apex Retail Group Group (Inventory Deposit)",   "2026-04-15",  52_000),
]

CLIENT_CONCENTRATION = [
    # name, revenue_ytd — top clients aligned with crm-mock companies
    ("Apex Retail Group Group",       1_042_000),
    ("Global Logistics Corp Sdn Bhd",   808_000),
    ("Lima Apparel Bhd",              641_000),
    ("Teras Elektronik",              462_000),
    ("Pelabuhan Timur Berhad",        398_000),
]

# FX: USD operating account is part of liquid cash (bank #3 below).
FX_RATE_USD = 4.23
USD_BALANCE = 118_000  # USD


def r(x: float) -> int:
    return int(round(x))


def attainment(section: str, account: str) -> float:
    return ATTAINMENT_BY_SECTION.get((section, account),
                                     ATTAINMENT.get(account, DEFAULT_ATTAINMENT))


def build(data: dict) -> dict:
    lines = data["lines"]

    # ── 1. Per-line BvA actuals + monthly actual series ──
    bva, monthly_rev, monthly_exp, monthly_oi = [], [0] * 12, [0] * 12, [0] * 12
    for line in lines:
        sec, acc = line["section"], line["account_name"]
        att = attainment(sec, acc)
        mb = line["monthly_budget"]
        monthly_actual = [r(mb[m] * att) for m in range(12)]
        actual_ytd = sum(monthly_actual[:YTD_MONTHS])
        budget_ytd = r(sum(mb[:YTD_MONTHS]))
        bva.append({
            "section": sec, "account_name": acc,
            "budget_annual": line["budget_amount"], "budget_ytd": budget_ytd,
            "actual_ytd": actual_ytd,
            "variance": actual_ytd - budget_ytd,
            "variance_pct": round((actual_ytd - budget_ytd) / budget_ytd * 100, 1) if budget_ytd else 0.0,
            "monthly_budget": [round(v, 2) for v in mb],
            "match_confidence": "high",
        })
        for m in range(12):
            if sec == "Revenue":
                monthly_rev[m] += monthly_actual[m]
            elif sec in ("Cost of Sales", "Expenses"):
                monthly_exp[m] += monthly_actual[m]
            elif sec == "Other Income":
                monthly_oi[m] += monthly_actual[m]

    revenue_ytd = sum(monthly_rev[:YTD_MONTHS])
    revenue_mtd = monthly_rev[7]
    expenses_ytd = sum(monthly_exp[:YTD_MONTHS])
    other_income_ytd = sum(monthly_oi[:YTD_MONTHS])
    net_monthly = [monthly_rev[m] + monthly_oi[m] - monthly_exp[m] for m in range(12)]
    net_profit_ytd = sum(net_monthly[:YTD_MONTHS])

    # COGS actual = sum of Cost of Sales line actuals
    cogs_ytd = sum(b["actual_ytd"] for b in bva if b["section"] == "Cost of Sales")
    gross_margin = (revenue_ytd - cogs_ytd) / revenue_ytd * 100
    depreciation_ytd = next(b["actual_ytd"] for b in bva if b["account_name"] == "Depreciation")
    interest_ytd = sum(b["actual_ytd"] for b in bva if b["account_name"] in
                       ("Total for Interest costs", "Total for Finance costs"))
    ebitda = net_profit_ytd + depreciation_ytd + interest_ytd
    ebitda_margin = ebitda / revenue_ytd * 100

    # ── 2. Cash: opening + cumulative net profit ──
    cash_end = [OPENING_CASH]
    for m in range(YTD_MONTHS):
        cash_end.append(cash_end[-1] + net_monthly[m])
    liquid_cash = cash_end[YTD_MONTHS]          # bank balances sum to this exactly
    net_monthly_burn = r(expenses_ytd / YTD_MONTHS)
    runway_months = round(liquid_cash / net_monthly_burn, 1)
    runway_status = ("critical" if runway_months < 3 else
                     "caution" if runway_months < 6 else "healthy")

    usd_myr = r(USD_BALANCE * FX_RATE_USD)
    bank_accounts = [
        {"name": "Maybank Islamic Berhad (Operating Account)", "currency": "MYR",
         "balance": r(liquid_cash * 0.55), "balance_myr": r(liquid_cash * 0.55),
         "last_reconciled": "2026-08-28"},
        {"name": "CIMB Bank Berhad (Payroll Reserve)", "currency": "MYR",
         "balance": liquid_cash - r(liquid_cash * 0.55) - usd_myr,
         "balance_myr": liquid_cash - r(liquid_cash * 0.55) - usd_myr,
         "last_reconciled": "2026-08-28"},
        {"name": "RHB Bank Berhad (USD Current)", "currency": "USD",
         "balance": USD_BALANCE, "balance_myr": usd_myr,
         "last_reconciled": "2026-08-28"},
    ]
    assert sum(b["balance_myr"] for b in bank_accounts) == liquid_cash

    # ── 3. AR: invoices → aging → totals ──
    ar_items, aging = [], {"bucket_0_30": 0, "bucket_31_60": 0, "bucket_61_90": 0, "bucket_90_plus": 0}
    bucket_key = {"0-30": "bucket_0_30", "31-60": "bucket_31_60",
                  "61-90": "bucket_61_90", "90+": "bucket_90_plus"}
    dunning_status = {"0-30": "Current", "31-60": "Reminder 1 Sent",
                      "61-90": "Reminder 2 Sent", "90+": "Final Notice"}
    for no, cust, due_s, amt in AR_INVOICES:
        due = date.fromisoformat(due_s)
        days = (ANCHOR - due).days
        bucket = ("0-30" if days <= 30 else "31-60" if days <= 60 else
                  "61-90" if days <= 90 else "90+")
        aging[bucket_key[bucket]] += amt
        ar_items.append({"invoice_no": no, "customer": cust, "due_date": due_s,
                         "amount": amt, "aging_days": max(days, 0), "bucket": bucket,
                         "dunning_status": dunning_status[bucket]})
    total_ar = sum(aging.values())
    ar_overdue30 = aging["bucket_31_60"] + aging["bucket_61_90"] + aging["bucket_90_plus"]
    dunning_queue = [i for i in ar_items if i["bucket"] != "0-30"]
    dso = round(total_ar / (revenue_ytd / YTD_DAYS), 1)
    aging_by_bucket_label = lambda a: [
        {"label": "1-30 DPD", "amount": a["bucket_0_30"]},
        {"label": "31-60 DPD", "amount": a["bucket_31_60"]},
        {"label": "61-90 DPD", "amount": a["bucket_61_90"]},
        {"label": "90+ DPD", "amount": a["bucket_90_plus"]},
    ]

    # ── 4. AP: bills → aging-by-target → totals ──
    ap_items, ap_aging_amt = [], {"1-30 DPD": 0, "31-60 DPD": 0, "61-90 DPD": 0, "90+ DPD": 0}
    for no, vend, due_s, amt in AP_BILLS:
        days = (ANCHOR - date.fromisoformat(due_s)).days
        if days <= 0:
            match, appr = "Matched", "Approved"
        elif days <= 30:
            ap_aging_amt["1-30 DPD"] += amt
            match, appr = ("PO Mismatch" if "PackPro" in vend else "Matched"), "Pending"
        elif days <= 60:
            ap_aging_amt["31-60 DPD"] += amt
            match, appr = "Matched", "Pending"
        elif days <= 90:
            ap_aging_amt["61-90 DPD"] += amt
            match, appr = "Missing GRN", "On Hold"
        else:
            ap_aging_amt["90+ DPD"] += amt
            match, appr = "Matched", "On Hold"
        ap_items.append({"bill_no": no, "vendor": vend, "due_date": due_s,
                         "amount": amt, "match_status": match, "approval_status": appr})
    total_ap = sum(i["amount"] for i in ap_items)
    ap_overdue = sum(v for k, v in ap_aging_amt.items())
    dpo = round(total_ap / (expenses_ytd / YTD_DAYS), 1)

    # ── 5. Balance sheet ──
    accrued_income, staff_advances, security_deposits = 42_000, 18_000, 24_000
    prepaid = 38_000
    receivables_total = total_ar + accrued_income + staff_advances + security_deposits
    current_assets = [
        {"name": "Cash and Cash Equivalents", "amount": liquid_cash, "icon": "Landmark",
         "sub_items": [{"name": b["name"].split(" (")[0] + f" ({b['currency']})",
                        "amount": b["balance_myr"]} for b in bank_accounts]},
        {"name": "Trade and Other Receivables", "amount": receivables_total, "icon": "FileText",
         "sub_items": [
             {"name": "Trade Receivables", "amount": total_ar},
             {"name": "Accrued Income", "amount": accrued_income},
             {"name": "Staff Advances", "amount": staff_advances},
             {"name": "Security Deposits", "amount": security_deposits}]},
        {"name": "Inventories", "amount": PROCUREMENT_INVENTORY, "icon": "Package",
         "sub_items": [
             {"name": "Apparel & Fashion Stock", "amount": 850_000},
             {"name": "Consumer Electronics Stock", "amount": 520_000},
             {"name": "Lifestyle & Home Items", "amount": 310_000},
             {"name": "Packaging & Store POS", "amount": 170_000}]},
        {"name": "Prepaid Expenses", "amount": prepaid, "icon": "CalendarClock",
         "sub_items": [
             {"name": "Software Licenses (Prepaid)", "amount": 22_000},
             {"name": "Insurance Prepaid", "amount": 16_000}]},
    ]
    total_ca = sum(c["amount"] for c in current_assets)

    ppe_gross = 2_180_000
    accum_dep = -610_000
    non_current_assets = [
        {"name": "Property, Plant and Equipment", "amount": ppe_gross, "icon": "Building2",
         "sub_items": [
             {"name": "Office Equipment", "amount": 420_000},
             {"name": "Renovation and Fit-Out", "amount": 650_000},
             {"name": "Motor Vehicles", "amount": 280_000},
             {"name": "Computer Hardware", "amount": 330_000},
             {"name": "Software Licenses (Capitalized)", "amount": 500_000}]},
        {"name": "Accumulated Depreciation", "amount": accum_dep, "icon": "TrendingDown",
         "sub_items": [
             {"name": "Depreciation - Office Equipment", "amount": -180_000},
             {"name": "Depreciation - Motor Vehicles", "amount": -120_000},
             {"name": "Depreciation - Fit-Out", "amount": -120_000},
             {"name": "Depreciation - Computer Hardware", "amount": -190_000}]},
    ]
    total_nca = sum(c["amount"] for c in non_current_assets)
    total_assets = total_ca + total_nca

    sst_payable = 58_000
    cp204_due = 24_000
    hp_current = 41_600
    accrued_expenses = 96_000
    total_cl = total_ap + accrued_expenses + sst_payable + hp_current + cp204_due
    term_loan, hp_non_current = 640_000, 128_000
    total_liabilities = total_cl + term_loan + hp_non_current
    total_equity = total_assets - total_liabilities

    unpaid_statutory = sst_payable + cp204_due

    # ── 6. Concentration + unit economics ──
    clients = [{"name": n, "revenue_ytd": v,
                "revenue_pct": round(v / revenue_ytd * 100, 1)}
               for n, v in CLIENT_CONCENTRATION]
    variable_opex_lines = ("Sales Commission", "Freight and delivery",
                           "Total Advertisement and promotions",
                           "Total Business Development Costs")
    variable_opex_ytd = sum(b["actual_ytd"] for b in bva if b["account_name"] in variable_opex_lines)
    contribution_margin = (revenue_ytd - cogs_ytd - variable_opex_ytd) / revenue_ytd * 100
    cac, ltv = 4_200.0, 26_400.0
    unit_economics = {"gross_margin_pct": round(gross_margin, 1),
                      "contribution_margin_pct": round(contribution_margin, 1),
                      "cac": cac, "ltv": ltv, "ltv_cac_ratio": round(ltv / cac, 1)}

    # ── 7. Risk alerts (derived from computed data) ──
    risk_alerts = []
    for c in clients:
        if c["revenue_pct"] > 20:
            risk_alerts.append({"type": "concentration", "level": "warning",
                                "message": f"{c['name']} represents {c['revenue_pct']:.1f}% of YTD revenue (Concentration Risk)"})
    if aging["bucket_90_plus"] > 0:
        risk_alerts.append({"type": "ar_overdue",
                            "level": "critical" if aging["bucket_90_plus"] > 50_000 else "warning",
                            "message": f"RM {aging['bucket_90_plus']:,.0f} in receivables overdue >90 days"})
    for b in bva:
        if b["section"] == "Expenses" and b["variance_pct"] > 10 and b["budget_ytd"] >= 5_000:
            risk_alerts.append({"type": "overrun", "level": "warning",
                                "message": f"{b['account_name']} is {b['variance_pct']:.1f}% over YTD budget"})

    # ── 8. Trend series (all from the same monthly series) ──
    revenue_opex_trend = [{"month": MONTH_LABELS[m], "revenue": monthly_rev[m],
                           "opex": monthly_exp[m], "otherIncome": monthly_oi[m],
                           "net": net_monthly[m]}
                          for m in range(YTD_MONTHS)]
    tail6 = range(2, YTD_MONTHS)  # Mar..Aug
    monthly_pl_trend = [{"month": f"{MONTH_LABELS[m]} 26", "revenue": monthly_rev[m],
                         "expenses": monthly_exp[m], "net_profit": net_monthly[m]}
                        for m in tail6]
    burn_trend = [{"month": f"{MONTH_LABELS[m]} 26", "burn": monthly_exp[m]} for m in tail6]
    cash_flow_trend = [{"month": MONTH_LABELS[m], "cash": cash_end[m + 1],
                        "netFlow": net_monthly[m]} for m in range(YTD_MONTHS)]

    # 6-month forward cash forecast (fan: conservative / expected / optimistic)
    forecast = []
    paths = {"low": -42_000, "total": 86_000, "high": 168_000}
    fwd_months = ["Sep 26", "Oct 26", "Nov 26", "Dec 26", "Jan 27", "Feb 27"]
    running = {"low": liquid_cash, "total": liquid_cash, "high": liquid_cash}
    for i, mo in enumerate(fwd_months):
        pt = {"month": mo}
        for k in ("low", "total", "high"):
            drift = paths[k] + (i * 4_000 if k != "low" else -i * 2_000)
            running[k] += drift
            pt[k] = running[k]
        forecast.append(pt)

    # 13-week rolling forecast (3 scenarios, anchored on liquid cash)
    def thirteen_week(weekly_inflow: int, weekly_outflow: int, shocks: dict) -> list:
        weeks, cum = [], liquid_cash
        for w in range(1, 14):
            inflow = weekly_inflow + shocks.get(w, (0, 0))[0]
            outflow = weekly_outflow + shocks.get(w, (0, 0))[1]
            net = inflow - outflow
            cum += net
            weeks.append({"week": f"Week {w}", "inflow": inflow, "outflow": outflow,
                          "net": net, "cumulative": cum})
        return weeks

    weekly_in = r(revenue_mtd * 0.92 / 4.33)   # collections ≈ 92% of run-rate revenue
    weekly_out = r(net_monthly_burn / 4.33)
    forecast_13w = {
        "expected": thirteen_week(weekly_in, weekly_out, {5: (-30_000, 0)}),
        "conservative": thirteen_week(r(weekly_in * 0.78), weekly_out,
                                      {4: (0, sst_payable), 9: (0, cp204_due)}),
        "optimistic": thirteen_week(r(weekly_in * 1.15), r(weekly_out * 0.95), {}),
    }

    # Asset trend — 12 months ending exactly on today's BS totals
    asset_trend = []
    nca_start = total_nca + 96_000  # higher before depreciation + disposals
    ca_start = total_ca - (liquid_cash - OPENING_CASH) - 310_000
    months_12 = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
    for i, mo in enumerate(months_12):
        frac = i / 11
        asset_trend.append({"month": mo,
                            "current": r(ca_start + (total_ca - ca_start) * frac),
                            "non_current": r(nca_start + (total_nca - nca_start) * frac)})
    asset_trend[-1] = {"month": "Aug", "current": total_ca, "non_current": total_nca}

    # Fixed vs variable OPEX (August split; sums to August expenses)
    fixed_lines = ("Total for Payroll", "Total for Employee Benefits",
                   "Total for Rent, Utilities & Phone", "Total for Insurance",
                   "Software and Hosting", "Subscription fees", "Depreciation",
                   "Total for Interest costs", "Total for Finance costs")
    fixed_opex = r(sum(next(b["actual_ytd"] for b in bva if b["account_name"] == n)
                       for n in fixed_lines) / YTD_MONTHS)
    variable_opex = monthly_exp[7] - fixed_opex

    # ── 9. Compliance (Tab 5) — fictional, staff from HR seed ──
    close_checklist = [
        {"task": "Bank reconciliation — all accounts", "owner": "Grace Lim", "status": "Done", "due": "2026-09-03"},
        {"task": "AR/AP sub-ledger to GL reconciliation", "owner": "Grace Lim", "status": "Done", "due": "2026-09-04"},
        {"task": "Payroll journals posted (Aug)", "owner": "Tina Low", "status": "Done", "due": "2026-09-02"},
        {"task": "Inventory valuation roll-forward", "owner": "Grace Lim", "status": "In Progress", "due": "2026-09-08"},
        {"task": "SST-02 draft for Aug period", "owner": "Henry Koh", "status": "In Progress", "due": "2026-09-10"},
        {"task": "Management accounts pack", "owner": "Henry Koh", "status": "Pending", "due": "2026-09-12"},
    ]
    statutory_schedule = [
        {"item": "EPF / SOCSO / EIS (Aug payroll)", "due": "2026-09-15", "amount": 118_400, "status": "Upcoming"},
        {"item": "PCB / MTD (Aug payroll)", "due": "2026-09-15", "amount": 64_200, "status": "Upcoming"},
        {"item": "SST-02 return (Jul-Aug period)", "due": "2026-09-30", "amount": sst_payable, "status": "Due"},
        {"item": "CP204 instalment 9 of 12", "due": "2026-09-30", "amount": cp204_due, "status": "Due"},
        {"item": "Form E (annual employer return)", "due": "2026-03-31", "amount": 0, "status": "Filed"},
    ]
    sst_readiness = {"draft_status": "In Progress", "taxable_sales": 1_933_000,
                     "sst_liability": sst_payable}
    cp58_register = [
        {"payee": "Kreasi Media Asia (marketing subcontractor)", "ytd_paid": 86_400,
         "cp58_required": True, "status": "Tracked"},
        {"payee": "Vektor Mekatronik (installation subcontractor)", "ytd_paid": 64_200,
         "cp58_required": True, "status": "Tracked"},
        {"payee": "Ledakan Teknologi (event crew)", "ytd_paid": 52_800,
         "cp58_required": True, "status": "Pending verification"},
    ]
    wht_queue = [
        {"payee": "Apex Tech OEM Corporation (non-resident)", "type": "Royalty s109B",
         "payment": 48_000, "wht_rate_pct": 10, "wht_due": 4_800, "due_date": "2026-09-21",
         "status": "Pending"},
        {"payee": "Fujin Imaging Pte Ltd (non-resident)", "type": "Technical fees s109C",
         "payment": 26_000, "wht_rate_pct": 10, "wht_due": 2_600, "due_date": "2026-10-05",
         "status": "Draft"},
    ]
    expense_claim_audit = [
        {"employee": "Kevin Yap", "department": "Engineering", "amount": 1_240, "category": "Travel", "status": "Approved", "week": "2026-08-W3"},
        {"employee": "Luna Chong", "department": "Marketing", "amount": 3_180, "category": "Events", "status": "Approved", "week": "2026-08-W3"},
        {"employee": "Oliver Chan", "department": "Sales", "amount": 920, "category": "Client Entertainment", "status": "Flagged — missing receipt", "week": "2026-08-W4"},
        {"employee": "Marcus Sim", "department": "Operations", "amount": 460, "category": "Mileage", "status": "Pending", "week": "2026-08-W4"},
    ]

    fx_poElenaons = [
        {"currency": "USD", "long": usd_myr, "short": 0, "net": usd_myr, "bnm_fea_compliant": True},
        {"currency": "SGD", "long": 36_000, "short": 12_000, "net": 24_000, "bnm_fea_compliant": True},
    ]

    return {
        "currency": "MYR",
        "as_of": ANCHOR.isoformat(),
        "source": "fictional-demo-ledger",
        # ── Tab 1 — Executive Pulse ──
        "totalLiquidCash": liquid_cash,
        "netMonthlyBurn": net_monthly_burn,
        "cashRunwayMonths": runway_months,
        "runwayStatus": runway_status,
        "revenueMTD": revenue_mtd,
        "revenueYTD": revenue_ytd,
        "grossMargin": round(gross_margin, 1),
        "ebitdaMargin": round(ebitda_margin, 1),
        "unpaidStatutory": unpaid_statutory,
        "riskAlerts": risk_alerts,
        "revenueOpexTrend": revenue_opex_trend,
        "cashFlowTrend": cash_flow_trend,
        # ── Overview KPIs (server derives ratios from these) ──
        "totalLiabilities": total_liabilities,
        "totalEquity": total_equity,
        "totalCurrentLiabilities": total_cl,
        "apAgingByTarget": [{"label": k, "amount": v} for k, v in ap_aging_amt.items()],
        "monthlyPlTrend": monthly_pl_trend,
        # ── Cash Flow tab ──
        "arAgingByTarget": aging_by_bucket_label(aging),
        "cashFlowForecast": forecast,
        "burnTrend": burn_trend,
        "cashFlowBreakdown": _breakdown(bva, monthly_rev, monthly_exp, monthly_oi, revenue_ytd, expenses_ytd),
        # ── Tab 2 — Cash & Runway ──
        "bankAccounts": bank_accounts,
        "fxPoElenaons": fx_poElenaons,
        "forecast13w": forecast_13w,
        "fixedOpex": fixed_opex,
        "variableOpex": variable_opex,
        # ── Assets tab ──
        "currentAssets": current_assets,
        "nonCurrentAssets": non_current_assets,
        "assetTrend": asset_trend,
        "totalCurrentAssets": total_ca,
        "totalNonCurrentAssets": total_nca,
        "totalAssets": total_assets,
        # ── Tab 3 — AR & AP ──
        "totalAR": total_ar,
        "arOverdue30": ar_overdue30,
        "dso": dso,
        "totalAP": total_ap,
        "apOverdue": ap_overdue,
        "dpo": dpo,
        "arAging": aging,
        "dunningQueue": dunning_queue,
        "arInvoices": ar_items,
        "apBills": ap_items,
        # ── Tab 4 — BvA & Unit Economics ──
        "bvaLineItems": bva,
        "unitEconomics": unit_economics,
        "clientConcentration": clients,
        # ── Tab 5 — Close & Tax ──
        "closeChecklist": close_checklist,
        "statutorySchedule": statutory_schedule,
        "sstReadiness": sst_readiness,
        "cp58Register": cp58_register,
        "whtQueue": wht_queue,
        "expenseClaimAudit": expense_claim_audit,
    }


def _breakdown(bva, monthly_rev, monthly_exp, monthly_oi, revenue_ytd, expenses_ytd) -> dict:
    """Cash flow breakdown by P&L account — YTD + MTD (August) shares."""
    income, expenses = [], []
    for b in bva:
        if b["section"] in ("Revenue", "Other Income"):
            income.append({"category": b["account_name"], "actual_ytd": b["actual_ytd"],
                           "actual_mtd": r(b["monthly_budget"][7] * _att(b)),
                           "pct_of_total": round(b["actual_ytd"] / (revenue_ytd + sum(
                               x["actual_ytd"] for x in bva if x["section"] == "Other Income")) * 100, 1)})
        else:
            expenses.append({"category": b["account_name"], "actual_ytd": b["actual_ytd"],
                             "actual_mtd": r(b["monthly_budget"][7] * _att(b)),
                             "pct_of_total": round(b["actual_ytd"] / expenses_ytd * 100, 1)})
    return {"income": income, "expenses": expenses,
            "income_total_ytd": sum(i["actual_ytd"] for i in income),
            "income_total_mtd": sum(i["actual_mtd"] for i in income),
            "expense_total_ytd": expenses_ytd,
            "expense_total_mtd": monthly_exp[7]}


def _att(b: dict) -> float:
    return attainment(b["section"], b["account_name"])


def validate(mock: dict) -> list:
    """Return list of invariant violations (empty = all aligned)."""
    errs = []
    def chk(cond, msg):
        if not cond:
            errs.append(msg)

    chk(mock["totalAssets"] == mock["totalCurrentAssets"] + mock["totalNonCurrentAssets"],
        "totalAssets != CA + NCA")
    chk(mock["totalAssets"] == mock["totalLiabilities"] + mock["totalEquity"],
        "BS identity broken: assets != liabilities + equity")
    chk(sum(b["balance_myr"] for b in mock["bankAccounts"]) == mock["totalLiquidCash"],
        "bank balances != totalLiquidCash")
    chk(mock["arAging"]["bucket_0_30"] + mock["arAging"]["bucket_31_60"] +
        mock["arAging"]["bucket_61_90"] + mock["arAging"]["bucket_90_plus"] == mock["totalAR"],
        "AR aging buckets != totalAR")
    chk(sum(i["amount"] for i in mock["arInvoices"]) == mock["totalAR"], "AR invoices != totalAR")
    chk(sum(i["amount"] for i in mock["apBills"]) == mock["totalAP"], "AP bills != totalAP")
    chk(sum(t["revenue"] for t in mock["revenueOpexTrend"]) == mock["revenueYTD"],
        "monthly revenue series != revenueYTD")
    chk(mock["revenueOpexTrend"][-1]["revenue"] == mock["revenueMTD"], "August revenue != revenueMTD")
    rev_lines = sum(b["actual_ytd"] for b in mock["bvaLineItems"] if b["section"] == "Revenue")
    chk(rev_lines == mock["revenueYTD"], "BvA revenue lines != revenueYTD")
    chk(mock["cashFlowTrend"][-1]["cash"] == mock["totalLiquidCash"],
        "cash trend ending balance != totalLiquidCash")
    chk(mock["assetTrend"][-1]["current"] == mock["totalCurrentAssets"],
        "asset trend Aug current != totalCurrentAssets")
    chk(mock["assetTrend"][-1]["non_current"] == mock["totalNonCurrentAssets"],
        "asset trend Aug non-current != totalNonCurrentAssets")
    chk(mock["forecast13w"]["expected"][0]["cumulative"] ==
        mock["totalLiquidCash"] + mock["forecast13w"]["expected"][0]["net"],
        "13w forecast not anchored on liquid cash")
    for c in mock["clientConcentration"]:
        chk(abs(c["revenue_pct"] - round(c["revenue_ytd"] / mock["revenueYTD"] * 100, 1)) < 0.05,
            f"concentration pct wrong for {c['name']}")
    for t in mock["revenueOpexTrend"]:
        chk(t["net"] == t["revenue"] - t["opex"] + t.get("otherIncome", 0),
            f"net != revenue - opex + otherIncome in {t['month']}")
    chk(mock["unitEconomics"]["ltv_cac_ratio"] == round(mock["unitEconomics"]["ltv"] / mock["unitEconomics"]["cac"], 1),
        "LTV:CAC ratio inconsistent")
    chk(all(p["low"] <= p["total"] <= p["high"] for p in mock["cashFlowForecast"]),
        "cashFlowForecast fan order broken (low <= total <= high)")
    inv_sum = sum(c["amount"] for c in mock["currentAssets"])
    chk(inv_sum == mock["totalCurrentAssets"], "currentAssets categories != totalCurrentAssets")
    nca_sum = sum(c["amount"] for c in mock["nonCurrentAssets"])
    chk(nca_sum == mock["totalNonCurrentAssets"], "nonCurrentAssets categories != totalNonCurrentAssets")
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="validate only, do not write")
    args = ap.parse_args()

    with open(TARGET, "r", encoding="utf-8") as f:
        data = json.load(f)

    mock = build(data)
    errs = validate(mock)
    if errs:
        print("INVARIANT VIOLATIONS:")
        for e in errs:
            print("  ✗", e)
        return 1

    print(f"✓ All invariants hold")
    print(f"  revenueYTD    RM {mock['revenueYTD']:>12,}   revenueMTD RM {mock['revenueMTD']:>9,}")
    print(f"  expensesYTD   RM {sum(t['opex'] for t in mock['revenueOpexTrend']):>12,}   netProfitYTD RM {sum(t['net'] for t in mock['revenueOpexTrend']):>9,}")
    print(f"  liquidCash    RM {mock['totalLiquidCash']:>12,}   burn/mo    RM {mock['netMonthlyBurn']:>9,}   runway {mock['cashRunwayMonths']}mo ({mock['runwayStatus']})")
    print(f"  totalAR       RM {mock['totalAR']:>12,}   totalAP    RM {mock['totalAP']:>9,}   DSO {mock['dso']}d / DPO {mock['dpo']}d")
    print(f"  totalAssets   RM {mock['totalAssets']:>12,}   equity     RM {mock['totalEquity']:>9,}   liabilities RM {mock['totalLiabilities']:>7,}")
    print(f"  grossMargin   {mock['grossMargin']}%   EBITDA {mock['ebitdaMargin']}%   riskAlerts: {len(mock['riskAlerts'])}")

    if args.check:
        return 0

    data["dashboard_mock"] = mock
    with open(TARGET, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"✓ Wrote {TARGET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
