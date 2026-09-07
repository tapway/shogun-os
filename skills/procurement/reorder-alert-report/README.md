![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Reorder Alert Report

> Generates a formatted low-stock report listing all SKUs at or below reorder threshold with recommended order quantities and vendor.

## What It Does

Calls `proc_check_reorder_alerts` to find all items at or below their reorder point, sorted by severity (critical first). Lists recommended order quantity and preferred vendor per SKU. Can be run standalone via script or triggered by the Mon–Fri 8AM cron. Output is saved to reports and posted to `#procurement`.

## Quick Example

```
🚨 REORDER ALERT REPORT (2026-09-04)
Status: 5 items require reordering
  Critical (stock ≤ safety stock): 2 SKUs
  Warning (stock ≤ reorder point): 3 SKUs

Critical Items:
SKU       | Item Name     | Qty | Reorder Pt | Rec. Order | Vendor
SKU-001   | Widget A      |   5 |         50 | 200 units  | Vendor X
SKU-018   | Adapter C     |   2 |         10 | 50 units   | Vendor Z
```

## When to Use / When NOT To

**Use when:**
- Mon–Fri 8AM reorder watchdog cron triggers
- Procurement executive wants a current low-stock list
- User says "Show me items that need restocking"

**Don't use for:**
- Full inventory valuation → use inventory-valuation-report
- Dead stock analysis → use dead-slow-stock-detector

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] Script: `scripts/reorder_alerts.py`
- [ ] MCP tools: `proc_check_reorder_alerts`, `proc_list_vendors`
- [ ] gbrain `procurement` source
- [ ] Comm layer for Slack delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | `/reorder-report` |
| Related Skills | reorder-alert-watchdog, inventory-valuation-report |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — severity-tiered reorder report with vendor and qty recommendations |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
