![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Ingest

> Ingest URLs, files, and documents into gbrain — auto-detect type, extract entities, file correctly, cross-link.

## What It Does

General-purpose import pipeline for bringing external content into the brain. Auto-detects content type (URL, PDF, image, code, email thread, bulk directory), extracts key facts and entities, files pages under the correct brain path, and creates back-links from every mentioned entity. Handles everything from single articles to 500+ file bulk imports via `gbrain import`.

## Quick Example

```
# Single URL ingest
User: "Import this PDF contract"
→ OCR/extract text → identify entities (Acme Corp, John Doe)
→ Write references/contracts/acme-service-agreement.md
→ Cross-link: companies/acme ← new page, people/john-doe ← new page

# Bulk directory ingest
gbrain import ~/downloads/reports/ --no-embed --workers 4
→ Imports 500+ files, entity extraction per file
→ Run gbrain embed --stale after
```

## When to Use / When NOT To

**Use when:**
- Importing any external content (URLs, PDFs, images, code, emails)
- Bulk importing directories of markdown files
- User says "import this" or "add this to brain"

**Don't use for:**
- Media-specific content with transcripts/OCR needs (use `gbrain-media-ingest`)
- External articles needing summarization (use `gbrain-idea-ingest`)
- Original user thoughts (use `capture`)

## Prerequisites

- [ ] gbrain CLI installed (`gbrain --version`)
- [ ] gbrain MCP tools available
- [ ] For PDFs: OCR tools (pymupdf or marker-pdf)
- [ ] For bulk imports: sufficient disk space and time

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (triggered by import requests) |
| Related Skills | [gbrain-idea-ingest](../gbrain-idea-ingest/), [gbrain-media-ingest](../gbrain-media-ingest/), [brain-compliance](../brain-compliance/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — multi-type ingest, entity extraction, bulk import support |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
