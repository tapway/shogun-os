![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Stock Movement Audit

> Record and audit inventory movements — receives, issues, adjustments, returns, and damage — with an immutable audit trail.

## What It Does

Appends immutable stock movement log entries to `procurement/stock-movements/` in gbrain. Each entry records SKU, movement type, quantity, reference ID (PO or ticket), location, and actor. After logging, atomically updates the running stock level on the item's master page, creating a complete tamper-evident audit trail for shrinkage control.

## Quick Example

```
"Record a stock receipt for PO-2026-0312"
  │
  ├── SKU-001: 200 units received at LOC-MAIN-A1
  ├── proc_record_stock_movement(type="receive", qty=200, ref="PO-2026-0312")
  ├── proc_update_stock(sku="SKU-001", delta=+200)
  ├── Movement ID: MOV-20260904-SKU001-001
  └── ✅ SKU-001 stock: 5 → 205 units
```

## When to Use / When NOT To

**Use when:**
- Goods received against a Purchase Order (GRN)
- Stock issued to a department or project
- Inventory adjustment after physical stock count
- Damaged or scrapped goods need logging

**Don't use for:**
- Creating or editing SKU master records → use inventory-item-management

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `proc_record_stock_movement`, `proc_update_stock`, `proc_get_item`
- [ ] gbrain `procurement` source

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A |
| Related Skills | inventory-item-management, location-binning, reorder-alert-watchdog |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — immutable movement log, atomic stock updates, damage flagging |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
