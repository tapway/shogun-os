![Retail](https://img.shields.io/badge/dept-Retail-orange)

# AutoCount Product Sync

> Pulls all product data from AutoCount into the Shogun master store for downstream listing and pricing skills.

## What It Does

Reads stock balances and sales invoices from AutoCount via the `autocount-connector`, merges them by SKU, and writes normalized product records to the shared master store (`products.jsonl`, `stock-balances.jsonl`, `sales-invoices.jsonl`). Supports full and incremental sync modes. This is the primary data ingestion point for the entire e-commerce pipeline.

## Quick Example

```bash
# Incremental sync (default) — pulls changes since last sync
python autocount_product_sync.py sync
→ {"products_synced": 45, "stock_records": 45, "invoice_records": 120}

# Full sync — pulls everything
python autocount_product_sync.py sync --full
→ {"products_synced": 312, "stock_records": 312, "invoice_records": 2400}

# Check status
python autocount_product_sync.py status
→ Last sync: 2026-08-14T10:00:00Z | Products: 312 | Stock: 312
```

## When to Use / When NOT To

**Use when:**
- First-time setup of the Shogun master store
- Scheduled daily/hourly product data refresh
- After adding new products in AutoCount
- Before running listing sync or price sync

**Don't use for:**
- Pushing prices to marketplaces → use price-sync skills
- Creating listings → use listing-sync skills
- Real-time stock queries → use `autocount-connector` directly

## Prerequisites

- [ ] Python 3.8+ with `requests` library
- [ ] `autocount-connector` skill installed and configured
- [ ] AutoCount AOTG API credentials set
- [ ] Write access to `$HERMES_HOME/ecommerce/master/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/autocount-product-sync` |
| Related Skills | [autocount-connector](../autocount-connector/), [ecommerce-workflow-orchestrator](../ecommerce-workflow-orchestrator/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — full/incremental sync, SKU dedup, master store output |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
