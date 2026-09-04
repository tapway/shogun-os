![General](https://img.shields.io/badge/dept-General-gray)

# Document Retrieval

> Searches gbrain for previously stored documents by keyword — does NOT store or interpret.

## What It Does

Searches the gbrain knowledge base for previously scanned and stored documents using keyword queries. Returns matching document summaries with title, path, key fields, and a brief description. Supports vendor name, document number, date, and type searches. Sits at the end of the document pipeline for lookup operations.

## Quick Example

```
User: "find the invoice from XYZ Sdn Bhd"

→ Search: mcp_gbrain_search("document XYZ invoice")
→ Filter: results under references/documents/

📄 Found: Invoice from XYZ Sdn Bhd
• Invoice #: INV-2026-001
• Date: 15 Aug 2026
• Total: RM 12,500.00
• Due: 30 Sep 2026
• Path: references/documents/invoices/xyz-inv-2026-001.md
```

## When to Use / When NOT To

**Use when:**
- User asks to find a previously scanned document
- Searching for invoices, quotations, or contracts by keyword
- Retrieving document metadata or summaries

**Don't use for:**
- Storing new documents → use `document-storage`
- Extracting text from files → use `document-ocr`
- Classifying documents → use `document-interpretation`

## Prerequisites

- [ ] gbrain MCP server running and accessible
- [ ] Documents previously stored via `document-storage`
- [ ] gbrain indexed with document pages

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/document-retrieval` |
| Related Skills | [document-storage](../document-storage/), [document-interpretation](../document-interpretation/), [gbrain-query](../../gbrain/gbrain-query/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — gbrain search, keyword queries, formatted response templates |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
