![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Website Listing Sync

> Create and update website listings from Shogun master product data.

## What It Does

Syncs product listings from the Shogun master store to WooCommerce or Shopify websites. Creates new products with proper categories, images, and attributes. Updates existing listings with current data from the master catalog. Handles platform-specific field mapping for both WooCommerce and Shopify.

## Quick Example

```
Input:  website sync --sku SKU-100 --platform shopify --dry-run

Output:
  Website Listing Sync — SKU-100 (Wireless Mouse)
  Platform: Shopify | Status: UPDATE EXISTING
  Title: Wireless Mouse Ergonomic 2.4GHz
  Price: RM 49.90 | Compare-at: RM 69.90
  Inventory: 150 units | SKU: WM-24G-BLK
  Images: 4 synced | Tags: ergonomic, wireless, office
  Category: Computer Accessories > Mice

  Dry run complete — no changes pushed.
```

## When to Use / When NOT To

**Use when:**
- Launching new products on your website from master store
- Updating website listings after catalog changes
- Bulk-syncing product data to WooCommerce or Shopify

**Don't use for:**
- Price-only updates → use website-price-sync skill (faster)
- Products without complete master data (run deep-dive-verifier first)
- Marketplace platforms → use platform-specific listing sync skills

## Prerequisites

- [ ] Website connector configured (WooCommerce or Shopify)
- [ ] Product exists in Shogun master store with complete data
- [ ] Category mapping configured for target platform
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/website-listing-sync` |
| Related Skills | [website-connector](../website-connector/), [website-price-sync](../website-price-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — create and update website listings from master store |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
