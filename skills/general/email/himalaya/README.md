![General](https://img.shields.io/badge/dept-General-gray)

# Himalaya Email

> Send, receive, search, and manage email from the terminal via himalaya CLI.

## What It Does

Provides terminal-based email operations using the himalaya CLI client. Supports sending, receiving, searching, listing, and managing emails across configured accounts. Enables agents to handle email workflows without a GUI — reading inboxes, drafting replies, searching by sender/subject/date, and managing folders.

## Quick Example

```bash
# List recent emails
himalaya list --folder INBOX --page-size 10
→ 1. [2026-08-14] Alice: Re: Order #1234 confirmation
  2. [2026-08-14] Bob: Invoice INV-2026-001 attached
  3. [2026-08-13] Newsletter: Weekly digest

# Read a specific email
himalaya read 42
→ From: alice@example.com
  Subject: Re: Order #1234 confirmation
  Body: "Hi, confirming delivery for next Tuesday..."

# Send an email
himalaya send --to bob@example.com --subject "Re: Invoice"   --body "Payment processed, thank you."

# Search by subject
himalaya list --folder INBOX --query "subject:invoice"
```

## When to Use / When NOT To

**Use when:**
- Reading or searching email from the terminal
- Sending email replies or notifications
- Automating email-based workflows
- Processing email attachments

**Don't use for:**
- Calendar management → use `google-workspace`
- Complex email templates → use dedicated email skills
- CRM communication → use CRM bridge skills

## Prerequisites

- [ ] himalaya CLI installed (`cargo install himalaya` or package manager)
- [ ] Email account configured in `~/.config/himalaya/config.toml`
- [ ] IMAP/SMTP credentials set up

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/email` |
| Related Skills | [google-workspace](../../productivity/google-workspace/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — send, receive, search, list, folder management via himalaya CLI |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
