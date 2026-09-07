![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Invoice Organizer
> Organize, categorize, and track invoices and receipts for Malaysian businesses. Filing system, payment tracking, aging reports, and tax-ready summaries.

## What It Does

Organizes, categorizes, and tracks invoices and receipts with structured filing systems, payment status tracking, aging analysis, and tax-ready reports. Designed for SMEs and freelancers managing invoices without full accounting software, or as a pre-processing layer before feeding data into Bukku/Xero/QBO.

## Quick Example

```
Input: Batch of 25 mixed invoices from August 2026

Processing:
  1. Categorize by vendor pattern (AWS→Software, TNB→Utilities)
  2. Assign status (Pending/Paid/Overdue)
  3. Record SST treatment per invoice
  4. Generate tracking register + monthly summary

Output:
## Invoice Tracking Register
| Invoice # | Vendor     | Due    | Amount  | Status   | Category  |
|-----------|------------|--------|---------|----------|-----------|
| INV-042   | Acme Sdn   | 14/09  | 1,350   | ⏳ Pending| Professional |
| INV-048   | Gamma Sup  | 29/08  | 500     | 🔴 Overdue| Office    |

Filing: 2026-08-15_AcmeCorp_1350.00_INV-042.pdf
```

## When to Use / When NOT To

**Use when:**
- Organizing/categorizing batch of invoices or receipts
- Need invoice tracking register (open, paid, overdue)
- Setting up filing system for financial documents
- Monthly/annual invoice summary for tax preparation
- Post-OCR organization after using finance-doc-scan

**Don't use for:**
- Creating new invoices → use [invoice-generator](../invoice-generator/)
- Auditing expense claims → use [expense-claim-audit](../expense-claim-audit/)
- OCR/scanning receipt images → use [finance-doc-scan](../finance-doc-scan/) first

## Prerequisites

- [ ] Invoice data from any source (text, OCR, spreadsheet, email)
- [ ] Required fields: vendor name, invoice number, date, amount, category, status

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | N/A (invoked via natural language) |
| Related Skills | [invoice-generator](../invoice-generator/), [finance-doc-scan](../finance-doc-scan/), [ap-vendor-management](../ap-vendor-management/), [ar-credit-control](../ar-credit-control/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — categorization, tracking register, filing system, tax-ready reports |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
