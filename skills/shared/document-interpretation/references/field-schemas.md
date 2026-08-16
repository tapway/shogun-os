# Document Field Schemas

## Classification Prompt

```
Classify this document as one of: invoice, quotation, legal_contract, purchase_order, delivery_order, other.
Respond with only the type name.

Document text:
---
[raw text]
---
```

## Invoice Extraction Prompt

```
Extract from this invoice the following fields as JSON:
- vendor_name: string
- invoice_number: string
- invoice_date: YYYY-MM-DD (or null)
- due_date: YYYY-MM-DD (or null)
- line_items: array of {description, quantity, unit_price, amount}
- subtotal: number
- tax: number
- total: number
- currency: string (e.g. "RM", "USD")
- payment_terms: string (e.g. "Net 30")

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Quotation Extraction Prompt

```
Extract from this quotation the following fields as JSON:
- vendor_name: string
- quote_number: string
- quote_date: YYYY-MM-DD
- validity_date: YYYY-MM-DD
- line_items: array of {description, quantity, unit_price, amount}
- total: number
- currency: string
- terms: string (payment terms, delivery terms)

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Legal Contract Extraction Prompt

```
Extract from this legal document the following fields as JSON:
- document_type: string (contract, agreement, MOU, letter, other)
- parties: array of strings (company/person names)
- effective_date: YYYY-MM-DD
- termination_date: YYYY-MM-DD (or null)
- key_clauses: array of {clause_name, summary}
- obligations: array of {party, obligation}

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Purchase Order Extraction Prompt

```
Extract from this purchase order the following fields as JSON:
- po_number: string
- issuer: string (our company name)
- vendor: string
- po_date: YYYY-MM-DD
- line_items: array of {description, quantity, unit_price, amount}
- total: number
- currency: string
- delivery_date: YYYY-MM-DD

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Delivery Order Extraction Prompt

```
Extract from this delivery order the following fields as JSON:
- do_number: string
- vendor: string
- delivery_date: YYYY-MM-DD
- items: array of {description, quantity_delivered}
- received_by: string (or null)
- condition_notes: string (or null)

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```
