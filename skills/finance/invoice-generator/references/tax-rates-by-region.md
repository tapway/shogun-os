# Malaysia Tax & Finance Reference — Invoice Generator

Detailed SST rates, e-Invoice requirements, withholding tax rules, and compliance references for Malaysian invoicing. Load this when generating invoices for Malaysian entities.

## SST (Sales and Service Tax) Overview

SST replaced GST on September 1, 2018. It is a **single-stage tax** (not multi-stage like GST), applied at the manufacturer or service provider level only. No input tax credit mechanism exists.

### Service Tax

| Category | Rate | Effective Date | Examples |
|----------|------|----------------|----------|
| Standard services | 6% | Sep 2018 | Consulting, legal, accounting, IT, advertising |
| Selected services (increased) | 8% | Jul 1, 2024 | Logistics, telecommunications, parking, brokerage |
| Digital services (foreign) | 6% | Jan 1, 2020 | Streaming, cloud, software subscriptions from abroad |
| Hospitality / accommodation | 6% | Sep 2018 | Hotels, Airbnb (if registered) |
| Insurance / takaful | 6% | Sep 2018 | General insurance, family takaful premiums |
| Financial services | Exempt | — | Banking fees, loan processing, life insurance |
| Education | Exempt | — | Tuition at approved institutions |
| Healthcare | Exempt | — | Licensed medical practitioners, hospitals |

**Registration threshold:** RM500,000 annual revenue for service providers. Voluntary registration allowed below threshold.

**Filing frequency:** Bi-monthly (every 2 months). Due date: last day of the month following the taxable period.

**Form:** SST-02 return via MySST portal (mysstext.customs.gov.my).

### Sales Tax

| Category | Rate | Scope |
|----------|------|-------|
| Most taxable goods | 10% | Manufactured goods not in exempt list |
| Selected goods | 5% | Basic food items, building materials, machinery |
| Petroleum products | Varies | RON95 subsidised; diesel, jet fuel taxed |
| Exempt goods | 0% | Essential food, medicines, educational materials, exports |

**Registration threshold:** RM500,000 annual revenue for manufacturers. Different thresholds for specific industries.

**Filing frequency:** Monthly. Due date: last day of the month following the taxable period.

**Form:** SST-01 return via MySST portal.

### SST Registration Number Format

```
W10-1809-32000123
│    │      │
│    │      └── Sequential number
│    └───────── State code + year
└────────────── Tax type (W = Service Tax, B = Sales Tax)
```

State codes: W=KL, B=Selangor, J=Johor, P=Penang, K=Kedah, etc.

---

## e-Invoice (MyInvois) Requirements

LHDN's MyInvois system mandates electronic invoicing in phases:

### Phasing Schedule

| Phase | Criteria | Effective Date | Status |
|-------|----------|----------------|--------|
| Phase 1 | Annual revenue > RM100 million | Aug 1, 2024 | Active |
| Phase 2 | Annual revenue RM25M – RM100M | Jan 1, 2025 | Active |
| Phase 3 | All taxpayers | Jul 1, 2025 | Active |
| MSME voluntary | Below RM25M | Anytime | Optional |

### Mandatory e-Invoice Fields

| Field | Format | Notes |
|-------|--------|-------|
| Supplier TIN | C + 10 digits | Issued by LHDN upon registration |
| Supplier BRN | SSM format | e.g., 1234567-W, 202401001234 |
| Supplier MSIC Code | 5 digits | From msic.stats.gov.my |
| Buyer TIN | C + 10 digits | Required for B2B; EI00000000010 for individuals without TIN |
| Buyer BRN | SSM format | Required for B2B |
| Invoice Type Code | 2 digits | 01=Invoice, 02=Credit Note, 03=Debit Note, 04=Refund Note |
| Issue Date/Time | ISO 8601 | YYYY-MM-DDTHH:MM:SS |
| Line Item Unit Price | Decimal | Before tax |
| Line Item Quantity | Decimal | Can be fractional |
| Line Item Tax Rate | Percentage | 0, 5, 6, 8, 10 |
| Line Item Tax Amount | Decimal | Calculated per line |
| Total Excluding Tax | Decimal | Sum of line subtotals |
| Total Tax Amount | Decimal | Sum of line tax amounts |
| Total Including Tax | Decimal | Total excl. tax + total tax |
| Currency Code | ISO 4217 | MYR default; USD, SGD, etc. for foreign |
| Payment Terms | Text | Net 30, COD, etc. |

