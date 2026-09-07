![General](https://img.shields.io/badge/dept-General-gray)

# Department Scrum

> Universal cross-department daily scrum workflow with 3-tier cadence (9 AM / 11 AM / 5 PM) for any Hermes profile.

## What It Does

Provides a unified daily scrum system for any Hermes Agent profile — Project, Product, HR, Finance, CRM, Marketing, Procurement, Compliance, Support. Sends standup questions via Slack DMs at 9 AM, warns non-responders at 11 AM (with brain cross-referencing), and generates compliance reports at 5 PM. Replaces per-department hardcoded scripts with profile-parameterized config.

## Quick Example

```
9:00 AM — send-scrum-dms.py
→ Sends 4 standard questions to each team member via Slack DM
→ Saves state to scrum-states/{profile}/{date}.json

11:00 AM — check-scrum-replies.py warn
→ Cross-references replies against gbrain
→ Warns 3 non-responders via Slack DM
→ Holiday gate: skips on KL public holidays

5:00 PM — check-scrum-replies.py report
→ Full compliance report: 8/10 responded
→ Quality gates: 6 SMART-compliant, 2 need follow-up
```

## When to Use / When NOT To

**Use when:**
- Setting up daily standups for any department
- Running morning/midday/evening scrum checks
- Generating scrum compliance reports
- Configuring team rosters and brain cross-reference rules

**Don't use for:**
- Ad-hoc meetings or discussions
- Sprint planning or backlog grooming
- Non-scrum communication workflows

## Prerequisites

- [ ] Slack workspace integration configured
- [ ] `scrum.yaml` with team roster for the profile
- [ ] gbrain source configured (for cross-referencing)
- [ ] Cron jobs scheduled for 9 AM, 11 AM, 5 PM

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any (profile-parameterized) |
| Slash Command | `/department-scrum` |
| Related Skills | [gbrain-query](../../gbrain/gbrain-query/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2026-09-04 | Universal cross-department design, profile-parameterized config, holiday gates, SMART quality checks |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
