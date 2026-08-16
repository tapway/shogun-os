# PR Review Amendments Plan — #12, #13, #14

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Two-stage review (spec compliance → code quality) after each task.

**Goal:** Address all code-review findings on PRs #12, #13, #14 (finance manager, procurement manager, portal redesign) so each PR moves from "Changes Requested" / "Reviewed" to "Approved".

**Architecture:** Surgical fixes only — no drive-by refactors. Where the same defect appears in two PRs (duplicate `include_router`, mock-data seeding), fix once on `feat/Shogun-OS-design` and it carries forward on rebase. Group by file to keep diffs reviewable.

**Tech Stack:** Python 3.11 (server + scripts), TypeScript/React (UI), Vite, FastAPI, SQLAlchemy.

**Branch:** `feat/Shogun-OS-design` (current working branch — all 3 PRs stack on top of it).

---

## Summary Table — All Findings

| # | PR | Severity | File | Issue |
|---|-----|---------|------|-------|
| 1 | #12 | ⚠️ Warn | `skills/finance/weekly-pulse-report/scripts/weekly_pulse.py:314` | `os.makedirs(os.path.dirname(output_path))` crashes when `--output` is a bare filename (empty dirname). |
| 2 | #12 | ⚠️ Warn | `shogun-web/server/dashboard.py:1465,1832` | ✅ **Task 6 — REMOVE** — finance is live from QBO; `examples/finance-budget.json` fallback is dead code. Delete the `else:` branch, return empty-state. |
| 3 | #12 | 💡 Sugg | `weekly_pulse.py:200`, `monthly_board.py:244`, `variance.py:106` | `fmt_money`/`format_money` hardcodes `$` but all data is MYR. Use `RM`. |
| 4 | #12 | 💡 Sugg | `scripts/generate-profile.py` | Unrelated backtick formatting changes in non-finance soul snippets (scope creep). |
| 5 | #13 | 🔴 Crit | `shogun-web/server/main.py:119` | `app.include_router(gateway.router)` registered twice — second call has no `/api` prefix. |
| 6 | #13 | ⚠️ Warn | `skills/procurement/reorder-alert-report/scripts/reorder_alerts.py:113-114` | Builds `report_filename` + prints "✅ Report path" but never writes the file. |
| 7 | #13 | ⚠️ Warn | `skills/procurement/inventory-valuation-report/scripts/inventory_valuation.py:12,148-149` | Docstring says "saves report" but only prints to stdout. No `open()/write()`. |
| 8 | #13 | ⚠️ Warn | `recipes/procurement/bridges/accounting_bridge.py` | Every `acct_*` call is a stub. Title says "wiring" but it's scaffolding. Mark clearly as pending MCP integration. |
| 9 | #13 | 💡 Sugg | `scripts/wire-crons.py` (multiple) | Prompts say "post to #channel" / "summarise to channel" but `deliver: "local"` writes locally, never reaches a channel. |
| 10 | #14 | 🔴 Crit | `shogun-web/server/database.py:237-252`, `shogun-web/ui/src/pages/Login.tsx:132-136` | ✅ **Task 2 — REMOVE** — delete `_ensure_default_user` auto-seed (admin@localhost/admin123456) + delete `fillDemoCredentials` button. First-run admin via `ensure_bootstrap_admin` CLI helper. |
| 11 | #14 | ⚠️ Warn | `shogun-web/server/departments.py:191-286` | `_ensure_default_brain_docs` writes 9 fabricated business docs (Parkson, Aeon, fake contacts, fake RM figures) into `~/brain/` on empty brain. Needs demo flag + namespacing. |
| 12 | #14 | ⚠️ Warn | `shogun-web/server/main.py:119` | Same duplicate `include_router` as #13 — dedupes on fix. |
| 13 | #14 | ⚠️ Warn | `shogun-web/server/database.py:193-219` | `_ensure_departments` overwrites `dept.status` on every init — clobbers admin who deactivated a dept. Only set on create. |
| 14 | #14 | 💡 Sugg | `shogun-web/ui/tsconfig.tsbuildinfo` | Generated build artifact committed though `.gitignore` has `*.tsbuildinfo`. Remove from PR. |
| 15 | #14 | 💡 Sugg | `shogun-web/server/auth.py:869` | ✅ **SOLVED** in uncommitted working tree — comment `# Fallback: match across tenants (legacy / single-tenant setups)` already added at `auth.py:869`. No action needed. |

---

## Task Ordering

