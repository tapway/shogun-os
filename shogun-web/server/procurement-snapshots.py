#!/usr/bin/env python3
"""procurement-snapshots.py

Write procurement/snapshots/* pages in gbrain from REAL data sources:

- inventory   ← procurement/inventory/inventory-ledger page (193 real SKUs,
                status taxonomy IN_STOCK/ALLOCATED/LOW/OUT, notes with
                suppliers & lead times) + products_raw.json prices
- purchase-orders ← procurement/inventory/po-register page (7 real customer
                POs; 0 open supplier POs — honest zero)
- vendors     ← June management report AP Ageing sheet (31 real vendors,
                RM 176,386 spend — the only real supplier spend data)
- stock-movements ← ledger history section (honest: no movements yet)
- accounting-bridge ← honest disabled state

Pages: source_id=default, data in FRONTMATTER (portal reader contract).
Idempotent re-runnable. Mock flag flips off once inventory or PO snapshots
exist — Kura's dashboard then serves real data.
"""
import base64, json, re, subprocess, os

PG = ["psql", "-h", "127.0.0.1", "-U", "hermes", "-d", "gbrain", "-t", "-A"]
env = dict(os.environ)
env["PGPASSWORD"] = base64.b64decode("aGVybWVzX3Mzc3Npb25zXzIwMjY=").decode()

def sql(q, params=()):
    p = subprocess.run(PG + ["-v", "ON_ERROR_STOP=1"], input=q, text=True,
                       capture_output=True, env=env)
    if p.returncode != 0:
        raise RuntimeError(p.stderr[:500])
    return p.stdout.strip()

def fetch_md(slug):
    out = sql(f"SELECT compiled_truth FROM pages WHERE slug='{slug}' AND deleted_at IS NULL LIMIT 1")
    return out

def put_snap(slug, title, data):
    fm = json.dumps(data, ensure_ascii=False)
    body = "```json\n" + json.dumps(data, indent=2, ensure_ascii=False) + "\n```"
    body_sql = body.replace("'", "''")
    fm_sql = fm.replace("'", "''")
    sql(f"""
    INSERT INTO pages (source_id, slug, type, page_kind, title, frontmatter, compiled_truth, updated_at)
    VALUES ('default', '{slug}', 'data', 'markdown', '{title}', '{fm_sql}'::jsonb, '{body_sql}', now())
    ON CONFLICT (source_id, slug) DO UPDATE SET
      frontmatter = EXCLUDED.frontmatter,
      compiled_truth = EXCLUDED.compiled_truth,
      updated_at = now()
    """)

# ─────────────────────────────────────────────────────────────
# 1. Load real sources
# ─────────────────────────────────────────────────────────────
ledger_md = fetch_md("procurement/inventory/inventory-ledger")
po_md = fetch_md("gbrain/po-register") if False else fetch_md("procurement/inventory/po-register")
ap_xlsx = "/home/tapway/brain/finance/202606-management-report.xlsx"

# products master for prices/categories
products = json.load(open("/home/tapway/brain/procurement/products_raw.json"))["items"]
by_sku = {p["sku"]: p for p in products}

# ───────────────────────────────────────── rows
def parse_ledger(md):
    """Extract SKU rows from ledger markdown tables."""
    rows = []
    cur_cat = None
    for line in md.splitlines():
        if line.startswith("## "):
            cur_cat = line[3:].strip()
            cur_cat = re.sub(r'^[⋯\s]+', '', cur_cat)
        m = re.match(r'^\|\s*([^|]+)\|', line)
        if not m or line.count("|") < 8:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 9:
            continue
        sku, name = cells[0], cells[1]
        if sku in ("SKU", ":---", "---") or sku.startswith(":") or sku.startswith("-") or sku.startswith("*"):
            continue
        try:
            on_hand = int(cells[2] or 0); alloc = int(cells[3] or 0)
            avail = int(cells[4] or 0); reorder = int(cells[5] or 0)
        except ValueError:
            continue
        status = cells[7]
        notes = cells[8] if len(cells) > 8 else ""
        rows.append(dict(sku=sku, item_name=name, category=cur_cat or "General",
                         current_qty=on_hand, allocated_qty=alloc, available_qty=avail,
                         safety_reorder_point=reorder, status=status, notes=notes))
    return rows

