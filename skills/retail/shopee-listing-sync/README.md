![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Shopee Listing Sync

> Create and update Shopee listings from Shogun master product data.

## What It Does

Syncs product listings from the Shogun master store to Shopee marketplace. Creates new listings for products not yet on Shopee, updates existing listings with current prices, stock levels, descriptions, and images. Handles platform-specific field mapping and category assignment.

## Quick Example

```
Input:  shopee sync --sku SKU-100 --dry-run

Output:
  Shopee Listing Sync — SKU-100 (Wireless Mouse)
  Status: NEW LISTING
  Category: Computer Peripherals > Mice
  Title: Wireless Mouse Ergonomic 2.4GHz | 12-Month Warranty
  Price: RM 49.90 | Stock: 150
  Images: 4/8 slots filled
  ⚠️ Missing: video, size chart (optional)

  Dry run complete — no changes pushed.
```

## When to Use / When NOT To

**Use when:**
- Launching new products on Shopee from master store
- Updating existing Shopee listings after price or stock changes
- Bulk-syncing catalog changes to Shopee

**Don't use for:**
- Price-only updates → use shopee-price-sync skill (faster)
- Products without complete master data (run deep-dive-verifier first)
- Manual Shopee listing edits that should override master data

## Prerequisites

- [ ] Shopee connector configured with valid API credentials
- [ ] Product exists in Shogun master store with complete data
- [ ] Shopee category mapping configured
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/shopee-listing-sync` |
| Related Skills | [shopee-connector](../shopee-connector/), [shopee-price-sync](../shopee-price-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — create and update Shopee listings from master store |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
