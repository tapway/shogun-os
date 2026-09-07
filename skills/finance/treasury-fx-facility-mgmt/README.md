![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Treasury FX & Facility Management
> Use when monitoring foreign exchange (FX) exposure, Bank Negara Malaysia (BNM) FEA regulations, Debt Service Coverage Ratio (DSCR), or bank credit line terms. Produces an FX exposure report, DSCR computation, and credit facility utilisation summary.

## What It Does

Monitors foreign exchange exposure across currencies, computes Debt Service Coverage Ratios against loan covenants, and tracks bank credit facility utilisation with expiry alerts. Assesses BNM FEA regulatory compliance for cross-border transactions and flags hedging needs when exposures exceed approved thresholds.

## Quick Example

```
Input: Monthly treasury review

Processing:
  1. Net FX exposure: USD +RM450K long, SGD -RM120K short
  2. DSCR: EBITDA RM1.2M / Debt Service RM800K = 1.50x
  3. Facility utilisation: OD RM2M/RM5M = 40%

Output: FX Exposure Report:
        | Currency | Net Exposure | MYR Equiv | Hedging Threshold | Status     |
        |----------|-------------|-----------|-------------------|------------|
        | USD      | +$100,000   | +RM450,000| RM300,000         | ⚠️ Review  |
        | SGD      | -S$35,000   | -RM120,000| RM200,000         | ✓ Within   |

        DSCR: 1.50x (Covenant min: 1.25x) → ✓ Compliant (headroom: 20%)
        Credit Facility: 40% utilised | Expires: 2027-03-15 (192 days)
```

## When to Use / When NOT To

**Use when:**
- Monthly treasury review needs FX exposure report and DSCR
- New bank facility or loan drawdown needs recording
- Foreign-currency receivables/payables need hedging assessment
- BNM FEA approval required for large offshore payment
- Loan covenant check before quarterly bank compliance report

**Don't use for:**
- Cash runway forecasting → use [cash-runway-forecasting](../cash-runway-forecasting/)
- Statutory financial statements → use [financial-statement-prep](../financial-statement-prep/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_profit_loss`, `acct_list_sales_invoices`, `acct_list_purchase_bills`
- [ ] gbrain `finance` source with FX positions at `finance/treasury/fx-positions.json` and facility agreements

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/treasury-fx-facility-mgmt` |
| Related Skills | [cash-runway-forecasting](../cash-runway-forecasting/), [financial-statement-prep](../financial-statement-prep/), [internal-control-governance](../internal-control-governance/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — FX exposure, DSCR, credit facility tracking, BNM FEA |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
