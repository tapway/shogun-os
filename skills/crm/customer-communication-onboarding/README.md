![CRM](https://img.shields.io/badge/dept-CRM-blue)

# Customer Communication Onboarding

> Step-by-step wizard to set up Respond.io or Chatwoot as your shared customer inbox after Shogun OS installation.

## What It Does

Walks you through connecting a customer communication platform to your Kizuna CRM agent. Choose between Respond.io (SaaS, paid, zero infrastructure) or Chatwoot (open source, self-hosted, free). The wizard handles API credentials, channel setup, webhook wiring, agent accounts, template imports, and assignment model configuration — everything needed to go from fresh install to live customer messaging.

## Quick Example

```
You: "cc setup"

Wizard:
  ╔═══════════════════════════════════════════════╗
  ║  Customer Communication Platform             ║
  ║                                               ║
  ║  [a] Respond.io  (SaaS, $79-279/mo)          ║
  ║  [b] Chatwoot    (Self-hosted, free)          ║
  ║  [c] Skip        (setup later)                ║
  ╚═══════════════════════════════════════════════╝

You: "b"

Wizard: → Deploys Chatwoot via Docker
        → Creates inboxes (IG, FB, WA, Website)
        → Wires webhooks to Kizuna
        → Syncs 5 agent accounts from brain
        → Imports 12 reply templates
        → Sets co-pilot mode

  ✅ Chatwoot active on http://localhost:3000
     Channels: IG, FB, WA, Website
     Model: Co-pilot (AI drafts, human approves)
```

## When to Use / When NOT To

**Use when:**
- Fresh Kizuna profile created, need to connect customer messaging
- Switching from one CC platform to another
- Adding new channels to existing CC setup

**Don't use for:**
- Day-to-day message handling → use [respondio-bridge](../respondio-bridge/) or [chatwoot-bridge](../chatwoot-bridge/)
- Core Shogun OS installation → run `scripts/install.sh` first
- Internal team chat setup → configure Slack/Telegram separately

## Prerequisites

- [ ] Shogun OS core installer completed (Steps 0–6)
- [ ] Kizuna CRM profile created and gateway running
- [ ] gbrain initialized (`gbrain doctor` passes)
- [ ] At least 1 productivity suite connected (Gmail/M365)
- [ ] Docker + Docker Compose available (Chatwoot path only)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | CRM |
| Owning Profile | kizuna |
| Slash Command | `hermes -p kizuna -q 'cc setup'` |
| Related Skills | [respondio-bridge](../respondio-bridge/), [chatwoot-bridge](../chatwoot-bridge/) |

## Configuration

The wizard writes configuration automatically. Resulting config:

```yaml
# ~/.hermes/profiles/kizuna/config.yaml
customer_communication:
  platform: respondio | chatwoot
  enabled: true
  assignment_model: hermes-first | human-first | co-pilot
  channels: [ig, fb, wa, web]
  escalation_keywords: ["speak to a person", "manager", "complaint", "refund"]
```

State tracked at `~/.hermes/profiles/kizuna/state/cc-onboarding.json` for resume capability.

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-24 | Initial release — dual-path wizard (Respond.io + Chatwoot), state tracking, smoke tests |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
