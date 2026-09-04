![Finance](https://img.shields.io/badge/dept-Finance-blue)

# General Ledger Journal Prep
> Use when maintaining the double-entry general ledger, accruals, prepayments, fixed asset depreciation schedules, and intercompany transactions.

## What It Does

Maintains double-entry bookkeeping for accruals, prepayments, fixed asset depreciation, and intercompany transactions. Produces balanced journal entries and reconciling schedules that keep the GL complete across accounting periods, persisting journals to gbrain for audit traceability.

## Quick Example

```
Input: Month-end accruals + depreciation schedule

Processing:
  1. Identify unposted accruals from P&L
  2. Compose offsetting journals (Dr expense / Cr accrued liability)
  3. Compute depreciation: (cost - salvage) / useful life
  4. Post depreciation journal (Dr depr expense / Cr accum depr)

Output: Journals saved to finance/journals/2026-08/
        ✓ Debits == Credits verified
        ✓ Depreciation schedule updated in finance/assets.json
```

## When to Use / When NOT To

**Use when:**
- Period-end requires accruals, prepayments, or depreciation journals
- Intercompany transactions need offsetting entries
- New fixed assets capitalized requiring depreciation schedule

**Don't use for:**
- Bank statement reconciliation → use [bank-payment-reconciliation](../bank-payment-reconciliation/)
- Trial balance verification / period locking → use [period-end-close-checklist](../period-end-close-checklist/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_profit_loss`
- [ ] gbrain `finance` source with depreciation schedule at `finance/assets.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/general-ledger-journal-prep` |
| Related Skills | None |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — accruals, prepayments, depreciation, intercompany journals |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
