![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Hermes Agent

> Manage Hermes Agent itself — CLI, gateway lifecycle, platform connections, configuration, and troubleshooting.

## What It Does

Central operations reference for Hermes Agent: starting/stopping the gateway, connecting Telegram/Slack/Discord, diagnosing failures (zombie processes, SIGTERM deaths, slow responses), and managing config. Covers WSL-specific pitfalls like process isolation via tmux and watchdog scripts.

## Quick Example

```
Problem: Gateway dies silently after a few minutes

Diagnosis:
  tail ~/.hermes/logs/gateway.log
  → "Shutdown context: parent_pid=16416 parent_name=hermes"

Fix:
  # Start in dedicated tmux session with watchdog
  cp scripts/hermes-gateway-watchdog.sh ~/.local/bin/
  chmod +x ~/.local/bin/hermes-gateway-watchdog
  tmux new-session -d -s hermes-gateway \
    '~/.local/bin/hermes-gateway-watchdog'
```

## When to Use / When NOT To

**Use when:**
- Configuring, starting, or troubleshooting the Hermes gateway
- Connecting platform bots (Telegram, Slack, Discord)
- Diagnosing slow responses, zombie processes, or silent failures
- Setting up auto-start on WSL or Windows Task Scheduler

**Don't use for:**
- Cron job management → use hermes-cron-jobs
- Model/provider configuration → use hermes-model-config
- Profile persona authoring → use profile-management

## Prerequisites

- [ ] Hermes Agent installed (`hermes --version`)
- [ ] Config at `~/.hermes/config.yaml`
- [ ] Platform bot tokens in `~/.hermes/.env`
- [ ] tmux installed (WSL environments)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | `/gateway` |
| Related Skills | hermes-cron-jobs, hermes-model-config, profile-management |

## Configuration

```yaml
# ~/.hermes/config.yaml
agent:
  gateway_timeout: 1800       # max response time (seconds)
  reasoning_effort: ''        # disable CoT for faster responses

display:
  platforms:
    slack:
      interim_assistant_messages: false  # prevent raw XML leaks
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — gateway lifecycle, WSL isolation, failure modes, troubleshooting |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
