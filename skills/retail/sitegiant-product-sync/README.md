![Retail](https://img.shields.io/badge/dept-Retail-orange)

# SiteGiant Product Sync

> Pull product data from SiteGiant into Shogun master store for unified catalog management.

## What It Does

Imports product data from SiteGiant into the Shogun master store, enabling centralized catalog management across all connected sales channels. Handles field mapping, category normalization, and image URL resolution. Supports both initial bulk import and incremental sync for ongoing updates.

## Quick Example

```
Input:  sitegiant sync --mode incremental

Output:
  SiteGiant Product Sync — Incremental
  New products: 5 | Updated: 12 | Skipped: 340
  Imported:
    SG-1001 → SKU-450 (Wireless Keyboard) — NEW
    SG-1002 → SKU-451 (USB Hub 4-Port)   — price updated
    SG-1003 → SKU-452 (Mouse Pad XL)     — stock updated
  ⚠️ Skipped: 3 products with missing required fields
```

## When to Use / When NOT To

**Use when:**
- Initial import of SiteGiant catalog into Shogun master store
- Keeping master store in sync with SiteGiant product changes
- Migrating from SiteGiant-native management to Shogun OS

**Don't use for:**
- Pushing master store data TO SiteGiant → use sitegiant-connector update methods
- Products that should remain SiteGiant-only (not in master catalog)

## Prerequisites

- [ ] SiteGiant connector configured and authenticated
- [ ] Master store schema ready to receive imported products
- [ ] Field mapping rules defined for SiteGiant → Shogun conversion
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/sitegiant-product-sync` |
| Related Skills | [sitegiant-connector](../sitegiant-connector/), [autocount-product-sync](../autocount-product-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — bulk import and incremental sync from SiteGiant |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
