![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Hermes Model Config

> Configure, audit, and troubleshoot Hermes Agent model providers — primary, custom, fallback, and cron overrides.

## What It Does

Manages the three-tier model resolution chain (Primary → Custom Provider → Fallback) across Hermes profiles. Detects silent fallback traps where a broken primary provider routes all traffic to an expensive fallback, audits credential pool interference, and fixes auxiliary provider 401 errors.

## Quick Example

```bash
# Check which provider is actually serving traffic
grep -c "NotFoundError.*provider=custom" ~/.hermes/logs/agent.log
# → 145 failures on primary

grep -c "provider=openrouter" ~/.hermes/logs/agent.log
# → 3,834 successes on fallback (silent fallback trap!)

# Fix: correct the DashScope endpoint/model name
hermes config set model.default deepseek-v4-flash
hermes config set model.provider custom
```

## When to Use / When NOT To

**Use when:**
- Setting up or changing model providers for a profile
- Debugging unexpected billing on a fallback provider
- Fixing HTTP 401/404 errors on auxiliary features (title gen, compression)
- Auditing credential pool entries in `auth.json`

**Don't use for:**
- Gateway lifecycle → use hermes-agent
- Cron job creation → use hermes-cron-jobs
- Profile persona/SOUL authoring → use profile-management

## Prerequisites

- [ ] Hermes Agent installed
- [ ] Valid API keys for at least one provider
- [ ] Access to `~/.hermes/config.yaml` and `~/.hermes/auth.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | `hermes config` |
| Related Skills | hermes-agent, hermes-cron-jobs |

## Configuration

```yaml
# ~/.hermes/config.yaml
model:
  default: deepseek-v4-flash
  provider: custom
  base_url: https://...dashscope.../apps/anthropic
  api_key: sk-xxx

custom_providers:          # MUST be a YAML list at top level
  - name: dashscope-openai
    base_url: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    api_key: sk-xxx
    provider_type: openai

fallback_providers:
  - provider: openrouter
    model: deepseek/deepseek-v4-flash
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — three-tier resolution, silent fallback detection, credential pool fixes |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
