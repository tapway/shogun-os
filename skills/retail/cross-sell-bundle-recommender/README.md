![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Cross-Sell & Bundle Recommender

> Analyzes order history to recommend cross-sell pairs and product bundles (dead stock, complementary, margin-optimized).

## What It Does

Reads sales invoices from the master store, builds a SKU co-occurrence matrix, and generates four types of recommendations: frequently-bought-together pairs, dead-stock + best-seller bundles, complementary category bundles, and high-margin + fast-moving bundles. Each bundle includes pricing economics (individual sum, bundle price, savings %, expected margin).

## Quick Example

```python
rec = BundleRecommender()
report = rec.generate()

# Cross-sell pairs
→ [{"primary_sku": "PROD-001", "paired_sku": "PROD-002",
    "confidence": 0.75,
    "rationale": "Bought together in 15 orders; 75% co-occurrence"}]

# Dead stock bundle
→ [{"bundle_id": "BUNDLE-001",
    "skus": ["DEAD-001", "FAST-001"],
    "type": "dead_stock_bundle",
    "bundle_price": 144.00, "savings_pct": 10.0,
    "expected_margin_pct": 30.56}]
```

## When to Use / When NOT To

**Use when:**
- Planning product bundles for promotions
- Clearing dead/slow stock via bundling
- Building "frequently bought together" features
- Optimizing margin through strategic pairings

**Don't use for:**
- Individual product pricing → use `product-margin-analyzer`
- Promo discount decisions → use `promo-recommender`
- Velocity classification → use `product-velocity-analyzer`

## Prerequisites

- [ ] Python 3.8+ (stdlib only)
- [ ] Master store populated (`products.jsonl` + `sales-invoices.jsonl`)
- [ ] Optional: velocity and margin reports for richer bundles

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/cross-sell-bundle-recommender` |
| Related Skills | [product-velocity-analyzer](../product-velocity-analyzer/), [product-margin-analyzer](../product-margin-analyzer/), [promo-recommender](../promo-recommender/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — co-occurrence analysis, 4 bundle types, pricing economics |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
