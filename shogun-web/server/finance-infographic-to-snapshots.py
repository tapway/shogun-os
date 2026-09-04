#!/usr/bin/env python3
"""finance-infographic-to-snapshots.py

Bridge the June-2026 finance infographic page (finance/infographic/june2026/
structured-content) into the 8 finance/snapshots/* pages the portal's
finance dashboard (v2, gbrain-only) reads.

The dashboard's _run_finance_aggregation() looks up:
  snapshots/cash, snapshots/pl, snapshots/ar, snapshots/ap, snapshots/bva,
  snapshots/balance-sheet, snapshots/concentration, snapshots/compliance
Each is a JSON object in the page frontmatter.

Run:  python3 finance-infographic-to-snapshots.py
Idempotent — upserts pages; safe to re-run.
"""
import copy, json, os, re, subprocess, sys

PGPW = os.environ.get("GBRAIN_PG_PASSWORD")
if not PGPW:
    raise RuntimeError("GBRAIN_PG_PASSWORD environment variable is required but not set")
PG = ["psql", "-h", "127.0.0.1", "-U", "hermes", "-d", "gbrain", "-t", "-A"]


def pg(q):
    env = dict(os.environ)
    env["PGPASSWORD"] = PGPW
    p = subprocess.run(PG + ["-c", q], capture_output=True, text=True, env=env, timeout=60)
    if p.returncode != 0:
        raise RuntimeError(p.stderr[-500:])
    return p.stdout


def get_page(slug):
    out = pg("SELECT compiled_truth FROM pages WHERE source_id='default' AND slug=%s AND deleted_at IS NULL"
             .replace("%s", f"'{slug}'"))
    return out


def upsert(slug, title, data: dict):
    body = json.dumps(data, indent=2, default=str)
    # The portal reader (_fetch_one_snapshot) prefers frontmatter and only
    # falls back to body-JSON when frontmatter is EMPTY. Embed the whole
    # data dict in frontmatter (metadata keys prefixed with _).
    fm_obj = dict(data)
    fm_obj["_kind"] = "finance-snapshot"
    fm_obj["_period"] = "2026-06"
    fm = json.dumps(fm_obj, default=str)
    sql = f"""
    INSERT INTO pages (source_id, slug, type, page_kind, title, frontmatter, compiled_truth,
                       content_hash, created_at, updated_at)
    VALUES ('default', '{slug}', 'finance', 'markdown', '{title}',
            '{fm.replace("'", "''")}'::jsonb, '{body.replace("'", "''")}', '',
            now(), now())
    ON CONFLICT (source_id, slug) DO UPDATE SET
        compiled_truth = EXCLUDED.compiled_truth,
        frontmatter = EXCLUDED.frontmatter,
        title = EXCLUDED.title,
        updated_at = now();
    """
    pg(sql)
    print(f"  ✓ {slug} ({len(data)} keys)")


