![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain File Delivery

> Enforce file-attachment delivery for newly created or modified brain files — send actual attachments to Telegram and Slack, never links.

## What It Does

Ensures every brain file write is followed by delivering the actual file as an attachment to both Telegram (via `MEDIA:` prefix) and Slack (via 3-step upload API). Prevents the common mistake of sharing file paths or links when the recipient needs the actual document. Uses the modern Slack upload flow since `files.upload` is deprecated.

## Quick Example

```
1. Write brain file: mcp_gbrain_put_page("people/alice-wong", content)
2. Telegram: Include MEDIA:/home/user/brain/people/alice-wong.md in response
3. Slack: Run upload script with file path + channel_id
4. Confirm both deliveries

✅ Created people/alice-wong.md
Delivered to:
• Telegram → attached below
• Slack → uploaded to Admin DM
MEDIA:/home/user/brain/people/alice-wong.md
```

## When to Use / When NOT To

**Use when:**
- Any brain file is created or modified via `mcp_gbrain_put_page` or `write_file`
- Delivering brain content to stakeholders on Telegram or Slack
- Bulk-generating brain pages that need distribution

**Don't use for:**
- Files over 20MB (skip Slack, offer GDrive link instead)
- Non-brain files (this rule is brain-specific)
- When Slack token is unavailable (deliver Telegram only, log warning)

## Prerequisites

- [ ] Telegram gateway configured with MEDIA: support
- [ ] Slack bot token in `~/.hermes/profiles/default/.env`
- [ ] Upload script at `~/.hermes/scripts/slack-upload-brain-file.py`
- [ ] Channel ID for Slack delivery target

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (auto-triggered on brain writes) |
| Related Skills | [brain-compliance](../brain-compliance/), [gbrain-brain-ops](../gbrain-brain-ops/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-20 | Initial release — Telegram MEDIA:, Slack 3-step upload, edge case handling |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
