![Finance](https://img.shields.io/badge/dept-Finance-blue)

# CFO Executive Reporting
> Use when compiling on-demand Weekly Pulse and Monthly Board reports delivered directly to Slack or Telegram. Produces a formatted executive report and triggers delivery via the department-scrum comm layer.

## What It Does

Orchestrates on-demand generation and delivery of weekly pulse and monthly board financial reports to Slack or Telegram channels. Delegates data gathering to underlying report skills and handles message delivery through the department-scrum communication layer, archiving all reports to gbrain for audit trail.

## Quick Example

```
Input: "Koku, generate the weekly financial report for this week"

Processing:
  1. Detect trigger intent → weekly pulse
  2. Delegate to weekly-pulse-report skill
  3. Format output per template
  4. Deliver via department-scrum comm layer
  5. Archive to finance/reports/weekly/2026-09-04.md

Output: Report delivered to #finance-updates Slack channel
        Copy saved to gbrain archive
```

## When to Use / When NOT To

**Use when:**
- Executive requests weekly/monthly financial summary via Slack/Telegram
- Regular scheduled report delivery triggered by cron
- Ad-hoc CFO briefing requested outside normal schedule

**Don't use for:**
- Direct data gathering → use [weekly-pulse-report](../weekly-pulse-report/) or [monthly-board-report](../monthly-board-report/)
- Customer concentration analysis → use [revenue-concentration-audit](../revenue-concentration-audit/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] All `acct_*` tools used by underlying report skills
- [ ] gbrain `finance` source with report archives at `finance/reports/`
- [ ] Comm layer: `skills/department-scrum/scripts/comm/` configured

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/cfo-executive-reporting`, `/weekly-report`, `/monthly-report` |
| Related Skills | [weekly-pulse-report](../weekly-pulse-report/), [monthly-board-report](../monthly-board-report/), [revenue-concentration-audit](../revenue-concentration-audit/), [bva-variance-analysis](../bva-variance-analysis/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — on-demand report orchestration, Slack/Telegram delivery |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
