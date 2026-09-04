---
name: invoice-generator
description: "Generate Malaysia-compliant invoices with SST calculations, e-Invoice readiness, and LHDN/RMCD formatting. Use when creating invoices for Malaysian businesses."
departments: [finance]
version: 1.0.0
author: Shogun OS
license: MIT
metadata:
  hermes:
    tags: [finance, invoice, billing, sst, malaysia, lhdn, einvoice, myr]
    category: finance
    related_skills: [ap-vendor-management, ar-credit-control, financial-statement-prep, tax-sst-compliance, mfrs15-revenue-recognition]
---

# Invoice Generator (Malaysia)

## Overview

Generate professional, Malaysia-compliant invoices for freelancers, SMEs, and businesses. Handles SST (Sales and Service Tax) calculations, e-Invoice format readiness (LHDN MyInvois), withholding tax for foreign payers, and multi-currency support with MYR as default. Outputs markdown invoices ready for copy-paste into Word/Google Docs or conversion to PDF via the `pdf` skill.

**Core principle:** Every invoice must comply with LHDN (Inland Revenue Board) and RMCD (Royal Malaysian Customs Department) requirements. When in doubt, include MORE information rather than less.

## When to Use

- User asks to create/generate an invoice for a Malaysian business or client
- User needs SST-compliant billing documentation
- User wants e-Invoice-ready format for LHDN MyInvois submission
- User needs withholding tax notation for cross-border services
- User bills in MYR or foreign currency from a Malaysian entity

**Don't use for:**
- Filing SST returns → use `tax-sst-compliance` skill
- Submitting e-Invoices to LHDN → use accounting connector (Bukku/Xero/QBO)
- Processing actual payments → use payment gateway integrations (FPX, Stripe MY)
- Recurring subscription billing → use AR/billing automation skills
- Expense reports → use `expense-claim-audit` skill
- Non-Malaysian jurisdiction invoicing → this skill is MY-specific

## Hard Rules

1. **NEVER generate without required fields** — invoice number, date, due date, from/to (with TIN/BRN), line items, and total are mandatory
2. **ALWAYS verify SST applicability** — not all services/goods are taxable; check registration status and scope
3. **NEVER reuse invoice numbers** — sequential gaps raise LHDN audit flags
4. **Currency MUST be explicit** — default MYR; always show currency code (MYR, USD, SGD, etc.)
5. **TIN required for B2B** — Tax Identification Number (TIN) or Business Registration Number (BRN) must appear on B2B invoices
6. **Verify calculations** — double-check subtotal + SST = total before presenting
7. **e-Invoice fields** — if user requests e-Invoice format, include ALL mandatory MyInvois fields (see Step 2b)
8. **Withholding tax** — flag when billing foreign clients for Malaysian-sourced services; note WHT obligation

## Protocol

### Step 0: Gather Required Information

Before generating, confirm ALL of these exist:

| Field | Required | Example |
|-------|----------|---------|
| Your business name & address | ✅ Yes | "Acme Consulting Sdn Bhd, Level 5, Menara XYZ, Jalan Sultan Ismail, 50250 Kuala Lumpur" |
| BRN / TIN | ✅ Yes | "1234567-W" or TIN "C2584563200" |
| SST registration number | ⚠️ If registered | "W10-1809-32000123" |
| Client name & address | ✅ Yes | "StartupXYZ Sdn Bhd, No. 12, Jalan Teknologi, Petaling Jaya, Selangor" |
| Client TIN / BRN | ⚠️ Required for B2B | "C1234567890" |
| Line items (description, qty, rate) | ✅ Yes | "IT consulting, 20 hrs, RM150/hr" |
| Invoice number | ✅ Yes | "INV-2026-0042" (auto-generate if not provided) |
| Issue date | ✅ Yes | Today's date or user-specified |
| Due date / payment terms | ✅ Yes | "Net 30", "Due on receipt" |
| Currency | ⚠️ Default MYR | MYR, USD, SGD, GBP |
| SST rate & type | ⚠️ Ask if taxable | "Service Tax 6%", "Sales Tax 10%", "Exempt", "Not registered" |
| Payment instructions | Recommended | Bank name, account number, SWIFT/BIC for international |
| e-Invoice required? | ⚠️ Ask | Yes → use Step 2b template |

