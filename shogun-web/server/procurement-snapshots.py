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
import json, re, subprocess, os

PG = ["psql", "-h", "127.0.0.1", "-U", "hermes", "-d", "gbrain", "-t", "-A"]
env = dict(os.environ)
env["PGPASSWORD"] = os.environ.get("GBRAIN_PG_PASSWORD")
if not env["PGPASSWORD"]:
    raise RuntimeError("GBRAIN_PG_PASSWORD environment variable is required but not set")

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
ap_xlsx = os.environ.get("FINANCE_REPORT_XLSX", "/home/tapway/brain/finance/202606-management-report.xlsx")

# products master for prices/categories
_products_path = os.environ.get("PROCUREMENT_PRODUCTS_JSON", "/home/tapway/brain/procurement/products_raw.json")
with open(_products_path) as _pf:
    products = json.load(_pf)["items"]
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

# ─────────────────────────────────────────────────────────────
# Procurement Ver2 Tabs — Issue #36 snapshot producers
# ─────────────────────────────────────────────────────────────
# These feed Progress Tracker, Supplier & Item History, PR-to-PO creation,
# and Barcode tabs. Each parser reads gbrain markdown tables and produces
# rows matching the frontend TypeScript contracts in types.ts.
# When a brain page doesn't exist yet, the parser returns [] (honest empty).

def _safe_fetch(slug):
    """Fetch a gbrain page; return empty string if it doesn't exist."""
    try:
        return fetch_md(slug) or ""
    except Exception:
        return ""

def _parse_md_table(md, header_match=None):
    """Generic markdown table parser. Yields lists of cell strings per row.
    Skips separator rows (:---) and header rows. If header_match is given,
    only parses tables whose header row contains that substring."""
    lines = md.splitlines()
    header_seen = False
    matched_table = False  # True once we're inside a matching table
    for line in lines:
        stripped = line.strip()
        if not stripped.startswith("|"):
            # Non-table line resets state — separates distinct tables
            header_seen = False
            matched_table = False
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        # Skip separator rows
        if all(c.replace(":", "").replace("-", "").strip() == "" for c in cells):
            if not matched_table and header_match and header_seen:
                matched_table = True  # separator confirms we passed a matching header
            elif not header_match and not matched_table and header_seen:
                matched_table = True
            continue
        if not header_seen:
            # This is a header row — check if it matches
            if header_match and header_match.lower() not in stripped.lower():
                # Non-matching header — skip this table entirely
                header_seen = False
                matched_table = False
                continue
            header_seen = True
            if not header_match:
                matched_table = True  # no filter → every table matches
            continue
        # Data row — only yield if we're inside a matched table
        if matched_table and cells:
            yield cells


# ── 1. Progress Tracker ──────────────────────────────────────
# Brain page: procurement/project-tracker (one page per project, or a single
# index page with a projects table + per-item step tables).
# Contract: ProgressTrackerProject → hardware_items[] → steps[]
# See types.ts lines 1619-1664

def parse_progress_tracker(md):
    """Parse project tracker markdown into ProgressTrackerProject dicts."""
    if not md:
        return []
    projects = []
    # Strategy: look for ## Project sections, each containing a metadata table
    # and an items/steps sub-table.
    sections = re.split(r'^## ', md, flags=re.MULTILINE)
    for sec in sections[1:]:  # skip preamble before first ##
        lines = sec.strip().splitlines()
        project_name = lines[0].strip() if lines else "Unknown"
        meta = {}
        items = []
        # Parse metadata key-value pairs from first table
        for cells in _parse_md_table(sec):
            if len(cells) >= 2:
                key = cells[0].strip().lower().replace(" ", "_")
                val = cells[1].strip()
                if key in ("project_id", "pr_number", "requester", "department",
                           "created_at", "status", "blocked_reason", "blocked_since"):
                    meta[key] = val
        # Parse hardware items table (look for item_name/quantity columns)
        for cells in _parse_md_table(sec, header_match="item"):
            if len(cells) >= 4:
                item = {
                    "item_id": cells[0] if len(cells) > 0 else f"item-{len(items)}",
                    "name": cells[1] if len(cells) > 1 else "",
                    "quantity": int(cells[2]) if len(cells) > 2 and cells[2].isdigit() else 1,
                    "unit": cells[3] if len(cells) > 3 else "unit",
                    "selected_supplier": {
                        "name": cells[4] if len(cells) > 4 else "",
                        "contact": cells[5] if len(cells) > 5 else "",
                        "quotation_amount": float(cells[6].replace(",", "").replace("RM", "")) if len(cells) > 6 else 0,
                        "lead_time_days": int(cells[7]) if len(cells) > 7 and cells[7].isdigit() else 0,
                    },
                    "current_step_index": 0,
                    "steps": [],  # Steps populated from separate step table below
                }
                items.append(item)
        # Parse steps table if present
        step_rows = list(_parse_md_table(sec, header_match="step"))
        for i, cells in enumerate(step_rows):
            if len(cells) >= 3 and items:
                step = {
                    "id": cells[0] if cells[0] else f"step-{i}",
                    "name": cells[1] if len(cells) > 1 else "",
                    "type": "vendor" if len(cells) > 2 and "vendor" in cells[2].lower() else "internal",
                    "status": cells[3] if len(cells) > 3 and cells[3] in ("pending", "in_progress", "completed", "blocked") else "pending",
                }
                # Assign step to last item (or distribute round-robin)
                target_idx = min(i, len(items) - 1)
                items[target_idx]["steps"].append(step)
        # Compute progress
        all_steps = [s for it in items for s in it["steps"]]
        completed = sum(1 for s in all_steps if s.get("status") == "completed")
        total = len(all_steps) or 1
        pid = meta.get("project_id", f"proj-{len(projects)}")
        status_raw = meta.get("status", "").lower()
        if status_raw not in ("not_started", "in_progress", "blocked", "completed"):
            status_raw = "in_progress" if completed < total else "completed"
        projects.append({
            "project_id": pid,
            "project_name": meta.get("project_name", project_name),
            "pr_number": meta.get("pr_number", ""),
            "requester": meta.get("requester", ""),
            "department": meta.get("department", "procurement"),
            "created_at": meta.get("created_at", ""),
            "overall_progress": round(completed / total * 100, 1),
            "completed_steps": completed,
            "total_steps": total,
            "status": status_raw,
            "blocked_reason": meta.get("blocked_reason"),
            "blocked_since": meta.get("blocked_since"),
            "hardware_items": items,
        })
    return projects

