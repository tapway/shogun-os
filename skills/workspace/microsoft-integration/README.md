![Workspace](https://img.shields.io/badge/dept-Workspace-indigo)

# Microsoft 365 Integration

> Microsoft Graph API client for mail, calendar, OneDrive, and directory via OAuth 2.0 client credentials.

## What It Does

Connects to Microsoft 365 via the Graph API using OAuth 2.0 client credentials flow. Provides mailbox search and send, calendar listing, OneDrive file browsing, and Azure AD directory lookups. No user interaction required — ideal for automated and background workflows.

## Quick Example

```
# Search mailbox
$MSFT --user alice@company.com mail search "budget" --max 5
→ [{"id": "msg1", "subject": "FY26 Budget Draft", "from": "cfo@company.com"}]

# List calendar events (next 30 days)
$MSFT --user alice@company.com calendar list --days 30
→ [{"subject": "Board Meeting", "start": "2026-09-10T14:00:00Z"}]

# Search OneDrive files
$MSFT --user alice@company.com drive search "quarterly"
→ [{"name": "Q3 Report.xlsx", "webUrl": "https://..."}]
```

## When to Use / When NOT To

**Use when:**
- Accessing Microsoft 365 mailboxes programmatically
- Reading calendar events from Exchange Online
- Browsing or searching OneDrive files
- Looking up Azure AD users and directory info

**Don't use for:**
- Google Workspace tenants → use google-workspace skill
- Interactive user login flows (this uses client credentials, not delegated auth)
- Sending rich HTML emails without confirming with user first

## Prerequisites

- [ ] Azure AD App Registration with client secret
- [ ] Microsoft Graph API permissions granted and admin-consented
- [ ] Environment variables set: `MSFT_TENANT_ID`, `MSFT_CLIENT_ID`, `MSFT_CLIENT_SECRET`
- [ ] Python 3.8+ with `requests` library

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Workspace |
| Owning Profile | Any profile needing Microsoft 365 access |
| Slash Command | `/microsoft-integration` |
| Related Skills | [google-workspace](../google-workspace/), [lark-workspace](../lark-workspace/) |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `MSFT_TENANT_ID` | Azure AD tenant ID | Yes |
| `MSFT_CLIENT_ID` | App registration client ID | Yes |
| `MSFT_CLIENT_SECRET` | Client secret value | Yes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — mail, calendar, OneDrive, directory operations |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