**If any required field is missing, ASK before generating.** Do not invent client addresses or business names.

### Step 1: Determine SST Applicability

Identify whether SST applies based on seller registration and transaction type:

| Scenario | Tax Type | Rate | Key Requirement |
|----------|----------|------|-----------------|
| Registered service provider → any client | Service Tax | 6% (8% from Jul 2024 for selected services) | Include SST reg. number; charge on taxable services |
| Registered manufacturer → any client | Sales Tax | 5% or 10% | Include SST reg. number; charge on taxable goods |
| Not SST-registered | None | 0% | Do NOT charge SST; state "Not SST-registered" if asked |
| Export of services | Exempt | 0% | Zero-rated; document export evidence |
| Digital services (foreign provider to MY consumer) | Service Tax | 6% | Foreign digital service provider must register |
| Professional services (legal, accounting, consulting) | Service Tax | 6% (8% from Jul 2024) | Check updated rate schedule |
| Hospitality / accommodation | Service Tax | 6% | Included in room rate or shown separately |
| Insurance / takaful | Service Tax | 6% | On premium amount |
| Telecom / internet | Service Tax | 6% | On monthly bill |

**SST Registration Threshold:** RM500,000 annual revenue for services; varies by industry for manufacturing.

**When uncertain about SST applicability:** Say so explicitly. Recommend user verify with their tax agent or RMCD. Do NOT fabricate SST rates.

