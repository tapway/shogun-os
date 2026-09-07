![Workspace](https://img.shields.io/badge/dept-Workspace-indigo)

# Lark Workspace

> Full Lark (Feishu) integration for calendar, docs, wiki, drive, tasks, and search — mirrors Google Workspace for Lark tenants.

## What It Does

Provides Hermes agents with access to Lark/Feishu workspace services: calendar event management via Python script, document and wiki operations via MCP tools, task management, and global search. Designed as a drop-in alternative to Google Workspace for organizations using Lark.

## Quick Example

```
# List tomorrow's events
python3 lark_calendar.py list --start 2026-09-05T00:00:00+08:00 --end 2026-09-05T23:59:59+08:00
→ [{"summary": "Client Meeting", "start": "1700000000", ...}]

# Create a meeting
python3 lark_calendar.py create --summary "Sprint Review" --start 1700100000 --end 1700103600
→ {"status": "created", "event_id": "xxx_xxx@xxx"}

# Search docs (via MCP tool)
lark_search(query="quarterly report")
→ [{"title": "Q3 Report", "url": "https://..."}]
```

## When to Use / When NOT To

**Use when:**
- Managing Lark/Feishu calendar events
- Reading, creating, or editing Lark documents and wiki pages
- Managing tasks and to-dos in Lark
- Searching across Lark workspace content

**Don't use for:**
- Lark Mail (not yet supported — planned future release)
- Organizations not using Lark/Feishu → use google-workspace or microsoft-integration
- Simple text messaging → use lark-formatting skill instead

## Prerequisites

- [ ] Lark/Feishu tenant with admin access
- [ ] Lark App created at https://open.feishu.cn/app with required permissions
- [ ] `bun` installed (`which bun`)
- [ ] lark-office-mcp cloned and installed in profile's mcp-servers directory
- [ ] `LARK_APP_ID` and `LARK_APP_SECRET` set in profile `.env`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Workspace |
| Owning Profile | executive-assistant (Benkei) |
| Slash Command | `/lark-workspace` |
| Related Skills | [google-workspace](../google-workspace/), [lark-formatting](../../communication/lark-formatting/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LARK_APP_ID` | Lark application ID | — |
| `LARK_APP_SECRET` | Lark application secret | — |
| `LARK_CALLBACK_PORT` | OAuth callback port | `9876` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — calendar script, MCP integration for docs/wiki/tasks/search |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
