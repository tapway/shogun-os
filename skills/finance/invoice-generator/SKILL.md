---
name: invoice-generator
description: "Generate professional invoices with tax calculations, multi-currency support, and region-specific compliance. Use when creating invoices for freelancers or small businesses."
departments: [finance]
version: 1.0.0
author: Shogun OS
license: MIT
metadata:
  hermes:
    tags: [finance, invoice, billing, tax, currency, document]
    category: finance
    related_skills: [ap-vendor-management, ar-credit-control, financial-statement-prep]
---

# Invoice Generator

## Overview

Generate professional, properly formatted invoices for freelancers and small businesses. Handles tax calculations (VAT, GST, sales tax), multiple currencies, and region-specific compliance requirements. Outputs markdown invoices ready for copy-paste into Word/Google Docs or conversion to PDF via the `pdf` skill.

**Core principle:** Every invoice must be legally compliant for its target jurisdiction. When in doubt, include MORE information rather than less.

## When to Use

- User asks to create/generate an invoice
- User needs billing documentation for services rendered
- User wants tax-calculated invoice for B2B or B2C transactions
- User needs multi-currency invoice formatting

**Don't use for:**
- Filing taxes or submitting to tax authorities → use accounting connector skills
- Processing actual payments → use payment gateway integrations
- Recurring subscription billing → use AR/billing automation skills
- Expense reports → use expense-claim-audit skill

## Hard Rules

1. **NEVER generate without required fields** — invoice number, date, due date, from/to addresses, line items, and total are mandatory
2. **ALWAYS verify tax rates** — don't guess; ask user or look up current rates for the jurisdiction
3. **NEVER reuse invoice numbers** — sequential gaps raise audit flags
4. **Currency MUST be explicit** — always show currency code (USD, EUR, GBP, CNY, MYR)
5. **Tax ID required for B2B** — if user doesn't provide one for B2B, ask before generating
6. **Verify calculations** — double-check subtotal + tax = total before presenting

## Protocol

### Step 0: Gather Required Information

Before generating, confirm ALL of these exist:

| Field | Required | Example |
|-------|----------|---------|
| Your business name & address | ✅ Yes | "Acme Consulting, 123 Main St, Austin TX" |
| Client name & address | ✅ Yes | "StartupXYZ Inc, 456 Oak Ave, SF CA" |
| Line items (description, qty, rate) | ✅ Yes | "Web dev, 20 hrs, $75/hr" |
| Invoice number | ✅ Yes | "INV-2026-0042" (auto-generate if not provided) |
| Issue date | ✅ Yes | Today's date or user-specified |
| Due date / payment terms | ✅ Yes | "Net 30", "Due on receipt" |
| Currency | ⚠️ Ask if unclear | USD, EUR, GBP, CNY, MYR |
| Tax rate & type | ⚠️ Ask if B2B or taxable | "20% VAT", "10% GST", "No tax" |
| Tax ID / VAT number | ⚠️ Required for B2B | "GB123456789", "MY-1234567890" |
| Payment instructions | Optional but recommended | Bank details, payment link |

**If any required field is missing, ASK before generating.** Do not invent client addresses or business names.

### Step 1: Determine Jurisdiction & Tax Rules

Identify the applicable tax regime based on seller/buyer locations:

| Scenario | Tax Type | Key Requirement |
|----------|----------|-----------------|
| US domestic | Sales tax (state-dependent) | Include EIN for B2B; rate varies by state |
| EU domestic B2B | VAT | Must include VAT number; sequential numbering |
| EU cross-border B2B | Reverse charge VAT | Note: "Reverse Charge — VAT to be paid by recipient" |
| UK post-Brexit | UK VAT | Separate from EU VAT; 20% standard |
| China domestic | VAT (fapiao system) | Official fapiao via tax authority; 13%/6%/3% tiers |
| Australia | GST 10% | Include ABN; GST-free for exports |
| Malaysia | SST 6-10% | Include SST registration; service tax vs sales tax |

**When uncertain about tax rules:** Say so explicitly. Recommend user verify with their accountant. Do NOT fabricate tax rates.

### Step 2: Generate Invoice

Use this template structure:

```markdown
# INVOICE

**Invoice Number:** [INV-YYYY-NNNN]
**Date:** [Month DD, YYYY]
**Due Date:** [Month DD, YYYY]

---

## From
[Business Name]
[Full Address]
[Email / Phone]
[Tax ID: XXXXX] ← if applicable

## Bill To
[Client Name]
[Full Address]
[Email / Phone]
[PO Number: XXXXX] ← if provided

---

## Items

| Description | Qty | Rate | Amount |
|-------------|-----|------|--------|
| [Service/product description] | [N] | [$X.XX/unit] | [$X,XXX.XX] |
| [Second item] | [N] | [$X.XX/unit] | [$X,XXX.XX] |

---

| | |
|---|---|
| **Subtotal** | [$X,XXX.XX] |
| **[Tax Type] ([Rate]%)** | [$XXX.XX] |
| **Total Due** | **[$X,XXX.XX CURRENCY]** |

---

## Payment Details

**Bank Transfer:**
Bank: [Bank Name]
Account: [Account Number]
Routing/Sort: [Code]

**Or pay online:** [Payment Link]

---

**Payment Terms:** [Net 30 / Due on Receipt / 2/10 Net 30]
**Late Fee:** [X% per month on overdue balance] ← if applicable

Thank you for your business!
```

