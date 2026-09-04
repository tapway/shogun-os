---
name: document-retrieval
description: "Use when searching for previously scanned documents by keyword. Input: query string. Output: matching document summaries. Does NOT store."
departments: [shared]
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, retrieval, search, gbrain, shared]
---

# Document Retrieval

Search gbrain for previously stored documents by keyword. One function: retrieval only.

Does NOT store documents (that's `document-storage`). Does NOT OCR or interpret (those are upstream).

## When to Load

- User says "find the invoice from [vendor]" / "show me [keyword]"
- User asks "what invoices do we have from August?"
- User asks to retrieve a previously scanned document

## Input

Query string — vendor name, document number, date, or type.

## Output

Array of matching document summaries:
```json
[
  {
    "path": "references/documents/invoices/xyz-inv-2026-001.md",
    "title": "Invoice: XYZ Sdn Bhd INV-2026-001 — 2026-08-15",
    "summary": "Invoice from XYZ Sdn Bhd, RM 12,500, due 30 Sep 2026",
    "fields": { ... key fields ... }
  }
]
```

## Search Strategy

1. **gbrain search** — `mcp_gbrain_search("document <query>")`
2. **Filter** — only results under `references/documents/`
3. **Rank** — by relevance to the query
4. **Format** — return title + summary + key fields (not full text)

## Query Examples

| User says | Search query |
|-----------|-------------|
| "find the XYZ invoice" | `document XYZ invoice` |
| "what invoices from August" | `document invoice August 2026` |
| "show me the fertilizer quotation" | `document quotation fertilizer` |
| "find contract with ABC Sdn Bhd" | `document contract ABC` |

## Response Format (Telegram)

For a single match:
```
📄 Found: Invoice from XYZ Sdn Bhd
• Invoice #: INV-2026-001
• Date: 15 Aug 2026
• Total: RM 12,500
• Due: 30 Sep 2026
• Stored: 15 Aug 2026
```

For multiple matches:
```
📄 Found 3 documents matching "XYZ":

1. Invoice XYZ-001 (RM 12,500, 15 Aug 2026)
2. Quotation XYZ-Q-045 (RM 8,200, 10 Aug 2026)
3. Delivery Order XYZ-DO-012 (received 12 Aug 2026)

Reply with a number to see details.
```

## Pitfalls

- ❌ Storing documents — that's `document-storage`'s job
- ❌ Returning full OCR text — too long for Telegram; return summary + fields only
- ❌ Not filtering to documents path — would return unrelated brain pages
- ❌ Returning 0 results silently — always say "no documents found matching [query], try [suggestion]"
