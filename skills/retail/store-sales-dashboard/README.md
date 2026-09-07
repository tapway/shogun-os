![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Store Sales Dashboard

> Daily sales by store with hourly trends, staff performance, customer count, and budget variance analysis.

## What It Does

Aggregates transactional data into a single-pane view of store performance. Tracks gross/net sales, customer count, average basket size, and budget attainment with drill-down to department and category level. Generates interactive HTML dashboards for store managers and regional supervisors.

## Quick Example

```
Input:  sales dashboard --date 2026-09-03 --store STORE-01

Output:
  STORE-01 Daily Report — Sep 3, 2026
  Gross Sales: RM 18,450 | Net Sales: RM 17,820
  Customers: 142 | Avg Basket: RM 125.49
  Budget: RM 17,857 | Variance: -0.2% ✅
  Peak Hour: 12:00-13:00 (RM 3,200)
  Top Staff: Ahmad (RM 4,800, 38 transactions)
```

## When to Use / When NOT To

**Use when:**
- Generating daily or weekly store performance reports
- Analyzing hourly sales trends for staffing decisions
- Tracking sales vs budget variance by store or region
- Reviewing individual staff sales performance

**Don't use for:**
- Real-time POS monitoring (5-15 min data latency)
- Multi-currency comparisons without FX rate normalization
- Holiday period analysis using sequential day comparisons (use YoY instead)

## Prerequisites

- [ ] Database connection for sales transaction data
- [ ] Budget targets defined in `budgets.yaml`
- [ ] Store identifiers configured
- [ ] Scripts: `generate-dashboard.py`, `hourly-trends.py`, `budget-variance.py`, `staff-performance.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / merchandising |
| Slash Command | `/store-sales-dashboard` |
| Related Skills | |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SALES_DB_URL` | Sales database connection | `postgresql://localhost:5432/sales` |
| `SALES_CURRENCY` | Display currency code | `MYR` |
| `SALES_REFRESH_INTERVAL` | Auto-refresh seconds | `300` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — daily dashboard, hourly trends, budget variance, staff metrics |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
