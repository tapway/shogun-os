---
name: expense-report
description: "Create categorized expense reports for reimbursement, tax prep, and budget tracking. Malaysia-compliant with SST treatment and LHDN documentation standards."
departments: [finance]
version: 1.0.0
author: Shogun OS
license: MIT
metadata:
  hermes:
    tags: [finance, expense, report, reimbursement, sst, malaysia, travel, categorization]
    category: finance
    related_skills: [expense-claim-audit, ap-vendor-management, tax-sst-compliance, financial-statement-prep]
---

# Expense Report Generator (Malaysia)

## Overview

Create structured, categorized expense reports for reimbursement requests, tax preparation, and budget tracking. Malaysia-compliant with SST input tax treatment, LHDN documentation standards, and corporate travel policy alignment. Outputs markdown reports ready for approval workflows or PDF conversion via the `pdf` skill.

**Core principle:** Every expense must be supported by a valid receipt/tax invoice and correctly classified for SST deductibility. When in doubt, flag for review rather than assume.

## When to Use

- Employee submits raw receipts/transactions needing organized into a report
- User asks to create an expense reimbursement report
- User needs categorized expenses for tax preparation (Form B / Form C)
- User wants monthly/quarterly expense summaries for budget tracking
- Travel expense report needed after a business trip
- Freelancer organizing business expenses for annual tax filing

**Don't use for:**
- Auditing/approving expense claims → use `expense-claim-audit` skill
- Processing supplier invoices → use `ap-vendor-management` skill
- Scanning/OCR of receipt images → use `finance-doc-scan` skill first, then this skill to organize extracted data
- SST return filing → use `tax-sst-compliance` skill
- Payroll-related deductions → use `payroll-statutory-accounting` skill

## Hard Rules

1. **Every expense MUST have a receipt/tax invoice reference** — no receipt = flag as "Missing Receipt" with explanation field
2. **SST treatment must be explicit per line item** — mark as "SST claimable", "SST exempt", or "No SST" based on category
3. **Meals & entertainment require attendees + business purpose** — LHDN requires substantiation; bare "dinner" is insufficient
4. **Currency defaults to MYR** — foreign currency expenses must show original amount + converted MYR with exchange rate source
5. **Never fabricate amounts or dates** — if unclear, ask user or flag as "Needs Clarification"
6. **Verify math** — category subtotals must sum to grand total before presenting

## Protocol

### Step 0: Gather Required Information

| Field | Required | Example |
|-------|----------|---------|
| Employee / claimant name | ✅ Yes | "Ahmad bin Ismail" |
| Department | ✅ Yes | "Engineering", "Sales" |
| Report period | ✅ Yes | "01/08/2026 – 31/08/2026" |
| Purpose | ✅ Yes | "Business trip to Penang", "Monthly office expenses" |
| Raw expense data | ✅ Yes | Receipts, transactions, descriptions |
| Company expense policy | ⚠️ Recommended | Per diem limits, approval thresholds |
| Submission date | Auto | Today's date |

### Step 1: Categorize Expenses

Apply Malaysian-standard expense categories with SST treatment:

| Category | Subcategory | SST Treatment | LHDN Deductible | Examples |
|----------|-------------|---------------|-----------------|----------|
| **Travel – Transport** | Airfare, train, bus | No SST on domestic flights; 6% on booking fees | ✅ Yes | Malaysia Airlines, KTMB, Aerodarat |
| **Travel – Accommodation** | Hotel, serviced apartment | 6% service tax | ✅ Yes | Hotels, Airbnb (if registered) |
| **Travel – Ground Transport** | Taxi, Grab, parking, toll | 6% on e-hailing; tolls exempt | ✅ Yes | Grab, Touch 'n Go, PLUS toll |
| **Meals & Entertainment** | Client meals, team dining | 6% service tax (restaurants) | ⚠️ 50% deductible (entertainment); 100% if staff welfare | Restaurant, café, catering |
| **Office Supplies** | Stationery, printing | 6% if from SST-registered vendor | ✅ Yes | MPH, Popular, Staples |
| **Software & Subscriptions** | SaaS, cloud, licenses | 6% digital service tax (foreign); local varies | ✅ Yes | AWS, Microsoft 365, Xero |
| **Professional Services** | Legal, accounting, consulting | 6% service tax | ✅ Yes | Law firm, tax agent, auditor |
| **Communication** | Mobile, internet | 6% service tax | ⚠️ Partial (business portion only) | Celcom, Maxis, TM Unifi |
| **Training & Development** | Courses, conferences, books | Varies (some exempt) | ✅ Yes | HRDF-claimable courses, seminars |
| **Marketing & Advertising** | Ads, events, promotional | 6% service tax | ✅ Yes | Google Ads, event sponsorship |
| **Equipment** | Hardware, furniture | 10% sales tax (if applicable) | ✅ Depreciated over useful life | Laptop, monitor, office chair |
| **Utilities** | Electricity, water | Exempt | ✅ Yes | TNB, IWK, SAJ |
| **Insurance** | Business insurance | Exempt (life/general) | ✅ Yes | Allianz, Zurich, Etiqa |
| **Other** | Miscellaneous | Case-by-case | Verify | Flag for review |

