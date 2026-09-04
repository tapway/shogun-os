---
name: invoice-organizer
description: "Organize, categorize, and track invoices and receipts for Malaysian businesses. Filing system, payment tracking, aging reports, and tax-ready summaries."
departments: [finance]
version: 1.0.0
author: Shogun OS
license: MIT
metadata:
  hermes:
    tags: [finance, invoice, organization, tracking, filing, sst, malaysia, categorization, aging]
    category: finance
    related_skills: [invoice-generator, ap-vendor-management, ar-credit-control, finance-doc-scan, expense-report, bank-payment-reconciliation]
---

# Invoice Organizer (Malaysia)

## Overview

Organize, categorize, and track invoices and receipts for Malaysian businesses. Provides structured filing systems, payment status tracking, aging analysis, vendor summaries, and tax-ready reports. Designed for SMEs and freelancers managing invoices without full accounting software, or as a pre-processing layer before feeding data into Bukku/Xero/QBO via `acct_*` contract tools.

**Core principle:** Every invoice must be traceable from receipt → categorization → payment → filing. No invoice should exist without a known status.

## When to Use

- User asks to organize/categorize a batch of invoices or receipts
- User needs an invoice tracking register (open, paid, overdue)
- User wants to set up a filing system for financial documents
- User needs a monthly/annual invoice summary for tax preparation
- User asks "show me unpaid invoices" or "what's overdue?"
- User needs vendor spending analysis
- Post-OCR organization after using `finance-doc-scan` to extract invoice data

**Don't use for:**
- Creating new invoices → use `invoice-generator` skill
- Auditing expense claims → use `expense-claim-audit` skill
- OCR/scanning receipt images → use `finance-doc-scan` skill first
- SST return filing → use `tax-sst-compliance` skill
- Full double-entry bookkeeping → use `general-ledger-journal-prep` skill
- Bank reconciliation → use `bank-payment-reconciliation` skill

## Hard Rules

1. **Every invoice MUST have a unique identifier** — invoice number + vendor name; never rely on filename alone
2. **Status must be explicit** — every invoice is one of: Pending, Paid, Overdue, Disputed, Cancelled, Partial
3. **SST treatment must be recorded** — mark each invoice as "SST claimable", "SST exempt", or "No SST" for input tax tracking
4. **Never modify original invoice data** — corrections go in notes field, not by overwriting extracted amounts
5. **Filing naming convention must be consistent** — enforce `YYYY-MM-DD_Vendor_Amount_InvoiceNo.pdf` format
6. **Verify totals** — category/vendor summaries must reconcile to grand total

## Protocol

### Step 0: Ingest Invoice Data

Accept invoice data from any source:

| Source | How to Handle |
|--------|---------------|
| Raw text / user description | Parse into structured fields manually |
| OCR output from `finance-doc-scan` | Map JSON fields to tracking register |
| Spreadsheet / CSV | Read with `xlsx` skill, normalize columns |
| Email attachments | Extract key fields, note source email/date |
| Accounting export (Bukku/Xero/QBO) | Already structured; focus on categorization/filing |

**Required fields per invoice:**

| Field | Required | Notes |
|-------|----------|-------|
| Vendor name | ✅ Yes | Full legal name (Sdn Bhd / Enterprise) |
| Invoice number | ✅ Yes | As stated on document |
| Invoice date | ✅ Yes | DD/MM/YYYY |
| Due date | ✅ Yes | Calculate from terms if not explicit |
| Amount (excl. SST) | ✅ Yes | Subtotal |
| SST amount | ⚠️ If applicable | May be zero if exempt |
| Total amount | ✅ Yes | Incl. SST |
| Currency | ✅ Yes | Default MYR |
| Category | ✅ Yes | Assign from category system below |
| Status | ✅ Yes | Pending / Paid / Overdue / Disputed / Cancelled / Partial |
| Receipt/file reference | Recommended | Filename or path |

### Step 1: Categorize

Apply Malaysian-standard expense categories aligned with LHDN and SST treatment:

