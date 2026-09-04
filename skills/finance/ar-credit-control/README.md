![Finance](https://img.shields.io/badge/dept-Finance-blue)

# AR Credit Control
> Use when managing customer billing, payment collections, aging buckets, credit limits, or automated dunning follow-ups. Produces an AR aging summary, dunning queue, and collections action list.

## What It Does

Manages accounts receivable collections by tracking unpaid invoices across aging buckets (0-30, 31-60, 61-90, 90+ days) and generating prioritized dunning queues. Reviews customer credit limits against payment history to recommend approvals, reductions, or holds before new orders are accepted.

## Quick Example

```
Input: Weekly AR sweep request

Processing:
  1. Pull aging report → 45 overdue invoices totaling RM128,500
  2. Cross-reference credit limits from finance/credit-limits.json
  3. Assign dunning tiers:
     - Reminder (31-60 days): 28 invoices
     - Escalation (61-90 days): 12 invoices
     - Legal (90+ days): 5 invoices
  4. Generate follow-up messages per tier

Output: Dunning queue sorted by days overdue
        Draft messages ready for each tier
```

## When to Use / When NOT To

**Use when:**
- Customer invoice is unpaid and falls into an aging bucket (>30 days)
- Week-end AR sweep to identify overdue invoices
- Credit limit review before approving new/expanded orders
- Monthly dunning batch to auto-generate follow-up messages

**Don't use for:**
- Supplier invoice processing → use [ap-vendor-management](../ap-vendor-management/)
- Bank/gateway settlement → use [bank-payment-reconciliation](../bank-payment-reconciliation/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_sales_invoices`, `acct_get_aging_report`, `acct_list_contacts`
- [ ] gbrain `finance` source with credit-limit policy and dunning templates

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/ar-credit-control` |
| Related Skills | [ap-vendor-management](../ap-vendor-management/), [bank-payment-reconciliation](../bank-payment-reconciliation/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — AR aging sweep, dunning queue, credit limit review |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