### Step 2: Generate Report

Choose the appropriate template based on purpose:

#### Template A: Standard Reimbursement Report

```markdown
# Expense Report

**Employee:** [Name]
**Department:** [Department]
**Report Period:** [DD/MM/YYYY] – [DD/MM/YYYY]
**Purpose:** [Business trip / Project / General]
**Submission Date:** [DD/MM/YYYY]

## Summary

| Category | Amount (RM) | SST Claimable (RM) |
|----------|-------------|---------------------|
| Travel – Transport | XXX.XX | XX.XX |
| Travel – Accommodation | XXX.XX | XX.XX |
| Meals & Entertainment | XXX.XX | XX.XX |
| Office Supplies | XXX.XX | XX.XX |
| Other | XXX.XX | XX.XX |
| **Total** | **X,XXX.XX** | **XXX.XX** |

## Expense Details

### Travel – Transport

| Date | Description | Vendor | Amount (RM) | SST (RM) | Receipt | Notes |
|------|-------------|--------|-------------|----------|---------|-------|
| DD/MM | [Description] | [Vendor] | XX.XX | X.XX | ✓ / ✗ | [Purpose] |

### Meals & Entertainment

| Date | Description | Attendees | Business Purpose | Amount (RM) | SST (RM) | Receipt |
|------|-------------|-----------|------------------|-------------|----------|---------|
| DD/MM | [Restaurant] | [Names] | [Specific purpose] | XX.XX | X.XX | ✓ / ✗ |

### [Other Categories...]

## Missing Receipts

| Date | Vendor | Amount (RM) | Reason Missing | Action Required |
|------|--------|-------------|----------------|-----------------|
| DD/MM | [Vendor] | XX.XX | [Explanation] | [Request duplicate / bank statement] |

## Approvals

- [ ] Employee Signature: _____________ Date: _______
- [ ] Manager Approval: _____________ Date: _______
- [ ] Finance Approval: _____________ Date: _______

## Notes
[Any additional context, policy exceptions, or clarifications]
```

#### Template B: Travel Expense Report

```markdown
# Travel Expense Report

**Traveler:** [Name]
**Trip Dates:** [DD/MM/YYYY] – [DD/MM/YYYY]
**Destination:** [City, State/Country]
**Business Purpose:** [Specific reason for travel]

## Trip Summary

| Metric | Value |
|--------|-------|
| Duration | [X] days |
| Total Expenses | RM X,XXX.XX |
| Per Diem Allowance | RM XXX.XX ([Rate]/day × [Days]) |
| Variance | +/- RM XX.XX |

## Daily Expenses

### Day 1 – [DD/MM/YYYY]

| Category | Description | Vendor | Amount (RM) | SST (RM) | Receipt |
|----------|-------------|--------|-------------|----------|---------|
| Transport | Grab to KLIA | Grab | XX.XX | X.XX | ✓ App |
| Meals | Dinner with client | [Restaurant] | XX.XX | X.XX | ✓ |
| **Day Total** | | | **XX.XX** | **X.XX** | |

### Day 2 – [DD/MM/YYYY]
[Same format...]

## Expense by Category

| Category | Amount (RM) | % of Total | SST Claimable (RM) |
|----------|-------------|------------|---------------------|
| Airfare | XXX.XX | XX% | XX.XX |
| Accommodation | XXX.XX | XX% | XX.XX |
| Ground Transport | XXX.XX | XX% | XX.XX |
| Meals | XXX.XX | XX% | XX.XX |
| Other | XXX.XX | XX% | XX.XX |
| **Total** | **X,XXX.XX** | **100%** | **XXX.XX** |

## Receipt Checklist

- [ ] Flight confirmation/tax invoice
- [ ] Hotel tax invoice (with SST breakdown)
- [ ] Ground transport receipts (Grab e-receipt, toll statements)
- [ ] Meal receipts over RM50 (with attendees noted)
- [ ] Conference/event registration invoice
- [ ] Foreign currency conversion records (if applicable)
```

#### Template C: Monthly Expense Summary

```markdown
# Monthly Expense Summary

**Period:** [Month Year]
**Prepared by:** [Name]
**Business:** [Business Name Sdn Bhd]

## Overview

| Metric | Amount (RM) |
|--------|-------------|
| Total Expenses | X,XXX.XX |
| vs Last Month | +/- XX% |
| vs Budget | +/- XX% |
| SST Claimable | XXX.XX |

## Expenses by Category

| Category | Actual (RM) | Budget (RM) | Variance (RM) | SST Claimable (RM) |
|----------|-------------|-------------|---------------|---------------------|
| Rent & Utilities | XXX.XX | XXX.XX | XX.XX | XX.XX |
| Software & Subscriptions | XXX.XX | XXX.XX | XX.XX | XX.XX |
| Professional Services | XXX.XX | XXX.XX | XX.XX | XX.XX |
| Marketing | XXX.XX | XXX.XX | XX.XX | XX.XX |
| Travel | XXX.XX | XXX.XX | XX.XX | XX.XX |
| Office Supplies | XXX.XX | XXX.XX | XX.XX | XX.XX |
| **Total** | **X,XXX.XX** | **X,XXX.XX** | **XX.XX** | **XXX.XX** |

## Top 10 Expenses

| Rank | Date | Description | Category | Amount (RM) |
|------|------|-------------|----------|-------------|
| 1 | DD/MM | [Description] | [Category] | XXX.XX |
| 2 | DD/MM | [Description] | [Category] | XXX.XX |

## Anomalies & Notes

- [Explanation for any unusual expenses or budget variances]
- [Flag items missing receipts or SST documentation]
```

