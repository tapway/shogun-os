![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Product Copy Generator

> Generate product descriptions, promo headlines, and banner copy from master product data.

## What It Does

Creates marketing-ready product copy including descriptions, promotional headlines, and banner text from structured product data. Tailors tone and length per platform (Shopee, Lazada, website, social media) and supports multilingual output for Malaysian market (EN, MS, ZH).

## Quick Example

```
Input:  SKU-100 "Wireless Mouse" | RM 49.90 | Ergonomic, 2.4GHz, 12-month warranty

Output:
  Shopee Title: Wireless Mouse Ergonomic 2.4GHz | 12-Month Warranty | Free Shipping
  Description: Upgrade your workspace with our ergonomic wireless mouse.
  Reliable 2.4GHz connectivity, comfortable grip for all-day use.
  Backed by 12-month warranty. Order now!
  Promo Headline: Work Smarter — RM 49.90 Only!
```

## When to Use / When NOT To

**Use when:**
- Creating product listings for ecommerce platforms
- Generating promotional copy for campaigns or banners
- Bulk-generating descriptions for new product launches

**Don't use for:**
- Technical specifications → pull from master product data directly
- Legal/compliance claims without verification
- Replacing human review for regulated product categories

## Prerequisites

- [ ] Master product data available (SKU, name, price, attributes)
- [ ] Platform-specific copy templates configured
- [ ] LLM access for copy generation

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/product-copy-generator` |
| Related Skills | [social-content-generator](../social-content-generator/), [banner-generator](../banner-generator/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-platform copy generation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
