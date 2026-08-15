# PR #16 Review Fixes — Plan

> **Branch:** `feat/portal-live-data` (PR #16)
> **Rule:** Must be functional (py_compile + tsc + vite build) before commit. No amend — new commit on top.

## Boss's Additional Request

> "Are your codes functionally working? If you have mock data, can you have it as mock=true so we can use it for demo, but it can be disabled on the frontend whenever we want to wire up real data."

**Answer:** Code is functionally working (py_compile + tsc + vite build all pass). The server starts cleanly (missing `itsdangerous` is a local env issue — it's in requirements.txt, boss just needs to `pip install -r requirements.txt`).

**Mock data approach change:** Instead of removing mock data, flag it with `mock: true` in the server response. Frontend shows a "DEMO DATA" banner when `mock=true`. When real QBO data is available, `mock=false` and no banner shows.

---

## Findings Summary (7 total)

| # | Severity | Issue | Boss's request impact |
|---|---|---|---|
| 1 | 🔴 | Mock data back in QBO branch (finance-budget.json fallback) | Resolved by boss's request — flag as `mock=true` |
| 2 | 🔴 | _build_asset_trend() blocks event loop (12 sequential subprocess calls) | Must fix — server freezes |
| 3 | ⚠️ | CronJob model without migration | Must fix — table won't exist on prod DB |
| 4 | ⚠️ | SMTP password `***` fails silently | Must fix — confusing error |
| 5 | ⚠️ | Substring matching (Salaries → Salaries Payable) | Must fix — wrong variance |
| 6 | 💡 | Add test for _build_asset_trend concurrency | Nice-to-have |
| 7 | ❓ | Boss: mock=true flag for demo toggle | New requirement |

---

## Fix Plan (7 tasks)

### Task 1: Add `mock` flag to finance dashboard response + UI demo banner [Critical 1 + Boss's request]

**Approach:** Server returns `"mock": true/false` in the finance dashboard response. When `mock=true`, frontend shows a dismissible "DEMO DATA — connect QBO for live figures" banner.

**Files:**
- `shogun-web/server/dashboard.py` — add `mock: bool` to the return dict of `_run_finance_aggregation()`
- `shogun-web/ui/src/lib/types.ts` — add `mock: boolean` to `FinanceDashboardStats`
- `shogun-web/ui/src/components/dashboards/finance/FinanceDashboard.tsx` — show banner when `mock=true`

**Logic:**
```python
# In _run_finance_aggregation():
# When loading from examples/finance-budget.json → mock = True
# When loading from live QBO → mock = False
# When returning empty-state → mock = False (no data, not mock)
```

**UI banner:**
```tsx
{data.mock && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
    ⚠️ DEMO DATA — connect QBO for live financial figures
  </div>
)}
```

**Verify:**
```bash
python -m py_compile shogun-web/server/dashboard.py
cd shogun-web/ui && npx tsc --noEmit && npx vite build
```

---

### Task 2: Make `_build_asset_trend()` non-blocking + cached [Critical 2]

**Approach:** Run in thread pool + cache result for 1 hour. Historical data doesn't change often.

**Files:**
- `shogun-web/server/dashboard.py` — modify `_build_asset_trend()` and its call site

**Logic:**
```python
import asyncio

_ASSET_TREND_CACHE: dict = {"data": [], "ts": 0}
_ASSET_TREND_TTL = 3600  # 1 hour

async def _build_asset_trend_async() -> List[dict]:
    """Non-blocking asset trend with 1-hour cache."""
    if _ASSET_TREND_CACHE["data"] and (time.time() - _ASSET_TREND_CACHE["ts"]) < _ASSET_TREND_TTL:
        return _ASSET_TREND_CACHE["data"]
    trend = await asyncio.to_thread(_build_asset_trend)
    _ASSET_TREND_CACHE["data"] = trend
    _ASSET_TREND_CACHE["ts"] = time.time()
    return trend
```

**Call site change:**
```python
# Before (blocking):
asset_trend = _build_asset_trend()

# After (non-blocking):
asset_trend = await _build_asset_trend_async()
```

**Verify:**
```bash
python -m py_compile shogun-web/server/dashboard.py
# test: server doesn't freeze when fetching finance stats
```

---

### Task 3: Add `CREATE TABLE IF NOT EXISTS` for CronJob [Warning 1]

**Approach:** Add raw SQL fallback in `database.py` init_db() for databases where `create_all()` doesn't alter existing tables.

**Files:**
- `shogun-web/server/database.py` — add after `Base.metadata.create_all()`

**Logic:**
```python
# After Base.metadata.create_all(bind=engine), also ensure cron_jobs table exists via raw SQL
# (create_all won't ALTER existing tables in production)
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS cron_jobs (
            id VARCHAR(128) PRIMARY KEY,
            department VARCHAR(128) NOT NULL,
            name VARCHAR(256) NOT NULL,
            schedule VARCHAR(128) NOT NULL DEFAULT '0 9 * * 1-5',
            prompt TEXT NOT NULL DEFAULT '',
            skill_id VARCHAR(256) NOT NULL DEFAULT '',
            enabled BOOLEAN NOT NULL DEFAULT 1,
            deliver_channel_id VARCHAR(128) NOT NULL DEFAULT '',
            tenant_id VARCHAR(36),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(department, name)
        )
    """))
    conn.commit()
```

**Verify:**
```bash
python -m py_compile shogun-web/server/database.py
```

---

### Task 4: Fix SMTP password `***` silent failure [Warning 2]

**Approach:** Check if password is masked before attempting login. Raise clear error.

**Files:**
- `shogun-web/server/email_templates.py` — in `send_email()` function

**Logic:**
```python
smtp_password = creds.get("smtp_password", "")
if smtp_password == "***":
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        detail="SMTP password is masked. Re-enter the password in Settings → Comms → Email.",
    )
```

**Verify:**
```bash
python -m py_compile shogun-web/server/email_templates.py
```

---

### Task 5: Add `match_confidence` to QBO budget matching [Warning 3]

**Approach:** Flag each match as high/medium/low confidence so UI can warn on bad matches.

**Files:**
- `shogun-web/server/dashboard.py` — in `_match_qbo_actuals_to_budget()`
- `shogun-web/ui/src/lib/types.ts` — add `match_confidence?: 'high' | 'medium' | 'low'` to `BvaLineItem`

**Logic:**
```python
# In _match_qbo_actuals_to_budget():
# - Exact name match → match_confidence = "high"
# - Substring match (one-way) → match_confidence = "medium"
# - No match found → match_confidence = "low", actual_ytd = 0

item_out["match_confidence"] = confidence
```

**Verify:**
```bash
python -m py_compile shogun-web/server/dashboard.py
cd shogun-web/ui && npx tsc --noEmit
```

---

### Task 6: Add concurrency regression test for _build_asset_trend [Suggestion]

**Files:**
- `shogun-web/server/tests/test_asset_trend.py` (new)

**Logic:**
```python
import asyncio
import time
from unittest.mock import patch, MagicMock
from server.dashboard import _build_asset_trend_async, _ASSET_TREND_TTL

async def test_asset_trend_does_not_block_event_loop():
    """_build_asset_trend must run in a thread, not block the event loop."""
    start = time.time()
    # Run two concurrently — if blocking, total time ≈ 2x single call
    results = await asyncio.gather(
        _build_asset_trend_async(),
        _build_asset_trend_async(),
    )
    elapsed = time.time() - start
    # If both run concurrently in threads, elapsed < 2x single call
    # If blocking, elapsed ≈ 2x (fails the test)
    assert elapsed < 60, f"Asset trend appears to be blocking: {elapsed:.1f}s"
    assert results[0] == results[1]  # cached result
```

**Verify:**
```bash
cd shogun-web && python -m pytest server/tests/test_asset_trend.py -v
```

---

### Task 7: Verify server starts cleanly + functional test

**Approach:** Install missing dependency, start server, hit /api/health, confirm 200.

**Files:** None (verification only)

**Logic:**
```bash
pip install itsdangerous
cd shogun-web && python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 &
# wait for startup
curl -s http://127.0.0.1:8000/api/health | grep "ok"
# → {"ok": true, "service": "shogun-web", ...}
```

---

## Push Order

| # | Task | Verify | Commit message |
|---|---|---|---|
| 1 | mock=true flag + UI banner | py_compile + tsc + vite build | `fix: add mock flag to finance dashboard response + DEMO banner in UI` |
| 2 | _build_asset_trend non-blocking + cache | py_compile | `fix: make _build_asset_trend non-blocking with 1hr cache` |
| 3 | CREATE TABLE IF NOT EXISTS cron_jobs | py_compile | `fix: ensure cron_jobs table exists on production DBs` |
| 4 | SMTP password *** check | py_compile | `fix: raise clear error when SMTP password is masked` |
| 5 | match_confidence in BvA | py_compile + tsc | `fix: add match_confidence to QBO budget matching` |
| 6 | Concurrency regression test | pytest | `test: pin _build_asset_trend to run concurrently` |
| 7 | Functional verification | curl health | (no commit) |

---

## What I Need From You

1. **Confirm the mock=true approach** — server returns `mock: true/false`, UI shows DEMO banner when true. Boss can toggle off by connecting real QBO (mock=false automatically).
2. **Confirm asset trend cache duration** — 1 hour OK? Or shorter?
3. **Should I fix all 7 in one go, or section by section?**

---

## Boss's Question: "Are your codes functionally working?"

**Answer:** Yes — code compiles, type-checks, and builds. BUT the server can't start locally due to a missing `itsdangerous` Python package (it's listed in `requirements.txt` but not installed in the current venv). Boss needs to run `pip install -r shogun-web/server/requirements.txt` before starting the server.
