![Finance](https://img.shields.io/badge/dept-Finance-blue)

# MFRS 15 Revenue Recognition
> Use when validating compliance with MFRS 15 5-Step model, Standalone Selling Price (SSP) allocation in MYR, deferred revenue amortization, or SST exclusion from transaction price. Produces a revenue recognition schedule and compliance flag per contract.

## What It Does

Validates revenue recognition compliance with the MFRS 15 five-step model, allocating transaction prices across performance obligations at standalone selling prices in MYR. Handles deferred revenue amortization scheduling and ensures SST is correctly excluded from transaction prices per accounting standards.

## Quick Example

```
Input: Multi-element SaaS contract: RM120,000 annual
       Includes: Subscription (RM90K SSP) + Implementation (RM30K SSP)

Processing (MFRS 15 5-Step):
  1. Contract identified ✓
  2. Performance obligations: Subscription + Implementation
  3. Transaction price: RM120,000 (ex-SST)
  4. Allocate at SSP: Sub 75% = RM90K, Impl 25% = RM30K
  5. Recognize: Sub over 12 months, Impl at completion

Output: Revenue Recognition Schedule:
        | Month | Subscription | Implementation | Total   |
        |-------|--------------|----------------|---------|
        | Jan   | RM7,500      | RM30,000       | RM37,500|
        | Feb   | RM7,500      | -              | RM7,500 |
        ...
        Compliance: ✓ SSP allocated in MYR | ✓ SST excluded
```

## When to Use / When NOT To

**Use when:**
- New multi-element contract requires revenue allocation
- Deferred revenue needs amortization scheduling
- Audit queries whether SST excluded from transaction price
- Year-end statements require MFRS 15 disclosure note

**Don't use for:**
- SST return filing → use [tax-sst-compliance](../tax-sst-compliance/)
- P&L and balance sheet prep → use [financial-statement-prep](../financial-statement-prep/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_sales_invoices`, `acct_list_contacts`, `acct_get_profit_loss`
- [ ] gbrain `finance` source with contract register at `finance/contracts/` and SSP schedule

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/mfrs15-revenue-recognition` |
| Related Skills | [financial-statement-prep](../financial-statement-prep/), [tax-sst-compliance](../tax-sst-compliance/), [general-ledger-journal-prep](../general-ledger-journal-prep/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — MFRS 15 5-Step, SSP allocation, deferred revenue |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