Tasks are grouped by file to keep diffs tight. Critical fixes (🔴) first, then warnings (⚠️), then suggestions (💡). Where one edit resolves multiple findings (e.g. #5 + #12 are the same line), that's called out.

---

### Task 1: Remove duplicate `include_router(gateway.router)` 🔴 [findings #5, #12]

**Objective:** Eliminate the unintended second gateway mount path at `/gateway/...` (outside `/api`).

**Files:**
- Modify: `shogun-web/server/main.py:119`

**Step 1: Read current state**
```bash
# confirm both lines exist
grep -n "include_router(gateway.router" shogun-web/server/main.py
```
Expected: two lines — `:118` (with prefix) and `:119` (without prefix).

**Step 2: Patch — delete the unprefixed line**
```python
# KEEP (line 118):
app.include_router(gateway.router, prefix="/api")
# DELETE (line 119):
app.include_router(gateway.router)
```

**Step 3: Verify**
```bash
grep -c "include_router(gateway.router" shogun-web/server/main.py  # → 1
```

**Step 4: Commit**
```bash
git add shogun-web/server/main.py
git commit -m "fix: remove duplicate gateway router registration (PR #13/#14 review)"
```

---

### Task 2: Remove auto-seeded admin + remove demo-credentials button 🔴 [finding #10]

**Objective:** Eliminate the one-click-admin-compromise risk. Don't gate — **remove entirely**. The auto-seeded `admin@localhost / admin123456` user is deleted from the boot flow, and the "fill demo credentials" button is deleted from the Login page.

**Files:**
- Modify: `shogun-web/server/database.py:237-257` (delete the `_ensure_default_user` function body — or make it a no-op)
- Modify: `shogun-web/server/database.py:292` (remove the `_ensure_default_user(db, tenant)` call in `init_db`)
- Modify: `shogun-web/ui/src/pages/Login.tsx:132-136` (delete `fillDemoCredentials` function)
- Modify: `shogun-web/ui/src/pages/Login.tsx:233-237` (delete the demo-fill button JSX)

**Why removing (not gating) is safe:**
- `auth.py:1184` already has `ensure_bootstrap_admin(db, email=..., password=..., name=...)` — the CLI/install first-run flow uses this to create a real admin with `first_login=True`. That path is unaffected.
- Removing the auto-seed just means: on a fresh DB with no CLI bootstrap run, there are no users → the Login page shows no users exist (which is the correct, safe state). Admins are created via the install script, not auto-seeded.

**Step 1: Remove `_ensure_default_user` from database.py**
- Delete the function definition at `database.py:237-257` (or make it `pass` with a deprecation comment pointing to `ensure_bootstrap_admin`).
- Remove the call at `database.py:292`: `_ensure_default_user(db, tenant)`.

**Step 2: Remove demo-credentials button from Login.tsx**
- Delete `fillDemoCredentials` function (lines ~132-136).
- Delete the button JSX block (lines ~233-237) that renders it.

**Step 3: Verify**
```bash
grep -n "_ensure_default_user\|admin123456\|admin@localhost" shogun-web/server/database.py  # → empty (or only a deprecation comment)
grep -n "fillDemoCredentials\|admin123456\|admin@localhost" shogun-web/ui/src/pages/Login.tsx  # → empty
python -m py_compile shogun-web/server/database.py  # → exit 0
cd shogun-web/ui && npx tsc --noEmit  # → no TS errors
```

**Step 4: Commit**
```bash
git add shogun-web/server/database.py shogun-web/ui/src/pages/Login.tsx
git commit -m "fix(security): remove auto-seeded admin + demo-credentials button (PR #14 review)"
```

---

### Task 3: Stop clobbering department status on re-init ⚠️ [finding #13]

**Objective:** `_ensure_departments` must only set `status` when the row is first created, not overwrite an admin's manual deactivation on every boot.

**Files:**
- Modify: `shogun-web/server/database.py:202-208`

**Step 1: Patch**
```python
# database.py:202-208 — current:
for spec in DEFAULT_DEPARTMENTS:
    name = spec["name"]
    default_status = "active" if name in DEFAULT_ACTIVE_NAMES else "inactive"
    if name in existing:
        dept = existing[name]
        dept.status = default_status   # ← REMOVE THIS LINE
        continue
    # ... create new dept with default_status
```
Replace with: only set `status` on the new-Department path; leave existing rows untouched.

**Step 2: Verify**
```bash
cd shogun-web && python -c "from server.database import init_db; init_db()"  # runs without error
```
Manual: set a department to `inactive` in the DB, re-run `init_db()`, confirm it stays `inactive`.

**Step 3: Commit**
```bash
git add shogun-web/server/database.py
git commit -m "fix: preserve admin-set department status across re-init (PR #14 review)"
```

---

### Task 4: Gate brain-doc demo seeding behind env flag ⚠️ [finding #11]

**Objective:** Don't write 9 fabricated business documents (Parkson, Aeon, fake contacts, fake RM figures) into `~/brain/` as if they were real. Gate behind `SEED_DEMO_BRAIN` (default off) and namespace the folder as `demo/`.

**Files:**
- Modify: `shogun-web/server/departments.py:191-286` (the `_ensure_default_brain_docs` function)
- Optionally Modify: `shogun-web/server/config.py` (add `seed_demo_brain: bool = False` to Config)

**Step 1: Add config flag** (in `config.py`)
```python
seed_demo_brain: bool = os.environ.get("SEED_DEMO_BRAIN", "false").lower() == "true"
```

**Step 2: Gate the seeding** in `departments.py:191`
```python
def _ensure_default_brain_docs(dept_name: str) -> None:
    """Ensure default brain markdown files exist for a department if ~/brain/<dept> is empty."""
    cfg = get_config()
    if not cfg.seed_demo_brain:
        return  # Do not seed fabricated demo data into a real brain.
    # ... existing seeding logic, but write under brain_root / "demo" subdir
```
Also rename the written paths to live under a `demo/` subfolder so real and demo data never mix (e.g. `brain_root / "demo" / "key-accounts" / ...`).

**Step 3: Add a clear log line** when seeding fires so it's visible in server logs:
```python
logger.info("Seeding DEMO brain docs for %s (SEED_DEMO_BRAIN=true)", dept_name)
```

**Step 4: Verify**
```bash
# default: no seeding
rm -rf ~/brain/crm && cd shogun-web && python -c "from server.departments import _ensure_default_brain_docs; _ensure_default_brain_docs('crm')" && ls ~/brain/crm 2>/dev/null | wc -l  # → 0
# with flag:
SEED_DEMO_BRAIN=true python -c "from server.departments import _ensure_default_brain_docs; _ensure_default_brain_docs('crm')" && ls ~/brain/crm/demo  # → populated
```

**Step 5: Commit**
```bash
git add shogun-web/server/departments.py shogun-web/server/config.py
git commit -m "fix: gate demo brain-doc seeding behind SEED_DEMO_BRAIN (PR #14 review)"
```

---

### Task 5: Fix weekly_pulse `os.makedirs` crash on bare filename ⚠️ [finding #1]

**Objective:** Mirror `monthly_board.py`'s guard so `--output report.md` (no directory component) doesn't crash with `FileNotFoundError: ''`.

**Files:**
- Modify: `skills/finance/weekly-pulse-report/scripts/weekly_pulse.py:314`

**Step 1: Patch**
```python
# weekly_pulse.py:314 — current:
os.makedirs(os.path.dirname(output_path), exist_ok=True)
# replace with:
os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
```

**Step 2: Verify (reproduce the reviewer's crash, then confirm fix)**
```bash
cd /d/Github/shogun-os
# before fix (reproduce): python skills/finance/weekly-pulse-report/scripts/weekly_pulse.py --dry-run --output report.md  → crash
# after fix:
python skills/finance/weekly-pulse-report/scripts/weekly_pulse.py --dry-run --output report.md  # → writes report.md in cwd, exit 0
rm -f report.md
```

**Step 3: Commit**
```bash
git add skills/finance/weekly-pulse-report/scripts/weekly_pulse.py
git commit -m "fix: guard weekly_pulse makedirs on bare-filename --output (PR #12 review)"
```

---

### Task 6: Remove dead-code finance-budget.json fallback ⚠️ [finding #2]

**Objective:** Finance data is **live from QBO** (the dashboard already calls `_fetch_qbo_balance_sheet`, `_fetch_qbo_profit_loss`, `_fetch_qbo_ar_invoices` at `dashboard.py:1493-1495` with a 5-min cache). The `examples/finance-budget.json` fallback branch at `dashboard.py:1831-1884+` is dead code that renders fabricated MYR figures (fake bank balances, fake revenue, fake client concentration with real-looking names like Parkson/Aeon) as if they were real financials. Remove the entire fallback branch.

**Files:**
- Modify: `shogun-web/server/dashboard.py:1831-1884+` (the `else:` branch that loads `examples/finance-budget.json`)
- Modify: `shogun-web/server/dashboard.py:1465` (remove the docstring line "Supplies rich demo mock data when gbrain snapshots are empty so users can view all 5 tabs immediately.")

**Step 1: Identify the exact branch boundaries**
```bash
# The structure is:
#   if has_real_data (snapshot_map has cash_snap or pl_snap):
#       ... (keep — snapshot path)
#   else:
#       # ── LOAD FROM EXAMPLES/FINANCE-BUDGET.JSON ──  ← line 1831
#       json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "finance-budget.json"
#       ... (lines 1832-1884+ load mock_data fields with hardcoded defaults)
#       ... (continues with more mock field assignments)
```
Read from `dashboard.py:1825` down to where the `else:` branch ends (the next dedent / next top-level statement) to find the exact end line.

**Step 2: Replace the `else:` branch with an empty-state return**
Instead of loading mock data, return an explicit empty-state payload so the UI shows "no data yet" rather than fake RM figures:
```python
else:
    # No snapshot data AND no live QBO → return empty-state, not fabricated mock data.
    # The UI should show "connect QBO / wait for first snapshot" — not fake financials.
    logger.info("Finance dashboard: no snapshot and no live QBO — returning empty state")
    # (keep any already-assigned zero defaults; do NOT load examples/finance-budget.json)
```
Then delete every line that reads from `mock_data.get(...)` (lines 1833-1884+).

**Step 3: Update the function docstring**
```python
def _run_finance_aggregation(pages: List[dict]) -> dict:
    """Aggregate gbrain finance pages into structured dashboard stats.

    Data source priority: live QBO (5-min cache) → gbrain snapshots → empty state.
    Does NOT load mock/example data — if no real source is available, returns
    an empty-state payload so the UI shows "no data yet".
    """
```

**Step 4: Verify**
```bash
# mock fallback removed
grep -n "finance-budget.json\|dashboard_mock" shogun-web/server/dashboard.py  # → empty
# empty-state path exists
grep -n "empty state\|no snapshot and no live QBO" shogun-web/server/dashboard.py  # → 1 match
# syntax
python -m py_compile shogun-web/server/dashboard.py  # → exit 0
# runtime — with QBO env configured, dashboard still loads live data
python -c "from server.dashboard import _run_finance_aggregation; print(_run_finance_aggregation([]))"  # → dict with empty fields, no fake RM figures
```

**Step 5: Commit**
```bash
git add shogun-web/server/dashboard.py
git commit -m "fix: remove dead-code finance-budget.json mock fallback (PR #12 review)"
```

**Note on `examples/finance-budget.json`:** Leave the file itself in place (it's a reference example) — just stop loading it from the dashboard. If the UI has an existing DEMO banner wired to `demo_data` flag, no change needed; if not, that's a follow-up.

---

### Task 7: Implement reorder_alerts.py file write ⚠️ [finding #6]

**Objective:** `reorder_alerts.py` prints "✅ Report path: …" but never writes the file. Implement the write.

**Files:**
- Modify: `skills/procurement/reorder-alert-report/scripts/reorder_alerts.py:113-115`

**Step 1: Patch** — add the actual write logic before the exit:
```python
report_filename = f"procurement/reports/reorder-{args.date}.md"
import os
os.makedirs(os.path.dirname(report_filename) or ".", exist_ok=True)
with open(report_filename, "w", encoding="utf-8") as f:
    f.write(report + "\n")
print(f"\n✅ Report saved to: {report_filename}")
sys.exit(0)
```

**Step 2: Verify**
```bash
cd /d/Github/shogun-os
python skills/procurement/reorder-alert-report/scripts/reorder_alerts.py --dry-run  # → exit 0, file written
ls procurement/reports/reorder-*.md  # → file exists
cat procurement/reports/reorder-*.md | head -5  # → content matches stdout
# cleanup:
rm -rf procurement/reports
```

**Step 3: Commit**
```bash
git add skills/procurement/reorder-alert-report/scripts/reorder_alerts.py
git commit -m "fix: implement report file write in reorder_alerts (PR #13 review)"
```

---

### Task 8: Implement inventory_valuation.py file write OR fix docstring ⚠️ [finding #7]

**Objective:** Docstring claims "saves report to procurement/reports/" but code only prints to stdout. Implement the write (preferred — matches `reorder_alerts` pattern).

**Files:**
- Modify: `skills/procurement/inventory-valuation-report/scripts/inventory_valuation.py:144-150`

**Step 1: Patch** — mirror Task 7's pattern:
```python
report = format_report(args.date, valuation, gl_balance)
print(report)

report_filename = f"procurement/reports/valuation-{args.date}.md"
import os
os.makedirs(os.path.dirname(report_filename) or ".", exist_ok=True)
with open(report_filename, "w", encoding="utf-8") as f:
    f.write(report + "\n")
print(f"\n✅ Report saved to: {report_filename}")
sys.exit(0)
```

**Step 2: Verify**
```bash
python skills/procurement/inventory-valuation-report/scripts/inventory_valuation.py --dry-run  # → file written
ls procurement/reports/valuation-*.md  # → exists
rm -rf procurement/reports
```

**Step 3: Commit**
```bash
git add skills/procurement/inventory-valuation-report/scripts/inventory_valuation.py
git commit -m "fix: implement report file write in inventory_valuation (PR #13 review)"
```

---

### Task 9: Mark accounting_bridge.py as scaffold/pending MCP ⚠️ [finding #8]

**Objective:** Make it impossible to mistake the stub bridge for a working integration. Update SKILL.md and add a clear module-level banner.

**Files:**
- Modify: `recipes/procurement/bridges/accounting_bridge.py` (module docstring)
- Modify: `skills/procurement/accounting-bridge-sync/SKILL.md` (if it exists — check path)

**Step 1: Update module docstring** in `accounting_bridge.py`:
```python
"""
Accounting Bridge — PROCUREMENT → FINANCE (SCAFFOLD / PENDING MCP INTEGRATION)

⚠️  STATUS: SCAFFOLD. Every acct_* function is a stub. No live accounting
   system is contacted. All flows are no-ops unless ENABLE_ACCOUNTING_SYNC=true,
   and even then they return hardcoded placeholder values (e.g. "STUB-BILL").

   To complete: replace _acct_list_purchase_bills / _acct_create_purchase_bill
   / _post_to_channels with live mcp_tool_call(...) invocations against the
   finance-manager profile's acct_* tools.

Links procurement events to finance-manager acct_* tools. All flows are
gated on ENABLE_ACCOUNTING_SYNC=true. When disabled, every function is a
no-op that returns a clear skip-reason message.
"""
```

**Step 2: Update the related SKILL.md** if one exists at `skills/procurement/accounting-bridge-sync/SKILL.md` — add a `> ⚠️ SCAFFOLD — pending MCP integration` callout at the top of the Description section.

**Step 3: Verify**
```bash
head -15 recipes/procurement/bridges/accounting_bridge.py  # → shows SCAFFOLD banner
```

**Step 4: Commit**
```bash
git add recipes/procurement/bridges/accounting_bridge.py
git commit -m "docs: mark accounting bridge as scaffold/pending MCP integration (PR #13 review)"
```

---

### Task 10: Switch finance report currency `$` → `RM` 💡 [finding #3]

**Objective:** All sample/budget data is MYR. Stop rendering reports as USD.

**Files:**
- Modify: `skills/finance/weekly-pulse-report/scripts/weekly_pulse.py:199-200`
- Modify: `skills/finance/monthly-board-report/scripts/monthly_board.py:243-244`
- Modify: `skills/finance/bva-variance-analysis/scripts/variance.py:105-106`

**Step 1: Patch all three** — identical change:
```python
# from:
def fmt_money(amount: float) -> str:
    return f"${amount:,.2f}"
# to:
def fmt_money(amount: float) -> str:
    return f"RM {amount:,.2f}"
```
Note: `variance.py` names it `format_money` — same change.

**Optional (preferred):** Make currency configurable via an env var so future non-MYR deployments don't need a code change:
```python
import os
_CURRENCY = os.environ.get("REPORT_CURRENCY", "RM")
def fmt_money(amount: float) -> str:
    return f"{_CURRENCY} {amount:,.2f}"
```
Recommend the env-var version — it's a 2-line change and future-proof.

**Step 2: Verify**
```bash
python skills/finance/weekly-pulse-report/scripts/weekly_pulse.py --dry-run 2>&1 | grep -i "RM\|\\\$" | head -3  # → shows "RM ..."
python skills/finance/monthly-board-report/scripts/monthly_board.py --dry-run 2>&1 | grep -i "RM\|\\\$" | head -3
python skills/finance/bva-variance-analysis/scripts/variance.py --dry-run 2>&1 | grep -i "RM\|\\\$" | head -3
```

**Step 3: Commit**
```bash
git add skills/finance/weekly-pulse-report/scripts/weekly_pulse.py skills/finance/monthly-board-report/scripts/monthly_board.py skills/finance/bva-variance-analysis/scripts/variance.py
git commit -m "fix: use RM currency in finance reports (was hardcoded \$) (PR #12 review)"
```

---

### Task 11: Align wire-crons.py prompt language with `deliver: "local"` 💡 [finding #9]

**Objective:** Several cron prompts say "post to #channel" / "summarise to the team channel" but `deliver: "local"` means output stays local and never reaches a channel. Fix the prompt language to match actual delivery.

**Files:**
- Modify: `scripts/wire-crons.py` (multiple prompt strings — see search output: lines ~59-61, 82-85, and the finance block ~129-165)

**Step 1: Audit all mismatches**
```bash
grep -n -E "post.*to.*channel|summarise.*to.*channel|post.*summary.*to" scripts/wire-crons.py
```
For each match, check if the corresponding job has `deliver: "local"`. If so, rewrite the prompt to say "produce a summary for local delivery" / "save the summary locally" instead of "post to channel".

**Step 2: Alternative — flip delivery to actually reach a channel.** If the intent really was channel delivery, change `deliver: "local"` to the appropriate channel target (e.g. `deliver: "slack:C0XXXXXXX"`). This is a larger change — see Decision Point.

**Decision Point — fix language vs fix delivery:** The reviewer flags the mismatch, not the mode. Safest first pass: fix the prompt language to match `local` delivery (Task 11 Step 1). If channel delivery is actually wanted, that's a follow-up PR with real Slack channel IDs.

**Step 3: Verify**
```bash
python scripts/wire-crons.py --dry-run  # → runs without error (if it has --dry-run; otherwise just python -c "import scripts.wire-crons" won't work — check for a syntax check)
python -m py_compile scripts/wire-crons.py  # → exit 0
```

**Step 4: Commit**
```bash
git add scripts/wire-crons.py
git commit -m "fix: align cron prompt language with local delivery mode (PR #13 review)"
```

---

### Task 12: Revert scope-creep backtick formatting in generate-profile.py 💡 [finding #4]

**Objective:** PR #12 changed unrelated `\\\`` → backtick formatting inside non-finance soul snippets (production-soul, quality-soul, maintenance-soul, warehouse-soul, etc.). Revert those non-finance edits.

**Files:**
- Modify: `scripts/generate-profile.py` (find the diff from PR #12 that touched non-finance snippets)

**Step 1: Identify the scope-creep**
```bash
git log --oneline -1 -- scripts/generate-profile.py  # find the commit
git show <commit> -- scripts/generate-profile.py | grep -E "^\+" | grep -v "finance" | head -40
```
Isolate the hunks that touched non-finance soul snippets.

**Step 2: Revert just those hunks** using `patch` tool or `git checkout -p` to selectively un-revert the finance-related changes while restoring the non-finance snippets to their pre-#12 state.

**Step 3: Verify**
```bash
git diff -- scripts/generate-profile.py  # → only finance-snippet changes remain
python scripts/generate-profile.py --help  # → still runs
```

**Step 4: Commit**
```bash
git add scripts/generate-profile.py
git commit -m "refactor: revert non-finance soul snippet formatting (scope creep) (PR #12 review)"
```

---

### Task 13: Remove committed `tsconfig.tsbuildinfo` 💡 [finding #14]

**Objective:** Generated build artifact committed though `.gitignore` already has `*.tsbuildinfo`. Remove from tracking.

**Files:**
- Untrack: `shogun-web/ui/tsconfig.tsbuildinfo`

**Step 1: Untrack (keep local file)**
```bash
git rm --cached shogun-web/ui/tsconfig.tsbuildinfo
```

**Step 2: Confirm `.gitignore` covers it**
```bash
grep "tsbuildinfo" .gitignore  # → *.tsbuildinfo (already present)
```

**Step 3: Verify**
```bash
git status -- shogun-web/ui/tsconfig.tsbuildinfo  # → not tracked
```

**Step 4: Commit**
```bash
git add .gitignore  # if any change (none expected — already there)
git commit -m "chore: untrack tsconfig.tsbuildinfo (PR #14 review)"
```

---

### ~~Task 14: Add tenant-boundary comment in auth.py~~ ✅ ALREADY SOLVED

**Status:** Finding #15 is already resolved in the uncommitted working tree. The comment `# Fallback: match across tenants (legacy / single-tenant setups)` is already present at `shogun-web/server/auth.py:869` (inside the `_resolve_sso_user` function, part of the in-flight SSO feature diff). No action needed.

---

## Final Verification

After all 14 tasks:

**Step 1: Re-run the reviewer's reproduction commands**
```bash
cd /d/Github/shogun-os
# #12 weekly_pulse bare-filename:
python skills/finance/weekly-pulse-report/scripts/weekly_pulse.py --dry-run --output report.md && rm -f report.md
# #12 currency check:
python skills/finance/weekly-pulse-report/scripts/weekly_pulse.py --dry-run 2>&1 | grep -c "RM"  # → >0
python skills/finance/monthly-board-report/scripts/monthly_board.py --dry-run 2>&1 | grep -c "RM"
python skills/finance/bva-variance-analysis/scripts/variance.py --dry-run 2>&1 | grep -c "RM"
# #13 report file writes:
python skills/procurement/reorder-alert-report/scripts/reorder_alerts.py --dry-run && ls procurement/reports/reorder-*.md
python skills/procurement/inventory-valuation-report/scripts/inventory_valuation.py --dry-run && ls procurement/reports/valuation-*.md
rm -rf procurement/reports
# #14 duplicate router:
grep -c "include_router(gateway.router" shogun-web/server/main.py  # → 1
# #14 admin first_login:
grep -n "first_login" shogun-web/server/database.py  # → True
# #14 tsbuildinfo untracked:
git ls-files shogun-web/ui/tsconfig.tsbuildinfo  # → (empty)
```

**Step 2: Build the portal**
```bash
cd shogun-web/ui && npx vite build
cd ..
python -m server.main  # start server, hit /api/health, confirm 200
```

**Step 3: Verify-install suite** (from AGENTS.md)
```bash
./scripts/verify-install.sh --quick
```

**Step 4: Push all amendment commits**
```bash
git push origin feat/Shogun-OS-design
```

**Step 5: Comment on the 3 PRs** (#12, #13, #14) with a link to the amendment commits and a per-finding checklist of what was addressed. Request re-review.

---

## Confirmed Decisions (from user)

1. **Login admin + demo button (Task 2):** ✅ **REMOVE entirely** — no auto-seed, no demo button. First-run admin created via `ensure_bootstrap_admin` CLI helper.
2. **Finance dashboard mock (Task 6):** ✅ **REMOVE entirely** — finance is live from QBO; `examples/finance-budget.json` fallback is dead code. Delete the `else:` branch, return empty-state when no QBO + no snapshot.
3. **wire-crons delivery (Task 11):** ✅ **Fix prompt language** to match `local` delivery. Channel delivery is a follow-up PR with real Slack channel IDs.
4. **3 PRs confirmed** — #12, #13, #14. No other PRs.

## Branch Structure (stacked PRs — important)

The 3 PRs are **stacked branches**, not one branch:

```
main (cccddee)
 └── PR #12  feat/finance-manager-profile  (010cdab + 7d4f24f + 54fa8f5)
      └── PR #13  feat/procurement-manager-profile  (948283a)
           └── PR #14  feat/Shogun-OS-design  (5d50a78 … ffc7b93 + 3 unpushed + 111 uncommitted)
```

PR #13 sits on top of #12. PR #14 sits on top of #13. They're not independent.

### Finding → PR branch mapping

| PR branch | Findings | Files |
|---|---|---|
| **#12** `feat/finance-manager-profile` | #1, #2, #3, #4 | `weekly_pulse.py`, `monthly_board.py`, `variance.py`, `dashboard.py`, `generate-profile.py` |
| **#13** `feat/procurement-manager-profile` | #5, #6, #7, #8, #9 | `main.py`, `reorder_alerts.py`, `inventory_valuation.py`, `accounting_bridge.py`, `wire-crons.py` |
| **#14** `feat/Shogun-OS-design` | #10, #11, #12*(dup of #5)*, #13, #14 | `database.py`, `Login.tsx`, `departments.py`, `main.py`, `tsconfig.tsbuildinfo` |

Finding #5 (dup `include_router`) appears in both #13 and #14 — fix on #13, carries forward on rebase.

### Workflow: stash → fix #12 → fix #13 → fix #14

```
Step 0: stash 111 uncommitted changes on feat/Shogun-OS-design
Step 1: checkout feat/finance-manager-profile     → fix #1-4  → commit → push
Step 2: checkout feat/procurement-manager-profile → rebase onto #12 → fix #5-9 → commit → push
Step 3: checkout feat/Shogun-OS-design            → rebase onto #13 → unstash → fix #10-14 → commit → push
```

---

## Execution Summary (when you say go)

- **14 tasks** (Task 14 already solved, removed from scope)
- **3 PRs** addressed: #12, #13, #14 (stacked branches)
- **3 commits** — one per PR branch, in stack order (#12 → #13 → #14)

### Step 0: Stash uncommitted work on PR #14
```bash
git stash push -u -m "PR #14 in-flight: SSO feature + dashboard + uncommitted fixes"
```

### Phase 1: PR #12 (feat/finance-manager-profile) — findings #1-4
- **Task 1** (#1): Fix weekly_pulse makedirs crash
- **Task 2** (#2): Remove finance-budget.json dead-code fallback from dashboard.py
- **Task 3** (#3): Currency `$`→`RM` in 3 finance scripts
- **Task 4** (#4): Revert non-finance soul snippet formatting in generate-profile.py
```bash
git checkout feat/finance-manager-profile
# ... apply Tasks 1-4, one commit per task or one combined commit
git push origin feat/finance-manager-profile
```

### Phase 2: PR #13 (feat/procurement-manager-profile) — findings #5-9
- **Task 5** (#5): Remove dup `include_router` in main.py
- **Task 6** (#6): Implement reorder_alerts file write
- **Task 7** (#7): Implement inventory_valuation file write
- **Task 8** (#8): Mark accounting_bridge as scaffold
- **Task 9** (#9): Fix wire-crons prompt language
```bash
git checkout feat/procurement-manager-profile
git rebase feat/finance-manager-profile  # pick up #12 fixes
# ... apply Tasks 5-9
git push origin feat/procurement-manager-profile --force-with-lease  # rebase rewrites history
```

### Phase 3: PR #14 (feat/Shogun-OS-design) — findings #10-14
- **Task 10** (#10): Remove auto-admin seed + demo button
- **Task 11** (#11): Gate brain demo seeding behind SEED_DEMO_BRAIN
- **Task 12** (#12, dup of #5): Already fixed in Phase 2 — verify after rebase
- **Task 13** (#13): Stop clobbering dept status
- **Task 14** (#14): Untrack tsconfig.tsbuildinfo
```bash
git checkout feat/Shogun-OS-design
git rebase feat/procurement-manager-profile  # pick up #13 fixes (incl. #5 dedup)
git stash pop  # restore in-flight SSO + dashboard work
# ... apply Tasks 10-14
git push origin feat/Shogun-OS-design --force-with-lease  # rebase rewrites history
```

### Per-task workflow (within each phase)
patch → run verify command → commit → next task

### Final pass
- `./scripts/verify-install.sh --quick`
- `cd shogun-web/ui && npx vite build`
- Comment on PRs #12, #13, #14 with per-finding checklist

---

## Verification Checklist (final pass)

- [ ] Task 1: `grep -c "include_router(gateway.router" shogun-web/server/main.py` → **1**
- [ ] Task 2: `grep "first_login" shogun-web/server/database.py` → **True**; Login.tsx demo button gated
- [ ] Task 3: deactivate a dept, re-init DB, status preserved
- [ ] Task 4: `SEED_DEMO_BRAIN` unset → no fake docs; flag set → docs in `demo/` subdir
- [ ] Task 5: `python weekly_pulse.py --dry-run --output report.md` → exit 0, file written
- [ ] Task 6: empty gbrain + no flag → empty-state, no fake RM; flag on → DEMO banner
- [ ] Task 7: `python reorder_alerts.py --dry-run` → `procurement/reports/reorder-*.md` exists
- [ ] Task 8: `python inventory_valuation.py --dry-run` → `procurement/reports/valuation-*.md` exists
- [ ] Task 9: `head -15 recipes/procurement/bridges/accounting_bridge.py` → shows SCAFFOLD banner
- [ ] Task 10: all 3 scripts print `RM ...` not `$`
- [ ] Task 11: `python -m py_compile scripts/wire-crons.py` → exit 0; no "post to channel" language with `deliver: local`
- [ ] Task 12: `git diff -- scripts/generate-profile.py` → only finance-snippet changes
- [ ] Task 13: `git ls-files shogun-web/ui/tsconfig.tsbuildinfo` → empty
- [ ] Final: `./scripts/verify-install.sh --quick` passes
- [ ] Final: `cd shogun-web/ui && npx vite build` passes
- [ ] Final: `git push origin feat/Shogun-OS-design` — push all amendment commits
- [ ] Final: comment on PRs #12, #13, #14 with per-finding checklist
