![General](https://img.shields.io/badge/dept-General-gray)

# Document Interpretation

> Classifies document type and extracts key fields from raw text — does NOT OCR or store.

## What It Does

Takes raw text (from OCR or paste) and produces a structured JSON output with document type (invoice, quotation, legal contract, PO, delivery order, other), type-specific extracted fields, and a 3-line summary. Sits between `document-ocr` (upstream) and `document-storage` (downstream) in the document processing pipeline.

## Quick Example

```
Input (raw text from OCR):
  "INVOICE #INV-2026-001
XYZ Sdn Bhd
Date: 15 Aug 2026

   Item: Widget A x 10 @ RM 150.00
Total: RM 1,500.00

   Due: 30 Sep 2026"

Output:
{
  "document_type": "invoice",
  "fields": {
    "vendor": "XYZ Sdn Bhd",
    "invoice_number": "INV-2026-001",
    "date": "2026-08-15",
    "total": 1500.00,
    "currency": "RM",
    "due_date": "2026-09-30"
  },
  "summary": "Invoice INV-2026-001 from XYZ Sdn Bhd for RM 1,500.00.
              10 units of Widget A at RM 150.00 each.
              Payment due 30 September 2026."
}
```

## When to Use / When NOT To

**Use when:**
- After OCR has produced raw text from a document
- User pastes text and asks "what type of document is this?"
- Extracting structured fields from unstructured text

**Don't use for:**
- Extracting text from files → use `document-ocr`
- Storing documents → use `document-storage`
- Searching stored documents → use `document-retrieval`

## Prerequisites

- [ ] Raw text input (from `document-ocr` or user paste)
- [ ] LLM access for classification and extraction

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/document-interpretation` |
| Related Skills | [document-ocr](../document-ocr/), [document-storage](../document-storage/), [document-retrieval](../document-retrieval/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 6 document types, field schemas, 3-line summary generation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
