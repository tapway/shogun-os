![Finance](https://img.shields.io/badge/dept-Finance-blue)

# BvA Variance Analysis
> Use when tracking line-item spending against budget baselines and flagging department cost overruns exceeding 10%. Produces a Budget vs. Actual variance report with flagged lines and a BvA section for the monthly board report.

## What It Does

Compares actual spending against budget baselines line-by-line and flags any P&L line with variance exceeding 10%. Produces a formatted variance table with amounts, percentages, and warning markers for inclusion in monthly board reports and department cost reviews.

## Quick Example

```
Input: finance/budget.json + QBO P&L actuals for Aug 2026

Processing:
  python scripts/variance.py --budget budget.json --actuals pl-aug.json

Output:
| Account          | Budget  | Actual  | Variance | Var % | Flag           |
|------------------|---------|---------|----------|-------|----------------|
| Marketing        | 15,000  | 18,500  | +3,500   | +23%  | ⚠️ >10% Variance |
| Office Supplies  | 2,000   | 1,950   | -50      | -2.5% |                |
| Software         | 8,000   | 8,200   | +200     | +2.5% |                |
```

## When to Use / When NOT To

**Use when:**
- Month-end close requires BvA section in board report
- Department manager asks why cost centre shows overrun
- Finance review needs full-period variance breakdown
- `monthly-board-report` skill calls this internally

**Don't use for:**
- Authoring the budget file → use [budget-financial-modeling](../budget-financial-modeling/)
- Producing full board report → use [monthly-board-report](../monthly-board-report/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_get_balance_sheet`
- [ ] gbrain `finance` source with `finance/budget.json` (authored by budget-financial-modeling)
- [ ] Script: `scripts/variance.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/bva-variance-analysis` |
| Related Skills | [budget-financial-modeling](../budget-financial-modeling/), [monthly-board-report](../monthly-board-report/), [cfo-executive-reporting](../cfo-executive-reporting/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — variance computation, >10% flagging, graceful degradation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
