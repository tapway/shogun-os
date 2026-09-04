![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Promo Recommender

> Recommend promo products, campaign themes, angles, and pricing based on sales history and margin data.

## What It Does

Analyzes historical promotion performance, current inventory levels, and margin data to recommend which products to promote, what campaign themes to use, and optimal discount levels. Balances revenue uplift against margin protection to maximize promotional ROI.

## Quick Example

```
Input:  promo recommend --month october --budget RM5000

Output:
  October Promo Recommendations (Budget: RM 5,000)

  Theme: "Back to Office" (post-holiday work prep)
  Recommended Products:
  1. SKU-045 Wireless Mouse — 15% off (margin safe at 38%)
     Expected lift: +25% | Est incremental: RM 2,100
  2. SKU-112 USB-C Hub — Bundle with mouse at RM 89
     Expected lift: +30% | Est incremental: RM 1,800
  3. SKU-078 Desk Organizer — 20% off (clear slow stock)
     Expected lift: +40% | Est incremental: RM 950

  Total est. incremental: RM 4,850 | Margin impact: -2.8%
```

## When to Use / When NOT To

**Use when:**
- Planning upcoming promotional campaigns
- Selecting products for seasonal or themed promotions
- Optimizing discount levels to balance lift and margin

**Don't use for:**
- Executing promotions → use promo-planning skill
- Real-time flash sales requiring instant decisions
- Products with insufficient sales history for lift estimation

## Prerequisites

- [ ] Historical promotion performance data
- [ ] Current margin and inventory data from master store
- [ ] Campaign calendar or theme preferences

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / merchandising |
| Slash Command | `/promo-recommender` |
| Related Skills | [promo-planning](../promo-planning/), [product-margin-analyzer](../product-margin-analyzer/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — product and theme recommendations with margin guardrails |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