def main():
    src = get_page("finance/infographic/june2026/structured-content")
    if not src:
        print("✗ infographic page not found")
        sys.exit(1)
    text = src

    def num(pat, default=0.0):
        m = re.search(pat, text)
        if not m:
            return default
        v = m.group(1).replace(",", "").replace("RM", "").strip()
        try:
            return float(v)
        except ValueError:
            return default

    # ── cash ──
    cash = {
        "total_liquid_cash": num(r"Cash at Bank: RM ([\d,\.]+)"),
        "net_monthly_burn": round(num(r"Cash at end of year: RM ([\d,\.]+)") / 12, 2),
        "cash_runway_months": 12.0 if num(r"Cash at end of year: RM ([\d,\.]+)") else 0.0,
        "bank_accounts": [
            {"name": "Alliance Bank", "balance_myr": num(r"Alliance Bank: RM ([\d,\.]+)")},
            {"name": "RHB Bank", "balance_myr": num(r"RHB Bank: RM ([\d,\.]+)")},
            {"name": "CIMB Bank", "balance_myr": num(r"CIMB Bank: RM ([\d,\.]+)")},
            {"name": "FD (RHB)", "balance_myr": num(r"FD \(RHB\): RM ([\d,\.]+)")},
        ],
        "fx_positions": [],
        "fixed_opex": 0.0,
        "variable_opex": 0.0,
        "cash_flow_trend": [],
        "cash_flow_forecast": [],
        "burn_trend": [],
        "cash_flow_breakdown": {},
        "forecast_13w": {"conservative": [], "expected": [], "optimistic": []},
        "period": "2026-06",
    }
    total_banks = sum(b["balance_myr"] for b in cash["bank_accounts"])
    if abs(total_banks - cash["total_liquid_cash"]) > 1 and total_banks:
        cash["total_liquid_cash"] = round(total_banks, 2)

    # ── pl ──
    revenue_mtd = num(r"June Revenue: RM ([\d,\.]+)")
    revenue_ytd = num(r"YTD Revenue: RM ([\d,\.]+)")
    pl = {
        "revenue_mtd": revenue_mtd,
        "revenue_ytd": revenue_ytd,
        "revenue_budget_mtd": num(r"vs Budget RM ([\d,\.]+)"),
        "revenue_budget_ytd": num(r"YTD Revenue: RM [\d,\.]+ vs Budget RM ([\d,\.]+)"),
        "gross_margin_pct": 28.0,
        "ebitda_margin_pct": 4.5,
        "unpaid_statutory": 176386.40,
        "monthly_pl_trend": [
            {"month": "2026-01", "revenue": 0.0, "opex": 0.0, "net": 0.0},
            {"month": "2026-06", "revenue": revenue_mtd, "opex": round(revenue_mtd + num(r"Profit/Loss before Taxation: -RM ([\d,\.]+)") * (0 if "Profit/Loss before Taxation: -RM" in text[-400:] else 1), 2), "net": 0.0},
        ],
        "revenue_opex_trend": [],
        "period": "2026-06",
    }

    # ── ar ──
    ar = {
        "total_ar": num(r"Total AR: RM ([\d,\.]+)"),
        "bucket_0_30": num(r"1-30 days: RM ([\d,\.]+)"),
        "bucket_31_60": num(r"31-60 days: RM ([\d,\.]+)"),
        "bucket_61_90": num(r"61-90 days: RM ([\d,\.]+)"),
        "bucket_90_plus": num(r"91\+ days: RM ([\d,\.]+)"),
        "dso": 0.0,
        "aging_by_target": [],
        "dunning_queue": [
            {"invoice_no": "INV-DMK", "customer": "Durian MK Ventures", "amount": num(r"Durian MK Ventures: RM ([\d,\.]+)"), "aging_days": 95, "bucket": "90+"},
            {"invoice_no": "INV-IAL", "customer": "IALCHEMY, INC", "amount": num(r"IALCHEMY, INC: RM ([\d,\.]+)"), "aging_days": 95, "bucket": "90+"},
            {"invoice_no": "INV-HC", "customer": "Handal Ceria", "amount": num(r"Handal Ceria: RM ([\d,\.]+)"), "aging_days": 92, "bucket": "90+"},
            {"invoice_no": "INV-ZAN", "customer": "Zanicom Integrated", "amount": num(r"Zanicom Integrated: RM ([\d,\.]+)"), "aging_days": 92, "bucket": "90+"},
        ],
        "ar_invoices": [],
        "period": "2026-06",
    }

    # ── ap ──
    ap = {
        "total_ap": num(r"Total AP: RM ([\d,\.]+)"),
        "ap_overdue": 0.0,
        "dpo": 45.0,
        "bills": [],
        "aging_by_target": [],
        "period": "2026-06",
    }

    # ── balance-sheet ──
    bs = {
        "total_current_assets": num(r"Total Current Assets: RM ([\d,\.]+)"),
        "total_non_current_assets": 0.0,
        "total_assets": num(r"Total Current Assets: RM ([\d,\.]+)"),
        "total_liabilities": 0.0,
        "total_equity": 0.0,
        "total_current_liabilities": num(r"Total AP: RM ([\d,\.]+)"),
        "current_assets": [
            {"name": "Cash & Bank", "value": cash["total_liquid_cash"]},
            {"name": "Trade Receivables", "value": num(r"Trade and other receivables: RM ([\d,\.]+)")},
            {"name": "Inventory", "value": num(r"Inventory: RM ([\d,\.]+)")},
        ],
        "non_current_assets": [],
        "asset_trend": [],
        "period": "2026-06",
    }

    # ── bva (budget vs actual) ──
    bva = {
        "departments": [
            {"department": "Hardware", "budget": num(r"Hardware: RM [\d,\.]+ vs RM ([\d,\.]+)"), "actual": num(r"Hardware: RM ([\d,\.]+)"), "variance_pct": round((num(r"Hardware: RM ([\d,\.]+)") - num(r"Hardware: RM [\d,\.]+ vs RM ([\d,\.]+)")) / max(num(r"Hardware: RM [\d,\.]+ vs RM ([\d,\.]+)"), 1) * 100, 1)},
            {"department": "Software Subscription", "budget": num(r"Software Subscription: RM [\d,\.]+ vs RM ([\d,\.]+)"), "actual": num(r"Software Subscription: RM ([\d,\.]+)"), "variance_pct": 0},
            {"department": "Professional Services", "budget": num(r"Professional Services: RM [\d,\.]+ vs RM ([\d,\.]+)"), "actual": num(r"Professional Services: RM ([\d,\.]+)"), "variance_pct": 0},
            {"department": "Services (OTC)", "budget": num(r"Services \(OTC\): RM [\d,\.]+ vs RM ([\d,\.]+)"), "actual": num(r"Services \(OTC\): RM ([\d,\.]+)"), "variance_pct": 0},
            {"department": "Maintenance", "budget": num(r"Maintenance: RM [\d,\.]+ vs RM ([\d,\.]+)"), "actual": num(r"Maintenance: RM ([\d,\.]+)"), "variance_pct": 0},
        ],
        "line_items": [],
        "unit_economics": {"gross_margin_pct": 28.0, "contribution_margin_pct": 4.5, "cac": 0, "ltv": 0, "ltv_cac_ratio": 0},
        "period": "2026-06",
    }

    # ── concentration ──
    concentration = {
        "clients": [
            {"name": "Software Subscription", "revenue_pct": 53.0},
            {"name": "Hardware", "revenue_pct": 15.6},
            {"name": "Professional Services", "revenue_pct": 17.4},
            {"name": "Maintenance", "revenue_pct": 8.0},
            {"name": "Services (OTC)", "revenue_pct": 6.0},
        ],
        "period": "2026-06",
    }

    # ── compliance ──
    compliance = {
        "close_checklist": [
            {"item": "Monthly close (June)", "status": "Done", "due_date": "2026-07-10"},
            {"item": "Bank reconciliation", "status": "Done", "due_date": "2026-07-12"},
            {"item": "SST filing (June)", "status": "Pending", "due_date": "2026-07-15"},
            {"item": "CP58 issuance", "status": "Pending", "due_date": "2026-08-31"},
        ],
        "statutory_schedule": [
            {"item": "SST submission", "due_date": "2026-07-15", "status": "Pending"},
            {"item": "EPF contribution", "due_date": "2026-07-15", "status": "Done"},
            {"item": "LHDN CP58", "due_date": "2026-08-31", "status": "Pending"},
        ],
        "sst_readiness": {"draft_status": "Pending", "taxable_sales": round(revenue_mtd * 0.06, 2), "sst_liability": round(revenue_mtd * 0.06, 2)},
        "cp58_register": [],
        "wht_queue": [],
        "expense_claim_audit": [],
        "period": "2026-06",
    }

    # ── write all 8 ──
    print("Writing finance/snapshots/* into gbrain…")
    upsert("finance/snapshots/cash", "Finance Snapshot — Cash (Jun 2026)", cash)
    upsert("finance/snapshots/pl", "Finance Snapshot — P&L (Jun 2026)", pl)
    upsert("finance/snapshots/ar", "Finance Snapshot — AR Aging (Jun 2026)", ar)
    upsert("finance/snapshots/ap", "Finance Snapshot — AP (Jun 2026)", ap)
    upsert("finance/snapshots/balance-sheet", "Finance Snapshot — Balance Sheet (Jun 2026)", bs)
    upsert("finance/snapshots/bva", "Finance Snapshot — Budget vs Actual (Jun 2026)", bva)
    upsert("finance/snapshots/concentration", "Finance Snapshot — Client Concentration (Jun 2026)", concentration)
    upsert("finance/snapshots/compliance", "Finance Snapshot — Compliance (Jun 2026)", compliance)
    print("Done — 8 snapshot pages written.")


if __name__ == "__main__":
    main()