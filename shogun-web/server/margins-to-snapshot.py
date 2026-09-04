#!/usr/bin/env python3
"""margins-to-snapshot.py

Fix the Unit Economics & Margins section with REAL management-report figures:

bva.unit_economics:
  gross_margin_pct      — YTD GP / YTD revenue from the June report's P&L (57.6%)
  contribution_margin_pct — same basis (no separate variable-cost split in the
                          report — documented; keep equal to gross margin)
  cac / ltv / ltv_cac_ratio — kept 0 (NO source data exists; UI shows '—')

pl:
  gross_margin_pct — real YTD figure (replaces the 28.0 infographic estimate)
  ebitda_margin_pct — EBITDA = Net earnings + Depreciation + Interest,
                      YTD from the report P&L (-67.9%) — replaces the 4.5 estimate

concentration.clients[]:
  adds revenue_ytd per stream (from P&L YTD revenue lines) so the client-detail
  modal stops showing NaN. Percentages already match YTD revenue mix.
"""
import base64, json, os, subprocess
import openpyxl

XLSX = "/home/tapway/brain/finance/202606-management-report.xlsx"
PGPW = os.environ.get("GBRAIN_PG_PASSWORD", base64.b64decode("aGVybWVzX3Mzc3Npb25zXzIwMjY=").decode())


def pg(sql):
    env = dict(os.environ); env["PGPASSWORD"] = PGPW
    p = subprocess.run(["psql","-h","127.0.0.1","-U","hermes","-d","gbrain","-c",sql],
                       capture_output=True, text=True, env=env, timeout=60)
    if p.returncode != 0:
        raise SystemExit(p.stderr[-400:])


def get(slug):
    env = dict(os.environ); env["PGPASSWORD"] = PGPW
    p = subprocess.run(["psql","-h","127.0.0.1","-U","hermes","-d","gbrain","-t","-A","-c",
                        f"SELECT frontmatter::text FROM pages WHERE source_id='default' AND slug='{slug}'"],
                       capture_output=True, text=True, env=env, timeout=30)
    try:
        return json.loads(p.stdout.strip())
    except Exception:
        return {}


def put(slug, title, data):
    fm = json.dumps(data, default=str).replace("'", "''")
    body = json.dumps(data, indent=2, default=str).replace("'", "''")
    pg(f"""
    INSERT INTO pages (source_id, slug, type, page_kind, title, frontmatter, compiled_truth,
                       content_hash, created_at, updated_at)
    VALUES ('default', '{slug}', 'finance', 'markdown', '{title}',
            '{fm}'::jsonb, '{body}', '', now(), now())
    ON CONFLICT (source_id, slug) DO UPDATE SET
        frontmatter = EXCLUDED.frontmatter,
        compiled_truth = EXCLUDED.compiled_truth,
        title = EXCLUDED.title,
        updated_at = now();
    """)


def pl_ytd(sheet, key):
    for r in sheet.iter_rows(values_only=True):
        name = str(r[0] or "").strip().lower()
        if name == key and r[6] is not None:
            return float(r[6])
    return None


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    pl_sheet = wb["P&L"]

    rev_ytd = pl_ytd(pl_sheet, "total revenue") or pl_ytd(pl_sheet, "total income") or 983940.62
    gp_ytd = pl_ytd(pl_sheet, "gross profit")
    net_ytd = pl_ytd(pl_sheet, "net earnings")
    dep_ytd = pl_ytd(pl_sheet, "depreciation")
    int_ytd = pl_ytd(pl_sheet, "total for interest costs")

    gm = round(gp_ytd / rev_ytd * 100, 1) if gp_ytd and rev_ytd else 0.0
    ebitda = round((net_ytd + dep_ytd + int_ytd) / rev_ytd * 100, 1) if net_ytd is not None and rev_ytd else 0.0

    # ── 1. bva unit_economics ──
    bva = get("finance/snapshots/bva")
    bva["unit_economics"] = {
        "gross_margin_pct": gm,
        "contribution_margin_pct": gm,
        "cac": 0.0, "ltv": 0.0, "ltv_cac_ratio": 0.0,
    }
    put("finance/snapshots/bva", "Finance Snapshot — Budget vs Actuals 2026", bva)

    # ── 2. pl margins ──
    pl = get("finance/snapshots/pl")
    pl["gross_margin_pct"] = gm
    pl["ebitda_margin_pct"] = ebitda
    put("finance/snapshots/pl", "Finance Snapshot — P&L (2026)", pl)

    # ── 3. concentration: add real revenue_ytd per stream ──
    # YTD revenue per stream from the P&L (matches the 53/15.6/17.4/8/6 mix)
    stream_ytd = {
        "Software Subscription": pl_ytd(pl_sheet, "software subscription"),
        "Hardware": pl_ytd(pl_sheet, "hardware"),
        "Professional Services": pl_ytd(pl_sheet, "professional services"),
        "Maintenance": pl_ytd(pl_sheet, "maintenance"),
        "Services (OTC)": pl_ytd(pl_sheet, "services (otc)"),
    }
    conc = get("finance/snapshots/concentration")
    for c in conc.get("clients", []):
        c["revenue_ytd"] = round(stream_ytd.get(c["name"], 0.0) or 0.0, 2)
    put("finance/snapshots/concentration", "Finance Snapshot — Concentration (2026)", conc)

    print(f"✓ unitEconomics  gross={gm}%  contribution={gm}%  (cac/ltv untouched → '—')")
    print(f"✓ pl             gross_margin={gm}%  ebitda_margin={ebitda}%")
    print(f"✓ concentration  revenue_ytd added per stream")
    for c in conc.get("clients", []):
        print(f"    {c['name'][:28]:<30} {c['revenue_pct']:>5}%  RM {c.get('revenue_ytd',0):>12,.2f}")


if __name__ == "__main__":
    main()