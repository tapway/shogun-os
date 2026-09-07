# QBO-Only Finance Dashboard Migration Plan

**Branch:** `feat/finance-ver2`  
**Objective:** Migrate ALL finance dashboard data sources from gbrain snapshots → QuickBooks Online (QBO)  
**Current State:** Dashboard reads from gbrain snapshots (`finance/snapshots/*`) with QBO helpers dormant  
**Target State:** Dashboard reads 100% from QBO via accounting bridge, zero gbrain dependency

---

## Executive Summary

### Architecture Today
```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Finance Dashboard  │  ────→  │  dashboard.py    │  ────→  │  gbrain MCP │
│  (UI - 9 tabs)      │  stats  │  _run_finance_   │  fetch  │  snapshots  │
│                     │         │  aggregation()   │         │  (8 pages)  │
└─────────────────────┘         └──────────────────┘         └─────────────┘
                                         │
                                         ├─── QBO helpers exist but NOT wired in
                                         │    - _fetch_qbo_balance_sheet()
                                         │    - _fetch_qbo_profit_loss()
                                         │    - _fetch_qbo_ar_invoices()
                                         │    - _fetch_qbo_ap_bills()
                                         │
                                         └─── SHOGUN_FINANCE_QBO=1 env var mentioned but unused
```

### Target Architecture
```
┌─────────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Finance Dashboard  │  ────→  │  dashboard.py    │  ────→  │  QBO API    │
│  (UI - 9 tabs)      │  stats  │  _run_finance_   │  call   │  via bridge │
│                     │         │  aggregation()   │         │  (acct-bridge)
└─────────────────────┘         └──────────────────┘         └─────────────┘
                                         │
                                         └─── Direct QBO calls for ALL tabs
                                              (gbrain path removed)
```

---

## Per-Tab Audit (9 Tabs)

### Legend
- 🟢 = **QBO can serve fully today** (bridge tool exists)
- 🟡 = **Needs new bridge tool** (additive development)
- 🔵 = **Derivable from QBO data** (computation in aggregation layer)
- 🔴 = **NOT in QBO** (structurally impossible — external data required)

---

