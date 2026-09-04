![Finance](https://img.shields.io/badge/dept-Finance-blue)

# AP Vendor Management
> Use when handling supplier invoices, 3-way matching (PO + GRN + Invoice), payment batching, or vendor account reconciliation. Produces a payment batch and vendor reconciliation statement.

## What It Does

Manages the full accounts payable lifecycle from supplier invoice receipt through payment disbursement. Performs 3-way matching (Purchase Order + Goods Receipt Note + Invoice) to prevent overbilling, batches payments for approval workflows, and reconciles vendor statements to ensure balances match supplier records.

## Quick Example

```
Input: Supplier invoice INV-2026-0892 from ABC Supplies Sdn Bhd
       PO# PO-2026-145 | GRN# GRN-7823

Processing:
  1. Match PO qty (100 units @ RM50) → ✓
  2. Confirm GRN received qty (100 units) → ✓
  3. Verify invoice total (RM5,000) → ✓
  4. Post bill via acct_create_purchase_bill

Output: Bill posted to QuickBooks with Net-30 terms
        Added to next payment batch for dual approval
```

## When to Use / When NOT To

**Use when:**
- Supplier invoice received and needs matching to PO and GRN
- Weekly or fortnightly AP payment run requires batching
- Month-end vendor statement reconciliation needed
- New vendor onboarding requires credit terms setup

**Don't use for:**
- Customer invoice collections → use [ar-credit-control](../ar-credit-control/)
- Bank/gateway settlement → use [bank-payment-reconciliation](../bank-payment-reconciliation/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_purchase_bills`, `acct_create_purchase_bill`, `acct_list_contacts`, `acct_get_aging_report`
- [ ] gbrain `finance` source with PO register at `finance/po-register/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/ap-vendor-management` |
| Related Skills | [ar-credit-control](../ar-credit-control/), [bank-payment-reconciliation](../bank-payment-reconciliation/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 3-way matching, payment batching, vendor reconciliation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
