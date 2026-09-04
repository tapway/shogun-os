![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Cash Runway Forecasting
> Use when computing net monthly burn rate, cash runway (months), or 13-week rolling liquidity forecasts. Produces a runway summary and 13-week cash forecast table.

## What It Does

Calculates how many months of cash remain at current burn rate and produces a week-by-week 13-week liquidity forecast. Assigns status labels (Critical <2 months, Caution 2-4 months, Healthy >4 months) to help executives and investors understand the company's financial runway position.

## Quick Example

```
Input: Current cash balance + last 3 months OPEX actuals

Processing:
  1. Total liquid cash: RM850,000
  2. Avg monthly burn: RM180,000 (excl. non-cash items)
  3. Runway = 850,000 / 180,000 = 4.7 months

Output: Runway: 4.7 months (Status: Healthy)
        13-Week Forecast Table:
        | Week | Opening | Receipts | Disbursements | Closing |
        |------|---------|----------|---------------|---------|
        | W1   | 850,000 | 200,000  | 180,000       | 870,000 |
        ...
```

## When to Use / When NOT To

**Use when:**
- Board or investor meeting requires cash runway statement
- Monthly finance review needs 13-week liquidity forecast
- Cash balance changed significantly, revised runway needed
- `cfo-executive-reporting` or `weekly-pulse-report` needs cash section

**Don't use for:**
- FX and credit facility monitoring → use [treasury-fx-facility-mgmt](../treasury-fx-facility-mgmt/)
- Budget modelling → use [budget-financial-modeling](../budget-financial-modeling/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_profit_loss`
- [ ] gbrain `finance` source with forecast assumptions at `finance/cash-forecast/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/cash-runway-forecasting` |
| Related Skills | [budget-financial-modeling](../budget-financial-modeling/), [bva-variance-analysis](../bva-variance-analysis/), [treasury-fx-facility-mgmt](../treasury-fx-facility-mgmt/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — burn rate calculation, 13-week forecast, runway status |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
