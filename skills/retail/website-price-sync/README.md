![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Website Price Sync

> Update product prices on your website, log changes, and flag sync failures.

## What It Does

Pushes price updates from the Shogun master store to WooCommerce or Shopify websites. Maintains a change log of all price modifications for audit purposes and flags sync failures or significant price changes for manual review. Supports bulk updates with dry-run preview across both platforms.

## Quick Example

```
Input:  website price-sync --platform woocommerce --dry-run

Output:
  Website Price Sync (WooCommerce) — Dry Run
  Changes detected: 15 SKUs
    SKU-100: RM 49.90 → RM 44.90 (-10.0%)
    SKU-105: RM 29.90 → RM 32.90 (+10.0%)
    SKU-112: RM 15.90 → RM 14.90 (-6.3%)
    ... (12 more)

  ⚠️ Flagged: 2 SKUs with price change >15%
  No changes pushed (dry run).
```

## When to Use / When NOT To

**Use when:**
- Pushing scheduled price changes to your website
- Bulk-updating prices after supplier cost adjustments
- Auditing price consistency between master store and website

**Don't use for:**
- Full listing sync → use website-listing-sync skill
- Flash sale pricing → use WooCommerce/Shopify native sale features
- Marketplace platforms → use platform-specific price sync skills

## Prerequisites

- [ ] Website connector configured (WooCommerce or Shopify)
- [ ] Price change threshold rules configured
- [ ] Change log storage available
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/website-price-sync` |
| Related Skills | [website-connector](../website-connector/), [website-listing-sync](../website-listing-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — price push, change logging, failure flagging |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