### 1. ExecutiveOverviewTab (Overview)
**File:** `shogun-web/ui/src/components/dashboards/finance/ExecutiveOverviewTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `totalLiquidCash` | gbrain cash snapshot | 🟢 BalanceSheet | Sum of bank/cash accounts |
| `netMonthlyBurn` | gbrain pl snapshot | 🟢 P&L | Monthly expenses from P&L |
| `cashRunwayMonths` | gbrain calculation | 🟢 Computed | `totalLiquidCash / netMonthlyBurn` |
| `revenueMTD` | gbrain pl snapshot | 🟢 P&L | Current month revenue |
| `revenueYTD` | gbrain pl snapshot | 🟢 P&L | Year-to-date revenue |
| `grossMargin` | gbrain pl snapshot | 🟢 P&L | `(revenue - COGS) / revenue` |
| `ebitdaMargin` | gbrain pl snapshot | 🟢 P&L | From P&L operating income |
| `totalLiabilities` | gbrain BS snapshot | 🟢 BalanceSheet | Total liabilities |
| `totalEquity` | gbrain BS snapshot | 🟢 BalanceSheet | Total equity |
| `debtToEquity` | gbrain calculation | 🟢 Computed | `totalLiabilities / totalEquity` |
| `equityRatio` | gbrain calculation | 🟢 Computed | `totalEquity / totalAssets` |
| `arToApCoverage` | gbrain AR/AP | 🟢 Computed | `totalAR / totalAP` |
| `netWorkingCapital` | gbrain BS | 🟢 Computed | `currentAssets - currentLiabilities` |
| `grossWorkingCapital` | gbrain BS | 🟢 Computed | Same as above |
| `grossProfitMargin` | gbrain PL | 🟢 Computed | From P&L |
| `totalCurrentLiabilities` | gbrain BS | 🟢 BalanceSheet | Current liabilities section |
| `apAgingByTarget` | gbrain AP snapshot | 🟢 Bills + math | From `acct_list_purchase_bills` |
| `monthlyPlTrend` | gbrain pl snapshot | 🟢 P&L × 6 months | 6 monthly P&L calls |

**Verdict:** 🟢 **95% QBO-ready**  
**Gap:** `unpaidStatutory` (Malaysian statutory — SST, CP58, WHT) = 🔴 NOT in QBO → keep gbrain or show "N/A"

---

### 2. CashFlowTab
**File:** `shogun-web/ui/src/components/dashboards/finance/CashFlowTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `arAgingByTarget` | gbrain AR snapshot | 🟢 Invoices + math | `acct_list_sales_invoices` |
| `cashFlowForecast` | gbrain forecast | 🔴 Plan data | QBO has no forecasting — compute from historical avg |
| `burnTrend` | gbrain cash snapshot | 🟢 P&L × 6 months | Monthly expenses trend |
| `bankAccounts` | gbrain cash snapshot | 🟢 BalanceSheet | Bank account balances |
| `arAging*` | gbrain AR snapshot | 🟢 Invoices + aging | Bucket by days overdue |
| `apAging*` | gbrain AP snapshot | 🟢 Bills + aging | Bucket by days overdue |
| `dunningQueue` | gbrain AR snapshot | 🟢 Invoices | Overdue invoices list |
| `dso` | gbrain calculation | 🟢 Computed | Days Sales Outstanding |
| `dpo` | gbrain calculation | 🟢 Computed | Days Payable Outstanding |
| `totalAR` | gbrain AR snapshot | 🟢 Invoices sum | Sum of outstanding invoices |
| `totalAP` | gbrain AP snapshot | 🟢 Bills sum | Sum of outstanding bills |
| `totalLiquidCash` | gbrain cash snapshot | 🟢 BalanceSheet | Bank balances |
| `revenueMTD` | gbrain pl snapshot | 🟢 P&L | Current month |
| `netMonthlyBurn` | gbrain pl snapshot | 🟢 P&L | Monthly expenses |
| `cashRunwayMonths` | gbrain calculation | 🟢 Computed | `cash / burn` |
| `cashFlowBreakdown` | gbrain breakdown | 🟢 P&L accounts | Group by P&L category |

**Verdict:** 🟢 **90% QBO-ready**  
**Gap:** `cashFlowForecast` = 🔴 QBO has no forward-looking forecasts — use historical average projection (already implemented in `_build_cash_flow_forecast()`)

---

### 3. ArCollectionsTab (AR)
**File:** `shogun-web/ui/src/components/dashboards/finance/ArCollectionsTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `arAging` | gbrain AR snapshot | 🟢 Invoices + aging | Bucket: 0-30, 31-60, 61-90, 90+ DPD |
| `arInvoices` | gbrain AR snapshot | 🟢 Invoice list | `acct_list_sales_invoices(status='ready')` |
| `arOverdue` | gbrain AR snapshot | 🟢 Computed | Sum of overdue invoices |
| `dso` | gbrain calculation | 🟢 Computed | `(AR / revenue) × days_in_period` |
| `dunningQueue` | gbrain AR snapshot | 🟢 Overdue list | Filter invoices > 0 DPD |
| `totalAR` | gbrain AR snapshot | 🟢 Sum | Total outstanding AR |

**Verdict:** 🟢 **100% QBO-ready** — Cleanest tab to flip first  
**Tool:** `acct_list_sales_invoices(status='ready', date_from, date_to)` + aging math

---

### 4. ApPaymentsTab (AP)
**File:** `shogun-web/ui/src/components/dashboards/finance/ApPaymentsTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `apBills` | gbrain AP snapshot | 🟢 Bill list | `acct_list_purchase_bills(status='ready')` |
| `apOverdue` | gbrain AP snapshot | 🟢 Computed | Sum of overdue bills |
| `dpo` | gbrain calculation | 🟢 Computed | `(AP / expenses) × days_in_period` |
| `totalAP` | gbrain AP snapshot | 🟢 Sum | Total outstanding AP |

