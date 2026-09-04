![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Lazada Connector

> Connects Shogun OS to Lazada Open Platform API for orders, products, finance, and seller performance.

## What It Does

Provides read/write access to Lazada's marketplace API across all Southeast Asian regions (MY, SG, TH, ID, PH, VN). Uses Lazada's custom HMAC-SHA256 signing with zero external dependencies (Python stdlib only). Supports order retrieval, product management, finance data, and seller performance metrics.

## Quick Example

```python
from lazada_connector import LazadaAdapter

adapter = LazadaAdapter(region="my")
result = adapter.connect()
→ {"success": true}

orders = adapter.read_orders(status="pending")
→ {"data": [{"order_id": "LZ-001", "items": [...], "total": 250.00}]}

# Update product price
adapter.update_product({"seller_sku": "PROD-001", "price": 135.00})
→ {"success": true}
```

## When to Use / When NOT To

**Use when:**
- Reading Lazada orders or product data
- Updating prices, stock, or images on Lazada
- Retrieving finance or seller performance data
- Any direct Lazada API interaction

**Don't use for:**
- Bulk price syncing → use `lazada-price-sync`
- Listing creation → use `lazada-listing-sync` or `ecommerce-listing`
- Cross-platform operations → use orchestrator or order management

## Prerequisites

- [ ] Python 3.8+ (no extra packages — stdlib only)
- [ ] Lazada Seller Center account with API access
- [ ] Environment variables: `LAZADA_APP_KEY`, `LAZADA_APP_SECRET`, `LAZADA_ACCESS_TOKEN`, `LAZADA_SELLER_ID`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/lazada-connector` |
| Related Skills | [lazada-price-sync](../lazada-price-sync/), [lazada-listing-sync](../lazada-listing-sync/) |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `LAZADA_APP_KEY` | Lazada Open Platform App Key | Yes |
| `LAZADA_APP_SECRET` | App Secret (used for HMAC signing) | Yes |
| `LAZADA_ACCESS_TOKEN` | OAuth access token | Yes |
| `LAZADA_SELLER_ID` | Lazada Seller ID | Yes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — HMAC-SHA256 signing, multi-region, orders/products/finance APIs |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
