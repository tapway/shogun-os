![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Ecommerce Order Management

> Consolidates orders from multiple marketplaces with fulfillment routing, return processing, and delivery tracking.

## What It Does

Centralizes order processing across Shopee, Lazada, TikTok, and Website into a unified workflow. Routes orders to the optimal fulfillment location, tracks returns and refunds, and provides delivery status visibility to customer service teams. Enforces SLAs from order intake (<30 min routing) through dispatch (<2 hours).

## Quick Example

```bash
# View consolidated orders
order list --date 2026-08-14 --status pending
→ 23 pending orders across 3 platforms

# Route order for fulfillment
order route --order ORD-2026-001 --source store-01
→ Routed to Store KL-01 | Pick & Pack SLA: 4 hours

# Process return
order return --order ORD-2026-001 --reason "defective" --refund full
→ Return initiated | Refund: RM 150.00 | Status: pending_approval
```

## When to Use / When NOT To

**Use when:**
- Managing orders from multiple marketplaces
- Routing orders to fulfillment locations
- Processing returns and refunds
- Tracking delivery status for customer inquiries

**Don't use for:**
- Product listing management → use `ecommerce-listing`
- Price updates → use price-sync skills
- Customer communication → use CRM bridge skills

## Prerequisites

- [ ] Platform connectors configured (Shopee, Lazada, TikTok, Website)
- [ ] Fulfillment location registry configured
- [ ] Carrier integration for delivery tracking

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/ecommerce-order-management` |
| Related Skills | [ecommerce-listing](../ecommerce-listing/), [warehouse-distribution](../warehouse-distribution/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — cross-platform consolidation, fulfillment routing, returns, delivery tracking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
