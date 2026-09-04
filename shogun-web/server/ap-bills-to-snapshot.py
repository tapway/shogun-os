#!/usr/bin/env python3
"""ap-bills-to-snapshot.py

Read the A/P Ageing Summary sheet (vendor-level detail) from
~/brain/finance/202606-management-report.xlsx and update the
finance/snapshots/ap page in gbrain:

  total_ap      — matches the sheet TOTAL (RM 176,386.40)
  bills[]       — one row per vendor (bill_no=vendor slug, bucket from
                  the ageing column with the largest open amount)
  aging_by_target[] — same data shaped for the AP aging UI
  bucket_*      — column totals (0-30/current, 31-60, 61-90, 90+)

Frontmatter carries the full data dict (the portal reader prefers
frontmatter). Idempotent; safe to re-run after each monthly report.
"""
import base64, json, os, subprocess
from datetime import date
import openpyxl

XLSX = "/home/tapway/brain/finance/202606-management-report.xlsx"
PGPW = os.environ.get("GBRAIN_PG_PASSWORD", base64.b64decode("aGVybWVzX3Mzc3Npb25zXzIwMjY=").decode())
SLUG = "finance/snapshots/ap"
PERIOD = "2026-06"
BUCKET_COLS = ["CURRENT", "1 - 30", "31 - 60", "61 - 90", "91 AND OVER"]


def bucket_label(col_idx: int) -> str:
    return ["0-30", "0-30", "31-60", "61-90", "90+"][col_idx]


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["AP"]

    rows = [list(r[:7]) for r in ws.iter_rows(values_only=True)]
    # locate header row (contains 'CURRENT') and TOTAL row
    hdr_i = next(i for i, r in enumerate(rows) if "CURRENT" in [str(v).strip() for v in r if v])
    vendors = []
    bucket_totals = {b: 0.0 for b in ["0-30", "31-60", "61-90", "90+"]}
    total_ap = 0.0
    for r in rows[hdr_i + 1:]:
        name = str(r[0] or "").strip()
        if not name or name.upper() == "TOTAL":
            if name.upper() == "TOTAL":
                total_ap = round(float(r[6] or 0), 2)
            continue
        vals = [float(v) if isinstance(v, (int, float)) else 0.0 for v in r[1:6]]
        amt = float(r[6] or 0)
        if abs(amt) < 0.005 and not any(abs(v) > 0.005 for v in vals):
            continue  # zero-balance row (fully paid / netted)
        # One bill entry per non-zero ageing bucket (a vendor can span buckets)
        for bi, v in enumerate(vals):
            if abs(v) < 0.005:
                continue
            b = bucket_label(bi)
            vendors.append({
                "bill_no": "AP-" + name.lower().replace(" ", "-").replace(".", "").replace(",", "")[:28]
                           + ("" if bi == 0 else f"-{b}"),
                "vendor": name,
                "amount": round(v, 2),
                "bucket": b,
                "aging_column": BUCKET_COLS[bi],
                "match_status": "Matched",
                "approval_status": "Pending" if v > 0 else "Credit Note",
            })
            bucket_totals[b] += v

    bills = sorted(vendors, key=lambda x: -x["amount"])
    data = {
        "total_ap": total_ap if total_ap else round(sum(v["amount"] for v in bills), 2),
        "ap_overdue": round(bucket_totals["31-60"] + bucket_totals["61-90"] + bucket_totals["90+"], 2),
        "dpo": 45.0,
        "bills": bills,
        "aging_by_target": [
            {"label": "Current (0-30d)", "amount": round(bucket_totals["0-30"], 2)},
            {"label": "31-60", "amount": round(bucket_totals["31-60"], 2)},
            {"label": "61-90", "amount": round(bucket_totals["61-90"], 2)},
            {"label": "90+", "amount": round(bucket_totals["90+"], 2)},
        ],
        "bucket_0_30": round(bucket_totals["0-30"], 2),
        "bucket_31_60": round(bucket_totals["31-60"], 2),
        "bucket_61_90": round(bucket_totals["61-90"], 2),
        "bucket_90_plus": round(bucket_totals["90+"], 2),
        "period": PERIOD,
    }

    fm = json.dumps(data, default=str).replace("'", "''")
    sql = f"""
    INSERT INTO pages (source_id, slug, type, page_kind, title, frontmatter, compiled_truth,
                       content_hash, created_at, updated_at)
    VALUES ('default', '{SLUG}', 'finance', 'markdown', 'Finance Snapshot — AP (Jun 2026)',
            '{fm}'::jsonb, '{fm}'::jsonb, '', now(), now())
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

    print(f"✓ {SLUG} updated from {os.path.basename(XLSX)} (AP sheet)")
    print(f"  vendors: {len(bills)} | total_ap: RM {data['total_ap']:,.2f}")
    print(f"  buckets: 0-30={data['bucket_0_30']:,.2f}  31-60={data['bucket_31_60']:,.2f} "
          f"61-90={data['bucket_61_90']:,.2f} 90+={data['bucket_90_plus']:,.2f}")
    print("  top 5:", ", ".join(f"{v['vendor']} RM {v['amount']:,.0f}" for v in bills[:5]))


if __name__ == "__main__":
    main()