### Step 3: Verify Before Presenting

Run through this checklist BEFORE showing the invoice to the user:

- [ ] Invoice number is unique and sequential
- [ ] All required fields present (from, to, items, dates, total)
- [ ] Tax calculation is correct (subtotal × rate = tax amount)
- [ ] Subtotal + tax = total due
- [ ] Currency code is shown on the total
- [ ] Tax ID included if B2B transaction
- [ ] Payment terms clearly stated
- [ ] No placeholder text remains (e.g., "[Client Address]")

### Step 4: Offer Export Options

After presenting the markdown invoice, offer:

1. **Copy as-is** — paste into Word/Google Docs
2. **Convert to PDF** — use the `pdf` skill if available
3. **HTML version** — for web display or email embedding
4. **Save to file** — write to `~/invoices/INV-YYYY-NNNN.md`

## Region-Specific Tax Reference

See `references/tax-rates-by-region.md` for detailed tax rates, legal requirements, and invoice format variations by country.

Key highlights:

### United States
- No federal invoice format requirement
- State sales tax varies: CA 7.25-10.75%, TX 6.25-8.25%, NY 4-8.875%, OR 0%
- Include EIN for B2B; 1099 reporting threshold $600+

### European Union
- VAT number mandatory for registered businesses
- Sequential invoice numbering legally required
- Cross-border B2B: reverse charge mechanism applies
- Standard rates: DE 19%, FR 20%, NL 21%, IE 23%

### China
- Two types: regular invoice vs. VAT special invoice (fapiao)
- Official invoices MUST go through tax authority system
- Rates: general goods 13%, services 6%, small-scale 3%

### Malaysia
- SST replaced GST in 2018
- Service tax 6% (professional services), sales tax 5-10% (goods)
- Include SST registration number on invoices

## Payment Terms Quick Reference

| Term | Meaning | Common Use |
|------|---------|------------|
| Due on Receipt | Pay immediately | Freelance, small projects |
| Net 15 | Due within 15 days | Fast-turnaround services |
| Net 30 | Due within 30 days | Most common B2B standard |
| Net 60 | Due within 60 days | Enterprise clients |
| 2/10 Net 30 | 2% discount if paid in 10 days, else due in 30 | Incentivize early payment |

**Late fee language:** "Invoices not paid within [X] days will incur a late fee of [1.5%] per month on the outstanding balance."

Legal maximums: US ~18-24% annually, UK 8% + BoE base rate, EU ECB rate + 8%.

## Invoice Numbering Best Practices

| Format | Example | Best For |
|--------|---------|----------|
| Sequential | 001, 002, 003 | Simple, low volume |
| Year-Seq | 2026-001, 2026-002 | Easy annual tracking |
| Client-Seq | ACME-001, STARTUP-002 | Multiple active clients |
| Date-Seq | 20260129-01 | Date-based auditing |

**Rules:**
- Never reuse numbers
- Keep sequential (gaps trigger audit questions)
- Prefix by service type if needed (e.g., DEV-2026-001, CON-2026-001)

## Common Pitfalls

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Missing due date | Client delays payment indefinitely | Always specify Net X or exact date |
| Vague line items ("Consulting") | Disputes, delayed payment | Be specific: "Q1 marketing strategy consulting" |
| Wrong tax rate | Underpayment, penalties | Verify current rate for jurisdiction |
| Missing tax ID on B2B | Invoice rejected by client accounting | Ask for VAT/EIN/SST number upfront |
| No payment instructions | Client can't pay easily | Include bank details or payment link |
| Reusing invoice numbers | Audit red flag | Use sequential generator or tracker |
| Assuming tax-exempt without proof | Liability if wrong | Get exemption certificate on file |

## Verification Checklist

Before delivering the invoice:

- [ ] All required fields populated (no placeholders)
- [ ] Math verified: line items sum to subtotal, subtotal + tax = total
- [ ] Currency code explicit on total line
- [ ] Tax rate appropriate for jurisdiction and transaction type
- [ ] Tax ID present if B2B
- [ ] Invoice number unique and sequential
- [ ] Payment terms and methods clearly stated
- [ ] Professional formatting (consistent alignment, clear sections)

## Limitations

- Generates text/markdown invoices — use `pdf` skill for PDF conversion
- Tax calculations are estimates — user should verify with accountant
- Cannot integrate directly with accounting software — use `accounting-connector-setup` skill
- Does not handle recurring/subscription billing — use AR automation skills
- Not a substitute for official fapiao system in China

## Related Skills

- `ar-credit-control` — manage collections and aging after invoicing
- `ap-vendor-management` — handle supplier invoices (reverse direction)
- `bank-payment-reconciliation` — match payments against invoices
- `financial-statement-prep` — aggregate invoices into P&L
- `pdf` — convert markdown invoice to PDF
- `xlsx` — generate spreadsheet version for accounting
