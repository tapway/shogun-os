---
name: cs-reply-drafter
description: "Use when drafting customer service replies from enquiries. Checks stock, price, credit via AutoCount, prepares a contextual reply draft for staff review."
departments: [crm, e-commerce]
version: 1.0.0
author: Shogun OS
license: MIT
metadata:
  hermes:
    tags: [retail, crm, customer-service, reply, draft, enquiry, autocount, approval]
    category: retail
    related_skills: [autocount-connector, ar-credit-control, promo-recommender, approval-gate, action-audit-log]
---

# Customer Service Reply Drafter

## Overview

Reads an inbound customer enquiry, checks stock availability, customer-specific
pricing, delivery possibility, and credit status against AutoCount data, then
prepares a professional reply draft for staff review before sending. The skill
produces a structured reply draft with availability status, line-item details,
and flagged missing information — derived from existing `autocount-connector`
and `acct_*` contract tools — no new integration is implied.

This skill closes the **Prepare** gap in the AI customer service loop
(Read → Check → **Prepare** → Approve → Send). The CRM bridges
(`respondio-bridge`, `chatwoot-bridge`) handle message intake and delivery;
this skill handles the reasoning layer between them.

## When to Use

- Customer sends an enquiry via WhatsApp, email, or chat asking about stock,
  price, or delivery availability