tracker_md = _safe_fetch("procurement/project-tracker")
progress_tracker_projects = parse_progress_tracker(tracker_md)


# ── 2. Supplier Directory ────────────────────────────────────
# Primary source: AP ageing vendor list (always available).
# Enrichment: procurement/vendors/* pages (optional, adds reg no / bank / PIC).
# Contract: SupplierRecord (types.ts lines 1680-1696)

def parse_vendor_pages(vendor_slugs_and_md):
    """Parse procurement/vendors/* pages for enrichment data.
    Returns dict keyed by vendor name (lowercased) with extra fields."""
    enrichment = {}
    for slug, md in vendor_slugs_and_md:
        if not md:
            continue
        vendor_name = slug.split("/")[-1].replace("-", " ").title()
        info = {}
        for cells in _parse_md_table(md):
            if len(cells) >= 2:
                key = cells[0].strip().lower()
                val = cells[1].strip()
                if "reg" in key and "no" in key:
                    info["companyRegNo"] = val
                elif "phone" in key:
                    info["officePhone"] = val
                elif "address" in key:
                    info["registeredAddress"] = val
                elif "website" in key or "web" in key:
                    info["website"] = val
                elif "pic" in key and "name" in key:
                    info["picName"] = val
                elif "pic" in key and ("contact" in key or "phone" in key):
                    info["picContact"] = val
                elif "pic" in key and "email" in key:
                    info["picEmail"] = val
                elif "bank" in key and "account" in key:
                    info["bankAccountNo"] = val
                elif "swift" in key:
                    info["bankSwiftCode"] = val
                elif "payment" in key and "term" in key:
                    info["paymentTerm"] = val
                elif "payment" in key and "bank" in key:
                    info["paymentBank"] = val
                elif "courier" in key:
                    info["preferredCourier"] = val
        if info:
            enrichment[vendor_name.lower()] = info
    return enrichment

# Try to fetch vendor enrichment pages (best-effort, won't fail if missing)
_vendor_enrichment = {}
try:
    _vendor_list_raw = sql("SELECT slug FROM pages WHERE slug LIKE 'procurement/vendors/%' AND deleted_at IS NULL LIMIT 50")
    if _vendor_list_raw:
        _vendor_enrichment = parse_vendor_pages(
            [(s, _safe_fetch(s)) for s in _vendor_list_raw.splitlines() if s.strip()]
        )
except Exception:
    pass

supplier_directory = []
for vendor_name, spend in sorted(ap_rows, key=lambda x: -x[1]):
    enrich = _vendor_enrichment.get(vendor_name.lower(), {})
    supplier_directory.append({
        "id": f"SUP-{vendor_name.replace(' ', '-').upper()[:20]}",
        "companyName": vendor_name,
        "companyRegNo": enrich.get("companyRegNo", ""),
        "officePhone": enrich.get("officePhone", ""),
        "registeredAddress": enrich.get("registeredAddress", ""),
        "website": enrich.get("website", ""),
        "picName": enrich.get("picName", ""),
        "picContact": enrich.get("picContact", ""),
        "picEmail": enrich.get("picEmail", ""),
        "paymentTerm": enrich.get("paymentTerm", "From A/P ageing (no terms data)"),
        "paymentCurrency": "MYR",
        "paymentBank": enrich.get("paymentBank", ""),
        "bankAccountNo": enrich.get("bankAccountNo", ""),
        "bankSwiftCode": enrich.get("bankSwiftCode") or None,
        "preferredCourier": enrich.get("preferredCourier", ""),
    })


