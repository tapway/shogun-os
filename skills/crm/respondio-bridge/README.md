![CRM](https://img.shields.io/badge/dept-CRM-blue)

# Respond.io Bridge

> Runtime bridge between Kizuna (Hermes CRM) and Respond.io for unified customer messaging across WhatsApp, Instagram, Facebook, and website chat.

## What It Does

Connects your Respond.io account to the Kizuna CRM agent so customer messages are automatically understood, replied to with brain-stored templates, and logged to your knowledge base. Supports three operating modes: Hermes auto-responds, human-first with AI suggestions, or co-pilot where AI drafts and humans approve. Includes SLA monitoring with daily reports on response times.

## Quick Example

```
Customer (WhatsApp): "Hi, I'm interested in your product"
        │
        ▼
Respond.io Webhook → Kizuna Agent
        │
        ├── Verifies HMAC signature
        ├── Resolves contact → Alice Tan (existing customer)
        ├── Classifies intent: inquiry
        ├── Searches brain → matches template "welcome-message"
        └── Sends reply via Respond.io API:
            "Hi Alice! 👋 Thanks for contacting us.
             How can I help you today?
             Reply with:
             1️⃣ Product inquiry
             2️⃣ Support
             3️⃣ Talk to a human"
        │
        └── Logs conversation to ~/brain/people/contacts/wa-cnt_xxx.md
```

## When to Use / When NOT To

**Use when:**
- You use Respond.io as your shared inbox platform
- Customer messages arrive via IG, FB, WhatsApp, or website
- You want AI-assisted replies with template support
- You need SLA tracking and escalation workflows

**Don't use for:**
- Chatwoot users → use [chatwoot-bridge](../chatwoot-bridge/) instead
- Internal team chat → use Slack/Telegram directly
- Email-only workflows without Respond.io → use Gmail integration

## Prerequisites

- [ ] Respond.io account with API key generated
- [ ] Kizuna CRM profile created and gateway running
- [ ] At least one channel connected in Respond.io
- [ ] Webhook URL accessible from Respond.io (public domain or tunnel)
- [ ] gbrain initialized (`gbrain doctor` passes)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | CRM |
| Owning Profile | kizuna |
| Slash Command | N/A (webhook-triggered) |
| Related Skills | [chatwoot-bridge](../chatwoot-bridge/), [cs-reply-drafter](../cs-reply-drafter/), [customer-communication-onboarding](../customer-communication-onboarding/) |

## Configuration

```yaml
# ~/.hermes/profiles/kizuna/config.yaml
customer_communication:
  platform: respondio
  enabled: true
  channels: [ig, fb, wa, web]
  assignment_model: hermes-first   # hermes-first | human-first | co-pilot
  auto_respond: true
  webhook_secret: <from onboarding>
  escalation_keywords: ["speak to a person", "manager", "complaint", "refund"]
```

```bash
# ~/.hermes/profiles/kizuna/.secrets/secrets.env
RESPONDIO_API_KEY=<your-api-key>
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-24 | Initial release — webhook handling, template replies, contact sync, SLA tracking, escalation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
