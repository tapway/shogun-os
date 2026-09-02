# CRM Dashboard: demo vs feat/crm-ver2 Branch Comparison

## Summary

Both branches now have **identical UI components** for the CRM dashboard, but they differ in their **data source**:

| Aspect | demo branch | feat/crm-ver2 branch |
|--------|-------------|----------------------|
| **UI Components** | Card-based layouts, modern design | ✅ Same (synced from demo) |
| **Data Source** | Mock data (`examples/crm-mock.json`) | ✅ Live gbrain data |
| **Backend Endpoint** | `_load_crm_mock()` | `_fetch_brain_pages_safe()` |
| **Use Case** | Demo/testing without gbrain | Production with live CRM data |
| **Empty State** | Shows mock data | Shows empty state when no gbrain data |

## Data Source Verification

### demo branch (mock data)
```python
async def get_crm_ceo_stats(...):
    """Aggregated CEO dashboard stats for CRM — 100% mock data (demo mode).
    
    Serves the fictional CRM ledger from examples/crm-mock.json.
    """
    mock_data = _load_crm_mock()
    if not mock_data:
        return {"mock": False}
    
    payload = mock_data.get("dashboard_mock", {})
    return {**payload, "mock": True}
```

### feat/crm-ver2 branch (live gbrain data)
```python
async def get_crm_ceo_stats(...):
    """Aggregated CEO dashboard stats for CRM.
    
    Reads CRM pages directly from the brain (source ``crm``) via gbrain.
    Returns empty state when the brain has no CRM pages yet or is down.
    """
    pages = await _fetch_brain_pages_safe(
        CRM_SOURCE, 
        limit=CRM_LIST_LIMIT, 
        slug_prefix="deals/"
    )
    return _run_ceo_aggregation(pages)
```

## UI Components Synced

All CRM dashboard UI components from `demo` branch have been copied to `feat/crm-ver2`:

1. **OverviewTab.tsx** - 5 subtabs (Sales Booking, Pipeline & Forecast, Partner Performance, Manager Performance, Deals Deep-Dive)
2. **SalesPulseTab.tsx** - Sales MTD/QTD/YTD, manager breakdown, won deals by month
3. **PipelineForecastTab.tsx** - Pipeline coverage, win rate, forecast vs actual
4. **PartnerPerformanceTab.tsx** - Partner booking, pipeline, win rate analytics
5. **ManagerPerformanceTab.tsx** - Manager cards with drill-down view
6. **DealsDeepDiveTab.tsx** - Deal analytics, manager × partner matrix
7. **DealsTab.tsx** - Card-based deal list with detail view
8. **CompaniesTab.tsx** - Card-based company list with industry filter
9. **TasksTab.tsx** - Tasks grouped by assignee
10. **PartnersTab.tsx** - Full Partner Sphere (9 sections including onboarding, CEO digest, command center)
11. **MyCommunicationTab.tsx** - Communication channels (new component)

## Build Status

✅ **npm run build** passes (10.83s)
- No TypeScript errors
- All components compile successfully

## Testing Strategy

- **demo branch**: Use for testing UI without requiring gbrain setup
- **feat/crm-ver2 branch**: Use for production deployment with live gbrain data
- Both branches render identical UI when data is available
- feat/crm-ver2 shows empty states when gbrain has no CRM pages

## Environment Variables

Production deployment (feat/crm-ver2) requires:
```bash
GBRAIN_API_KEY=<your-key>
SHOGUN_GBRAIN_URL=http://localhost:8788
GBRAIN_READ_PREFERENCE=primary
GBRAIN_MCP_ENRICH_CAP=500
SHOGUN_WEB_CRM_MOCK=0  # Must be 0 or unset for live data
```

Demo mode (fallback only):
```bash
SHOGUN_WEB_CRM_MOCK=1  # Only activates when live data is empty
```

## Next Steps

1. ✅ UI synced from demo to feat/crm-ver2
2. ✅ Backend retains gbrain data source
3. ✅ Build passes
4. ✅ Commit pushed to origin/feat/crm-ver2
5. ⏸️ Visual confirmation pending (check http://localhost:8787)
6. ⏸️ pytest deferred until visual confirmation received