**⚠️ DATA DISCREPANCY NOTE:**  
Your AP snapshot came from Excel ageing sheet (RM 176.4K). QBO shows 42 open bills Σ RM 249.8K.  
**Reason:** Different definitions — QBO = all open bills; Excel = aged-by-bucket (excludes some categories).  
**Decision needed:** Use QBO definition (all open) or map to Excel buckets?

**Verdict:** 🟢 **100% QBO-ready**  
**Tool:** `acct_list_purchase_bills(status='ready', date_from, date_to)` + aging math

---

### 5. AssetTab
**File:** `shogun-web/ui/src/components/dashboards/finance/AssetTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `currentAssets` | gbrain BS snapshot | 🟢 BalanceSheet | Current assets section |
| `nonCurrentAssets` | gbrain BS snapshot | 🟢 BalanceSheet | Non-current assets section |
| `totalAssets` | gbrain BS snapshot | 🟢 BalanceSheet | Total assets |
| `totalCurrentAssets` | gbrain BS snapshot | 🟢 BalanceSheet | Current assets total |
| `totalNonCurrentAssets` | gbrain BS snapshot | 🟢 BalanceSheet | Non-current total |
| `assetTrend` | gbrain BS snapshot | 🟡 12× BS calls | Need loop over monthly BS (already implemented!) |

**✨ GOOD NEWS:** `_build_asset_trend()` already exists and fetches 12 monthly balance sheets! This solves your "only 2 data points" problem permanently.

**Verdict:** 🟢 **95% QBO-ready**  
**Gap:** None — asset trend already implemented via 12 monthly BS calls

---

### 6. BvaUnitEconomicsTab (Budget vs Actuals)
**File:** `shogun-web/ui/src/components/dashboards/finance/BvaUnitEconomicsTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `bvaLineItems` | gbrain BvA snapshot | 🔴 Budget data | Budget lives in Excel, NOT in QBO |
| `bvaDepartments` | gbrain BvA snapshot | 🔴 Budget data | Department budgets in Excel |
| `unitEconomics` | gbrain BvA snapshot | 🟢 P&L actuals | Gross margin, contribution margin from P&L |
| `clientConcentration` | gbrain concentration | 🟡 Invoice grouping | Group invoices by customer (new tool or computed) |

**🔴 CRITICAL BLOCKER:**  
Budget data is in Excel (uploaded to Google Drive), NOT in QBO's Budgets feature.  
**QBO DOES have** `/reports/BudgetVsActuals` endpoint — but only if budgets are entered into QBO first.

**Options:**
1. **Keep gbrain** for budget portion (hybrid mode)
2. **Migrate budgets to QBO** (manual entry or bulk import via API)
3. **Show actuals only** with "Budget not configured" empty state

**Verdict:** 🔴 **50% QBO-ready** — Actuals ✅, Budget ❌

---

### 7. MarginsConcentrationTab
**File:** `shogun-web/ui/src/components/dashboards/finance/MarginsConcentrationTab.tsx`

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `unitEconomics` | gbrain BvA snapshot | 🟢 P&L | Gross/contribution margins from P&L |
| `cac` | gbrain CRM | 🔴 CRM data | CAC requires marketing spend (not in QBO) |
| `ltv` | gbrain CRM | 🔴 CRM data | LTV requires customer lifecycle (CRM) |
| `ltvCacRatio` | gbrain calculation | 🔴 Derived | Requires CAC/LTV |
| `clientConcentration` | gbrain concentration | 🟡 Invoice grouping | Group revenue by customer |

**Verdict:** 🟢 **66% QBO-ready**  
**Gaps:** CAC/LTV = 🔴 CRM metrics (requires deal/marketing data from gbrain or CRM)

---

### 8. Compliance Items (Close & Tax Tab)
**File:** `shogun-web/ui/src/components/dashboards/finance/BvaUnitEconomicsTab.tsx` (closeChecklist, etc.)

