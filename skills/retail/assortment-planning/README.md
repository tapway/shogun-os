![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Assortment Planning

> Optimizes product mix across stores via category performance analysis, SKU rationalization, and new product intake scheduling.

## What It Does

Analyzes category performance (sales, margin, inventory turnover) to identify underperforming SKUs for rationalization and manage the new product introduction pipeline. Helps merchandising teams ensure the right products are in the right stores at the right time, targeting >40% gross margin and 6–12x annual inventory turnover.

## Quick Example

```
# Category performance report
assortment category --period monthly --date 2026-08

→ Category: Electronics
  Revenue: RM 125,000 | Margin: 42% | Turnover: 8.2x
  SKUs: 145 active | 12 flagged for rationalization

# SKU rationalization (bottom 5%)
assortment rationalize --threshold 0.05 --period 90d

→ 23 SKUs below 5th percentile — candidates for delist
```

## When to Use / When NOT To

**Use when:**
- Reviewing category performance monthly/quarterly
- Identifying SKUs to delist or reduce
- Planning new product introductions
- Optimizing shelf space or catalog breadth

**Don't use for:**
- Individual product pricing → use `product-margin-analyzer`
- Sales velocity analysis → use `product-velocity-analyzer`
- Reorder decisions → use `stock-reorder-supplier-analysis`

## Prerequisites

- [ ] Master store populated with product and sales data
- [ ] Access to sales history (minimum 90 days recommended)
- [ ] Merchandising or retail-manager profile active

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/assortment-planning` |
| Related Skills | [product-velocity-analyzer](../product-velocity-analyzer/), [product-margin-analyzer](../product-margin-analyzer/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — category reports, SKU rationalization, intake calendar, lifecycle tracking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
