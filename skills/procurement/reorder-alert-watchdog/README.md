![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Reorder Alert Watchdog

> Daily scan for items at or below reorder threshold — groups by vendor, drafts POs, and posts prioritised alerts to #procurement.

## What It Does

Runs `proc_check_reorder_alerts` to find all low-stock items, separates them into critical (≤ safety stock) and warning tiers, groups by preferred vendor, and drafts Purchase Orders automatically. Posts a prioritised reorder summary to `#procurement`. Runs Mon–Fri at 8AM via cron.

## Quick Example

```
🚨 REORDER ALERT — 2026-09-04
Critical (stock ≤ safety): 2 SKUs
Warning (stock ≤ reorder point): 3 SKUs

Vendor: Vendor X
- SKU-001 — Widget A: Order 200 units (Current: 5)
- SKU-018 — Adapter C: Order 50 units (Current: 2)
Draft PO: PO-2026-0312

✅ All healthy items: 137 SKUs above reorder point
```

## When to Use / When NOT To

**Use when:**
- Daily/weekly stock health check triggered by cron
- User asks "Check stock levels and flag anything that needs reordering"
- Procurement executive wants draft POs for low-stock items

**Don't use for:**
- Dead/slow stock detection → use dead-slow-stock-detector
- Full inventory valuation → use weekly-inventory-valuation

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `proc_check_reorder_alerts`, `proc_create_purchase_order`, `proc_list_vendors`
- [ ] gbrain `procurement` source
- [ ] Comm layer for Slack delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A (cron-triggered) |
| Related Skills | inventory-item-management, dead-slow-stock-detector, weekly-inventory-valuation |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — daily reorder scan, vendor-grouped PO drafting, Slack alerts |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