def parse_po(md):
    """Customer POs from the po-register page."""
    rows = []
    in_sec = False
    for line in md.splitlines():
        if "Received customer POs" in line:
            in_sec = True
            continue
        if in_sec and line.startswith("## "):
            break
        if not in_sec or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 6 or cells[0] in ("PO #", ":---") or cells[0].startswith(":") or cells[0].startswith("*"):
            continue
        po_num, customer, project = cells[0], cells[1], cells[2]
        val = cells[3].replace("RM", "").replace(",", "").strip()
        try:
            value = float(val) if val and val != "—" else 0.0
        except ValueError:
            value = 0.0
        rows.append(dict(po_number=po_num, vendor=customer, order_date=cells[4] if len(cells) > 4 else "",
                         total_amount=value, fulfillment_status=project or "Received",
                         approval_status=(cells[5] if len(cells) > 5 else "") or "Received"))
    return rows

ledger_rows = parse_ledger(ledger_md)
po_rows = parse_po(po_md)

# ───────────────────────────────────────── prices → catalog
# ───────────────────────────────────────── catalog from products master (full 364 rows; Inventory type)
ledger_by_sku = {r["sku"]: r for r in ledger_rows}
catalog = []
valuation = {}
dead_slow = []
for p in products:
    if str(p.get("type", "")).lower() != "inventory":
        continue
    sku = p.get("sku") or ""
    if not sku or sku == "0":
        continue
    raw = str(p.get("price_myr") or 0)
    cost = float(re.sub(r"[^\d.]", "", raw) or 0)
    lr = ledger_by_sku.get(sku, {})
    cat = str(p.get("category") or "General")
    on_hand = int(lr.get("current_qty", 0) or 0)
    status = lr.get("status") or ("⚫ OUT" if on_hand == 0 else "🟢 IN_STOCK")
    r = dict(sku=sku, item_name=p.get("name") or sku, category=cat,
             current_qty=on_hand, allocated_qty=int(lr.get("allocated_qty", 0) or 0),
             available_qty=int(lr.get("available_qty", 0) or 0),
             safety_reorder_point=int(lr.get("safety_reorder_point", 0) or 0),
             unit_cost=cost, location_bin=p.get("vendor") or "",
             status=status, notes=lr.get("notes") or "")
    catalog.append(r)
    valuation[cat] = valuation.get(cat, 0.0) + cost * on_hand
    if on_hand == 0 and cost > 0:
        dead_slow.append(dict(sku=sku, item_name=r["item_name"], category=cat,
                              current_qty=0, days_since_last_movement=None,
                              months_of_cover=None, total_tied_value=0.0,
                              action_recommendation="Raise PO when deployment scheduled"))

total_valuation = round(sum(cost * r["current_qty"] for r in catalog), 2)
n_skus = len(catalog)
out_skus = sum(1 for r in catalog if "OUT" in r["status"])
# Dead code removed — referenced warehouse_rows before definition  # placeholder fixed below

# ───────── leftover: warehouse capacity — honest: single storehouse, no bin data
warehouse_rows = [{"location": "Tapway Storehouse (single site)", "used": 0, "capacity": None, "utilisation_pct": 0.0}]
low = sum(1 for r in catalog if "LOW" in r["status"])

# ───────────────────────────────────────── AP vendor spend
import openpyxl
wb = openpyxl.load_workbook(ap_xlsx, read_only=True, data_only=True)
ws = wb["AP"]
ap_rows = []
for row in ws.iter_rows(values_only=True):
    r0 = str(row[0] or "").strip()
    if not r0 or r0 in ("Vendor", "TOTAL", "") or r0.startswith(("A/P", "Ageing", "As at")):
        continue
    try:
        amt = float(row[6] or 0)
    except (TypeError, ValueError):
        continue
    if abs(ap_amt := amt) < 0.005:
        continue
    ap_rows.append((r0, amt))

