![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Inventory Valuation Report

> Generates a detailed inventory valuation report by SKU and category, with optional GL reconciliation.

## What It Does

Reads all inventory items from gbrain and computes total stock value (`sum(current_stock × unit_cost)`). Outputs a per-SKU valuation table and category-level breakdown. When accounting sync is enabled, compares the total against the GL Inventory Asset balance and flags any variance. Can be run standalone or via weekly cron.

## Quick Example

```
📦 INVENTORY VALUATION REPORT (2026-09-04)
Total Active SKUs: 142
Total Inventory Value: MYR 485,000

By Category:
IT Hardware    | 45 SKUs | MYR 280,000 | 57.7%
Consumables    | 62 SKUs | MYR 125,000 | 25.8%
Office Suppl.  | 25 SKUs | MYR  55,000 | 11.3%
Spare Parts    | 10 SKUs | MYR  25,000 |  5.2%

GL Reconciliation: PASSED ✅
```

## When to Use / When NOT To

**Use when:**
- Weekly Friday valuation cron triggers
- CPO or CFO requests a current inventory value snapshot
- Period-end close requires confirmed inventory balance

**Don't use for:**
- Reorder alerts → use reorder-alert-watchdog
- Dead stock analysis → use dead-slow-stock-detector

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] Script: `scripts/inventory_valuation.py`
- [ ] MCP tools: `proc_list_inventory`; `acct_get_balance_sheet` (if accounting sync enabled)
- [ ] gbrain `procurement` source
- [ ] Comm layer for Slack delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | `/inventory-valuation` |
| Related Skills | weekly-inventory-valuation, accounting-bridge-sync, dead-slow-stock-detector |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — per-SKU and category valuation with GL comparison |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
