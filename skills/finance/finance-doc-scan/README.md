![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Finance Document Scan
> Use when scanning finance documents (invoices, quotations, receipts). Input: document file. Output: extracted fields as bullet points (vendor, amounts, dates, line items). Does NOT summarize. Does NOT assess legal docs.

## What It Does

Extracts structured fields from finance documents (invoices, quotations, receipts) using OCR and returns them as a JSON object with vendor, amounts, dates, and line items. Validates that subtotal + tax equals total. This is a pure field extraction tool — it does not summarize or store documents.

## Quick Example

```
Input: PDF invoice from ABC Supplies Sdn Bhd

Output:
{
  "document_type": "invoice",
  "fields": {
    "vendor": "ABC Supplies Sdn Bhd",
    "document_number": "INV-2026-001",
    "date": "15 August 2026",
    "due_date": "30 September 2026",
    "subtotal": "RM 10,000.00",
    "tax": "RM 600.00",
    "total": "RM 10,600.00",
    "line_items": ["Office Supplies - RM 5,000.00", ...]
  },
  "validation": { "valid": true, "message": "Subtotal + tax = total verified" }
}
```

## When to Use / When NOT To

**Use when:**
- User uploads invoice/quotation/receipt in Finance dashboard
- Finance dashboard scan endpoint calls this after OCR
- Need structured field extraction from finance documents

**Don't use for:**
- Summarizing documents → this skill extracts fields only
- Legal documents/contracts → use `estate-legal-scan` instead
- Storing to gbrain → that's the dashboard endpoint's job

## Prerequisites

- [ ] Document file (PDF, PNG, JPG)
- [ ] OCR text extracted by backend before passing to this skill

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | N/A (called by dashboard scan endpoint) |
| Related Skills | [expense-report](../expense-report/), [invoice-organizer](../invoice-organizer/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — field extraction, validation, JSON output |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
