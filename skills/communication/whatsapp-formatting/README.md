![Communication](https://img.shields.io/badge/dept-Communication-pink)

# WhatsApp Formatting

> Convert markdown content into WhatsApp-optimized plain text — bold, italic, lists, and emoji headers only.

## What It Does

Converts rich markdown content (tables, headings, links) into WhatsApp-friendly plain text. WhatsApp supports only bold, italic, strikethrough, monospace, lists, and blockquotes. Tables become indented bullet lists, headings become bold text, and links become bare URLs. Uses emoji as visual section markers since `#` headers don't work.

## Quick Example

```
Input (markdown):
  ## Status Report
  | Project | Status |
  |---------|--------|
  | Alpha   | ✅ On track |
  | Beta    | ⚠️ Delayed |

Output (WhatsApp):
  *STATUS REPORT*

  📋 *Alpha* ✅ On track
  📋 *Beta* ⚠️ Delayed — ETA revised to Friday
```

## When to Use / When NOT To

**Use when:**
- Delivering any content to WhatsApp (gateway, bridge, or automated delivery)
- Converting markdown reports for WhatsApp recipients
- Formatting trip plans, status updates, or summaries for WhatsApp

**Don't use for:**
- Slack delivery → use slack-formatting skill
- Lark delivery → use lark-formatting skill
- Content that requires tables or clickable links (WhatsApp can't render them)

## Prerequisites

- [ ] WhatsApp gateway or bridge configured for message delivery
- [ ] Content converted to WhatsApp-safe formatting before sending
- [ ] Lines kept under 50 characters for proper mobile wrapping

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Communication |
| Owning Profile | Any profile delivering to WhatsApp |
| Slash Command | `/whatsapp-formatting` |
| Related Skills | [slack-formatting](../slack-formatting/), [lark-formatting](../lark-formatting/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — conversion rules, emoji headers, structure guidelines |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
