![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Social Content Generator

> Generate captions, hashtags, keywords, and CTAs per platform for product promotions.

## What It Does

Creates platform-specific social media content from product data including captions, hashtag sets, keywords, and calls-to-action. Tailors format, length, and tone for each platform (Instagram, Facebook, TikTok, Twitter/X). Supports multilingual output for Malaysian market engagement.

## Quick Example

```
Input:  social generate --sku SKU-100 --platform instagram

Output:
  Platform: Instagram
  Caption: Upgrade your desk setup 🖱️ Our ergonomic wireless mouse
  keeps you comfortable all day. 2.4GHz connectivity, 12-month
  warranty. Link in bio! #WirelessMouse #DeskSetup #Ergonomic
  Hashtags: #WirelessMouse #DeskSetup #Ergonomic #WorkFromHome
  #TechAccessories #MalaysiaShopping
  CTA: Shop now — link in bio 🔗
```

## When to Use / When NOT To

**Use when:**
- Creating social media posts for product promotions
- Generating hashtag sets optimized per platform
- Bulk-generating content for scheduled social campaigns

**Don't use for:**
- Video script creation → use video-content-generator skill
- Banner/image generation → use banner-generator skill
- Organic community engagement (this is promotional content only)

## Prerequisites

- [ ] Master product data with images and descriptions
- [ ] Platform accounts configured for posting
- [ ] Brand voice guidelines defined

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / marketing |
| Slash Command | `/social-content-generator` |
| Related Skills | [product-copy-generator](../product-copy-generator/), [video-content-generator](../video-content-generator/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-platform caption, hashtag, and CTA generation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
