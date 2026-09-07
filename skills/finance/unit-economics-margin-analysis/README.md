![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Unit Economics & Margin Analysis
> Use when calculating Gross Margin %, Net Margin %, EBITDA, Customer Acquisition Cost (CAC), or Client Profitability. Produces a unit-economics summary and margin breakdown by revenue line.

## What It Does

Calculates key profitability metrics including gross margin, net margin, EBITDA, customer acquisition cost, and per-client profitability. Produces margin breakdowns by revenue stream (e.g., SaaS vs. professional services) to inform pricing, product mix, and growth investment decisions.

## Quick Example

```
Input: Q3 2026 financials + marketing spend data

Processing:
  1. P&L: Revenue RM1.4M, COGS RM520K, Net Profit RM210K
  2. S&M spend: RM180K | New customers: 45
  3. Allocate costs per client

Output: Unit Economics Summary — Q3 2026
        Gross Margin:  62.9% ((1.4M - 520K) / 1.4M)
        Net Margin:    15.0% (210K / 1.4M)
        EBITDA:        RM285,000
        CAC:           RM4,000 (180K / 45 new customers)

        Client Profitability (Top 5):
        | Client       | Revenue | Gross Profit | Margin |
        |--------------|---------|-------------|--------|
        | MegaCorp     | 280,000 | 196,000     | 70%    |
        | TechStart    | 185,000 | 111,000     | 60%    |
        ⚠️ LowMargin   | 45,000  | 2,250       | 5%     |
```

## When to Use / When NOT To

**Use when:**
- Monthly/quarterly review needs full margin breakdown by revenue stream
- New product line or client segment needs profitability assessment
- Board materials require EBITDA and net margin KPIs
- CAC changed and LTV relationship needs evaluating

**Don't use for:**
- Customer concentration risk → use [revenue-concentration-audit](../revenue-concentration-audit/)
- BvA tracking → use [bva-variance-analysis](../bva-variance-analysis/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_list_sales_invoices`, `acct_list_contacts`
- [ ] gbrain `finance` source with marketing spend at `finance/unit-economics/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/unit-economics-margin-analysis` |
| Related Skills | [revenue-concentration-audit](../revenue-concentration-audit/), [bva-variance-analysis](../bva-variance-analysis/), [cfo-executive-reporting](../cfo-executive-reporting/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — margin calculation, EBITDA, CAC, client profitability |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