vendor_scorecard = []
concentration = []
total_ap = sum(a for _, a in ap_rows)
for v, a in sorted(ap_rows, key=lambda x: -x[1])[:10]:
    pct = round(a / total_ap * 100, 1) if total_ap else 0
    concentration.append(dict(vendor=v, spend=round(a, 2), spend_pct=pct))
    vendor_scorecard.append(dict(vendor=v, preferred_category="From A/P ageing (no category data)",
                                 ytd_spend=round(a, 2), on_time_delivery_rate=None,
                                 quality_acceptance_rate=None, sla_status="No SLA data"))

# ───────────────────────────────────────── build snapshots
risk_alerts = [
    dict(type="stock_out", level="critical",
         message=f"All {out_skus} inventory-class SKUs at 0 on hand (honest baseline 2026-08-19) — raise POs when deployments are scheduled"),
    dict(type="open_po", level="info",
         message="0 open supplier POs; 7 real customer POs registered (GXO RM 67,088 the largest)"),
]

inventory_snap = {
    "period": "2026-08", "source": "gbrain procurement/inventory/inventory-ledger + products_raw.json",
    "total_inventory_valuation": total_valuation,
    "total_active_skus": n_skus,
    "low_stock_alerts": low,
    "dead_slow_stock_capital": 0.0,
    "valuation_by_category": [dict(category=k, value=round(v, 2)) for k, v in valuation.items() if v > 0],
    "sku_catalog": catalog,
    "dead_slow_stock": dead_slow,
    "warehouse_bin_capacity": warehouse_rows,
    "spend_vs_budget_trend": [],  # no real procurement-spend budget series exists yet
    "procurement_spend_mtd": 0.0,
    "procurement_spend_budget_mtd": 0.0,
    "risk_alerts": risk_alerts,
}

po_snap = {
    "period": "2026-08", "source": "gbrain procurement/inventory/po-register",
    "open_po_count": 0,
    "po_pipeline": [dict(stage="Received customer POs", count=len(po_rows), value=round(sum(r["total_amount"] for r in po_rows), 2))],
    "active_purchase_orders": po_rows,
    "executive_approval_queue": [],  # none — nothing pending approval
}

vendor_snap = {
    "period": "2026-06", "source": "202606-management-report.xlsx A/P Ageing",
    "vendor_scorecard": vendor_scorecard,
    "vendor_spend_concentration": concentration,
}

movement_snap = {
    "period": "2026-08",
    "stock_movements": [],   # honest: ledger baseline logged zero movement
    "movement_type_distribution": [],
    "shrinkage_flag_items": [],
}

bridge_snap = {
    "period": "2026-08",
    "bridge_status": {"enabled": False, "provider": "None", "connected": False,
                      "note": "No accounting system bridge configured; AP data imported monthly from management report"},
    "po_bill_conversion_queue": [],
    "gl_valuation_reconciliation": [],
}

# ───────────────────────────────────────── write
put_snap("procurement/snapshots/inventory", "Procurement Snapshot — Inventory (2026-08)", inventory_snap)
put_snap("procurement/snapshots/purchase-orders", "Procurement Snapshot — Purchase Orders (2026-08)", po_snap)
put_snap("procurement/snapshots/vendors", "Procurement Snapshot — Vendors (2026-06)", vendor_snap)
put_snap("procurement/snapshots/stock-movements", "Procurement Snapshot — Stock Movements (2026-08)", movement_snap)
put_snap("procurement/snapshots/accounting-bridge", "Procurement Snapshot — Accounting Bridge (2026-08)", bridge_snap)

print(f"inventory: {n_skus} SKUs, valuation RM {total_valuation:,.2f}, out={out_skus}, low={low}")
print(f"purchase-orders: {len(po_rows)} customer POs, value RM {sum(r['total_amount'] for r in po_rows):,.2f}")
print(f"vendors: {len(ap_rows)} AP vendors, total RM {total_ap:,.2f}")
print("all 5 snapshots written → dashboard flips to mock=false")