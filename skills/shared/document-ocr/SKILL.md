---
name: document-ocr
description: "Use when extracting raw text from a PDF or image file. Input: file path. Output: raw text. Tries pymupdf first (text PDFs), falls back to liteparse (scanned/images). Does NOT classify, summarize, or store."
departments: [shared]
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, ocr, text-extraction, shared]
---

# Document OCR

Extract raw text from a PDF or image file. One function: text extraction only.

Does NOT classify document type. Does NOT extract fields. Does NOT summarize. Does NOT store.

Those are separate skills: `document-interpretation`, `document-storage`.

## When to Load

- User sends a PDF or image and needs text extracted
- Another skill needs raw text from a file (called as a sub-step)
- Works for: invoices, quotations, legal docs, contracts, delivery orders, any document

## Input

File path (local), or file bytes (from Telegram download or gdrive download).

## Output

Raw text string. If OCR fails, returns empty string with an error note.

## Pipeline

1. Try `pymupdf` — works for text-based PDFs (born digital). Fast, instant.
2. If pymupdf returns empty text → try `liteparse` — works for scanned PDFs and images. Uses OCR.
3. If liteparse unavailable or fails → fall back to vision model (the agent uses `vision_analyze`).

## Usage

### As a Python module

```python
from ocr import extract_text

text = extract_text("/path/to/invoice.pdf")
print(text)
```

### As a CLI script

```bash
python scripts/ocr.py /path/to/invoice.pdf
# Prints raw text to stdout
```

## gdrive Files

If the file is in Google Drive, the agent first downloads it using the `google-workspace` skill:

```bash
GAPI="python ~/.hermes/skills/productivity/google-workspace/scripts/google_api.py"
$GAPI drive download <FILE_ID> --output /tmp/document.pdf
```

Then pass the local path to `document-ocr`.

## Dependencies

- `pymupdf` (text PDFs) — pip install pymupdf
- `liteparse` (scanned/images) — pip install liteparse + `lit` CLI
- Falls back to vision model if both fail (the agent can use `vision_analyze`)

## Pitfalls

- ❌ Summarizing or classifying — that's `document-interpretation`'s job
- ❌ Storing the text — that's `document-storage`'s job
- ❌ Using marker-pdf for single docs (too slow, 1-14s/page) — only for batch
- ❌ Not checking if text is empty before returning — always validate
