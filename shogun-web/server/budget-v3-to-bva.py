#!/usr/bin/env python3
"""budget-v3-to-bva.py

Read '2026 Budget (v3).xlsx' (single 'Budget' sheet) and write the
finance/snapshots/bva page in gbrain as line_items matching the UI's
BvaLineItem contract:

  section        Revenue | Cost of Sales | Other Income | Expenses
  account_name   row label
  budget_annual  sum of the 12 monthly budget columns (col 6..18)
  budget_ytd     sum of monthly budget for Jan..(current month)
  actual_ytd     from the workbook's YTD column (col 1, Jan–May actuals)
  variance       actual_ytd - budget_ytd
  variance_pct   variance / budget_ytd * 100
  monthly_budget 12 values (cols 6..18)

The BvA tab UI groups by section (Revenue/Other Income = INCOME,
Cost of Sales/Expenses = EXPENSES), sums budget_ytd/actual_ytd per group,
and renders monthly planned vs actual from monthly_budget.

Top-level keys also written: departments[] (kept for the risk-alert path),
unit_economics (with real gross margin from GP/Revenue).

Idempotent; re-run when a new budget file lands.
"""
import base64, json, os, re, subprocess
from datetime import date
import openpyxl

XLSX = "/home/tapway/brain/finance/2026-budget-v3.xlsx"
PGPW = os.environ.get("GBRAIN_PG_PASSWORD", base64.b64decode("aGVybWVzX3Mzc3Npb25zXzIwMjY=").decode())
SLUG = "finance/snapshots/bva"
SLUG_BS = "finance/snapshots/balance-sheet"
SLUG_PL = "finance/snapshots/pl"
MONTH_IDX = date.today().month  # YTD window Jan..current month

SECTION_OF = {}  # row-name → section, filled while walking

# rows that are group headers (their children are skipped; totals rolled up)
SKIP_PREFIXES = ("     ", "\t")


