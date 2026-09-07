![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Loyalty Program

> Manages points accrual, tier progression, birthday/promo triggers, rewards catalog, and redemption analytics.

## What It Does

Handles the full lifecycle of customer loyalty initiatives: configures points earning rules (e.g., 1 point per RM 1), manages membership tiers (Silver/Gold/Platinum), triggers automated birthday and promotional rewards, maintains a redeemable rewards catalog, and tracks redemption patterns to measure program ROI. Targets >30% redemption rate and >5x program cost ROI.

## Quick Example

```bash
# Configure points rules
loyalty points-rules --set --rate 1.0 --threshold 100
→ Points rule updated: 1 point per RM 1, min spend RM 100

# List tiers
loyalty tiers --list
→ Silver: 0-999 pts | Gold: 1000-4999 pts | Platinum: 5000+ pts

# Trigger birthday promotions
loyalty trigger --type birthday --date 2026-08-15 --dry-run
→ 47 members with birthdays on 2026-08-15 — 2x points offer queued

# Redemption report
loyalty redemptions --period 30d
→ 312 redemptions | 34% redemption rate | Top reward: RM 20 voucher
```

## When to Use / When NOT To

**Use when:**
- Setting up or modifying loyalty program rules
- Running birthday or seasonal promotions
- Analyzing program effectiveness and ROI
- Managing tier promotions or demotions

**Don't use for:**
- Customer segmentation → use `customer-segmentation`
- General marketing campaigns → use `promo-recommender`
- CRM communication → use CRM bridge skills

## Prerequisites

- [ ] Customer database with purchase history
- [ ] CRM or retail-manager profile active
- [ ] Rewards catalog configured

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/loyalty-program` |
| Related Skills | [customer-segmentation](../customer-segmentation/), [promo-recommender](../promo-recommender/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — points rules, tier management, birthday triggers, redemption analytics |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
