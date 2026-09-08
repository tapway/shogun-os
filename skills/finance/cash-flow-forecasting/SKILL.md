---
name: cash-flow-forecasting
description: "13-week rolling cash flow forecast — inflows, outflows, and runway analysis for treasury management."
departments: [finance]
version: 1.0.0
author: Shogun OS
tags: [cash-flow, forecasting, treasury, runway]
metadata:
  hermes:
    related_skills: [cash-runway-forecasting, treasury-fx-facility-mgmt]
---

# Cash Flow Forecasting

Use when preparing weekly cash flow forecasts, analyzing liquidity position, or planning payment schedules.

## Forecast Structure (13-Week Rolling)

| Week | Opening Balance | Inflows | Outflows | Net Flow | Closing Balance |
|------|----------------|---------|----------|----------|----------------|
| W1 | RM X | AR collections, loans | AP payments, payroll | +/- | RM Y |
| W2–W4 | Carry forward | Projected receipts | Scheduled payments | +/- | Running total |
| W5–W13 | Trend-based | Pipeline-weighted | Recurring + planned | +/- | Forecast end |

## Inflow Categories

- **Trade Receivables** — Invoice due dates × historical collection rate
- **Contract Milestones** — Project completion % × payment schedule
- **Loan Disbursements** — Approved facilities with drawdown dates
- **Other Income** — Rental, interest, asset sales

## Outflow Categories

- **Trade Payables** — Supplier invoices by due date
- **Payroll & Statutory** — EPF, SOCSO, PCB, salary dates
- **Operating Expenses** — Rent, utilities, subscriptions (recurring)
- **CAPEX** — Approved purchase orders not yet invoiced
- **Tax Payments** — SST, CP204 instalment dates

## Accuracy Targets

| Horizon | Target Accuracy | Method |
|---------|----------------|--------|
| Week 1–2 | ±5% | Confirmed invoices + bank statements |
| Week 3–4 | ±10% | Aged AR/AP + pipeline probability |
| Week 5–8 | ±15% | Historical trends + seasonality |
| Week 9–13 | ±20% | Budget-aligned projections |

## Pitfalls

| Issue | Solution |
|-------|----------|
| Overstating AR collections | Apply aging-based collection rates (current: 95%, 60d: 70%, 90d+: 40%) |
| Missing one-off payments | Monthly review of CAPEX commitments and tax calendar |
| FX exposure ignored | Convert foreign currency items at forward rate, not spot |
| Stale data | Refresh every Monday morning before management meeting |

## Verification

- [ ] All known payables included for next 4 weeks
- [ ] AR collection assumptions documented
- [ ] Variance vs actual tracked weekly
- [ ] Runway calculation updated (months of cash remaining)
