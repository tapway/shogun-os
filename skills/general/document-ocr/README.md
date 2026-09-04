![General](https://img.shields.io/badge/dept-General-gray)

# Document OCR

> Extracts raw text from PDFs and images using pymupdf/liteparse/vision fallback — does NOT classify or store.

## What It Does

Extracts raw text from PDF or image files using a three-tier pipeline: pymupdf for text-based PDFs (fast), liteparse for scanned PDFs and images (OCR), and vision model as final fallback. Returns plain text only — no classification, no field extraction, no storage. Sits at the start of the document processing pipeline.

## Quick Example

```python
from ocr import extract_text

# Text-based PDF (instant)
text = extract_text("/path/to/invoice.pdf")
→ "INVOICE #INV-2026-001\nXYZ Sdn Bhd\n..."

# Scanned PDF (OCR via liteparse)
text = extract_text("/path/to/scanned-contract.pdf")
→ "AGREEMENT BETWEEN...\nParty A: ABC Sdn Bhd\n..."

# Image file
text = extract_text("/path/to/receipt.jpg")
→ "RECEIPT\nStore: ShopMart\nDate: 2026-08-14\nTotal: RM 45.90"
```

## When to Use / When NOT To

**Use when:**
- User sends a PDF or image needing text extraction
- Another skill needs raw text from a file
- Processing invoices, contracts, receipts, or any document

**Don't use for:**
- Classifying document type → use `document-interpretation`
- Extracting structured fields → use `document-interpretation`
- Storing documents → use `document-storage`
- Editing PDF text → use `document-processing` (nano-pdf)

## Prerequisites

- [ ] Python with pymupdf installed (`pip install pymupdf`)
- [ ] Optional: liteparse for scanned documents
- [ ] Vision model access (final fallback)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/document-ocr` |
| Related Skills | [document-interpretation](../document-interpretation/), [document-processing](../document-processing/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 3-tier pipeline (pymupdf → liteparse → vision), PDF + image support |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
