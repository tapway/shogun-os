![Workspace](https://img.shields.io/badge/dept-Workspace-indigo)

# Google Workspace

> Gmail, Calendar, Drive, Docs, Sheets, and Contacts via OAuth — managed through Hermes or the gws CLI.

## What It Does

Connects your Google account to Hermes for reading/sending email, managing calendar events, searching Drive files, and reading/writing Sheets and Docs. Supports both individual OAuth and Domain-Wide Delegation (DWD) for enterprise deployments. All operations return JSON for easy parsing.

## Quick Example

```
# Search unread emails
$GAPI gmail search "is:unread" --max 5
→ [{"id": "abc123", "from": "boss@co.com", "subject": "Q4 Budget", ...}]

# List next week's calendar
$GAPI calendar list --start 2026-09-07T00:00:00+08:00 --end 2026-09-14T00:00:00+08:00
→ [{"id": "evt1", "summary": "Team Standup", "start": "2026-09-08T10:00:00+08:00"}]

# Read a spreadsheet
$GAPI sheets get SHEET_ID "Overview!A1:D10"
→ [["Name", "Score"], ["Alice", "95"], ["Bob", "87"]]
```

## When to Use / When NOT To

**Use when:**
- Reading, sending, or replying to Gmail messages
- Creating or listing Google Calendar events
- Searching Drive files or reading Sheets/Docs
- Syncing contacts or calendar to brain files

**Don't use for:**
- Email-only access with no workspace needs → use `himalaya` skill instead
- Accessing Google Forms behind sign-in (browser can't authenticate)
- Writing to Google Docs via the wrapper (use direct REST API per references)

## Prerequisites

- [ ] Google Cloud project with required APIs enabled (Gmail, Calendar, Drive, Sheets, Docs, People)
- [ ] OAuth client credentials (Desktop app) or DWD service account key
- [ ] Token at `~/.hermes/google_token.json` (run `setup.py --check` to verify)
- [ ] Python 3.8+ with `google-api-python-client` and `google-auth` installed

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Workspace |
| Owning Profile | Any profile needing Google access |
| Slash Command | `/google-workspace` |
| Related Skills | [himalaya](../../email/himalaya/), [lark-workspace](../lark-workspace/), [microsoft-integration](../microsoft-integration/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `HERMES_HOME` | Hermes config directory | `~/.hermes` |
| Token path | OAuth token file | `~/.hermes/google_token.json` |
| DWD key path | Service account key | `~/.hermes/secrets/google-dwd-sa.json` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-09-04 | Full scope auth, DWD support, shared drive patterns, Sheets create reference |
| 1.0.0 | 2026-01-15 | Initial release — Gmail, Calendar, Drive, Sheets, Contacts |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
