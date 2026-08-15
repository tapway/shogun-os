"""Regression tests: no fabricated mock data when gbrain snapshots are empty.

PR #12 removed the finance `examples/finance-budget.json` fallback (CH Lim
review: fake RM figures shown as real financials). The same fabricated-data
fallback is still live in the procurement and CRM aggregations on main:

- ``_run_procurement_aggregation`` loads ``examples/procurement-mock.json``
  and serves fake inventory valuation (MYR 1,850,000), fake SKU counts, fake
  POs, etc. when no gbrain snapshot exists.
- ``_run_ceo_aggregation`` returns the full ``examples/crm-mock.json``
  wholesale when there are no deals.

These must behave like the finance dashboard: empty-state payloads (zeros +
empty lists) when no real data is present, so the UI shows "no data yet"
instead of fabricated figures.
"""

import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


def test_procurement_aggregation_empty_pages_returns_zero_valuation() -> None:
    """No snapshots → total inventory valuation must be 0.0, not a mock MYR figure."""
    result = dashboard._run_procurement_aggregation([])
    assert result["totalInventoryValuation"] == 0.0
    assert result["totalActiveSkus"] == 0.0
    assert result["openPoCount"] == 0.0
    assert result["procurementSpendMtd"] == 0.0


def test_procurement_aggregation_empty_pages_returns_empty_lists() -> None:
    """No snapshots → all tab lists must be empty, none populated from mock."""
    result = dashboard._run_procurement_aggregation([])
    for key in (
        "riskAlerts", "valuationByCategory", "spendVsBudgetTrend",
        "skuCatalog", "deadSlowStock", "warehouseBinCapacity",
        "stockMovements", "poPipeline", "activePurchaseOrders",
        "executiveApprovalQueue", "vendorScorecard",
        "vendorSpendConcentration", "poBillConversionQueue",
        "glValuationReconciliation",
    ):
        assert result.get(key) in ([],), f"{key} should be empty, got {result.get(key)!r}"


def test_procurement_aggregation_empty_pages_keeps_accounting_bridge_disabled() -> None:
    """Empty state must report the accounting bridge as disabled, not 'connected'."""
    result = dashboard._run_procurement_aggregation([])
    bridge = result.get("accountingBridge", {})
    assert bridge.get("connected") is False
    assert bridge.get("enabled") is False


def test_crm_aggregation_empty_pages_returns_zero_sales() -> None:
    """No deals → sales figures must be 0, not mock values."""
    result = dashboard._run_ceo_aggregation([])
    assert result["salesMTD"] == 0
    assert result["salesYTD"] == 0
    assert result["totalPipelineValue"] == 0
    assert result["weightedPipelineValue"] == 0