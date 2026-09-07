![Retail](https://img.shields.io/badge/dept-Retail-orange)

# SiteGiant Connector

> Connect to SiteGiant Open API for products, orders, inventory, and fulfillment operations.

## What It Does

Provides integration with SiteGiant ecommerce platform via its Open API. Supports reading and writing product data, order management, inventory synchronization, and fulfillment status updates. Enables SiteGiant as a connected sales channel within the Shogun OS ecosystem.

## Quick Example

```
Input:  sitegiant connect --verify

Output:
  SiteGiant Connection: ✅ Active
  Store: MyStore.sitegiant.com
  Products: 342 listed | Orders (30d): 1,205
  Last sync: 2026-09-04 08:15

Input:  sitegiant orders --status pending

Output:
  Pending Orders: 23
  ORD-78901: RM 245.00 | 3 items | Placed 2h ago
  ORD-78902: RM 89.90  | 1 item  | Placed 4h ago
```

## When to Use / When NOT To

**Use when:**
- Syncing products between Shogun master store and SiteGiant
- Pulling orders from SiteGiant for fulfillment
- Updating inventory levels on SiteGiant

**Don't use for:**
- Shopee/Lazada/TikTok operations → use platform-specific connectors
- Website stores on WooCommerce/Shopify → use website-connector

## Prerequisites

- [ ] SiteGiant account with API access enabled
- [ ] API credentials configured (key, secret, store URL)
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/sitegiant-connector` |
| Related Skills | [sitegiant-product-sync](../sitegiant-product-sync/), [website-connector](../website-connector/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — products, orders, inventory, fulfillment |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
