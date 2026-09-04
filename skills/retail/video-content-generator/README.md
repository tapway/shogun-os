![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Video Content Generator

> Generate video concepts and scripts for product promotions across platforms.

## What It Does

Creates video content plans including concepts, shot lists, scripts, and captions for product promotional videos. Tailors format and duration per platform (TikTok 15-60s, Instagram Reels, YouTube Shorts, Facebook). Generates talking points, text overlays, and CTA suggestions optimized for each platform's audience.

## Quick Example

```
Input:  video generate --sku SKU-100 --platform tiktok

Output:
  TikTok Video Concept — Wireless Mouse (SKU-100)
  Duration: 30 seconds | Style: Product demo + unboxing

  Script:
  [0-5s]  Hook: "Your wrist hurts because of THIS" (show old mouse)
  [5-15s] Demo: Unbox ergonomic mouse, show grip angle
  [15-25s] Feature: 2.4GHz test, scroll smoothness close-up
  [25-30s] CTA: "RM 49.90 — link in bio 🛒"

  Text Overlays: "Ergonomic Design" | "12-Month Warranty"
  Music: Upbeat tech review style
  Hashtags: #TechReview #WirelessMouse #DeskSetup
```

## When to Use / When NOT To

**Use when:**
- Planning product demo or promotional videos
- Generating scripts for TikTok, Reels, or YouTube Shorts
- Creating shot lists for videographers or AI video tools

**Don't use for:**
- Actual video production/editing → use ComfyUI or external tools
- Static image content → use banner-generator skill
- Long-form YouTube tutorials (different format requirements)

## Prerequisites

- [ ] Master product data with images and key features
- [ ] Platform target specified (TikTok, Instagram, YouTube, Facebook)
- [ ] Brand guidelines for tone and visual style

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / marketing |
| Slash Command | `/video-content-generator` |
| Related Skills | [social-content-generator](../social-content-generator/), [product-copy-generator](../product-copy-generator/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-platform video concept and script generation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
