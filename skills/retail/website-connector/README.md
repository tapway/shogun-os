![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Website Connector

> Connect to WooCommerce or Shopify REST API for product/order/inventory operations.

## What It Does

Provides a unified adapter for connecting to WooCommerce and Shopify websites via their REST APIs. Supports product CRUD, order retrieval, inventory synchronization, and customer data access. Uses pluggable adapters so the same interface works across both platforms.

## Quick Example

```
Input:  website connect --platform woocommerce --verify

Output:
  WooCommerce Connection: ✅ Active
  Store: mystore.com.my | Products: 456 | Orders (30d): 234
  Last sync: 2026-09-04 10:00

Input:  website orders --status processing

Output:
  Processing Orders: 8
  WC-7890: RM 345.00 | 4 items | Customer: Ahmad
  WC-7891: RM 129.90 | 2 items | Customer: Siti
```

## When to Use / When NOT To

**Use when:**
- Syncing products between Shogun master store and WooCommerce/Shopify
- Pulling website orders for centralized fulfillment
- Updating website inventory from master stock levels

**Don't use for:**
- Marketplace platforms (Shopee, Lazada, TikTok) → use platform-specific connectors
- SiteGiant stores → use sitegiant-connector skill
- Custom-built websites without REST API

## Prerequisites

- [ ] WooCommerce or Shopify store with REST API enabled
- [ ] API credentials (consumer key/secret for WooCommerce, access token for Shopify)
- [ ] Platform adapter configured
- [ ] Scripts available in `scripts/adapters/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/website-connector` |
| Related Skills | [website-listing-sync](../website-listing-sync/), [website-price-sync](../website-price-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — WooCommerce and Shopify adapter support |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