### Self-Billed e-Invoices

Allowed in specific scenarios:
- Purchases from unregistered suppliers (individuals/small biz without TIN)
- Expense claims from employees
- Agent commissions
- Profit distribution to owners

The buyer issues the invoice on behalf of the supplier. Must still be validated through MyInvois.

### e-Invoice Validation Flow

```
1. Generate invoice JSON/XML → 2. Submit to MyInvois API → 
3. LHDN validates → 4. Returns Unique ID + QR code + digital signature → 
5. Embed QR/signature in invoice → 6. Deliver to buyer
```

**API endpoint:** https://api.myinvois.hasil.gov.my (production)
**Sandbox:** https://preprod-api.myinvois.hasil.gov.my (testing)

---

## Withholding Tax (WHT)

Under the Income Tax Act 1967 (ITA), payers must deduct WHT on certain payments to non-residents:

### WHT Rates by Payment Type

| Payment Type | WHT Rate | ITA Section | Filing Deadline |
|-------------|----------|-------------|-----------------|
| Technical/management fees | 10% | s.109B | Within 1 month of payment |
| Royalties / use of movable property | 10% | s.109 | Within 1 month of payment |
| Interest | 15% | s.109 | Within 1 month of payment |
| Contract payments (services) | 10% | s.109B | Within 1 month of payment |
| Contract payments (materials/supplies) | 3% | s.109B | Within 1 month of payment |
| Rental of movable property | 10% | s.109 | Within 1 month of payment |
| Special classes of income | 10% | s.109F | Within 1 month of payment |
| Public entertainment / athletes | Variable | s.109A | Within 1 month of payment |

### Double Taxation Agreements (DTA)

Malaysia has DTAs with 70+ countries that may reduce WHT rates:

| Country | Technical Fees | Royalties | Interest | Dividends |
|---------|---------------|-----------|----------|-----------|
| Singapore | 10% | 10% | 10% | 10% |
| UK | 10% | 8% | 10% | 10% |
| USA | 10% | 10% | 10% | 10% |
| Japan | 10% | 10% | 10% | 10% |
| Australia | 10% | 10% | 10% | 15% |
| China | 10% | 10% | 10% | 10% |
| Indonesia | 10% | 10% | 10% | 10% |
| Germany | 10% | 8% | 10% | 10% |
| France | 10% | 10% | 10% | 10% |
| India | 10% | 10% | 10% | 10% |
| UAE | 10% | 10% | 10% | 10% |
| Netherlands | 10% | 8% | 10% | 10% |

**To claim DTA reduced rate:** Non-resident must provide Certificate of Residence (COR) from their home country tax authority. Submit Form CA-1 to LHDN.

### WHT Penalty

Failure to deduct/remit WHT:
- Penalty: 10% of unpaid WHT amount
- Additional penalty: 5% if not paid within 30 days of first penalty
- The payer (not the payee) is liable for undeducted WHT

---

## Corporate Tax Reference

### Corporate Income Tax (CIT)

| Entity Type | Rate | Notes |
|-------------|------|-------|
| Standard company | 24% | On chargeable income |
| SME (first RM150K) | 15% | Paid-up capital ≤ RM2.5M, gross income ≤ RM50M |
| SME (RM150K–RM600K) | 17% | Same eligibility criteria |
| SME (above RM600K) | 24% | Balance taxed at standard rate |
| Labuan entity | 3% | On net profits from trading activities |
| REIT | 24% | Distributed income taxed at unit holder level |

