![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Profile Management

> Manage Hermes profiles end-to-end — persona authoring, channel wiring, and Slack bot creation.

## What It Does

Handles the full lifecycle of Hermes profiles: writing SOUL.md personas, routing platform messages to the right profile via channel prompts, and setting up Slack bots. One gateway serves all personas through channel prompt routing — no need for multiple gateway instances.

## Quick Example

```
Task: Wire HR profile to Telegram group

1. Confirm profile exists: ~/.hermes/profiles/hr-manager/SOUL.md
2. Get Telegram group chat_id from gateway logs
3. Add channel_prompt entry (line surgery, NOT yaml.dump):
     '-1003773708968': "You are JINZAI, the HR manager..."
4. Restart gateway: tmux kill-session + relaunch
5. Test: send message in group → responds as Jinzai
```

## When to Use / When NOT To

**Use when:**
- Creating or editing a profile persona (SOUL.md)
- Wiring a profile to a Telegram/Slack/Discord chat
- Setting up a new Slack bot for a department
- Troubleshooting message routing issues

**Don't use for:**
- Model/provider config → use hermes-model-config
- Gateway lifecycle → use hermes-agent
- Cron job management → use hermes-cron-jobs

## Prerequisites

- [ ] Hermes Agent installed and gateway running
- [ ] Profile directory structure understood
- [ ] Bot tokens configured in profile `.env`
- [ ] Telegram bot privacy mode disabled (for groups)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (agent-loaded) |
| Related Skills | hermes-agent, shogunify, add-profile-dashboard |

## Configuration

Profile directory structure:
```
~/.hermes/profiles/<name>/
├── SOUL.md          # Persona definition
├── config.yaml      # Model, toolsets, platform settings
├── .env             # API keys and secrets
├── memories/
├── skills/
└── cron/
```

Key pitfall: Never use `yaml.safe_load` + `yaml.dump` on config.yaml — it destroys comments and reorders keys. Use line surgery for channel_prompt edits.

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — persona authoring, channel wiring, Slack bot setup, naming conventions |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
