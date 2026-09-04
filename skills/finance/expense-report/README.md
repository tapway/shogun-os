![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Expense Report Generator
> Create categorized expense reports for reimbursement, tax prep, and budget tracking. Malaysia-compliant with SST treatment and LHDN documentation standards.

## What It Does

Creates structured, categorized expense reports for employee reimbursement, tax preparation, and budget tracking with full Malaysian SST and LHDN compliance. Supports standard reimbursement, travel expense, and monthly summary templates with automatic SST treatment classification per expense category.

## Quick Example

```
Input: Employee Ahmad bin Ismail, Engineering dept
       Period: 01/08/2026 – 31/08/2026
       Raw receipts from Penang business trip

Output:
# Expense Report
Employee: Ahmad bin Ismail | Dept: Engineering
Period: 01/08/2026 – 31/08/2026

| Category              | Amount (RM) | SST Claimable |
|-----------------------|-------------|---------------|
| Travel – Transport    | 450.00      | 27.00         |
| Travel – Accommodation| 680.00      | 40.80         |
| Meals & Entertainment | 320.00      | 19.20         |
| **Total**             | **1,450.00**| **87.00**     |

✓ All receipts validated | ✓ Math verified
```

## When to Use / When NOT To

**Use when:**
- Employee submits raw receipts needing organized report
- Creating expense reimbursement report
- Categorized expenses needed for tax prep (Form B/C)
- Monthly/quarterly expense summaries for budget tracking
- Travel expense report after business trip

**Don't use for:**
- Auditing/approving claims → use [expense-claim-audit](../expense-claim-audit/)
- Processing supplier invoices → use [ap-vendor-management](../ap-vendor-management/)
- Scanning receipt images → use [finance-doc-scan](../finance-doc-scan/) first

## Prerequisites

- [ ] Employee/claimant name and department
- [ ] Report period and purpose
- [ ] Raw expense data (receipts, transactions)
- [ ] Company expense policy (recommended)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | N/A (invoked via natural language) |
| Related Skills | [expense-claim-audit](../expense-claim-audit/), [finance-doc-scan](../finance-doc-scan/), [tax-sst-compliance](../tax-sst-compliance/), [financial-statement-prep](../financial-statement-prep/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — Malaysia-compliant expense reports, SST treatment, LHDN standards |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