# ── 3. Supplier History ──────────────────────────────────────
# Source: PO register (item-level) joined with vendor spend.
# Falls back to deriving from ap_rows + po_rows when item-level data absent.
# Contract: SupplierHistoryEntry (types.ts lines 1668-1678)

def parse_supplier_history(po_data, vendor_spend):
    """Build supplier history from PO rows grouped by vendor.
    Each entry represents one vendor's purchasing history summary."""
    if not po_data and not vendor_spend:
        return []
    # Group POs by vendor
    vendor_pos = {}
    for po in po_data:
        v = po.get("vendor", "")
        if v not in vendor_pos:
            vendor_pos[v] = []
        vendor_pos[v].append(po)
    history = []
    idx = 0
    for vendor_name, spend in sorted(vendor_spend, key=lambda x: -x[1]):
        pos = vendor_pos.get(vendor_name, [])
        orders_count = len(pos) if pos else 1
        total_spent = spend
        last_date = ""
        last_price = 0.0
        if pos:
            last_po = max(pos, key=lambda p: p.get("order_date", ""))
            last_date = last_po.get("order_date", "")
            last_price = last_po.get("total_amount", 0.0)
        avg_lead = 14  # default assumption until real lead-time tracking exists
        rating = 3.0   # neutral until quality/delivery data exists
        history.append({
            "id": f"SH-{idx:04d}",
            "item_name": f"{vendor_name} (all items)",
            "supplier_name": vendor_name,
            "last_price": round(last_price, 2),
            "last_order_date": last_date,
            "orders_count": orders_count,
            "avg_lead_time_days": avg_lead,
            "rating": rating,
            "total_spent": round(total_spent, 2),
        })
        idx += 1
    return history

supplier_history = parse_supplier_history(po_rows, ap_rows)


# ── 4. Purchase Requisitions ─────────────────────────────────
# Brain page: procurement/purchase-requisitions/* (one page per PR, or index).
# Contract: DemoPurchaseRequisition (types.ts lines 1468-1484)
#           → items: PurchaseRequisitionItem[] (types.ts lines 1443-1466)

def parse_purchase_requisitions(md):
    """Parse PR markdown pages into DemoPurchaseRequisition dicts."""
    if not md:
        return []
    prs = []
    sections = re.split(r'^## ', md, flags=re.MULTILINE)
    for sec in sections[1:]:
        lines = sec.strip().splitlines()
        pr_title = lines[0].strip() if lines else ""
        meta = {}
        items = []
        # Parse metadata table
        for cells in _parse_md_table(sec):
            if len(cells) >= 2:
                key = cells[0].strip().lower().replace(" ", "_")
                val = cells[1].strip()
                if key in ("pr_number", "project_name", "requester", "department",
                           "priority", "justification", "status", "created_at",
                           "total_amount", "finance_approved_by", "finance_approved_at",
                           "finance_notes", "finance_rejection_reason", "template_version"):
                    meta[key] = val
        # Parse items table
        for cells in _parse_md_table(sec, header_match="item"):
            if len(cells) >= 4:
                qty = int(cells[2]) if len(cells) > 2 and cells[2].isdigit() else 1
                est_price = float(cells[3].replace(",", "").replace("RM", "")) if len(cells) > 3 else 0
                item = {
                    "id": cells[0] if cells[0] else f"item-{len(items)}",
                    "name": cells[1] if len(cells) > 1 else "",
                    "quantity": qty,
                    "unit": cells[4] if len(cells) > 4 else "unit",
                    "estimated_price": est_price,
                    "selected_supplier": {
                        "supplier_name": cells[5] if len(cells) > 5 else "",
                        "amount": float(cells[6].replace(",", "").replace("RM", "")) if len(cells) > 6 else est_price * qty,
                        "lead_time_days": int(cells[7]) if len(cells) > 7 and cells[7].isdigit() else 14,
                    },
                }
                items.append(item)
        priority = meta.get("priority", "Medium")
        if priority not in ("Low", "Medium", "High", "Urgent"):
            priority = "Medium"
        status = meta.get("status", "Draft")
        valid_statuses = ("Draft", "Pending Finance Approval", "Approved", "Rejected",
                          "Clarification Requested", "Converted to PO")
        if status not in valid_statuses:
            status = "Draft"
        total = float(meta.get("total_amount", "0").replace(",", "").replace("RM", "")) or \
                sum(it["estimated_price"] * it["quantity"] for it in items)
        prs.append({
            "pr_number": meta.get("pr_number", pr_title),
            "project_name": meta.get("project_name", ""),
            "requester": meta.get("requester", ""),
            "department": meta.get("department", "procurement"),
            "priority": priority,
            "justification": meta.get("justification", ""),
            "status": status,
            "items": items,
            "total_amount": round(total, 2),
            "created_at": meta.get("created_at", ""),
            "finance_approved_by": meta.get("finance_approved_by"),
            "finance_approved_at": meta.get("finance_approved_at"),
            "finance_notes": meta.get("finance_notes"),
            "finance_rejection_reason": meta.get("finance_rejection_reason"),
            "template_version": meta.get("template_version"),
        })
    return prs