### Step 3: Apply Malaysia-Specific Validations

Before presenting the report, verify:

- [ ] All amounts in MYR (or foreign currency with conversion shown)
- [ ] SST treatment marked for each line item
- [ ] Meals > RM50 have attendees + business purpose documented
- [ ] Receipt references present (✓) or flagged (✗ with explanation)
- [ ] Category subtotals sum to grand total
- [ ] Per diem within company policy limits (if applicable)
- [ ] Entertainment expenses flagged as 50% deductible for tax
- [ ] No personal expenses mixed in (flag if suspected)

### Step 4: Offer Export Options

1. **Copy as-is** — paste into Word/Google Docs
2. **Convert to PDF** — use `pdf` skill
3. **Generate XLSX** — use `xlsx` skill for spreadsheet version with formulas
4. **Save to file** — write to `~/expense-reports/YYYY-MM-[employee]-[purpose].md`
5. **Feed to audit** — hand off to `expense-claim-audit` skill for approval workflow

## Currency Conversion (Foreign Expenses)

When expenses are incurred in foreign currency:

| Field | Requirement |
|-------|-------------|
| Original amount + currency | Must show (e.g., USD 150.00) |
| Exchange rate used | Must state rate and source |
| Converted MYR amount | Must show calculation |
| Date of transaction | Rate should match transaction date |

**Preferred rate sources (priority order):**
1. Bank statement rate (actual rate charged)
2. BNM daily exchange rate (bnm.gov.my/exchange-rates)
3. Bank credit card rate (if paid by card)
4. XE.com / OANDA (last resort; note as estimated)

**Format:**
```
USD 150.00 × 4.3500 (BNM rate 15/08/2026) = RM 652.50
```

## Mileage Claims (Malaysia)

For employees using personal vehicles for business:

| Rate Type | Rate | Notes |
|-----------|------|-------|
| LHDN approved rate | RM 0.60/km | Standard rate for income tax exemption |
| Company policy rate | Varies | Check internal policy; may differ from LHDN |

**Required documentation per trip:**
- Date
- Origin → Destination
- Business purpose
- Distance (km) — use Waze/Google Maps screenshot or odometer
- Calculation: distance × rate = claim amount

## Common Pitfalls (Malaysia)

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Missing SST breakdown on hotel invoice | Cannot claim input tax | Request tax invoice with SST line from hotel |
| "Dinner" without attendees/purpose | Disallowed by LHDN on audit | Always document who attended and why |
| Using GST terminology | Confusion; GST abolished 2018 | Use "SST" or "Service Tax" / "Sales Tax" |
| Mixing personal and business expenses | Entire claim disallowed | Separate clearly; pro-rate shared expenses |
| Foreign expense without conversion | Cannot process in MYR accounts | Always convert with documented rate |
| Entertainment claimed at 100% | Only 50% deductible under ITA 1967 | Flag as 50% unless staff welfare event |
| No receipt for expense > RM50 | Audit risk; may be disallowed | Get duplicate invoice or bank statement |
| Claiming SST on exempt items | Overclaim; penalty from RMCD | Verify SST applicability per category |

## Verification Checklist

Before delivering the report:

- [ ] All required fields populated (employee, period, purpose)
- [ ] Every expense categorized correctly
- [ ] SST treatment marked per line item
- [ ] Math verified: subtotals sum to grand total
- [ ] Receipts referenced or missing receipts flagged with explanation
- [ ] Meals documented with attendees + purpose
- [ ] Foreign currency converted with rate source
- [ ] Entertainment flagged as 50% deductible
- [ ] No personal expenses included
- [ ] Professional formatting (consistent tables, clear sections)

## Limitations

- Cannot scan/read receipt images directly → use `finance-doc-scan` first
- Does not submit claims to HR/payroll systems → output is for manual processing
- SST deductibility guidance is informational → verify with tax agent
- Exchange rates should be verified against actual bank rates
- Company-specific policies may override general guidance
- Does not handle capital expenditure classification → consult accountant

## Related Skills

- `expense-claim-audit` — audit and approve expense claims after report generation
- `finance-doc-scan` — OCR receipts/invoices before organizing into reports
- `ap-vendor-management` — supplier invoice processing (different from employee expenses)
- `tax-sst-compliance` — SST return filing and input tax claims
- `financial-statement-prep` — aggregate expenses into P&L
- `payroll-statutory-accounting` — payroll-related expense treatments
- `pdf` — convert report to PDF
- `xlsx` — generate spreadsheet version with formulas
