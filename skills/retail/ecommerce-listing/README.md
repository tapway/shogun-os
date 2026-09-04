![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Ecommerce Listing

> Syncs product listings to Shopee/Lazada with image compliance, SEO optimization, and inventory accuracy checks.

## What It Does

Manages the end-to-end product catalog lifecycle across online marketplaces. Pushes product data to Shopee and Lazada APIs, audits image compliance (dimensions, size, format), optimizes titles and descriptions for search visibility, and reconciles stock levels across platforms to prevent overselling.

## Quick Example

```bash
# Sync a listing to Shopee
listing sync --platform shopee --sku PROD-001 --full
→ Listing created: SHP-12345 | Status: Active

# Check image compliance
listing images --sku PROD-001 --platform shopee
→ Image 1: ✅ 1024x1024, 245KB, JPEG
  Image 2: ❌ 800x600 (min 1024x1024) — resize required

# Optimize SEO title
listing optimize-seo --sku PROD-001 --language en
→ Before: "Widget A"
  After:  "Widget A Premium Stainless Steel Water Bottle 500ml BPA-Free"
```

## When to Use / When NOT To

**Use when:**
- Creating or updating marketplace listings
- Auditing listing quality and compliance
- Optimizing product titles for search
- Reconciling inventory across platforms

**Don't use for:**
- Price updates → use price-sync skills
- Order management → use `ecommerce-order-management`
- Product data ingestion → use `autocount-product-sync`

## Prerequisites

- [ ] Platform API credentials (Shopee/Lazada)
- [ ] Master store populated with product data
- [ ] Product images meeting platform requirements

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/ecommerce-listing` |
| Related Skills | [shopee-listing-sync](../shopee-listing-sync/), [lazada-listing-sync](../lazada-listing-sync/), [ecommerce-order-management](../ecommerce-order-management/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — listing sync, image compliance, SEO optimization, inventory reconciliation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