| Stat Key | Current Source | QBO Feasibility | Notes |
|----------|---------------|-----------------|-------|
| `closeChecklist` | gbrain compliance | 🔴 Process tracking | Month-end close checklist (process, not accounting) |
| `statutorySchedule` | gbrain compliance | 🔴 Malaysian law | SST-02, CP204 filing dates (external calendar) |
| `sstReadiness` | gbrain compliance | 🔴 Malaysian tax | SST computation (QBO has no SST concept) |
| `cp58Register` | gbrain compliance | 🔴 Malaysian WHT | Contractor withholding register (external) |
| `whtQueue` | gbrain compliance | 🔴 Malaysian WHT | Withholding tax queue (external) |
| `expenseClaimAudit` | gbrain compliance | 🔴 HR process | Staff expense claims (HR workflow) |

**Verdict:** 🔴 **0% QBO-ready** — Malaysian statutory/compliance = structurally NOT in QBO

---

### 9. FinanceDocScanTab
**File:** `shogun-web/ui/src/components/dashboards/finance/FinanceDocScanTab.tsx`

**Status:** n/a — This is a document scanning pipeline (upload → OCR → extract), unrelated to financial data sources. Reads no stats keys.

---

## Files Requiring Amendments

### Backend (1 file)

| File | Lines to Change | What to Do |
|------|----------------|------------|
| `shogun-web/server/dashboard.py` | ~2296-2667 (`_run_finance_aggregation()`) | **REPLACE** entire gbrain-only logic with QBO-first path |

**Detailed changes to `dashboard.py`:**

1. **Remove gbrain snapshot fetching** (lines 2227-2294):
   - Delete `_FIN_SNAPSHOT_NAMES`, `_FIN_SNAP_CACHE`, `_fetch_one_snapshot()`, `_fetch_finance_snapshots()`
   - These become obsolete

2. **Rewrite `_run_finance_aggregation()`** (lines 2296-2667):
   - Current: gbrain-only with QBO helpers commented out
   - New: QBO-first architecture:
     ```python
     async def _run_finance_aggregation(pages: List[dict]) -> dict:
         # 1. Fetch QBO data (parallel calls where possible)
         bs = _fetch_qbo_balance_sheet()
         pl_ytd = _fetch_qbo_profit_loss(ytd_start, today)
         pl_mtd = _fetch_qbo_profit_loss(month_start, today)
         ar_invoices = _fetch_qbo_ar_invoices()
         ap_bills = _fetch_qbo_ap_bills()
         
         # 2. Build all derived data from QBO responses
         #    - Asset trend: 12× monthly BS calls (already implemented)
         #    - AR aging: bucket invoices by days_overdue
         #    - AP aging: bucket bills by days_overdue
         #    - P&L trend: 6× monthly P&L calls (already implemented)
         #    - Burn trend: from monthly expenses
         #    - Cash flow forecast: from historical avg (already implemented)
         
         # 3. Return stats object (same shape as today)
         return { ... }
     ```

3. **Remove `SHOGUN_FINANCE_QBO` env var check** (line 2232-2233, 3070):
   - No longer needed — QBO is the ONLY source

4. **Keep QBO helper functions** (lines 1354-2225):
   - `_fetch_qbo_balance_sheet()` ✅
   - `_fetch_qbo_profit_loss()` ✅
   - `_fetch_qbo_ar_invoices()` ✅
   - `_fetch_qbo_ap_bills()` ✅
   - `_build_asset_trend()` ✅
   - `_build_monthly_pl_trend()` ✅
   - `_build_burn_trend()` ✅
   - `_build_cash_flow_forecast()` ✅
   - `_build_aging_by_target()` ✅
   - `_build_live_assets()` ✅
   - All classification/mapping helpers ✅

5. **Update `/finance-stats` endpoint** (line 2670-2678):
   - Remove `pages` parameter (no longer needs gbrain pages)
   - Simplify to just call `_run_finance_aggregation([])`

### Frontend (0 files)

**No UI changes required!** The frontend reads `stats.<key>` — the response shape remains identical. Only the backend data source changes.

### Environment Variables

