![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Inventory Item Management

> Create, read, and update inventory item brain pages — SKU master data, stock levels, reorder points, vendor, and bin assignment.

## What It Does

Maintains inventory item records under `procurement/items/<SKU>.md` in gbrain. Each page stores SKU, name, category, current stock, unit cost, reorder point, safety stock, preferred vendor, and bin location as YAML frontmatter. Ensures frontmatter compliance and prevents duplicate SKU creation.

## Quick Example

```
"Add a new inventory item"
  │
  ├── Gather: SKU-099, "USB-C Hub", IT Hardware, MYR 45.00
  ├── Check proc_get_item(sku="SKU-099") → not found ✓
  ├── Create procurement/items/SKU-099.md with frontmatter:
  │     sku: SKU-099
  │     name: USB-C Hub
  │     category: IT Hardware
  │     current_stock: 50
  │     reorder_point: 20
  │     preferred_vendor_id: VND-003
  │     location_id: LOC-MAIN-B2
  └── ✅ Created SKU-099 with 50 units in stock
```

## When to Use / When NOT To

**Use when:**
- Onboarding a new SKU into gbrain
- Updating stock level, reorder point, or vendor on an existing SKU
- Verifying SKU master data during an inventory audit

**Don't use for:**
- Recording stock movements (receives/issues/damage) → use stock-movement-audit
- Generating reorder POs → use reorder-alert-watchdog

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `proc_get_item`, `proc_update_stock`, `proc_list_inventory`
- [ ] gbrain `procurement` source
- [ ] `brain_compliance_helper.py` available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A |
| Related Skills | stock-movement-audit, reorder-alert-watchdog, location-binning |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — CRUD for inventory item brain pages with frontmatter compliance |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
