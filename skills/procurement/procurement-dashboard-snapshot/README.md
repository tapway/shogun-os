![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Procurement Dashboard Snapshot

> Refreshes the Procurement dashboard with live data by writing JSON snapshots to gbrain for all 5 dashboard tabs.

## What It Does

Reads live procurement data through `proc_*` MCP tools, computes the full 5-tab dashboard payload (Pulse, Inventory Catalog, Stock Movements, PO & Vendors, Accounting Bridge), and writes machine-readable JSON snapshots to gbrain. The dashboard backend reads these slugs automatically — no backend changes needed. Falls back gracefully to mock data when snapshots are absent.

## Quick Example

```
/refresh-procurement-dashboard
  │
  ├── Reads proc_list_inventory → 142 SKUs, MYR 485,000 total
  ├── Reads proc_list_purchase_orders → 8 open POs
  ├── Reads proc_list_stock_movements → 23 movements today
  ├── Writes procurement/snapshots/inventory.json
  ├── Writes procurement/snapshots/purchase-orders.json
  ├── Writes procurement/snapshots/vendors.json
  ├── Writes procurement/snapshots/stock-movements.json
  └── Writes procurement/snapshots/accounting-bridge.json
      ✅ Dashboard now shows live data
```

## When to Use / When NOT To

**Use when:**
- Daily 7AM cron refresh before the 9AM scrum
- On-demand via `/refresh-procurement-dashboard`
- After bulk inventory or PO changes to update the dashboard

**Don't use for:**
- Real-time streaming updates (snapshots are point-in-time)
- ABC Pareto analysis (computed client-side from sku_catalog)
- Individual item lookups (use inventory-item-management instead)

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] Procurement agent gateway running (MCP tools responsive)
- [ ] MCP tools: `proc_list_inventory`, `proc_get_item`, `proc_list_purchase_orders`, `proc_list_vendors`, `proc_check_reorder_alerts`, `proc_list_stock_movements`
- [ ] For accounting tab: `ENABLE_ACCOUNTING_SYNC` and `ACCT_PROVIDER` env vars set

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | `/refresh-procurement-dashboard` |
| Related Skills | inventory-valuation-report, dead-slow-stock-detector, reorder-alert-report, stock-movement-audit, accounting-bridge-sync |

## Configuration

```bash
# Standalone script with dry-run
python skills/procurement/procurement-dashboard-snapshot/scripts/write_snapshots.py --dry-run
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 5-tab snapshot writer, idempotent, empty-brain-safe |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
