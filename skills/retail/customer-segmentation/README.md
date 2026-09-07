![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Customer Segmentation

> RFM analysis, churn prediction, lookalike targeting, and campaign response scoring for data-driven customer marketing.

## What It Does

Divides the customer base into actionable segments (Champions, Loyal, At Risk, Lost, New) based on purchasing behavior using RFM scoring. Predicts churn risk, generates lookalike audiences for acquisition campaigns, and scores campaign response propensity — enabling targeted marketing that maximizes ROI.

## Quick Example

```bash
# Run RFM analysis
segment rfm --period 90d --buckets 5

→ Champions:    1,240 customers (avg RM 850/month)
  Loyal:        3,450 customers (avg RM 320/month)
  At Risk:      2,100 customers (last purchase 120 days ago)
  Lost:           890 customers (last purchase 200+ days ago)
  New:            560 customers (first purchase < 30 days)

# Predict churn risk
segment churn-prediction --confidence 0.7
→ 430 customers at >70% churn risk — re-engagement recommended
```

## When to Use / When NOT To

**Use when:**
- Planning targeted marketing campaigns
- Identifying at-risk customers for re-engagement
- Building lookalike audiences for ad targeting
- Quarterly customer health reviews

**Don't use for:**
- Loyalty points/tier management → use `loyalty-program`
- Individual customer service → use CRM skills
- Product-level analysis → use assortment or velocity skills

## Prerequisites

- [ ] Customer transaction history (minimum 90 days)
- [ ] CRM or retail-manager profile active
- [ ] Access to order/sales data

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/customer-segmentation` |
| Related Skills | [loyalty-program](../loyalty-program/), [promo-recommender](../promo-recommender/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — RFM scoring, churn prediction, lookalike generation, response scoring |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