| Category | Subcategory | SST Input Tax | LHDN Deductible | Auto-Match Vendors |
|----------|-------------|---------------|-----------------|--------------------|
| **Office** | Supplies | Claimable if SST charged | ✅ Yes | MPH, Popular, Staples, Office Depot |
| | Equipment | Claimable if SST charged | ✅ Depreciated | Dell, Lenovo, HP, Acer |
| | Services | Claimable if SST charged | ✅ Yes | Cleaning companies, maintenance |
| **Software** | Subscriptions | 6% digital ST (foreign) | ✅ Yes | AWS, Microsoft, Adobe, Xero, Canva |
| | Licenses | Varies | ✅ Yes | One-time software purchases |
| | Hosting/Cloud | 6% digital ST | ✅ Yes | AWS, Azure, DigitalOcean, Exabytes |
| **Travel** | Transportation | 6% on e-hailing/booking | ✅ Yes | Malaysia Airlines, AirAsia, Grab, KTMB |
| | Accommodation | 6% service tax | ✅ Yes | Hotels, serviced apartments |
| | Meals | 6% service tax | ⚠️ 50% entertainment | Restaurants, cafes |
| **Professional** | Legal | 6% service tax | ✅ Yes | Law firms, company secretary |
| | Accounting/Tax | 6% service tax | ✅ Yes | Tax agents, auditors, bookkeepers |
| | Consulting | 6% service tax | ✅ Yes | Management consultants, advisors |
| **Marketing** | Advertising | 6% service tax | ✅ Yes | Google Ads, Meta Ads, media buys |
| | Events | 6% service tax | ✅ Yes | Conferences, exhibitions, booths |
| | Content/Creative | 6% service tax | ✅ Yes | Design agencies, copywriters |
| **Utilities** | Electricity/Water | Exempt | ✅ Yes | TNB, IWK, SAJ, PBA |
| | Telecom/Internet | 6% service tax | ⚠️ Business portion | Maxis, Celcom, TM Unifi, TIME |
| **Insurance** | Business insurance | Exempt | ✅ Yes | Allianz, Zurich, Etiqa, Tokio Marine |
| **Rent** | Office/workspace | Exempt (residential); 6% commercial | ✅ Yes | Landlord, co-working spaces |
| **Other** | Miscellaneous | Case-by-case | Verify | Flag for review |

**Auto-categorization rules (apply when vendor is recognized):**

| Vendor Pattern | → Category | Confidence |
|----------------|------------|------------|
| Contains "AirAsia", "Malaysia Airlines", "Firefly" | Travel > Transportation | High |
| Contains "Grab", "MyCar", "e-hailing" | Travel > Ground Transport | High |
| Contains "Marriott", "Hilton", "Hotel", "Residence" | Travel > Accommodation | High |
| Contains "AWS", "Azure", "DigitalOcean", "Exabytes" | Software > Hosting/Cloud | High |
| Contains "Adobe", "Microsoft", "Canva", "Figma" | Software > Subscriptions | High |
| Contains "TNB", "Tenaga" | Utilities > Electricity | High |
| Contains "Maxis", "Celcom", "TM", "Unifi", "TIME" | Utilities > Telecom | High |
| Contains "MPH", "Popular", "Staples" | Office > Supplies | Medium |
| Contains "Google Ads", "Meta", "Facebook Ads" | Marketing > Advertising | High |
| Amount < RM50 + unknown vendor | Office > Supplies | Low (verify) |

### Step 2: Build Tracking Register

Maintain a living register of all invoices:

```markdown
## Invoice Tracking Register

### Open Invoices

| Invoice # | Vendor | Date | Due | Amount (RM) | SST (RM) | Status | Days Left | Category |
|-----------|--------|------|-----|-------------|----------|--------|-----------|----------|
| INV-042 | Acme Sdn Bhd | 15/08 | 14/09 | 1,350.00 | 81.00 | ⏳ Pending | 14 | Professional |
| INV-045 | Beta Tech | 18/08 | 17/09 | 890.00 | 53.40 | ⏳ Pending | 11 | Software |
| INV-048 | Gamma Supply | 22/08 | 29/08 | 500.00 | 30.00 | 🔴 Overdue | -3 | Office |

### Recently Paid

| Invoice # | Vendor | Paid Date | Amount (RM) | Method | Reference |
|-----------|--------|-----------|-------------|--------|-----------|
| INV-038 | Delta Corp | 25/08 | 720.00 | DuitNow | DN-789456 |
| INV-035 | Epsilon Sdn Bhd | 22/08 | 1,200.00 | IBG | MB-REF123 |

### Summary

| Status | Count | Total (RM) | SST Claimable (RM) |
|--------|-------|------------|---------------------|
| Pending | 2 | 2,240.00 | 134.40 |
| Overdue | 1 | 500.00 | 30.00 |
| Paid (Aug) | 2 | 1,920.00 | 115.20 |
```

