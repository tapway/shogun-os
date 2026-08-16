---
name: document-storage
description: "Use when storing a scanned document's fields and summary to gbrain. Input: {fields, summary, source}. Output: gbrain page path. Does NOT interpret. Does NOT retrieve."
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, storage, gbrain, persist, shared]
---

# Document Storage

Persist a document record to gbrain at the correct path with proper frontmatter. One function: storage only.

Does NOT classify or extract fields (that's `document-interpretation`). Does NOT search/retrieve (that's `document-retrieval`).

## When to Load

- After `document-interpretation` has produced {type, fields, summary}
- User says "save this" / "store this document"

## Input

JSON object:
```json
{
  "document_type": "invoice",
  "fields": {
    "vendor_name": "XYZ Sdn Bhd",
    "invoice_number": "INV-2026-001",
    "total": 12500,
    "currency": "RM"
  },
  "summary": "Invoice from XYZ Sdn Bhd, RM 12,500, due 30 Sep 2026",
  "source": "telegram://file_id" | "gdrive://file_id" | "local://path"
}
```

## Output

gbrain page path: `references/documents/<type>/<vendor>-<number>.md`

## Storage Path Convention

```
references/documents/
├── invoices/
│   └── <vendor_slug>-<invoice_number>.md
├── quotations/
│   └── <vendor_slug>-<quote_number>.md
├── legal/
│   └── <type>-<party1>-<party2>.md
├── purchase_orders/
│   └── <po_number>.md
├── delivery_orders/
│   └── <do_number>.md
└── other/
    └── <description>-<date>.md
```

## Page Template

```yaml
---
title: "[Type]: [vendor/parties] [number] — [date]"
type: reference
tags: [document, <type>]
source: "telegram://file_id" or "gdrive://file_id"
stored: "2026-08-15"
document_type: invoice
---

## Summary
[3-line summary from interpretation]

## Key Fields
- Vendor: [vendor_name]
- Invoice #: [invoice_number]
- Date: [invoice_date]
- Total: [currency] [total]
- Due: [due_date]

## Full Fields
<details>
[complete JSON fields]
</details>
```

## How to Store

Use the gbrain MCP tool:

```
mcp_gbrain_put_page(
  path="references/documents/invoices/xyz-inv-2026-001.md",
  content="[page content from template above]"
)
```

Then add a timeline entry if the document has a date:

```
mcp_gbrain_add_timeline_entry(
  page_path="references/documents/invoices/xyz-inv-2026-001.md",
  date="[invoice_date]",
  event="Invoice [number] from [vendor], [total]"
)
```

## Pitfalls

- ❌ Interpreting the document — that's `document-interpretation`'s job
- ❌ Retrieving documents — that's `document-retrieval`'s job
- ❌ Not including the source field — can't trace back to the original file
- ❌ Wrong path — invoices go in `invoices/`, not a flat directory
- ❌ Missing tags — `document` and the type tag are required for retrieval to work
