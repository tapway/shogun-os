![CRM](https://img.shields.io/badge/dept-CRM-blue)

# Chatwoot Bridge

> Runtime bridge between Kizuna (Hermes CRM) and Chatwoot for unified customer messaging across WhatsApp, Instagram, Facebook, website chat, and email.

## What It Does

Connects your self-hosted Chatwoot instance to the Kizuna CRM agent so customer messages are automatically understood, replied to (or drafted for review), and logged to your knowledge base. Supports three operating modes: Hermes auto-responds, human-first with AI suggestions, or co-pilot where AI drafts and humans approve.

## Quick Example

```
Customer (WhatsApp): "Hi, I'd like a quote for 10 units of Widget A"
        │
        ▼
Chatwoot Webhook → Kizuna Agent
        │
        ├── Classifies intent: inquiry
        ├── Searches brain templates → matches "quote-request"
        └── Sends reply via Chatwoot API:
            "Hi Alice! Thanks for your interest in Widget A.
             Here's what I need to prepare a quote:
             1. Approximate quantity ✓ (10 units)
             2. Timeline?
             3. Any special requirements?
             I'll get back to you within 2 hours!"
```

## When to Use / When NOT To

**Use when:**
- You use Chatwoot as your shared inbox platform
- Customer messages arrive via IG, FB, WhatsApp, website, or email
- You want AI-assisted replies with human oversight
- You need SLA tracking on response times

**Don't use for:**
- Respond.io users → use [respondio-bridge](../respondio-bridge/README.md) instead
- Internal team chat → use Slack/Telegram directly
- Email-only workflows without Chatwoot → use Gmail integration

## Prerequisites

- [ ] Chatwoot deployed (Docker) and accessible
- [ ] Kizuna CRM profile created and gateway running
- [ ] Chatwoot personal access token generated
- [ ] At least one inbox configured in Chatwoot
- [ ] gbrain initialized (`gbrain doctor` passes)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | CRM |
| Owning Profile | kizuna |
| Slash Command | N/A (webhook-triggered) |
| Related Skills | [respondio-bridge](../respondio-bridge/), [cs-reply-drafter](../cs-reply-drafter/), [customer-communication-onboarding](../customer-communication-onboarding/) |

## Configuration

```yaml
# ~/.hermes/profiles/kizuna/config.yaml
customer_communication:
  platform: chatwoot
  enabled: true
  chatwoot:
    api_url: http://localhost:3000
    account_id: 1
  channels: [ig, fb, wa, web]
  assignment_model: co-pilot   # hermes-first | human-first | co-pilot
  auto_respond: true
  escalation_keywords: ["speak to a person", "manager", "complaint", "refund"]
```

```bash
# ~/.hermes/profiles/kizuna/.secrets/secrets.env
CHATWOOT_ACCESS_TOKEN=<personal-access-token>
CHATWOOT_API_URL=http://localhost:3000
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-24 | Initial release — webhook handling, template replies, contact sync, SLA tracking, escalation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
