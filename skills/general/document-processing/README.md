![General](https://img.shields.io/badge/dept-General-gray)

# Document Processing

> Process documents — extract text from PDFs/scans (OCR) and edit PDF text via natural language prompts.

## What It Does

Umbrella skill covering two document tools: OCR & Documents (extract text from PDFs and scans using pymupdf and marker-pdf) and Nano PDF (edit existing PDF text, fix typos, and update titles via natural language prompts). Provides a quick decision framework for choosing the right tool based on the task.

## Quick Example

```
Task: Extract text from a complex-layout PDF
→ Use OCR & Documents (marker-pdf for complex layouts)
→ python -m marker_pdf input.pdf --output-dir ./output

Task: Fix a typo in an existing PDF
→ Use Nano PDF
→ nano-pdf edit invoice.pdf "Change 'Recieved' to 'Received'"
→ Output: invoice_edited.pdf

Task: Simple text PDF extraction
→ Use OCR & Documents (pymupdf — faster)
→ python -c "import fitz; print(fitz.open('doc.pdf').get_text())"
```

## When to Use / When NOT To

**Use when:**
- Extracting text from any PDF or scanned document
- Editing text within an existing PDF
- Choosing between OCR tools for different document types

**Don't use for:**
- Document classification → use `document-interpretation`
- Document storage/retrieval → use `document-storage` / `document-retrieval`
- Creating new PDFs → use the `pdf` skill

## Prerequisites

- [ ] pymupdf (`pip install pymupdf`) for simple OCR
- [ ] marker-pdf (`pip install marker-pdf`) for complex layouts
- [ ] nano-pdf CLI for PDF editing

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/document-processing` |
| Related Skills | [document-ocr](../document-ocr/), [document-interpretation](../document-interpretation/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — OCR & Documents + Nano PDF umbrella, quick decision guide |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
