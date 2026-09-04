![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Expense Claim Audit
> Use when auditing staff expense reimbursement claims for receipt validity, corporate travel policy limits, and SST compliance before payout. Produces an approved/rejected claims list with compliance flags.

## What It Does

Audits employee expense reimbursement claims against receipt validity, corporate travel policy limits, and Malaysian SST compliance rules before payment approval. Produces an approved/rejected claims list with compliance flags, ensuring every reimbursement is properly documented and tax-treated correctly.

## Quick Example

```
Input: Batch of 12 pending expense claims for Aug 2026

Processing:
  1. Validate receipts (supplier name, date, amount match)
  2. Check policy limits (meal allowance, hotel cap)
  3. Apply SST compliance check
  4. Route exceptions to line manager

Output: Approved: 9 claims (RM4,250)
        Rejected: 2 claims (missing receipts)
        Pending Override: 1 claim (over-limit, manager approval needed)
        SST Flags: 3 claims marked for tax review
```

## When to Use / When NOT To

**Use when:**
- Employee submits expense claim requiring audit before payment
- Month-end expense run requires batch review
- Claim includes entertainment/meals/travel with SST implications
- Policy limit exceptions require manager override

**Don't use for:**
- Supplier invoice processing → use [ap-vendor-management](../ap-vendor-management/)
- Payroll statutory deductions → use [payroll-statutory-accounting](../payroll-statutory-accounting/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_create_purchase_bill`, `acct_list_purchase_bills`
- [ ] gbrain `finance` source with expense policy at `finance/policies/expense-policy.md`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/expense-claim-audit` |
| Related Skills | [payroll-statutory-accounting](../payroll-statutory-accounting/), [ap-vendor-management](../ap-vendor-management/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — receipt validation, policy limits, SST compliance |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