- Customer message is received by `respondio-bridge` or `chatwoot-bridge` and
  routed via `assignment_model: co-pilot` (draft but don't send)
- Sales or customer service staff request a draft reply for a complex enquiry
  that requires checking multiple data sources before responding
- Batch enquiry processing at start of business day — draft replies for all
  overnight enquiries for staff review

Don't use for: sending the reply — see [respondio-bridge](../../crm/respondio-bridge/SKILL.md)
or [chatwoot-bridge](../../crm/chatwoot-bridge/SKILL.md); preparing a Sales
Order draft — see [so-draft-approver](../so-draft-approver/SKILL.md);
credit limit policy decisions — see [ar-credit-control](../../finance/ar-credit-control/SKILL.md).

## Prerequisites

- Owning profile: `kizuna` (CRM profile) or `retail-manager`
- MCP / tools: `autocount_connector.read_stock_balance`, `acct_get_aging_report`,
  `acct_list_contacts` (existing tools)
- gbrain `retail` source (for `retail/pricing-rules.json` and
  `retail/reply-templates/`)
- CRM bridge (`respondio-bridge` or `chatwoot-bridge`) must be configured for
  message intake if running in real-time mode

## Workflows

### Enquiry → Reply Draft (Single)

1. Parse the inbound enquiry text to extract intent and entities (item SKU or
   name, quantity, customer identity) — done when: a structured enquiry object
   with `intent`, `items[]`, `customer` fields is produced, or the enquiry is
   flagged as `unclear` for human routing.
2. Resolve customer identity via `acct_list_contacts` — done when: the customer
   code, credit limit, and outstanding balance are attached to the enquiry
   object, or the customer is flagged as `new_customer` (no AutoCount record).
3. For each requested item, check stock via `autocount_connector.read_stock_balance(sku)`
   — done when: each item has `available_qty`, `warehouse`, and `uom` attached.
4. Look up customer-specific pricing in `retail/pricing-rules.json` in the
   gbrain retail source — done when: each item has `unit_price`, `discount`,
   and `price_source` (contract / tier / list) attached, or is flagged
   `price_not_found`.
5. Check credit status via `acct_get_aging_report(type="receivable")` filtered
   to this customer — done when: the enquiry has `credit_status` (clear /
   over_limit / overdue_invoices) and `credit_hold` boolean attached.
6. Select the appropriate reply template from `retail/reply-templates/` based
   on availability status (available / partial / unavailable) and credit status
   — done when: a template is selected and populated with enquiry data.
7. Produce the reply draft — done when: the draft contains a greeting, item
   table (SKU, description, qty available, unit price, line total), delivery
   estimate, credit flags (if any), and missing-info callouts, and is written
   to `retail/reply-drafts/<draft_id>.json` for staff review.

### Batch Enquiry Processing

1. Load all unprocessed enquiries from the CRM bridge's intake queue
   (`respondio-bridge` webhook log or `chatwoot-bridge` inbox) — done when:
   a list of enquiry objects is loaded.
2. For each enquiry, run the single enquiry → reply draft workflow above —
   done when: each enquiry has a corresponding draft in
   `retail/reply-drafts/`.
3. Produce a batch summary — done when: a summary with draft count, by-status
   breakdown (available / partial / unavailable / unclear), and flagged items
   is written to `retail/reply-drafts/_batch_summary.json`.

## Draft Output Format

```json
{
  "draft_id": "rd-20260101-001",
  "enquiry_id": "msg_xxx",
  "customer": {
    "code": "CUST001",
    "name": "Alice Tan",
    "channel": "whatsapp",
    "is_new_customer": false
  },
  "status": "partial",
  "items": [
    {
      "sku": "PROD-001",
      "description": "Widget A",
      "requested_qty": 10,
      "available_qty": 7,
      "unit_price": 150.00,
      "price_source": "contract",
      "line_total": 1050.00,
      "note": "3 units short — backorder ETA 3 days"
    }
  ],
  "delivery_estimate": "2-3 business days",
  "credit_status": {
    "status": "clear",
    "credit_limit": 10000,
    "outstanding": 2300,
    "overdue_invoices": 0,
    "credit_hold": false
  },
  "missing_info": [],
  "reply_text": "Hi Alice, thank you for your enquiry...\n\nItem | Qty Avail | Unit Price | Total\nWidget A | 7 | RM 150.00 | RM 1,050.00\n\n3 units are currently short — we can backorder with ETA 3 days.\nDelivery: 2-3 business days.\n\nShall I proceed with the order?",
  "requires_approval": true,
  "approval_reason": "partial_availability"
}
```

## Reply Templates

Templates are stored as brain pages in `~/brain/retail/reply-templates/`:

| Template | Trigger Condition |
|---|---|
| `reply-available.md` | All items in stock, credit clear |
| `reply-partial.md` | Some items short, backorder possible |
| `reply-unavailable.md` | Items out of stock, no backorder |
| `reply-credit-hold.md` | Customer over credit limit or overdue |
| `reply-new-customer.md` | Customer not in AutoCount — request details |
| `reply-unclear.md` | Enquiry intent could not be parsed — route to human |

Each template uses `{{variables}}` populated from the draft object.

## Common Pitfalls

1. **Vague enquiry parsing** — customers rarely provide exact SKUs; the parser
   must handle product descriptions, partial names, and colloquial terms.
   When confidence is low, flag as `unclear` and route to human — never guess
   a SKU.
2. **Stale stock data** — `read_stock_balance` reflects a point-in-time snapshot;
   if the enquiry has been in the queue for >1 hour, re-check stock before
   drafting. Note the check timestamp in the draft.
3. **Pricing rules drift** — customer-specific pricing in `pricing-rules.json`
   may be outdated; always attach `price_source` so staff can verify contract
   pricing before sending. Flag `price_not_found` items for manual pricing.
4. **Credit check timing** — a customer's credit status can change between
   draft and send; the draft is advisory, not a guarantee. The SO draft
   approver re-checks credit at order time.
5. **Template tone inconsistency** — templates should share a consistent
   greeting and sign-off structure; vary only the body. Avoid mixing formal
   and casual tones across templates.

## Verification Checklist

- [ ] Skill installed under owning profile `skills/cs-reply-drafter/`
- [ ] `/cs-reply-drafter` loads on the `kizuna` or `retail-manager` profile
- [ ] Happy-path: enquiry with known SKU + known customer → draft produced with
      stock + price + credit attached
- [ ] Partial availability: enquiry with short stock → draft flags `partial`
      status with backorder note
- [ ] New customer: enquiry with unknown customer → draft uses
      `reply-new-customer` template requesting details
- [ ] Unclear enquiry: unparseable message → draft routes to human with
      `reply-unclear` template
- [ ] Batch mode: 5 enquiries processed → 5 drafts + batch summary produced
