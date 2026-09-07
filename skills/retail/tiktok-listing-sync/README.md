![Retail](https://img.shields.io/badge/dept-Retail-orange)

# TikTok Listing Sync

> Create and update TikTok Shop listings from Shogun master product data.

## What It Does

Syncs product listings from the Shogun master store to TikTok Shop. Creates new listings with platform-compliant titles, descriptions, and category mappings. Updates existing listings with current prices, stock, and images. Handles TikTok Shop's specific requirements for product approval.

## Quick Example

```
Input:  tiktok sync --sku SKU-100 --dry-run

Output:
  TikTok Listing Sync — SKU-100 (Wireless Mouse)
  Status: UPDATE EXISTING
  Title: Wireless Mouse Ergonomic 2.4GHz 12-Month Warranty
  Category: Computers & Laptops > Computer Accessories > Mice
  Price: RM 49.90 | Stock: 150
  Images: 5/9 slots | Video: ✅ attached
  Compliance: ✅ All required fields present

  Dry run complete — no changes pushed.
```

## When to Use / When NOT To

**Use when:**
- Launching products on TikTok Shop from master store
- Updating TikTok listings after catalog changes
- Ensuring TikTok listing compliance before going live

**Don't use for:**
- Price-only updates → use tiktok-price-sync skill
- TikTok Live shopping events → manage via TikTok Seller Center
- Products restricted on TikTok Shop (check prohibited categories first)

## Prerequisites

- [ ] TikTok Shop connector configured with valid API credentials
- [ ] Product exists in Shogun master store with complete data
- [ ] TikTok category mapping configured
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/tiktok-listing-sync` |
| Related Skills | [tiktok-shop-connector](../tiktok-shop-connector/), [tiktok-price-sync](../tiktok-price-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — create and update TikTok Shop listings |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
