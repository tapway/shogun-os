![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Competitive Pricing Research

> Compares live competitor prices on Shopee, Lazada, and TikTok against your current selling price and flags gaps.

## What It Does

Searches competitor listings across marketplaces, calculates net effective cost after promos (free units, discounts) plus shipping, and compares against your CSP. Produces priced-out alerts (where you're uncompetitive) and advantage reports (where you win), enabling data-driven repricing decisions.

## Quick Example

```bash
# Full competitive analysis
python competitive_pricing.py analyze PROD-001

→ SKU: PROD-001 (Widget A)
  Your CSP: RM 150.00
  Competitor X (Shopee): RM 135.00 (after 10% voucher)
  Competitor Y (Lazada): RM 142.00 + RM 5 shipping = RM 147.00
  Status: PRICED OUT on Shopee (gap: -RM 15.00)
  Status: ADVANTAGE on Lazada (gap: +RM 3.00)

# List all priced-out SKUs
python competitive_pricing.py priced-out
→ 12 SKUs priced out across 3 platforms
```

## When to Use / When NOT To

**Use when:**
- Preparing for a repricing cycle
- Monitoring competitor promotions
- Validating pricing strategy before campaigns
- Investigating lost sales due to pricing

**Don't use for:**
- Actually updating prices → use price-sync skills
- Internal margin analysis → use `product-margin-analyzer`
- Bundle recommendations → use `cross-sell-bundle-recommender`

## Prerequisites

- [ ] Platform connectors configured (Shopee, Lazada, TikTok env vars)
- [ ] Master store populated with your products
- [ ] Competitor shop IDs in `config/competitors.yaml`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/competitive-pricing-research` |
| Related Skills | [shopee-price-sync](../shopee-price-sync/), [lazada-price-sync](../lazada-price-sync/), [product-margin-analyzer](../product-margin-analyzer/) |

## Configuration

Edit `config/competitors.yaml` to set competitor shop IDs and alert thresholds.

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-platform comparison, net effective cost, priced-out/advantage reports |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