### CP204 Estimated Tax

Companies must submit estimated tax payable (CP204) before the start of each basis period. Revision allowed in month 6 and month 9. Underestimation penalty: 10% if actual tax exceeds estimate by >30%.

### Key Deadlines

| Obligation | Deadline |
|------------|----------|
| CP204 submission | 30 days before basis period starts |
| Monthly instalment (CP205) | 15th of each month |
| Annual tax return (Form C) | Within 7 months after basis period ends |
| SST-02 return | Last day of month following taxable period |
| WHT remittance | Within 1 month of payment to non-resident |
| e-Invoice validation | Real-time (within 72 hours of issuance) |

---

## Bank Details Format (Malaysia)

### Major Banks SWIFT/BIC Codes

| Bank | SWIFT/BIC | Account Format |
|------|-----------|----------------|
| Maybank | MBBEMYKL | 10-12 digits |
| CIMB | CIBBMYKL | 10-12 digits |
| Public Bank | PBBEMYKL | 10-12 digits |
| RHB | RHBBMYKL | 10-12 digits |
| Hong Leong Bank | HLBMYKL | 10-12 digits |
| AmBank | ARBKMYKL | 10-12 digits |
| Alliance Bank | MFBBMYKL | 10-12 digits |
| Bank Islam | BIMBMYKL | 10-12 digits |
| Affin Bank | ABBMYKL | 10-12 digits |
| OCBC Malaysia | OCBCMYKL | 10-12 digits |
| HSBC Malaysia | HBMWMYKL | 10-12 digits |
| Standard Chartered MY | SCBLMYKL | 10-12 digits |

### DuitNow / Instant Transfer

- All major banks support DuitNow instant transfers
- Proxy identifiers: NRIC, passport, mobile number, email, army number
- Maximum per transaction: RM50,000 (varies by bank)
- Available 24/7 including weekends and public holidays

### FPX (Financial Process Exchange)

- Direct bank debit for online payments
- Supported by all major Malaysian banks
- No credit card required
- Transaction limit: RM30,000 per transaction (varies by bank)
- Commonly used for e-commerce, government payments, utility bills

---

## Currency Reference (Common in Malaysian Invoicing)

| Currency | Code | Symbol | Typical Use Case |
|----------|------|--------|------------------|
| Malaysian Ringgit | MYR | RM | Default domestic currency |
| US Dollar | USD | US$ | International trade, tech services |
| Singapore Dollar | SGD | S$ | Cross-border with Singapore |
| British Pound | GBP | £ | UK clients, legacy contracts |
| Euro | EUR | € | EU clients |
| Chinese Yuan | CNY | ¥ | China trade, manufacturing |
| Japanese Yen | JPY | ¥ | Japan trade, electronics |
| Australian Dollar | AUD | A$ | Australia/NZ clients |
| Indonesian Rupiah | IDR | Rp | Indonesia trade |
| Thai Baht | THB | ฿ | Thailand trade |
| Brunei Dollar | BND | B$ | Brunei (interchangeable with SGD) |

**Exchange rate source:** Bank Negara Malaysia (BNM) daily rates at bnm.gov.my/exchange-rates

**Foreign currency invoicing:** Allowed for export/import transactions. Domestic transactions between Malaysian residents should generally be in MYR unless exempted by BNM.

---

## Useful Government Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| MySST | mysstext.customs.gov.my | SST registration, filing, payment |
| MyInvois | myinvois.hasil.gov.my | e-Invoice submission, validation |
| LHDN e-Filing | mytax.hasil.gov.my | Corporate/individual tax returns |
| SSM e-Info | einfo.ssm.com.my | Business registration verification |
| MSIC Lookup | msic.stats.gov.my | Industry classification codes |
| BNM Exchange Rates | bnm.gov.my/exchange-rates | Official daily exchange rates |
| Customs Tariff | dagangan.miti.gov.my | Import/export tariff lookup |
| MDEC Digital Tax | mdec.my/digital-tax | Digital service tax guidance |
