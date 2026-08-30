# Finance Snapshot Writer — Server-Side Spec (for Gozen)

Companion to `recipes/DASHBOARD_SNAPSHOT_CONTRACT.md`. The **portal side is
already done and tested** (gbrain-first, QBO off). This file is everything the
server-side writer + shim needs.

## 1. What the portal now does (no further portal changes needed)

`shogun-web/server/dashboard.py` → `_fetch_finance_snapshots()`:

- Reads **8 snapshots**, targeted `get_page` calls (no `list_pages`, no `tools/list`):
  `cash`, `pl`, `balance-sheet`, `ar`, `ap`, `bva`, `concentration`, `compliance`
- For each, tries slugs in order (first hit wins):
  `finance/snapshots/<name>` → `finance/snapshots/<name>.json` → `snapshots/<name>` → `snapshots/<name>.json`
- **Before MCP it reads the filesystem mirror directly** (regardless of read
  preference): `<brain_root>/finance/snapshots/<name>.json`. So if the writer
  ALSO writes a plain JSON file to `~/brain/finance/snapshots/<name>.json` on
  the portal host, zero shim work is needed.
- Cache: 60 s in-process. UI refetches every 120 s.
- QBO branch is OFF by default (`SHOGUN_FINANCE_QBO=1` to re-enable). No
  snapshots → `dataSource: "empty"`, UI shows a "waiting for snapshots"
  banner. Never mock figures.

## 2. What the writer must emit

8 pages, slug `finance/snapshots/<name>.json` (or `<name>`), body = JSON
object with the **exact snake_case keys** in `DASHBOARD_SNAPSHOT_CONTRACT.md`
(Finance slugs section — updated today with `balance-sheet`, chart series, and
item-shape tolerance). Summary of the non-negotiables:

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

## 3. Data source on the server

QBO creds are already on the server — pull P&L, balance sheet, AR invoices,
AP bills via the existing `qb.py` / acct bridge, same as the old local
`write_snapshots.py`. Derivations:

- `cash`: sum bank/cash-type BS accounts → `total_liquid_cash`; burn = avg
  monthly expenses (trailing 3 mo).
- `ar`/`ap` aging buckets from due dates vs today; `dso`/`dpo` from revenue/COGS proxies.
- `bva` budgets: from the budget JSON (the writer's existing `examples/finance-budget.json` shape).
- `concentration`/`compliance`: from gbrain pages if available, else empty arrays.

## 4. Two server tasks

1. **Fix the shim's finance mapping** — add `finance/snapshots/%` so
   `get_page(slug="finance/snapshots/cash", source_id="finance")` resolves to
   the snapshot pages (currently finance maps to `data/%`, which is why
   `list_pages` returned emails). `tools/call` is all the portal needs —
   `tools/list` NOT required.
2. **Cron the writer** — nightly (or alongside the management report on the
   10th). Command: `python write_snapshots.py` (idempotent overwrite).

Optional but recommended: also write the 8 `.json` files to
`~/brain/finance/snapshots/` on the portal host — that bypasses the shim
entirely (portal's direct filesystem read) and keeps working if the shim is
restarted/down.

## 5. Verify after first write

```bash
curl -X POST http://127.0.0.1:7432/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_page","arguments":{"source_id":"finance","slug":"finance/snapshots/cash"}}}'
```

Then on the portal: `GET /api/departments/finance/dashboard/finance-stats`
should return `"dataSource": "gbrain"` with non-zero figures. UI banner
disappears automatically within 2 minutes.
