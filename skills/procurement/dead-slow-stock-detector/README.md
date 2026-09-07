![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Dead & Slow Stock Detector

> Identifies dead and slow-moving inventory, ranks by capital tied up, and recommends flush actions per SKU.

## What It Does

Scans all inventory items to find dead stock (zero sales in 180+ days) and slow-moving stock (>8 months of cover). Ranks items by capital tied up (`current_stock × unit_cost`) and assigns an action-to-flush recommendation: 25% Promo Discount, Vendor Clearance Return, Bundle Promo, or Scrap/Write-off. Posts results to `#procurement` for management review.

## Quick Example

```
💀 DEAD & SLOW STOCK REPORT — 2026-09-04
Total Capital at Risk: MYR 60,000

# | SKU     | Item Name  | Days Idle | Cover  | Value (MYR) | Action
1 | SKU-001 | Widget A   | 320       | ∞      | 48,000      | Scrap / Write-off
2 | SKU-042 | Cable B    | 90        | 18 mo  | 12,000      | 25% Promo Discount
```

## When to Use / When NOT To

**Use when:**
- Monthly or ad-hoc capital recovery review
- Executive asks "Which items are dead stock?"
- Dashboard Dead & Slow Stock KPI needs refreshing

**Don't use for:**
- Active reorder alerts → use reorder-alert-watchdog
- Inventory valuation totals → use weekly-inventory-valuation

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `proc_list_inventory`, `proc_get_item`
- [ ] gbrain `procurement` source with `last_movement_date` frontmatter
- [ ] Comm layer for Slack delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A |
| Related Skills | inventory-item-management, reorder-alert-watchdog, weekly-inventory-valuation |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — dead/slow classification, capital ranking, action recommendations |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
