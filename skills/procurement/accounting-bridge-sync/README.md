![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Accounting Bridge Sync

> Optional bridge that syncs procurement events (PO receipts, inventory cost, GL variance) to your accounting system via acct_* tools.

## What It Does

Automatically creates supplier bills when goods are received against a PO, syncs inventory valuation to the GL Inventory Asset account, and flags discrepancies between stock value and GL balance. Gated on `ENABLE_ACCOUNTING_SYNC=true` — procurement works fully without it.

## Quick Example

```
GRN recorded for PO-2024-0158
  │
  ├── ENABLE_ACCOUNTING_SYNC=true? → Yes
  ├── Call acct_create_purchase_bill(vendor="Vendor X", lines=[...])
  ├── Bill created: BILL-2024-0892, Total: MYR 12,400
  │
  Weekly valuation (Fri 5PM):
  ├── Stock Valuation:  MYR 485,000
  ├── GL Inventory GL:  MYR 483,200
  ├── Variance:         MYR 1,800 (0.37%)
  └── ⚠️ Posted to #procurement + #finance
```

## When to Use / When NOT To

**Use when:**
- GRN against a PO should auto-generate a supplier bill
- Inventory revaluation needs syncing to GL
- Organisation uses both Shogun OS procurement and Bukku/QuickBooks/Xero

**Don't use for:**
- Procurement-only deployments without accounting integration
- Manual journal entry workflows
- Leave `ENABLE_ACCOUNTING_SYNC=false` if no accounting provider is connected

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] `ENABLE_ACCOUNTING_SYNC=true` in `.env`
- [ ] MCP tools: `acct_list_purchase_bills`, `acct_create_purchase_bill`, `acct_get_balance_sheet`
- [ ] `recipes/procurement/bridges/accounting_bridge.py` deployed
- [ ] `GBRAIN_FEDERATED_READ=true`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A (trigger-based) |
| Related Skills | weekly-inventory-valuation, ap-vendor-management |

## Configuration

```bash
# .env
ENABLE_ACCOUNTING_SYNC=true
GBRAIN_FEDERATED_READ=true
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — PO→Bill, inventory cost sync, GL variance flag |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
