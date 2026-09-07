![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Lazada Price Sync

> Pushes product prices to Lazada, logs every change, and flags failures for retry.

## What It Does

Updates product prices on Lazada by resolving Shogun SKUs to Lazada seller_skus via the mapping file, calling the `lazada-connector`'s update endpoint, and appending every attempt to an append-only JSONL change log. Failed updates are recorded with error details and retrievable for retry. Supports single-SKU and batch operations.

## Quick Example

```python
sync = LazadaPriceSync()

# Update one SKU
result = sync.update_price("PROD-001", 135.00)
→ {"success": true, "sku": "PROD-001", "new_price": 135.00}

# Batch update
result = sync.update_batch({"PROD-001": 135.0, "PROD-002": 89.90})
→ {"total": 2, "succeeded": 1, "failed": 1}

# Check failures
failures = sync.get_failed_updates()
→ [{"sku": "PROD-002", "error": "HTTP 429: rate limit exceeded"}]
```

## When to Use / When NOT To

**Use when:**
- Updating prices on Lazada after repricing decisions
- Batch price pushes during promotional periods
- Verifying price sync success/failure
- As part of the e-commerce workflow pipeline

**Don't use for:**
- Other platforms → use `shopee-price-sync`, `tiktok-price-sync`, etc.
- Price research → use `competitive-pricing-research`
- Listing creation → use `lazada-listing-sync`

## Prerequisites

- [ ] `lazada-connector` skill installed and configured
- [ ] Lazada API credentials set
- [ ] SKU mapping at `$HERMES_HOME/ecommerce/master/sku-mapping.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/lazada-price-sync` |
| Related Skills | [lazada-connector](../lazada-connector/), [competitive-pricing-research](../competitive-pricing-research/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — single/batch update, JSONL change log, failure tracking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
