![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Monthly Board Report
> Use when generating the Monthly Financial Performance & Board Report — P&L breakdown, balance sheet ratios, BvA variance analysis, and customer concentration risk. Produces a formatted board report delivered to Slack/Telegram and saved to gbrain.

## What It Does

Compiles comprehensive monthly financial performance reports including executive KPI scorecard, P&L breakdown, balance sheet health ratios, budget vs. actual variance analysis, and customer concentration risk assessment. Delivers formatted reports to Slack/Telegram and archives to gbrain for governance records.

## Quick Example

```
Input: "Generate monthly board financial report for August 2026"

Output:
🏛️ MONTHLY FINANCIAL PERFORMANCE REPORT — August 2026

1. 🎯 Executive Summary & KPI Scorecard
   - Revenue: RM485,000 (MoM: +12% | YoY: +28%)
   - Gross Margin: 62% | Net Margin: 18%
   - EBITDA: RM112,000

2. 📑 P&L Breakdown (Revenue + OPEX by line)
3. ⚖️ Balance Sheet Ratios (Current: 2.1x | Quick: 1.4x)
4. 📉 BvA Variance (2 lines flagged >10%)
5. 🔍 Concentration Risk: Top client 18% (within 20% threshold)

Saved to: finance/reports/monthly/2026-08.md
Delivered to: #board-updates Slack channel
```

## When to Use / When NOT To

**Use when:**
- User requests monthly financial performance report
- Monthly scheduled cron triggers board report
- Board or investors require formal monthly financial pack

**Don't use for:**
- Weekly pulse report → use [weekly-pulse-report](../weekly-pulse-report/)
- Standalone BvA → use [bva-variance-analysis](../bva-variance-analysis/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_get_balance_sheet`, `acct_list_contacts`, `acct_list_sales_invoices`
- [ ] gbrain `finance` source with `finance/budget.json` (optional, degrades gracefully)
- [ ] Comm layer configured for delivery

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/monthly-board-report`, `/monthly-report` |
| Related Skills | [cfo-executive-reporting](../cfo-executive-reporting/), [weekly-pulse-report](../weekly-pulse-report/), [bva-variance-analysis](../bva-variance-analysis/), [revenue-concentration-audit](../revenue-concentration-audit/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-09-04 | Updated — added manual generation fallback when script unavailable |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