### Step 3: Set Up Filing System

Recommended folder structure for Malaysian businesses:

```
📁 Invoices/
├── 📁 2026/
│   ├── 📁 Office/
│   │   └── 2026-08-15_Staples_125.50_INV001.pdf
│   ├── 📁 Software/
│   │   └── 2026-08-20_Microsoft_299.00_INV002.pdf
│   ├── 📁 Travel/
│   │   └── 2026-08-22_AirAsia_450.00_INV003.pdf
│   ├── 📁 Professional/
│   │   └── 2026-08-25_TaxAgent_800.00_INV004.pdf
│   ├── 📁 Marketing/
│   ├── 📁 Utilities/
│   ├── 📁 Insurance/
│   ├── 📁 Rent/
│   └── 📁 Other/
├── 📁 2025/
│   └── ...
└── 📁 Archive/
```

**Naming convention:**
```
YYYY-MM-DD_VendorName_Amount_InvoiceNumber.ext
```

**Examples:**
- `2026-08-15_AcmeCorp_1350.00_INV-2026-0042.pdf`
- `2026-08-20_Microsoft_299.00_Monthly-Aug.pdf`
- `2026-08-22_AirAsia_450.00_PNR-ABC123.pdf`

**Rules:**
- Date first (sortable)
- Vendor name simplified (no spaces, no special chars)
- Amount with 2 decimal places
- Invoice number or reference last
- Extension matches original format (.pdf, .jpg, .png)

### Step 4: Generate Reports

#### Monthly Summary

```markdown
## Invoice Summary: [Month Year]

### Overview

| Metric | Value |
|--------|-------|
| Total Invoices | XX |
| Total Amount | RM XX,XXX.XX |
| Avg per Invoice | RM XXX.XX |
| Paid | XX (RM X,XXX.XX) |
| Pending | XX (RM X,XXX.XX) |
| Overdue | XX (RM XXX.XX) |
| SST Claimable | RM X,XXX.XX |

### By Category

| Category | Count | Amount (RM) | % of Total | SST Claimable (RM) |
|----------|-------|-------------|------------|---------------------|
| Software | 8 | 4,200.00 | 33.7% | 252.00 |
| Professional | 5 | 3,500.00 | 28.1% | 210.00 |
| Office | 6 | 2,100.00 | 16.9% | 126.00 |
| Travel | 4 | 1,650.00 | 13.3% | 99.00 |
| Utilities | 3 | 600.00 | 4.8% | 36.00 |
| Other | 2 | 400.00 | 3.2% | 24.00 |

### By Vendor

| Vendor | Invoices | Total (RM) | Last Invoice |
|--------|----------|------------|--------------|
| Microsoft | 2 | 1,200.00 | 20/08/2026 |
| AWS | 1 | 2,800.00 | 15/08/2026 |
| Acme Corp | 3 | 3,200.00 | 25/08/2026 |

### Trends
- Software expenses up 15% from last month
- Travel expenses down 20% (seasonal)
- New vendor added: Gamma Supply Sdn Bhd
```

#### Tax-Ready Annual Report

