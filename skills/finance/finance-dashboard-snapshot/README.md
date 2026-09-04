![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Finance Dashboard Snapshot
> Use when refreshing the Finance dashboard with live system data. Calls acct_* MCP tools, computes the 5-tab payload, and writes JSON snapshots to finance/snapshots/*.json gbrain pages. Idempotent + empty-brain-safe.

## What It Does

Closes the live-data gap for the Finance dashboard by reading system data through `acct_*` MCP tools and writing machine-readable JSON snapshots to seven gbrain pages. The dashboard backend reads these slugs automatically — no backend changes needed. Falls back gracefully to example data when snapshots are absent.

## Quick Example

```
Input: /refresh-finance-dashboard OR daily 7am cron

Processing:
  python scripts/write_snapshots.py
  (or --dry-run to preview without writing)

Output: 7 snapshot pages written:
  - finance/snapshots/cash.json      (Tab 1: Cash & Treasury)
  - finance/snapshots/pl.json        (Tab 1/3: P&L)
  - finance/snapshots/concentration.json (Tab 3: Revenue Concentration)
  - finance/snapshots/bva.json       (Tab 3: Budget vs Actual)
  - finance/snapshots/ar.json        (Tab 4: AR & Dunning)
  - finance/snapshots/ap.json        (Tab 4: AP & Bills)
  - finance/snapshots/compliance.json (Tab 5: Compliance)
```

## When to Use / When NOT To

**Use when:**
- Daily 7am cron refreshes all 7 snapshot pages
- On-demand via `/refresh-finance-dashboard` slash trigger
- Manual refresh needed after significant data changes

**Don't use for:**
- Generating human-readable reports → use [cfo-executive-reporting](../cfo-executive-reporting/)
- Deep variance analysis → use [bva-variance-analysis](../bva-variance-analysis/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] Finance agent gateway up (for `acct_*` MCP tools)
- [ ] MCP tools: `acct_get_balance_sheet`, `acct_get_profit_loss`, `acct_get_aging_report`, `acct_list_sales_invoices`, `acct_list_purchase_bills`, `acct_list_contacts`
- [ ] `finance/budget.json` for BvA tab

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/refresh-finance-dashboard` |
| Related Skills | [cash-runway-forecasting](../cash-runway-forecasting/), [ar-credit-control](../ar-credit-control/), [bva-variance-analysis](../bva-variance-analysis/), [revenue-concentration-audit](../revenue-concentration-audit/), [tax-sst-compliance](../tax-sst-compliance/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 7-tab snapshot writer, idempotent, empty-brain-safe |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
