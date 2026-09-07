![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Banner Generator

> Generates platform-specific promo banners as PNG from product data, copy, and promo pricing.

## What It Does

Renders HTML/CSS templates via headless Chrome into pixel-exact PNG banners for Shopee, Lazada, TikTok, and Website. Reads product images from the master store, accepts headline/subheadline/price parameters, applies brand config (logo, colors, fonts), and outputs to a pending folder for review. Supports 8 platform/size combinations from 800×800 to 1920×600.

## Quick Example

```python
gen = BannerGenerator()
result = gen.generate(
    sku="PROD-001",
    promo_type="flash_sale",
    platform="shopee",
    size="product",           # 1024x1024
    headline="Flash Sale: Widget A",
    subheadline="40% OFF — Today Only",
    price="RM 89.90"
)
→ {"success": True,
   "path": ".../banners/pending/PROD-001_shopee_product_....png",
   "width": 1024, "height": 1024}
```

## When to Use / When NOT To

**Use when:**
- Creating promo banners for marketplace campaigns
- Generating flash sale or seasonal graphics
- Batch-generating banners for multiple SKUs/platforms
- After product copy and promo pricing are ready

**Don't use for:**
- Writing product copy → use `product-copy-generator`
- Setting promo prices → use `promo-recommender`
- Video content → use `video-content-generator`

## Prerequisites

- [ ] Python 3.8+ (stdlib only for generator; Pillow optional for verification)
- [ ] Headless Chrome or Microsoft Edge installed
- [ ] Shogun master store populated (`autocount-product-sync`)
- [ ] Brand config at `scripts/templates/brand-config.yaml`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/banner-generator` |
| Related Skills | [product-copy-generator](../product-copy-generator/), [promo-recommender](../promo-recommender/), [approval-gate](../approval-gate/) |

## Configuration

Brand config (`scripts/templates/brand-config.yaml`):

```yaml
brand_name: "Shogun Mart"
logo_path: ""
colors:
  primary: "#4ECDC4"
  secondary: "#FF6B6B"
  accent: "#FFD93D"
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 8 platform/size combos, HTML→PNG rendering, brand config YAML |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
