![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Invoice Generator
> Generate Malaysia-compliant invoices with SST calculations, e-Invoice readiness, and LHDN/RMCD formatting. Use when creating invoices for Malaysian businesses.

## What It Does

Generates professional, Malaysia-compliant invoices with automatic SST calculations, e-Invoice format readiness for LHDN MyInvois, and withholding tax notation for cross-border services. Outputs markdown invoices ready for copy-paste, PDF conversion, or e-Invoice JSON payload generation.

## Quick Example

```
Input: Acme Consulting Sdn Bhd billing StartupXYZ
       IT consulting, 20 hrs @ RM150/hr, Service Tax 6%

Output:
# INVOICE
Invoice Number: INV-2026-0042 | Date: 04/09/2026

From: Acme Consulting Sdn Bhd (BRN: 1234567-W, TIN: C2584563200)
Bill To: StartupXYZ Sdn Bhd (TIN: C1234567890)

| Description      | Qty | Rate   | Amount    |
|------------------|-----|--------|-----------|
| IT Consulting    | 20  | 150.00 | 3,000.00  |

Subtotal:           RM 3,000.00
Service Tax (6%):   RM 180.00
Total Due:          RM 3,180.00
```

## When to Use / When NOT To

**Use when:**
- Creating invoices for Malaysian business or client
- SST-compliant billing documentation needed
- e-Invoice-ready format for LHDN MyInvois submission
- Withholding tax notation for cross-border services
- Billing in MYR or foreign currency from Malaysian entity

**Don't use for:**
- Filing SST returns → use [tax-sst-compliance](../tax-sst-compliance/)
- Submitting e-Invoices to LHDN → use accounting connector (Bukku/Xero/QBO)
- Non-Malaysian jurisdiction invoicing → this skill is MY-specific

## Prerequisites

- [ ] Business name, address, BRN/TIN
- [ ] Client name, address, TIN (for B2B)
- [ ] Line items with description, quantity, rate
- [ ] SST registration status and applicable rate

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | N/A (invoked via natural language) |
| Related Skills | [ap-vendor-management](../ap-vendor-management/), [ar-credit-control](../ar-credit-control/), [tax-sst-compliance](../tax-sst-compliance/), [mfrs15-revenue-recognition](../mfrs15-revenue-recognition/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — Malaysia-compliant invoices, SST, e-Invoice, WHT |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
