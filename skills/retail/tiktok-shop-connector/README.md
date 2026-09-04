![Retail](https://img.shields.io/badge/dept-Retail-orange)

# TikTok Shop Connector

> Connect to TikTok Shop API for orders, products, logistics, and seller operations.

## What It Does

Provides integration with TikTok Shop via its official API. Supports order management, product CRUD operations, logistics tracking, and seller account operations. Enables TikTok Shop as a connected sales channel within the Shogun OS multi-platform ecosystem.

## Quick Example

```
Input:  tiktok connect --verify

Output:
  TikTok Shop Connection: ✅ Active
  Seller: MyStore MY | Region: Malaysia
  Products: 189 listed | Orders (30d): 856
  Last sync: 2026-09-04 09:30

Input:  tiktok orders --status AWAITING_SHIPMENT

Output:
  Awaiting Shipment: 15 orders
  TK-ORD-12345: RM 129.90 | 2 items | Due ship: Sep 5
  TK-ORD-12346: RM 49.90  | 1 item  | Due ship: Sep 5
```

## When to Use / When NOT To

**Use when:**
- Pulling TikTok Shop orders for fulfillment processing
- Managing TikTok product listings programmatically
- Tracking logistics and shipment status on TikTok

**Don't use for:**
- Shopee/Lazada operations → use platform-specific connectors
- TikTok Live management → use TikTok Seller Center directly
- Content creation → use social-content-generator or video-content-generator

## Prerequisites

- [ ] TikTok Shop seller account with API access
- [ ] App key and secret from TikTok Developer Portal
- [ ] Access token configured and refreshed
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/tiktok-shop-connector` |
| Related Skills | [tiktok-listing-sync](../tiktok-listing-sync/), [tiktok-price-sync](../tiktok-price-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — orders, products, logistics, seller operations |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
