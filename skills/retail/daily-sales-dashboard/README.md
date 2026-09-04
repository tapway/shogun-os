![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Daily Sales Dashboard

> Generates a 6 AM morning report with yesterday's sales, top sellers, channel breakdown, GP%, and day-over-day comparison.

## What It Does

Pulls sales data from all platforms (Shopee, Lazada, TikTok, Website), merges by SKU, and produces a unified daily report with total revenue, units, orders, gross profit %, top 20 best sellers, per-channel breakdown, and DoD/week-over-week comparisons. Cron-schedulable for automatic 6 AM delivery via Slack or Telegram.

## Quick Example

```bash
# Generate yesterday's dashboard
python daily_sales_dashboard.py generate

→ Date: 2026-08-14
  Revenue: RM 15,420 | Units: 127 | Orders: 45
  GP%: 42.3% | DoD: +12.5%
  
  Top Seller: Widget A (24 units, RM 2,160)
  Channel Mix: Shopee 46.7% | Lazada 28.1% | TikTok 15.2% | Web 10.0%

# Deliver to Slack
python daily_sales_dashboard.py deliver yesterday slack
```

## When to Use / When NOT To

**Use when:**
- Morning standup sales review
- Daily KPI monitoring
- Identifying trending products or declining channels
- Automated daily reporting via cron

**Don't use for:**
- Real-time order tracking → use `ecommerce-order-management`
- Deep margin analysis → use `product-margin-analyzer`
- Historical trend analysis → use assortment planning

## Prerequisites

- [ ] Python 3.8+ (stdlib only)
- [ ] Master store populated (`products.jsonl` + `sales-invoices.jsonl`)
- [ ] Platform connectors configured (optional — falls back to master store)
- [ ] `HERMES_HOME` environment variable set

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/daily-sales-dashboard` |
| Related Skills | [product-margin-analyzer](../product-margin-analyzer/), [ecommerce-order-management](../ecommerce-order-management/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-platform merge, top 20, GP%, DoD, cron-ready |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
