![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Tax SST Compliance
> Use when monitoring SST-02 return filing, CP204 corporate tax estimate filings, Form C annual tax compliance, or tax penalty prevention. Produces a compliance calendar and filing checklist.

## What It Does

Monitors Malaysian tax compliance obligations including bimonthly SST-02 returns, CP204 corporate tax instalment estimates, and annual Form C filings. Maintains a compliance calendar with due dates and flags penalty risks from missed or underpaid instalments to prevent LHDN/RMCD enforcement actions.

## Quick Example

```
Input: SST-02 preparation for Jul-Aug 2026 period

Processing:
  1. Taxable period: Jul-Aug 2026, Due: 30-Sep-2026
  2. Pull taxable supplies → Output tax: RM18,500
  3. Check claimable input tax (if Sales Tax registered)
  4. Compute net SST payable

Output: SST-02 Return Summary — Jul-Aug 2026
        Output Tax:     RM18,500
        Input Tax:      RM0 (Service Tax - no input mechanism)
        Net Payable:    RM18,500
        Due Date:       30-Sep-2026
        Status:         ⏳ Pending filing

        CP204 Check: YTD estimate vs prior year → within 30% ✓
```

## When to Use / When NOT To

**Use when:**
- Bimonthly SST-02 return is due
- CP204 instalment filing requires updated estimate
- Year-end Form C corporate tax return needs P&L reconciliation
- New tax filing due date needs adding to calendar
- Approaching penalty risk from missed/underpaid instalment

**Don't use for:**
- MFRS 15 revenue recognition → use [mfrs15-revenue-recognition](../mfrs15-revenue-recognition/)
- SST treatment on reimbursed expenses → use [expense-claim-audit](../expense-claim-audit/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_list_sales_invoices`, `acct_list_purchase_bills`
- [ ] gbrain `finance` source with compliance calendar at `finance/tax/compliance-calendar.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/tax-sst-compliance` |
| Related Skills | [mfrs15-revenue-recognition](../mfrs15-revenue-recognition/), [internal-control-governance](../internal-control-governance/), [expense-claim-audit](../expense-claim-audit/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — SST-02, CP204, Form C compliance monitoring |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
