---
name: ap-vendor-management
description: "Manage supplier invoices, 3-way matching (PO + GRN + Invoice), and payment scheduling for accounts payable."
departments: [finance]
version: 1.0.0
author: Shogun OS
tags: [accounts-payable, vendor, invoice, 3-way-match]
metadata:
  hermes:
    related_skills: [bank-payment-reconciliation, period-end-close-checklist]
---

# AP Vendor Management

Use when handling supplier invoices, 3-way matching (PO + GRN + Invoice), or scheduling payments.

## Workflow

1. **Receive Invoice** — Scan or upload supplier invoice
2. **3-Way Match** — Verify PO number, GRN quantity, and invoice amount match
3. **Discrepancy Flag** — If mismatch > RM 50 or qty diff > 5%, flag for review
4. **Approve Payment** — Route to finance approver based on amount threshold
5. **Schedule Payment** — Add to next payment run batch

## Key Rules

- Invoices without PO reference → hold in "Unmatched" queue
- Credit notes auto-offset against open invoices from same vendor
- Payment terms: Net 30 default, override per vendor master

## Pitfalls

| Issue | Solution |
|-------|----------|
| Duplicate invoice entry | Check vendor+invoice# combo before posting |
| Currency mismatch | Convert to MYR using BNM rate on invoice date |
| SST not separated | Extract SST line item; validate 6%/8% rate |

## Verification

- [ ] All invoices have valid PO reference
- [ ] 3-way match passes or discrepancy documented
- [ ] Payment scheduled within vendor terms
