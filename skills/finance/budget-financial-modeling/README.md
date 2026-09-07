![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Budget Financial Modeling
> Use when authoring annual operating budgets (OPEX/CAPEX), driver-based financial models, or rolling 12-month projections. Produces a structured budget model and projection file saved to the finance gbrain source.

## What It Does

Creates annual OPEX and CAPEX budgets anchored to business drivers (headcount, revenue-per-seat, cost-per-unit) rather than arbitrary percentages. Maintains rolling 12-month projections that update with latest actuals, producing structured JSON budget files consumed by variance analysis skills.

## Quick Example

```
Input: Annual planning cycle for FY2027
       Driver assumptions: +15% headcount, RM8K revenue/seat

Processing:
  1. Pull FY2026 actuals via acct_get_profit_loss
  2. Apply driver-based growth assumptions
  3. Structure budget JSON with account_code, budget_amount, driver
  4. Save to finance/budget.json

Output: finance/budget.json readable by bva-variance-analysis
        finance/projections/rolling-2026-09.json
```

## When to Use / When NOT To

**Use when:**
- Annual planning requires bottom-up OPEX/CAPEX budget
- Rolling 12-month projection needs updating with latest actuals
- Driver-based model needs building or updating
- Stakeholders request budget file for variance tracking

**Don't use for:**
- Tracking actuals against budget → use [bva-variance-analysis](../bva-variance-analysis/)
- Computing cash runway → use [cash-runway-forecasting](../cash-runway-forecasting/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_get_balance_sheet`
- [ ] gbrain `finance` source for budget storage at `finance/budget.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/budget-financial-modeling` |
| Related Skills | [bva-variance-analysis](../bva-variance-analysis/), [cash-runway-forecasting](../cash-runway-forecasting/), [unit-economics-margin-analysis](../unit-economics-margin-analysis/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — annual budget build, rolling projections |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
