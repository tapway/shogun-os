![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Shogunify

> Structured questionnaire that turns vague "add X" requests into correctly placed Shogun OS artifacts.

## What It Does

Guides the creation of Shogun OS integrations, skills, workflows, and connectors through a structured interview process. Ensures every artifact is profile-owned, gbrain-compliant, and installed to the correct Hermes home. Supports five modes: integration, skill, workflow, provider-only, and profile.

## Quick Example

```
User: /shogunify skill leave-balance for hr-manager

Agent:
1. Mode: skill | Profile: hr-manager
2. Interview: trigger conditions, data source, output format
3. Reuse check: no existing leave-balance skill found
4. Generate: SKILL.md + scripts/leave-balance.py
5. Install: ~/.hermes/profiles/hr-manager/skills/leave-balance/
6. Verify: slash command visible, frontmatter valid
7. Report: files created, how to invoke, manual steps
```

## When to Use / When NOT To

**Use when:**
- Adding a connector, skill, workflow, or cron to Shogun OS
- Creating a new department profile
- Extending an existing domain CONTRACT with a new provider
- User asks "how do I add this to Shogun OS properly?"

**Don't use for:**
- One-off ops that aren't reusable
- Pure code bug fixes → use systematic-debugging
- Simple config changes → use hermes-agent

## Prerequisites

- [ ] Shogun OS repo at `~/shogun-os/`
- [ ] Target Hermes profile exists
- [ ] Understanding of profile path conventions

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | `/shogunify` |
| Related Skills | profile-management, company-workflow, shogun-add-department |

## Configuration

Path resolution rules:

| Target | Path |
|--------|------|
| Default profile skill | `~/.hermes/skills/<name>/` |
| Named profile skill | `~/.hermes/profiles/<profile>/skills/<name>/` |
| Profile config | `~/.hermes/profiles/<profile>/config.yaml` |
| Profile secrets | `~/.hermes/profiles/<profile>/.env` |
| Shared scripts | `~/.hermes/scripts/` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 5 modes, questionnaire protocol, install-to-profiles, compliance checklist |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
