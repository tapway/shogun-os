![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Shopee Connector

> Connect to Shopee Open Platform API v2 for orders, products, listings, analytics, and returns.

## What It Does

Provides read/write access to Shopee marketplace via the Open Platform API v2. Supports order retrieval (by status/date), product listing management, price/stock updates, shop analytics, and return/refund tracking. Uses HMAC-SHA256 request signing with zero external dependencies (Python stdlib only).

## Quick Example

```
# Test connectivity
python shopee_connector.py connect
→ {"success": true, "data": {"shop_name": "MyStore MY"}}

# Read ready-to-ship orders
python shopee_connector.py orders READY_TO_SHIP
→ {"success": true, "data": [{"order_sn": "230901ABC", ...}]}

# Update listing price and stock
python shopee_connector.py update listing.json
→ {"success": true, "data": {"item_id": 123456789, "price": 99.90}}
```

## When to Use / When NOT To

**Use when:**
- Reading or updating Shopee product listings
- Pulling orders by status or date range
- Checking shop analytics or return requests
- Building integrations that need Shopee API access

**Don't use for:**
- Lazada operations → use lazada-connector skill
- TikTok Shop → use tiktok-shop-connector skill
- Bulk operations without rate-limit handling (Shopee throttles aggressively)

## Prerequisites

- [ ] Shopee Seller Center account with API access enabled
- [ ] Partner ID and API Key from Shopee Open Platform
- [ ] Environment variables: `SHOPEE_PARTNER_ID`, `SHOPEE_API_KEY`, `SHOPEE_ACCESS_TOKEN`, `SHOPEE_SHOP_ID`
- [ ] Python 3.8+ (stdlib only, no pip packages needed)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/shopee-connector` |
| Related Skills | [shopee-listing-sync](../shopee-listing-sync/), [shopee-price-sync](../shopee-price-sync/) |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPEE_PARTNER_ID` | Seller partner ID (integer) | Yes |
| `SHOPEE_API_KEY` | Partner API key for HMAC signing | Yes |
| `SHOPEE_ACCESS_TOKEN` | OAuth access token (expires ~4h) | Yes |
| `SHOPEE_SHOP_ID` | Shop ID (integer) | Yes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — orders, products, listings, analytics, returns, 12 regions |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
