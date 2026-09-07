![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Hermes Cron Jobs

> Create, edit, pause, resume, and troubleshoot scheduled recurring tasks in Hermes Agent.

## What It Does

Manages Hermes Agent's cron scheduler — creating jobs with correct argument ordering, diagnosing failures by reading `.md` output files, auditing delivery targets across profiles, and moving jobs between profiles. Covers critical CLI quirks that differ from general documentation.

## Quick Example

```bash
# WRONG — prompt after flags silently fails
hermes cron create '0 9 * * 1-5' --name 'Scrum' \
  --skill 'product-scrum-workflow' "Do the scrum thing."

# RIGHT — prompt immediately after schedule
hermes cron create '0 9 * * 1-5' \
  "Do the scrum thing. Post to #channel." \
  --name 'Scrum' --skill 'product-scrum-workflow' --deliver local
```

## When to Use / When NOT To

**Use when:**
- Creating or editing scheduled cron jobs via `hermes cron`
- Diagnosing job failures (auth expiry, timeouts, lock contention)
- Auditing which jobs deliver to which chats/groups
- Moving jobs between Hermes profiles

**Don't use for:**
- One-off commands (just run them directly)
- Gateway lifecycle management → use hermes-agent
- Model/provider overrides on jobs → use hermes-model-config

## Prerequisites

- [ ] Hermes Agent installed and gateway running
- [ ] Understanding of cron schedule syntax (`'0 9 * * 1-5'`)
- [ ] Scripts stored in `~/.hermes/scripts/` (for `--script` flag)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | `hermes cron` CLI |
| Related Skills | hermes-agent, hermes-model-config |

## Configuration

Jobs are stored in `~/.hermes/cron/jobs.json`. Output logs live at `~/.hermes/cron/output/<job_id>/<timestamp>.md`.

Key CLI rules:
- Prompt is a **positional arg** right after schedule, before flags
- `--model` and `--prompt` named flags do **not** exist
- `--script` expects a filename relative to `~/.hermes/scripts/`

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — argument ordering, failure diagnosis, delivery audit, profile migration |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
