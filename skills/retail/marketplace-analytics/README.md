![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Marketplace Analytics

> Sales by platform/channel, ad spend ROI, competitor pricing monitoring, and review sentiment analysis.

## What It Does

Aggregates data from all connected ecommerce platforms to provide a unified view of channel performance. Tracks advertising spend efficiency (ACOS/ROAS), monitors competitor pricing gaps, and analyzes customer review sentiment to identify marketplace opportunities and threats.

## Quick Example

```
Input:  marketplace sales --platform shopee --period weekly --date 2026-09-01

Output:
  Platform: Shopee | Week: 2026-W35
  GMV: RM 45,200 | Orders: 312 | AOV: RM 144.87
  Conversion: 3.2% | vs prior week: +8.1%

Input:  marketplace competitor-pricing --sku SKU-100 --competitors 3

Output:
  SKU-100 (Widget A): Your price RM 89.90
  Competitor A: RM 79.90 (⚠️ 11.1% below)
  Competitor B: RM 94.90 (✅ 5.6% above)
  Alert: Price gap exceeds 10% threshold
```

## When to Use / When NOT To

**Use when:**
- Comparing sales performance across Shopee, Lazada, and other platforms
- Analyzing ad spend ROI and campaign effectiveness
- Monitoring competitor pricing for matched SKUs
- Tracking customer review sentiment trends

**Don't use for:**
- Real-time inventory or order management → use platform-specific connectors
- Making pricing decisions without human review
- Scraping competitor data outside platform API terms

## Prerequisites

- [ ] Platform API keys configured (Shopee, Lazada, ads platform)
- [ ] Database connection for analytics storage
- [ ] Competitor SKU mapping in `competitors.yaml`
- [ ] Scripts: `platform-sales.py`, `ad-roi-analysis.py`, `competitor-pricing.py`, `sentiment-analysis.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / merchandising |
| Slash Command | `/marketplace-analytics` |
| Related Skills | [ecommerce-listing](../ecommerce-listing/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MARKETPLACE_SHOPEE_API_KEY` | Shopee analytics API key | — |
| `MARKETPLACE_LAZADA_API_KEY` | Lazada analytics API key | — |
| `MARKETPLACE_PRICE_ALERT_THRESHOLD` | Price gap % to trigger alert | `10` |
| `MARKETPLACE_SENTIMENT_THRESHOLD` | Sentiment score alert threshold | `3.5` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — platform sales, ad ROI, competitor pricing, sentiment |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
