![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Weekly Pulse Report
> Use when generating the Weekly Financial Pulse report — cash & runway status, AR aging collections focus, AP commitments, and MTD revenue & spend pacing. Produces a formatted report delivered to Slack/Telegram and saved to gbrain.

## What It Does

Generates concise weekly financial pulse reports covering cash position and runway, AR aging with priority collections actions, AP commitments due this week, and month-to-date revenue/spend pacing against targets. Delivers formatted reports to Slack/Telegram and archives to gbrain for trend analysis.

## Quick Example

```
Input: "Give me the weekly financial pulse" OR /weekly-report

Output:
📊 WEEKLY FINANCIAL PULSE (Week Ending: 04-Sep-2026)

1. 💵 Cash & Runway Status
   - Available Bank Balance: RM850,000
   - Avg Monthly Burn Rate: RM180,000
   - Estimated Cash Runway: 4.7 Months (Healthy)

2. 📥 Accounts Receivable (Collections Focus)
   - Total Outstanding AR: RM320,000
   - Overdue (>30 Days): RM85,000 (12 invoices)
   - ⚠️ Priority: MegaCorp RM42,000 (45 days — INV-2026-0312)

3. 📤 Accounts Payable & Upcoming Commitments
   - Payments Due This Week: RM28,500
   - Total Outstanding AP: RM145,000

4. 📈 MTD Revenue & Spend Pacing
   - MTD Revenue (4 Days): RM62,000 (Target Pace: RM65,000 | 95%)
   - Net MTD Operating Surplus: +RM8,200

Saved to: finance/reports/weekly/2026-09-04.md
```

## When to Use / When NOT To

**Use when:**
- User requests weekly financial report or pulse
- Weekly scheduled cron triggers pulse report
- Ad-hoc cash-position check requested by CFO

**Don't use for:**
- Full monthly board report → use [monthly-board-report](../monthly-board-report/)
- Deep cash runway modelling → use [cash-runway-forecasting](../cash-runway-forecasting/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_aging_report`, `acct_list_purchase_bills`, `acct_get_profit_loss`
- [ ] gbrain `finance` source for report archive at `finance/reports/weekly/`
- [ ] Comm layer configured for delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/weekly-pulse-report`, `/weekly-report` |
| Related Skills | [cfo-executive-reporting](../cfo-executive-reporting/), [monthly-board-report](../monthly-board-report/), [cash-runway-forecasting](../cash-runway-forecasting/), [ar-credit-control](../ar-credit-control/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 4-section pulse report, Slack/Telegram delivery |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