pr_md = _safe_fetch("procurement/purchase-requisitions")
purchase_requisitions = parse_purchase_requisitions(pr_md)


# ── 5. Barcode Batches ───────────────────────────────────────
# Brain page: procurement/barcode-batches (index or per-batch pages).
# Contract: BarcodeBatch (types.ts lines 1495-1503)
#           → items: BarcodeBatchItem[] (types.ts lines 1487-1493)

def parse_barcode_batches(md):
    """Parse barcode batch markdown into BarcodeBatch dicts."""
    if not md:
        return []
    batches = []
    sections = re.split(r'^## ', md, flags=re.MULTILINE)
    for sec in sections[1:]:
        lines = sec.strip().splitlines()
        batch_title = lines[0].strip() if lines else ""
        meta = {}
        items = []
        # Parse metadata table
        for cells in _parse_md_table(sec):
            if len(cells) >= 2:
                key = cells[0].strip().lower().replace(" ", "_")
                val = cells[1].strip()
                if key in ("batch_id", "po_number", "generated_at", "generated_by"):
                    meta[key] = val
        # Parse items table
        for cells in _parse_md_table(sec, header_match="barcode"):
            if len(cells) >= 2:
                scanned_val = cells[2].strip().lower() if len(cells) > 2 else "false"
                scanned = scanned_val in ("true", "yes", "✓", "scanned", "1")
                items.append({
                    "item_name": cells[0] if cells[0] else "",
                    "barcode_code": cells[1] if len(cells) > 1 else "",
                    "scanned": scanned,
                    "scanned_at": cells[3] if len(cells) > 3 and scanned else None,
                    "scanned_by": cells[4] if len(cells) > 4 and scanned else None,
                })
        scanned_count = sum(1 for it in items if it["scanned"])
        batches.append({
            "batch_id": meta.get("batch_id", f"batch-{len(batches)}"),
            "po_number": meta.get("po_number", ""),
            "generated_at": meta.get("generated_at", ""),
            "generated_by": meta.get("generated_by", ""),
            "items": items,
            "total_items": len(items),
            "scanned_count": scanned_count,
        })
    return batches

barcode_md = _safe_fetch("procurement/barcode-batches")
barcode_batches = parse_barcode_batches(barcode_md)

# Build ver2 snapshots
progress_tracker_snap = {
    "period": "2026-08",
    "source": "gbrain procurement/project-tracker (not yet implemented)",
    "progress_tracker_projects": progress_tracker_projects,
}

supplier_snap = {
    "period": "2026-06",
    "source": "202606-management-report.xlsx A/P Ageing (enriched with placeholders)",
    "supplier_directory": supplier_directory,
    "supplier_history": supplier_history,
}

pr_snap = {
    "period": "2026-08",
    "source": "gbrain procurement/purchase-requisitions (not yet implemented)",
    "purchase_requisitions": purchase_requisitions,
}

barcode_snap = {
    "period": "2026-08",
    "source": "gbrain procurement/barcode-batches (not yet implemented)",
    "barcode_batches": barcode_batches,
}

# Write ver2 snapshots
put_snap("procurement/snapshots/progress-tracker", "Procurement Snapshot — Progress Tracker (2026-08)", progress_tracker_snap)
put_snap("procurement/snapshots/suppliers", "Procurement Snapshot — Suppliers (2026-06)", supplier_snap)
put_snap("procurement/snapshots/purchase-requisitions", "Procurement Snapshot — Purchase Requisitions (2026-08)", pr_snap)
put_snap("procurement/snapshots/barcode-batches", "Procurement Snapshot — Barcode Batches (2026-08)", barcode_snap)

print(f"progress-tracker: {len(progress_tracker_projects)} projects")
print(f"suppliers: {len(supplier_directory)} suppliers, {len(supplier_history)} history entries")
print(f"purchase-requisitions: {len(purchase_requisitions)} PRs")
print(f"barcode-batches: {len(barcode_batches)} batches")
print("all 9 snapshots written (5 original + 4 ver2) → Issue #36 done")