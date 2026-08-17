---
name: finance-doc-scan
description: "Use when scanning finance documents (invoices, quotations, receipts). Input: document file. Output: extracted fields as bullet points (vendor, amounts, dates, line items). Does NOT summarize. Does NOT assess legal docs."
departments: [finance]
version: 1.0.0
author: Shogun OS
category: finance
tags: [finance, document-scan, invoice, quotation, receipt, ocr, deepseek]
---

# Finance Document Scan

OCR a finance document (invoice, quotation, receipt) and extract key fields as bullet points. One function: finance document field extraction.

Does NOT summarize (just list the details in point form). Does NOT scan legal documents (that's `estate-legal-scan`). Does NOT store to gbrain (that's the dashboard endpoint's job).

## When to Load

- User uploads an invoice, quotation, or receipt in the Finance dashboard
- Finance dashboard scan endpoint calls this skill after OCR

## Input

Document file (PDF, PNG, JPG) — OCR text is extracted first by the backend, then passed to DeepSeek with this skill's prompt.

## Output

JSON object with extracted fields — **point form, no summary**:
```json
{
  "document_type": "invoice | quotation | receipt | other",
  "fields": {
    "vendor": "ABC Supplies Sdn Bhd",
    "document_number": "INV-2026-001",
    "date": "15 August 2026",
    "due_date": "30 September 2026",
    "subtotal": "RM 10,000.00",
    "tax": "RM 600.00",
    "total": "RM 10,600.00",
    "line_items": ["Office Supplies - RM 5,000.00", "Equipment Rental - RM 5,000.00"]
  },
  "validation": {
    "valid": true,
    "message": "Subtotal + tax = total verified"
  }
}
```

## DeepSeek Prompt

```
You are a finance document scanner. Below is the OCR text from an invoice, quotation, or receipt.

=== DOCUMENT TEXT ===
{ocr_text}
=== END DOCUMENT TEXT ===

Extract ALL key fields from this document. Return ONLY a JSON object:
{
  "document_type": "invoice | quotation | receipt | other",
  "fields": {
    "vendor": "vendor/supplier name",
    "document_number": "invoice/quotation/receipt number",
    "date": "document date",
    "due_date": "due date if present",
    "subtotal": "subtotal amount with currency",
    "tax": "tax amount with currency",
    "total": "total amount with currency",
    "line_items": ["each line item with description and amount"]
  },
  "validation": {
    "valid": true/false,
    "message": "verify subtotal + tax = total, note any discrepancy"
  }
}

List ALL fields as key-value pairs. Do NOT write a summary. Do NOT add explanation outside JSON.
```

## Pitfalls

- ❌ Writing a summary — this skill extracts fields only, no summary text
- ❌ Scanning legal documents/contracts — that's `estate-legal-scan`'s job
- ❌ Missing line items — always extract every line item visible
- ❌ Not validating totals — always check if subtotal + tax = total