def monthvals(row):
    return [float(v) if isinstance(v, (int, float)) else 0.0 for v in row[6:19]]


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Budget"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]

    # Actuals window from the header: "Jan 1 - May 31 2026 (YTD)" → 5 months.
    # The BvA tab compares budget_ytd vs actual_ytd over the SAME window.
    global MONTH_IDX
    m = re.search(r"Jan 1 - (\w+) 31", str(rows[3][1] or ""))
    if m:
        MONTH_IDX = ["January","February","March","April","May","June","July",
                     "August","September","October","November","December"].index(m.group(1).capitalize()) + 1
    print(f"  actuals YTD window: Jan..month {MONTH_IDX} (from header: {rows[3][1]!r})")

    items = []
    section = None
    totals = {}
    for r in rows:
        name = str(r[0] or "").strip()
        if not name:
            continue
        up = name.upper()

        # section markers
        if up == "REVENUE":
            section = "Revenue"; continue
        if up == "COST OF SALES":
            section = "Cost of Sales"; continue
        if up == "OTHER INCOME":
            section = "Other Income"; continue
        if up == "EXPENSES":
            section = "Expenses"; continue
        if section is None:
            continue

        mv = monthvals(r)
        ytd_actual = float(r[1]) if isinstance(r[1], (int, float)) else 0.0

        # section TOTAL lines → capture as section rollups, don't emit as line items
        is_total = up.startswith("TOTAL ") or up.startswith("TOTAL FOR ") or name.startswith("Total ") or name.startswith("Total for ")
        if is_total:
            totals[name] = {"actual_ytd": ytd_actual, "monthly": mv}
            continue
        # GP / PBT are derived lines — capture for margins, skip as line items
        if up.startswith("GROSS PROFIT") or up.startswith("NET EARNINGS"):
            totals[name] = {"actual_ytd": ytd_actual, "monthly": mv}
            continue
        # child detail lines (indented) — skip, we keep group level
        if name != r[0]:  # original had leading whitespace
            continue

        budget_annual = round(sum(mv), 2)
        budget_ytd = round(sum(mv[:MONTH_IDX]), 2)
        actual_ytd = round(ytd_actual, 2)
        variance = round(actual_ytd - budget_ytd, 2)
        variance_pct = round(variance / budget_ytd * 100, 1) if budget_ytd else 0.0
        # skip placeholder / zero-activity lines ([DO NOT USE] rows, all-zero rows)
        if "[DO NOT USE]" in name.upper() or (budget_annual == 0 and actual_ytd == 0):
            continue
        items.append({
            "section": section,
            "account_name": name,
            "budget_annual": budget_annual,
            "budget_ytd": budget_ytd,
            "actual_ytd": actual_ytd,
            "variance": variance,
            "variance_pct": variance_pct,
            "monthly_budget": [round(x, 2) for x in mv],
            "match_confidence": "high",
        })

    # ── compute real gross margin from section totals ──
    rev_act = totals.get("TOTAL REVENUE", {}).get("actual_ytd", 0.0)
    gp_act = totals.get("GROSS PROFIT (GP)", {}).get("actual_ytd", 0.0)
    gm_pct = round(gp_act / rev_act * 100, 1) if rev_act else 0.0

    data = {
        "line_items": items,
        # risk-alert path expects departments[] with variance_pct
        "departments": [
            {"department": it["account_name"], "budget": it["budget_ytd"],
             "actual": it["actual_ytd"], "variance_pct": it["variance_pct"]}
            for it in items if it["section"] == "Expenses"
        ],
        "unit_economics": {
            "gross_margin_pct": gm_pct,
            "contribution_margin_pct": gm_pct,
            "cac": 0, "ltv": 0, "ltv_cac_ratio": 0,
        },
        "section_totals": {
            k: {"actual_ytd": v["actual_ytd"], "budget_annual": round(sum(v["monthly"]), 2)}
            for k, v in totals.items()
        },
        "budget_file": os.path.basename(XLSX),
        "period": "2026",
    }

    fm = json.dumps(data, default=str).replace("'", "''")
    body = json.dumps(data, indent=2, default=str).replace("'", "''")
    sql = f"""
    INSERT INTO pages (source_id, slug, type, page_kind, title, frontmatter, compiled_truth,
                       content_hash, created_at, updated_at)
    VALUES ('default', '{SLUG}', 'finance', 'markdown', 'Finance Snapshot — Budget vs Actuals 2026',
            '{fm}'::jsonb, '{body}', '', now(), now())
    ON CONFLICT (source_id, slug) DO UPDATE SET
        frontmatter = EXCLUDED.frontmatter,
        compiled_truth = EXCLUDED.compiled_truth,
        updated_at = now();
    """
    env = dict(os.environ); env["PGPASSWORD"] = PGPW
    p = subprocess.run(["psql", "-h", "127.0.0.1", "-U", "hermes", "-d", "gbrain", "-c", sql],
                       capture_output=True, text=True, env=env, timeout=60)
    if p.returncode != 0:
        raise SystemExit(p.stderr[-400:])

    # ── report ──
    n = len(items)
    print(f"✓ {SLUG}: {n} line items from {os.path.basename(XLSX)} (YTD = Jan..month {MONTH_IDX})")
    for sec in ("Revenue", "Other Income", "Cost of Sales", "Expenses"):
        xs = [it for it in items if it["section"] == sec]
        if not xs:
            continue
        b = sum(it["budget_ytd"] for it in xs); a = sum(it["actual_ytd"] for it in xs)
        print(f"  {sec:<14} budgetYTD RM {b:>12,.0f} | actualYTD RM {a:>12,.0f} | variance {a-b:>+12,.0f}")
    print(f"  gross margin (from GP/Rev actuals): {gm_pct}%")
    print("  Revenue lines:", ", ".join(it["account_name"] for it in items if it["section"] == "Revenue"))
    print(f"  Expense lines: {sum(1 for it in items if it['section']=='Expenses')}")


if __name__ == "__main__":
    main()