```markdown
## Tax-Ready Invoice Report: [Year]

### Annual Summary

| Category | Total (RM) | SST Claimable (RM) | LHDN Deductible |
|----------|------------|---------------------|-----------------|
| Office Supplies | 4,500.00 | 270.00 | ✅ Full |
| Software | 18,000.00 | 1,080.00 | ✅ Full |
| Travel – Business | 8,200.00 | 492.00 | ✅ Full |
| Travel – Meals | 2,400.00 | 144.00 | ⚠️ 50% |
| Professional Services | 12,000.00 | 720.00 | ✅ Full |
| Utilities | 3,600.00 | 216.00 | ✅ Full |
| **Total** | **48,700.00** | **2,922.00** | |

### Documentation Status

| Requirement | Count | Status |
|-------------|-------|--------|
| Invoices with valid tax invoice | XX | ✅ Complete |
| Missing tax invoice | XX | ⚠️ Action needed |
| Foreign currency invoices (with conversion) | XX | ✅ Documented |
| Entertainment (50% deductible flagged) | XX | ✅ Flagged |

### Missing Documentation

| Date | Vendor | Amount (RM) | Action Required |
|------|--------|-------------|-----------------|
| DD/MM | [Vendor] | XXX.XX | Request duplicate tax invoice |
| DD/MM | [Vendor] | XXX.XX | Download from vendor portal |
| DD/MM | [Vendor] | XXX.XX | Use bank statement as evidence |

### SST Input Tax Summary

| Period | SST Claimable (RM) | Filed | Status |
|--------|---------------------|-------|--------|
| Jan-Feb | XXX.XX | ✅ | Filed |
| Mar-Apr | XXX.XX | ✅ | Filed |
| May-Jun | XXX.XX | ⏳ | Pending |
```

### Step 5: Verify Before Presenting

- [ ] All invoices categorized and status assigned
- [ ] SST treatment recorded per invoice
- [ ] Tracking register totals reconcile to individual invoices
- [ ] Category/vendor summaries sum correctly
- [ ] Filing names follow convention consistently
- [ ] Overdue invoices flagged with days count
- [ ] Missing documentation listed with action items
- [ ] Foreign currency conversions documented

## Automation Rules (Optional)

If the user wants auto-processing rules for future invoices:

| Trigger | Action |
|---------|--------|
| Vendor = known pattern | Auto-categorize (see Step 1 table) |
| Due date within 3 days | Flag as "Due Soon" |
| Past due date | Flag as "Overdue" |
| Amount > RM5,000 | Flag for manager approval |
| Missing SST on taxable category | Flag for verification |
| New vendor (not in history) | Flag for category confirmation |

## Common Pitfalls (Malaysia)

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Filing by vendor only (no date prefix) | Cannot sort chronologically | Always use YYYY-MM-DD prefix |
| Not recording SST separately | Cannot claim input tax on SST-02 | Always capture SST amount as separate field |
| Using GST category codes | Confusion; GST abolished 2018 | Use SST-aligned categories |
| Losing original invoice files | Audit failure; no evidence | Keep originals; organize copies |
| Not tracking payment references | Cannot reconcile with bank | Record DuitNow/IBG reference per payment |
| Mixing AP invoices with employee expenses | Messy books; audit confusion | Separate registers: supplier vs employee |
| Forgetting foreign currency conversion | MYR accounts don't balance | Always convert and document rate |
| Not flagging entertainment 50% rule | Overclaimed deduction on tax return | Auto-flag meals/entertainment category |

## Verification Checklist

Before delivering organized output:

- [ ] All invoices have unique ID (number + vendor)
- [ ] Status assigned to every invoice
- [ ] SST treatment recorded
- [ ] Categories assigned consistently
- [ ] Math verified across summaries
- [ ] Filing names follow convention
- [ ] Overdue items flagged
- [ ] Missing documentation listed
- [ ] Foreign currency converted with source

## Limitations

- Cannot perform actual file system operations (move/rename files) → provide instructions for user
- OCR quality affects data extraction → verify extracted fields against original
- Auto-categorization may misclassify → always allow manual override
- Does not integrate directly with accounting software → export CSV/XLSX for import
- Exchange rates need external verification → use BNM rates
- Tax advice should come from licensed tax agent
- Does not handle e-Invoice validation → use MyInvois system directly

## Related Skills

- `invoice-generator` — create new invoices (this skill organizes existing ones)
- `finance-doc-scan` — OCR invoices/receipts before organizing
- `ap-vendor-management` — supplier invoice processing and 3-way matching
- `ar-credit-control` — customer invoice aging and collections
- `expense-report` — employee expense reports (different from supplier invoices)
- `bank-payment-reconciliation` — match payments against invoice register
- `tax-sst-compliance` — SST return filing using organized invoice data
- `general-ledger-journal-prep` — post organized invoices to GL
- `pdf` — convert reports to PDF
- `xlsx` — generate spreadsheet tracking register
