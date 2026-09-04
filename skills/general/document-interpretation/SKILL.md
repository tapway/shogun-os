---
name: document-interpretation
description: "Use when classifying a document type and extracting key fields from raw text. Input: raw text. Output: {type, fields, summary}. Does NOT OCR. Does NOT store."
departments: [shared]
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, interpretation, classification, extraction, shared]
---

# Document Interpretation

Classify a document's type, extract its key fields, and generate a 3-line summary. One function: interpretation only.

Does NOT extract text from files (that's `document-ocr`). Does NOT store to brain (that's `document-storage`).

## When to Load

- After `document-ocr` has produced raw text
- User pastes text and asks "what type of document is this?" or "extract the key info"

## Input

Raw text string (from OCR or paste).

## Output

JSON object:
```json
{
  "document_type": "invoice | quotation | legal_contract | purchase_order | delivery_order | other",
  "fields": { ... type-specific fields ... },
  "summary": "3-line summary"
}
```

## Document Types & Field Schemas

See `references/field-schemas.md` for the full schema per document type. Covers:
- Invoice: vendor, invoice_number, date, due_date, line_items, subtotal, tax, total, currency, payment_terms
- Quotation: vendor, quote_number, validity, line_items, total, terms
- Legal: document_type, parties, effective_date, key_clauses, obligations
- Purchase Order: po_number, issuer, vendor, line_items, total, delivery_date
- Delivery Order: do_number, vendor, delivery_date, items, condition_notes

## Classification Method

Use the LLM to classify. Prompt:

```
Classify this document as one of: invoice, quotation, legal_contract, purchase_order, delivery_order, other.
Respond with only the type name.

Document text:
---
[raw text]
---
```

## Summary Generation

3-line summary format:
- Line 1: [type] from [vendor/parties]
- Line 2: key amount or obligation
- Line 3: key date (invoice date / validity / effective date)

## Usage

### As a Python module

```python
from interpret import interpret_document

result = interpret_document(raw_text)
# result = {"document_type": "invoice", "fields": {...}, "summary": "..."}
```

### As a CLI script

```bash
echo "raw text..." | python scripts/interpret.py
# Or:
python scripts/interpret.py --file /path/to/text.txt
```

## Pitfalls

- ❌ OCRing the file — that's `document-ocr`'s job
- ❌ Storing the result — that's `document-storage`'s job
- ❌ Extracting fields without classifying first — different types have different fields
- ❌ Long summaries — 3 lines max, Telegram-friendly
