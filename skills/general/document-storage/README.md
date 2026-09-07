![General](https://img.shields.io/badge/dept-General-gray)

# Document Storage

> Persists scanned document records to gbrain with proper frontmatter and path conventions — does NOT interpret or retrieve.

## What It Does

Takes structured document data (type, fields, summary, source) from `document-interpretation` and writes it to gbrain at the correct path with proper YAML frontmatter. Follows strict path conventions (`references/documents/<type>/<vendor>-<number>.md`) for consistent organization. One function: storage only.

## Quick Example

```
Input:
{
  "document_type": "invoice",
  "fields": {"vendor_name": "XYZ Sdn Bhd", "invoice_number": "INV-2026-001",
             "total": 12500, "currency": "RM"},
  "summary": "Invoice from XYZ Sdn Bhd, RM 12,500, due 30 Sep 2026",
  "source": "telegram://file_id_abc123"
}

Output:
→ Stored at: references/documents/invoices/xyz-inv-2026-001.md
→ Frontmatter: title, type, tags, source, stored date, document_type
→ Body: Summary + Key Fields sections
```

## When to Use / When NOT To

**Use when:**
- After `document-interpretation` has produced structured data
- User says "save this" or "store this document"
- Persisting document records for future retrieval

**Don't use for:**
- Classifying or extracting fields → use `document-interpretation`
- Searching stored documents → use `document-retrieval`
- Extracting text from files → use `document-ocr`

## Prerequisites

- [ ] gbrain MCP server running and writable
- [ ] Structured document data from `document-interpretation`
- [ ] Source reference (telegram, gdrive, or local path)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/document-storage` |
| Related Skills | [document-interpretation](../document-interpretation/), [document-retrieval](../document-retrieval/), [gbrain-ingest](../../gbrain/gbrain-ingest/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — path conventions, YAML frontmatter, 6 document type directories |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
