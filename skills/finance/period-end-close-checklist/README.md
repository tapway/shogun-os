![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Period End Close Checklist
> Use when executing trial balance verification, sub-ledger to GL balancing, period locking, and month-end close checklists.

## What It Does

Orchestrates the month-end and year-end close process by verifying trial balances, reconciling sub-ledgers to GL control accounts, running close checklists, and locking periods against late postings. Produces signed-off close attestations with evidence snapshots for audit trail.

## Quick Example

```
Input: Month-end close for August 2026

Processing:
  1. Pull TB via acct_get_balance_sheet + acct_get_profit_loss
     → Total debits == Total credits ✓
  2. Reconcile AR/AP sub-ledgers to GL control accounts
     → AR ties ✓ | AP ties ✓
  3. Run checklist: accruals posted ✓, bank rec done ✓, depreciation booked ✓
  4. Lock period against late postings

Output: Close Checklist Signed Off:
        ✓ Trial Balance balanced
        ✓ Sub-ledgers tie to control accounts
        ✓ All accruals posted
        ✓ Bank reconciliation complete
        ✓ Depreciation booked
        Period 2026-08 LOCKED
        Evidence saved to finance/close/2026-08/
```

## When to Use / When NOT To

**Use when:**
- Month-end or year-end close requires controlled checklist run
- Sub-ledgers must tie to GL control accounts before lock
- Period must be locked against late postings

**Don't use for:**
- Journal authoring → use [general-ledger-journal-prep](../general-ledger-journal-prep/)
- Statutory statements → use [financial-statement-prep](../financial-statement-prep/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_profit_loss`, `acct_get_aging_report`
- [ ] gbrain `finance` source for signed close checklist at `finance/close/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/period-end-close-checklist` |
| Related Skills | None |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — TB verification, sub-ledger reconciliation, period locking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
