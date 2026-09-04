![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Bank Payment Reconciliation
> Use when reconciling daily bank feeds and payment gateway settlements (Stripe, FPX, Credit Cards) against QuickBooks general ledger records.

## What It Does

Reconciles daily bank feeds and payment gateway settlements against QuickBooks GL cash accounts to close the gap between gateway/bank inflows and posted records. Produces a differences list categorizing transactions as matched, unmatched, or exceptions to surface reconciling items before period close.

## Quick Example

```
Input: Stripe settlement file for 2026-09-03
       GL cash account balance as of today

Processing:
  1. Load GL cash accounts via acct_get_balance_sheet
  2. Load settlement lines (net: RM15,230.00)
  3. Match to AR receipts / AP disbursements
  4. Identify differences

Output: Matched: RM14,800.00 (97%)
        Unmatched: RM350.00 (timing difference)
        Exceptions: RM80.00 (FX rounding)
```

## When to Use / When NOT To

**Use when:**
- End-of-day gateway settlement must match posted GL cash
- Bank feed transactions need matching to AR/AP
- Reconciling items need surfacing before period close

**Don't use for:**
- AR collections dunning → use [ar-credit-control](../ar-credit-control/)
- AP batching → use [ap-vendor-management](../ap-vendor-management/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_list_sales_invoices`, `acct_list_purchase_bills`
- [ ] gbrain `finance` source with settlement truth at `finance/settlements/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/bank-payment-reconciliation` |
| Related Skills | None |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — daily settlement reconciliation, exception surfacing |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
