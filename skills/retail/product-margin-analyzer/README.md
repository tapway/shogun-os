![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Product Margin Analyzer

> Classify products by margin tier (high, low, negative) and rank by profitability contribution.

## What It Does

Analyzes gross margin across the product catalog by comparing selling prices against cost data from AutoCount or ERP. Classifies products into margin tiers, ranks by absolute profit contribution, and flags negative-margin SKUs that need pricing review or discontinuation consideration.

## Quick Example

```
Input:  margin analyze --tier all --sort profit_desc

Output:
  Margin Analysis — 245 SKUs
  High Margin (>40%):  82 SKUs | Total Profit: RM 28,400
  Medium (20-40%):    118 SKUs | Total Profit: RM 31,200
  Low (<20%):          38 SKUs | Total Profit: RM 4,100
  Negative:             7 SKUs | Total Loss: RM -1,850

  Top 5 by Profit:
  1. SKU-045 (Battery Pack) — RM 4,200 (52% margin)
  2. SKU-112 (USB Cable)   — RM 3,800 (68% margin)
  ...
```

## When to Use / When NOT To

**Use when:**
- Identifying high-profit products to prioritize in promotions
- Flagging negative-margin SKUs for pricing review
- Preparing margin reports for management review
- Optimizing assortment based on profitability

**Don't use for:**
- Real-time pricing decisions → use competitive-pricing-research skill
- Cost analysis without current cost data from ERP/AutoCount

## Prerequisites

- [ ] Master product data with cost prices loaded
- [ ] AutoCount or ERP connector for cost data
- [ ] Current selling prices from at least one sales channel

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / merchandising |
| Slash Command | `/product-margin-analyzer` |
| Related Skills | [product-velocity-analyzer](../product-velocity-analyzer/), [competitive-pricing-research](../competitive-pricing-research/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — margin classification and profit ranking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
