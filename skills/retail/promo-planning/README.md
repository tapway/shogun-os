![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Promo Planning

> Promotional calendar management, display allocation, signage generation, and post-promo analysis.

## What It Does

Manages the full lifecycle of retail promotions from calendar planning through post-promo analysis. Allocates promotional displays across store clusters, generates multilingual in-store signage, and measures incremental lift, margin impact, and ROI to optimize future campaigns.

## Quick Example

```
Input:  promo calendar --quarter Q1-2026

Output:
  Q1 2026 Promotions:
  Jan 20 – Feb 10: Chinese New Year Bundle (15% off, endcap)
  Feb 15 – Mar 15: Back to School (bundle RM 29.90, floor-stand)
  Mar 20 – Apr 05: Ramadan Prep (shelf-talker)

Input:  promo analysis --promo PROMO-2025-Q1-01

Output:
  CNY Bundle: Incremental lift +28% ✅ | Margin impact -3.2% ✅
  Display compliance: 92% | Sell-through: 85%
  ROI: 4.2x | Cannibalization: -2.1% on non-promo SKUs
```

## When to Use / When NOT To

**Use when:**
- Planning quarterly promotional calendars
- Allocating displays and stock to store clusters
- Generating in-store signage in multiple languages
- Running post-promo performance analysis

**Don't use for:**
- Online-only promotions → use marketplace-analytics skill
- Pricing decisions without margin impact review
- Scheduling promotions less than 3 weeks apart in same category

## Prerequisites

- [ ] Promotional calendar defined in `promo-calendar.yaml`
- [ ] Store cluster configuration available
- [ ] Signage output path configured
- [ ] Scripts: `promo-calendar.py`, `display-allocation.py`, `signage-generator.py`, `post-promo-analysis.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / visual-merchandising |
| Slash Command | `/promo-planning` |
| Related Skills | [store-sales-dashboard](../store-sales-dashboard/), [planogram-compliance](../planogram-compliance/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PROMO_SIGNAGE_LANGUAGES` | Signage languages | `en,ms,zh` |
| `PROMO_MIN_MARGIN_IMPACT` | Min acceptable margin impact % | `-5` |
| `PROMO_DISPLAY_TYPES` | Available display types | `endcap,floor-stand,shelf-talker` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — calendar, allocation, signage, post-promo analysis |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
