![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Product Velocity Analyzer

> Classify products by sales velocity: dead, slow, fast, and zero-sales SKUs.

## What It Does

Segments the product catalog by sales velocity based on transaction history. Identifies dead stock (no sales in 90+ days), slow movers, fast movers, and zero-sales SKUs. Provides actionable recommendations for inventory optimization, clearance planning, and reorder adjustments.

## Quick Example

```
Input:  velocity analyze --period 90d

Output:
  Velocity Analysis — 90 days — 312 SKUs
  Fast (>10 units/week):   45 SKUs (14%) | 68% of revenue
  Medium (1-10/week):     128 SKUs (41%) | 28% of revenue
  Slow (<1/week):          89 SKUs (29%) | 4% of revenue
  Dead (0 sales):          50 SKUs (16%) | RM 12,400 tied up

  Top Dead Stock:
  1. SKU-201 (Desk Lamp Blue) — 45 units, RM 2,250 value
  2. SKU-189 (Phone Case XL)  — 30 units, RM 1,500 value
```

## When to Use / When NOT To

**Use when:**
- Planning clearance sales for dead/slow stock
- Adjusting reorder quantities based on actual velocity
- Preparing inventory health reports for management
- Rationalizing assortment (delist vs keep decisions)

**Don't use for:**
- New products with less than 30 days of sales history
- Seasonal products during off-season (adjust period accordingly)

## Prerequisites

- [ ] Sales transaction history (minimum 90 days recommended)
- [ ] Master product data with current stock levels
- [ ] Database connection for sales analytics

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / merchandising |
| Slash Command | `/product-velocity-analyzer` |
| Related Skills | [product-margin-analyzer](../product-margin-analyzer/), [stock-reorder-supplier-analysis](../stock-reorder-supplier-analysis/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — velocity segmentation and dead stock identification |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
