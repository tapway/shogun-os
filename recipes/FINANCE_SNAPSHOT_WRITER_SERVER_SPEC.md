# Finance Snapshot Writer — Server-Side Spec (for Gozen)

Companion to `recipes/DASHBOARD_SNAPSHOT_CONTRACT.md`. The **portal side is
already done and tested** (gbrain-only — QBO deleted). This file is everything the
server-side writer + shim needs.

## 1. What the portal now does (no further portal changes needed)

`shogun-web/server/dashboard.py` → `_fetch_finance_snapshots()`:

- Reads **8 snapshots**, targeted `get_page` calls (no `list_pages`, no `tools/list`):
  `cash`, `pl`, `balance-sheet`, `ar`, `ap`, `bva`, `concentration`, `compliance`
- For each, tries slugs in order (first hit wins):
  `finance/snapshots/<name>` → `finance/snapshots/<name>.json` → `snapshots/<name>` → `snapshots/<name>.json`
- **gbrain-only**: every read goes through `get_page` on the MCP link — no
  local data files, no filesystem mirror reads. The 8 fetches run
  concurrently (one round-trip batch when the cache is cold).
- Cache: 60 s in-process. UI refetches every 120 s.
- **No QBO, ever** — the QBO branch was deleted, not gated. No snapshots →
  `dataSource: "empty"`, UI shows a "waiting for snapshots" banner. Never
  mock figures.

## 2. What the writer must emit

**Required** — 7 pages, slug `finance/snapshots/<name>.json` (or `<name>`),
body = JSON object with the **exact snake_case keys** in
`DASHBOARD_SNAPSHOT_CONTRACT.md` (Finance slugs section — updated today with
`balance-sheet`, chart series, and item-shape tolerance):

`cash`, `pl`, `balance-sheet`, `ar`, `ap`, `bva`, `concentration`

**Optional (skip for now):** `compliance` — the portal renders empty
checklist/schedule/SST sections when the page is absent. Add later when
needed.

Non-negotiables:

- Numbers are floats (MYR), no string formatting, no commas.
- Arrays of objects use snake_case keys; the portal normalizes the short
  spellings (`invoice`/`client`/`days_overdue`, `bill`, `balance`) — writing
  those is fine.
- `bank_accounts[]`: `name`, `balance`, `currency`.
- `bills[]`: include `match_status` + `approval_status` if known, else omit
  (defaults `Matched`/`Pending`).
- `ar_invoices[]`: ALL outstanding invoices; `dunning_queue[]`: overdue-only.
  Include `bucket` ("0-30"|"31-60"|"61-90"|"90+") if you have it, else the
  portal derives it from `days_overdue`.
- Chart series shapes (verified against `ui/src/lib/types.ts`):
  - `monthly_pl_trend`: `{month, revenue, expenses, net_profit}` (6 months)
  - `burn_trend`: `{month, burn}`
  - `cash_flow_forecast`: `{month, total, low, high}`
  - `aging_by_target` (AR & AP): `{label, amount}`
  - `bva.line_items`: `{section: "income"|"expenses", account_name, budget_ytd, actual_ytd}`
  - `balance-sheet.asset_trend`: `{month, current, non_current}`
- Empty/missing source data → write zeros/empty arrays (never crash, never skip a page).

## 3. Data source on the server — portal never sees it

**Hard requirement: the portal talks to gbrain ONLY.** The snapshot writer's
upstream source is the server agent's choice — use whatever finance data
exists on the server (Gozen: `qb.py` / accounting bridge is available there;
manual pages, ingested reports, or any other source work equally well). The
portal contract ends at `get_page` — it never calls the upstream directly.

What the writer must produce, per snapshot:

| Snapshot | Content |
|---|---|
| `cash` | `total_liquid_cash` + `bank_accounts[]`; monthly inflow/outflow (`cash_flow_trend`); burn = avg monthly expenses |
| `pl` | revenue MTD/YTD, margins, `monthly_pl_trend` (6 months) |
| `balance-sheet` | assets classified current/non-current + totals + `asset_trend` |
| `ar` / `ap` | outstanding invoices/bills; aging buckets from due dates vs today |
| `concentration` | revenue per client ÷ total → `revenue_pct` |
| `bva` | budget (from yearly Excel) vs actuals |

### Budget flow — Excel uploaded ONCE per year

1. User uploads the annual Budget Excel (existing format: account_code,
   account_name, section Revenue/Expenses, budget_amount, monthly split —
   see `scripts/parse-budget-excel.py` + `examples/finance-budget.json`).
2. Parse once → `put_page finance/budget/<year>` with the raw lines
   (`{account_code, account_name, section, budget_amount, monthly_budget[12]}`).
   This page persists all year; re-upload only next year.
3. The snapshot writer reads `finance/budget/<current_year>`, pro-rates
   `budget_ytd` to the current month, matches actuals per account, and writes
   `finance/snapshots/bva` (`line_items[]` + per-dept `departments[]`).

Derivation rules:
- `dso`/`dpo`: revenue/COGS proxies are fine (60-day windows).
- `forecast_13w` / `cash_flow_forecast`: simple projection from burn + inflow
  trend (±15% fan) — no ML needed.
- `bva.departments[]`: group budget lines by department tag if present, else
  one "All Departments" row.

## 4. Two server tasks

1. **Fix the shim's finance mapping** — add `finance/snapshots/%` so
   `get_page(slug="finance/snapshots/cash", source_id="finance")` resolves to
   the snapshot pages (currently finance maps to `data/%`, which is why
   `list_pages` returned emails). `tools/call` is all the portal needs —
   `tools/list` NOT required.
2. **Cron the writer** — nightly (or alongside the management report on the
   10th). Command: `python write_snapshots.py` (idempotent overwrite).

## 5. Verify after first write

```bash
curl -X POST http://127.0.0.1:7432/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_page","arguments":{"source_id":"finance","slug":"finance/snapshots/cash"}}}'
```

Then on the portal: `GET /api/departments/finance/dashboard/finance-stats`
should return `"dataSource": "gbrain"` with non-zero figures. UI banner
disappears automatically within 2 minutes.
