![CRM](https://img.shields.io/badge/dept-CRM-blue)

# CS Reply Drafter

> Drafts customer service replies by checking stock, pricing, and credit status — ready for staff review before sending.

## What It Does

Sits between your CRM inbox bridge and the customer. When an enquiry arrives, it automatically checks real-time stock levels in AutoCount, looks up customer-specific pricing, verifies credit status, and produces a professional reply draft with line-item details. Staff review the draft and approve or edit before it's sent — no guesswork, no stale data.

## Quick Example

```
Enquiry: "Hi, do you have Widget A? Need 10 units, deliver to KL"

→ Stock check:     7 available (3 short, backorder ETA 3 days)
→ Price lookup:    RM 150.00/unit (contract price for CUST001)
→ Credit check:    Clear (limit RM 10,000, outstanding RM 2,300)

Draft reply:
  "Hi Alice, thank you for your enquiry!

   Item       | Qty Avail | Unit Price | Total
   Widget A   | 7         | RM 150.00  | RM 1,050.00

   3 units are currently short — we can backorder with ETA 3 days.
   Delivery: 2-3 business days to KL.

   Shall I proceed with the order?"

Status: partial_availability → requires_approval: true
```

## When to Use / When NOT To

**Use when:**
- Customer asks about stock, price, or delivery availability
- CRM bridge routes enquiry in co-pilot mode
- Batch-processing overnight enquiries at start of day
- Complex multi-item enquiries needing data lookups

**Don't use for:**
- Sending the actual reply → use [respondio-bridge](../respondio-bridge/) or [chatwoot-bridge](../chatwoot-bridge/)
- Creating sales orders → use SO draft approver
- Credit limit policy decisions → use [ar-credit-control](../../finance/ar-credit-control/)

## Prerequisites

- [ ] Kizuna or retail-manager profile active
- [ ] AutoCount connector configured (`autocount_connector.read_stock_balance`)
- [ ] Accounting tools available (`acct_get_aging_report`, `acct_list_contacts`)
- [ ] gbrain retail source with `pricing-rules.json` and `reply-templates/`
- [ ] CRM bridge configured for message intake

## Department & Profile

| Field | Value |
|-------|-------|
| Department | CRM |
| Owning Profile | kizuna / retail-manager |
| Slash Command | `/cs-reply-drafter` |
| Related Skills | [respondio-bridge](../respondio-bridge/), [chatwoot-bridge](../chatwoot-bridge/), [ar-credit-control](../../finance/ar-credit-control/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — single + batch enquiry processing, 6 reply templates, AutoCount integration |
| 1.0.1 | 2026-09-04 | Moved from retail/ to crm/, departments set to [crm] |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
