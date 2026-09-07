![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Shopee Price Sync

> Update product prices on Shopee, log changes, and flag sync failures.

## What It Does

Pushes price updates from the Shogun master store to Shopee listings. Maintains a change log of all price modifications for audit purposes and flags any sync failures for manual review. Supports bulk price updates across the catalog with dry-run preview.

## Quick Example

```
Input:  shopee price-sync --all --dry-run

Output:
  Shopee Price Sync — Dry Run
  Changes detected: 12 SKUs
    SKU-100: RM 49.90 → RM 44.90 (-10.0%)
    SKU-105: RM 29.90 → RM 32.90 (+10.0%)
    SKU-112: RM 15.90 → RM 14.90 (-6.3%)
    ... (9 more)

  ⚠️ Flagged: SKU-201 price drop >20% — requires approval
  No changes pushed (dry run).
```

## When to Use / When NOT To

**Use when:**
- Pushing scheduled price changes to Shopee
- Bulk-updating prices after supplier cost changes
- Auditing price consistency between master store and Shopee

**Don't use for:**
- Full listing sync (descriptions, images) → use shopee-listing-sync
- Flash sale pricing → use Shopee's native promotion tools
- Price changes exceeding threshold without manager approval

## Prerequisites

- [ ] Shopee connector configured with valid API credentials
- [ ] Price change threshold rules configured
- [ ] Change log storage available
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/shopee-price-sync` |
| Related Skills | [shopee-connector](../shopee-connector/), [shopee-listing-sync](../shopee-listing-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — price push, change logging, failure flagging |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
