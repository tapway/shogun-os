![Communication](https://img.shields.io/badge/dept-Communication-pink)

# Lark Formatting

> Format messages for Lark (Feishu) delivery — plain text, CardKit JSON cards, and rich post messages.

## What It Does

Defines how to format output for Lark/Feishu messaging. Supports three message types: plain text with basic markdown, interactive CardKit JSON cards (recommended for structured content), and legacy rich text posts. Includes ready-made templates for scrum reports, alerts, and multi-column layouts.

## Quick Example

```
Input:  "Send a scrum report to Lark"

Output (CardKit JSON):
{
  "config": {"wide_screen_mode": true},
  "header": {
    "title": {"tag": "plain_text", "content": "[SCRUM] — 2026-09-04"},
    "template": "blue"
  },
  "elements": [
    {"tag": "markdown", "content": "**Team:** Engineering (5 members)"},
    {"tag": "hr"},
    {"tag": "column_set", "flex_mode": "bisect",
     "columns": [
       {"tag": "column", "width": "weighted", "weight": 1,
        "elements": [{"tag": "markdown", "content": "**✅ Done**\nAuth refactor"}]},
       {"tag": "column", "width": "weighted", "weight": 1,
        "elements": [{"tag": "markdown", "content": "**🚧 Blockers**\nDB migration"}]}
     ]}
  ]
}
```

## When to Use / When NOT To

**Use when:**
- Delivering structured reports, alerts, or dashboards to Lark
- Sending messages via Lark bot or webhook
- Building interactive cards with buttons and columns

**Don't use for:**
- Slack delivery → use slack-formatting skill
- WhatsApp delivery → use whatsapp-formatting skill
- Simple DMs where plain text suffices (CardKit adds token overhead)

## Prerequisites

- [ ] Lark bot or webhook configured for message delivery
- [ ] Understanding of CardKit JSON structure (see SKILL.md for full reference)
- [ ] Messages under 30KB (text) or 50 elements (CardKit)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Communication |
| Owning Profile | Any profile delivering to Lark |
| Slash Command | `/lark-formatting` |
| Related Skills | [lark-workspace](../../workspace/lark-workspace/), [slack-formatting](../slack-formatting/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — text, CardKit, post formats, scrum/alert templates |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