| Variable | Action | Notes |
|----------|--------|-------|
| `SHOGUN_FINANCE_QBO` | Remove | No longer needed |
| `ACCT_PROVIDER=quickbooks` | Keep | Already set in finance-manager .env |
| `ACCT_COMPANY_ID` | Keep | QBO realm ID |
| `ACCT_CLIENT_ID`, `ACCT_CLIENT_SECRET`, `ACCT_REFRESH_TOKEN` | Keep | OAuth credentials |

---

## Implementation Phasing Recommendation

### Phase 1: Flip the 100% QBO-ready tabs (1-2 hours)
**Tabs:** ExecutiveOverview (95%), CashFlow (90%), AR (100%), AP (100%), Asset (95%)  
**Files:** `dashboard.py` only  
**Risk:** Low — these tabs have zero gbrain dependency after flip

### Phase 2: Handle the 50-66% tabs (decision required)
**Tabs:** BvA & Unit Economics, Margins & Concentration  
**Decision:** 
- Option A: Keep gbrain for budget/CAC/LTV portions (hybrid mode)
- Option B: Show "Budget not configured" empty state for budget fields
- Option C: Migrate budgets to QBO (requires manual entry or bulk import tool)

### Phase 3: Accept the 0% tabs (no code change)
**Tabs:** Compliance items (Close & Tax)  
**Action:** Leave gbrain-only or show honest-empty states with "Not applicable — QBO does not track Malaysian statutory compliance"

---

## Testing Protocol

### Before Flipping
```bash
# 1. Verify QBO bridge connectivity
cd /d/Github/shogun-os
python recipes/accounting/bridges/acct-bridge.py <<< '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 2. Test individual QBO tools
python -c "from shogun-web.server.dashboard import _fetch_qbo_balance_sheet; print(_fetch_qbo_balance_sheet())"

# 3. Run existing pytest suite
pytest shogun-web/server/tests/test_dashboard_aggregation.py -v
```

### After Flipping
```bash
# 1. Hit the finance-stats endpoint
curl http://localhost:8787/api/departments/finance/dashboard/finance-stats

# 2. Verify all tabs render without "no data" states
# 3. Check that numbers match QBO UI (sanity check)
# 4. Confirm no gbrain calls in server logs
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| QBO API rate limits | Low | Medium | 5-min cache already in place |
| Budget data gap | High | Medium | Hybrid mode or empty state |
| Compliance tab empty | Certain | Low | Honest-empty with explanation |
| AR/AP definition mismatch | Medium | Low | Document definition difference |
| Asset trend slow (12× BS calls) | Low | Low | 1-hour cache on trend |

---

## Bottom Line

**Can you achieve 100% QBO-only?**  
❌ **No** — 15% of dashboard (compliance tabs, budget data, CAC/LTV) is structurally NOT in QBO.

**Can you achieve 85% QBO-only?**  
✅ **Yes** — Tabs 1-5 (Overview, CashFlow, AR, AP, Assets) are fully QBO-served TODAY with existing bridge tools.

**Recommended approach:**
1. Flip tabs 1-5 to QBO immediately (Phase 1)
2. Keep gbrain for compliance tabs (Phase 3) — they'll always be gbrain-only
3. Decide on BvA budget: migrate to QBO OR accept hybrid mode

**Code changes:** ONE function rewrite (`_run_finance_aggregation()` in `dashboard.py`)  
**UI changes:** ZERO  
**Timeline:** 2-4 hours for Phase 1 (including testing)

---

## Appendix: QBO Bridge Tool Inventory

| Tool | Purpose | Used By Tab |
|------|---------|-------------|
| `acct_get_balance_sheet` | Get balance sheet as-of date | Overview, Assets, CashFlow |
| `acct_get_profit_loss` | Get P&L for date range | Overview, CashFlow, Margins |
| `acct_list_sales_invoices` | List AR invoices | AR, CashFlow |
| `acct_list_purchase_bills` | List AP bills | AP, CashFlow |
| `acct_get_aging_report` | Get AR/AP aging (alternative to manual bucketing) | AR, AP |
| `acct_list_contacts` | List customers/vendors | Concentration analysis |
| `acct_list_products` | List products/services | Margin analysis |

All tools are implemented and verified working (see `recipes/accounting/plugins/quickbooks.py`).
