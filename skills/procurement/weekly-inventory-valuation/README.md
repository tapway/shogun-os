![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Weekly Inventory Valuation

> Computes total inventory valuation across all SKUs with optional GL reconciliation — runs every Friday at 5PM.

## What It Does

Sums `current_stock × unit_cost` across all active SKUs to produce a total inventory valuation with category breakdown. When `ENABLE_ACCOUNTING_SYNC=true`, compares the result against the GL Inventory Asset balance and writes a discrepancy report if variance exceeds tolerance. Runs automatically every Friday at 5PM via cron.

## Quick Example

```
📦 INVENTORY VALUATION — 2026-09-04
Total Active SKUs: 142
Total Inventory Value: MYR 485,000

By Category:
- IT Hardware:     MYR 280,000 (45 SKUs)
- Office Supplies: MYR  55,000 (25 SKUs)
- Consumables:     MYR 125,000 (62 SKUs)
- Spare Parts:     MYR  25,000 (10 SKUs)

GL Reconciliation: VARIANCE MYR 1,800 ⚠️
→ Report saved: procurement/reports/valuation-discrepancy-2026-09-04.md
```

## When to Use / When NOT To

**Use when:**
- Friday end-of-week inventory valuation sweep
- CFO/CPO requests current inventory value with GL reconciliation
- Period-end close requires inventory balance confirmation

**Don't use for:**
- Reorder alerts → use reorder-alert-watchdog
- Dead/slow stock reporting → use dead-slow-stock-detector

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `proc_list_inventory`; `acct_get_balance_sheet` (if accounting sync enabled)
- [ ] gbrain `procurement` source
- [ ] `ENABLE_ACCOUNTING_SYNC` env flag configured

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A (cron: Fri 5PM) |
| Related Skills | inventory-valuation-report, accounting-bridge-sync, dead-slow-stock-detector |

## Configuration

```bash
# .env
ENABLE_ACCOUNTING_SYNC=true   # Set false to skip GL comparison
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — weekly valuation with category breakdown and GL reconciliation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