**Rate Change Alert (Jul 2024):** Service tax increased from 6% to 8% for selected services including logistics, telecommunications, and certain professional services. Verify current rate at [mysstext.customs.gov.my](https://mysstext.customs.gov.my).

### Step 2a: Generate Standard Invoice

Use this template for standard (non-e-Invoice) invoices:

```markdown
# INVOICE

**Invoice Number:** [INV-YYYY-NNNN]
**Date:** [DD/MM/YYYY]
**Due Date:** [DD/MM/YYYY]

---

## From
[Business Name Sdn Bhd / Enterprise / PLT]
[Full Address, Postcode, City, State]
[Email / Phone]
**BRN:** [1234567-W]
**TIN:** [C2584563200]
**SST Reg:** [W10-1809-32000123] ← if registered

## Bill To
[Client Name Sdn Bhd / Enterprise]
[Full Address, Postcode, City, State]
[Email / Phone]
**TIN:** [C1234567890] ← B2B
**PO Number:** [PO-2026-XXX] ← if provided

---

## Items

| Description | Qty | Rate (RM) | Amount (RM) |
|-------------|-----|-----------|-------------|
| [Service/product description] | [N] | [X.XX] | [X,XXX.XX] |
| [Second item] | [N] | [X.XX] | [X,XXX.XX] |

---

| | |
|---|---|
| **Subtotal** | [RM X,XXX.XX] |
| **Service Tax (6%)** | [RM XXX.XX] |
| **Total Due** | **[RM X,XXX.XX]** |

---

## Payment Details

**Bank Transfer:**
Bank: [Maybank / CIMB / Public Bank / RHB / Hong Leong]
Account Name: [Business Name Sdn Bhd]
Account Number: [1234567890]
SWIFT/BIC: [MBBEMYKL] ← for international transfers

**Or pay via:** [FPX / DuitNow QR / Payment Link]

---

**Payment Terms:** [Net 30 / Due on Receipt]
**Late Fee:** [1.5% per month on overdue balance] ← if applicable

Thank you for your business!
```

### Step 2b: Generate e-Invoice Ready Format

For users who need LHDN MyInvois-compliant e-Invoice format, include ALL mandatory fields:

```markdown
# e-INVOICE (MyInvois Compliant)

**Invoice Number:** [INV-YYYY-NNNN]
**Issue Date:** [YYYY-MM-DDTHH:MM:SS] ← ISO 8601 format
**Due Date:** [YYYY-MM-DD]
**Invoice Type Code:** [01] ← 01=Invoice, 02=Credit Note, 03=Debit Note, 04=Refund Note
**Original Invoice Ref:** [] ← only for credit/debit/refund notes

---

## Supplier
**Name:** [Business Name Sdn Bhd]
**TIN:** [C2584563200]
**BRN:** [1234567-W]
**SST Reg:** [W10-1809-32000123]
**MSIC Code:** [62010] ← Malaysia Standard Industrial Classification
**Address:** [Line 1, Line 2, Postcode, City, State, Country]
**Contact:** [+60123456789]
**Email:** [billing@company.com.my]

## Buyer
**Name:** [Client Name Sdn Bhd]
**TIN:** [C1234567890]
**BRN:** [9876543-X]
**Address:** [Line 1, Line 2, Postcode, City, State, Country]
**Contact:** [+60198765432]
**Email:** [accounts@client.com.my]

---

## Line Items

| # | Description | Unit Price (RM) | Qty | Subtotal (RM) | Tax Rate | Tax Amount (RM) | Total (RM) |
|---|-------------|-----------------|-----|---------------|----------|-----------------|------------|
| 1 | [Description] | [X.XX] | [N] | [X,XXX.XX] | [6%] | [XX.XX] | [X,XXX.XX] |
| 2 | [Description] | [X.XX] | [N] | [X,XXX.XX] | [6%] | [XX.XX] | [X,XXX.XX] |

---

| | |
|---|---|
| **Subtotal (excl. tax)** | [RM X,XXX.XX] |
| **Service Tax (6%)** | [RM XXX.XX] |
| **Total (incl. tax)** | **[RM X,XXX.XX]** |
| **Total Payable** | **[RM X,XXX.XX]** |

---

## Validation
**Digital Signature:** [To be applied by MyInvois system]
**QR Code:** [To be generated upon validation]
**Unique ID:** [Assigned by LHDN upon submission]

---

**Payment Terms:** [Net 30]
**Bank:** [Maybank] | **Account:** [1234567890] | **SWIFT:** [MBBEMYKL]
```

**e-Invoice Mandatory Fields Checklist:**
- [ ] Supplier TIN, BRN, MSIC code
- [ ] Buyer TIN, BRN
- [ ] Invoice type code (01/02/03/04)
- [ ] Issue date in ISO 8601 format
- [ ] Line item unit price, quantity, tax rate, tax amount
- [ ] Total excluding tax, total tax, total including tax
- [ ] Digital signature placeholder (applied by MyInvois)

**e-Invoice Phasing (LHDN):**
| Phase | Annual Revenue | Effective Date |
|-------|---------------|----------------|
| Phase 1 | > RM100 million | Aug 1, 2024 |
| Phase 2 | RM25M – RM100M | Jan 1, 2025 |
| Phase 3 | All taxpayers | Jul 1, 2025 |

### Step 3: Verify Before Presenting

Run through this checklist BEFORE showing the invoice to the user:

- [ ] Invoice number is unique and sequential
- [ ] All required fields present (from, to, items, dates, total)
- [ ] BRN/TIN included for both parties (B2B)
- [ ] SST calculation correct (subtotal × rate = tax amount)
- [ ] Subtotal + SST = total due
- [ ] Currency code shown (default MYR)
- [ ] SST registration number included if charging SST
- [ ] Payment terms clearly stated
- [ ] Bank details complete (account name matches business name)
- [ ] No placeholder text remains
- [ ] e-Invoice fields complete if requested (Step 2b)

### Step 4: Offer Export Options

After presenting the markdown invoice, offer:

1. **Copy as-is** — paste into Word/Google Docs
2. **Convert to PDF** — use the `pdf` skill if available
3. **HTML version** — for web display or email embedding
4. **Save to file** — write to `~/invoices/INV-YYYY-NNNN.md`
5. **e-Invoice JSON** — if e-Invoice requested, generate MyInvois-compatible JSON payload

## Withholding Tax (Cross-Border)

When a Malaysian entity bills a **foreign client** for services performed in Malaysia, or when a **foreign payer** pays a Malaysian resident:

| Scenario | WHT Rate | Notes |
|----------|----------|-------|
| Technical/management fees to non-resident | 10% | Under Section 109B ITA 1967 |
| Royalties to non-resident | 10% | Under Section 109 ITA 1967 |
| Interest to non-resident | 15% | Under Section 109 ITA 1967 |
| Contract payments to non-resident | 10% + 3% | Services portion + materials |
| Services rendered OUTSIDE Malaysia by non-resident | 0% | Not Malaysian-sourced income |

**On the invoice:** Add a note if WHT may apply:
> "Note: Withholding tax may apply to this invoice under the Income Tax Act 1967. The payer is responsible for deducting and remitting WHT to LHDN within one month of payment."

## SST Exemption & Relief Reference

Common exemptions where SST does NOT apply:

| Category | Examples |
|----------|----------|
| Essential goods | Rice, flour, cooking oil, fresh vegetables, poultry |
| Education | Tuition fees (approved institutions), textbooks |
| Healthcare | Medical services (licensed practitioners), medicines |
| Financial services | Banking, insurance premiums (life/family takaful) |
| Residential property | Sale of residential units (first RM500K) |
| Exports | Goods/services exported outside Malaysia |
| Small businesses | Below RM500K annual revenue threshold |

## Payment Methods (Malaysia)

| Method | Best For | Notes |
|--------|----------|-------|
| Bank transfer (IBG/DuitNow) | B2B, large amounts | Most common; instant with DuitNow |
| FPX | Online B2C/B2B | Direct bank debit; no card needed |
| DuitNow QR | Retail, small biz | Unified QR across all banks |
| Credit/debit card | B2C, international | MDR 1-3%; Visa/Mastercard widely accepted |
| Cheque | Declining use | Still accepted but slow clearance |
| Touch 'n Go / GrabPay / ShopeePay | Micro, retail | E-wallet; limited B2B adoption |

## Common Pitfalls (Malaysia-Specific)

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Charging SST without registration | Offence under STA 2018; penalties up to RM50K | Verify SST registration status first |
| Wrong SST rate (6% vs 8% vs 10%) | Under-collection, penalty from RMCD | Check latest rate at mysstext.customs.gov.my |
| Missing TIN on e-Invoice | Rejected by MyInvois system | Always include supplier + buyer TIN |
| Using GST terminology | Confusion; GST abolished Sept 2018 | Use "SST" or "Service Tax" / "Sales Tax" |
| Missing MSIC code on e-Invoice | Validation failure | Look up at msic.stats.gov.my |
| Not noting WHT on cross-border invoice | Payer fails to deduct; both parties penalized | Add WHT note for foreign transactions |
| Invoice date format DD/MM/YYYY vs YYYY-MM-DD | e-Invoice rejection | Use ISO 8601 (YYYY-MM-DDTHH:MM:SS) for e-Invoice |
| Bank account name ≠ business name | Payment rejected / compliance flag | Ensure exact match with SSM registration |
| Assuming all services are SST-taxable | Overcharging client | Check Schedule of Taxable Services (STA 2018) |

## Verification Checklist

Before delivering the invoice:

- [ ] All required fields populated (no placeholders)
- [ ] Math verified: line items sum to subtotal, subtotal + SST = total
- [ ] Currency code explicit (default MYR)
- [ ] SST rate appropriate for service/good type
- [ ] SST registration number present if charging SST
- [ ] TIN/BRN present for both parties (B2B)
- [ ] Invoice number unique and sequential
- [ ] Payment terms and bank details complete
- [ ] e-Invoice fields complete if requested (ISO date, MSIC, type code)
- [ ] WHT note added if cross-border transaction
- [ ] Professional formatting (consistent alignment, clear sections)

## Limitations

- Generates text/markdown invoices — use `pdf` skill for PDF conversion
- SST calculations are estimates — verify with tax agent or RMCD
- Cannot submit e-Invoices directly to LHDN MyInvois — use accounting software (Bukku, Xero, QBO) or MyInvois API
- Does not handle SST return filing — use `tax-sst-compliance` skill
- Does not auto-detect SST exemption eligibility — user must confirm
- Not a substitute for official fapiao system in China or GST in Singapore/Australia
- WHT guidance is informational — consult tax agent for complex cross-border scenarios

## Related Skills

- `tax-sst-compliance` — SST return filing, CP204 corporate tax estimation
- `ar-credit-control` — manage collections and aging after invoicing
- `ap-vendor-management` — handle supplier invoices (reverse direction)
- `bank-payment-reconciliation` — match FPX/bank payments against invoices
- `financial-statement-prep` — aggregate invoices into P&L (MFRS compliant)
- `mfrs15-revenue-recognition` — validate revenue recognition against MFRS 15
- `pdf` — convert markdown invoice to PDF
- `xlsx` — generate spreadsheet version for accounting
- `malaysia-contractor-cp58-wht` — track contractor payouts and WHT obligations
