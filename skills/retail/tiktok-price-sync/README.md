![Retail](https://img.shields.io/badge/dept-Retail-orange)

# TikTok Price Sync

> Update product prices on TikTok Shop, log changes, and flag sync failures.

## What It Does

Pushes price updates from the Shogun master store to TikTok Shop listings. Maintains a change log of all price modifications for audit trail and flags sync failures or price changes exceeding configured thresholds for manual review. Supports bulk updates with dry-run preview.

## Quick Example

```
Input:  tiktok price-sync --all --dry-run

Output:
  TikTok Price Sync — Dry Run
  Changes detected: 8 SKUs
    SKU-100: RM 49.90 → RM 44.90 (-10.0%)
    SKU-112: RM 15.90 → RM 14.90 (-6.3%)
    ... (6 more)

  ⚠️ Flagged: SKU-201 price drop >20% — requires approval
  No changes pushed (dry run).
```

## When to Use / When NOT To

**Use when:**
- Pushing scheduled price changes to TikTok Shop
- Bulk-updating prices after cost adjustments
- Auditing price consistency between master store and TikTok

**Don't use for:**
- Full listing sync → use tiktok-listing-sync skill
- Flash sale pricing → use TikTok Shop's native promotion tools
- Price changes exceeding threshold without manager approval

## Prerequisites

- [ ] TikTok Shop connector configured with valid API credentials
- [ ] Price change threshold rules configured
- [ ] Change log storage available
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/tiktok-price-sync` |
| Related Skills | [tiktok-shop-connector](../tiktok-shop-connector/), [tiktok-listing-sync](../tiktok-listing-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — price push, change logging, failure flagging |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
