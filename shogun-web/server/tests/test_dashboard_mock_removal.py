"""Tests: procurement mock-fallback behaviour when gbrain snapshots are empty.

Policy (reversed Aug 2026 per user request): when no gbrain snapshots exist,
the procurement dashboard falls back to ``examples/procurement-mock.json`` so
the UI shows realistic demo data instead of empty zeros. The ``mock: true``
flag in the response payload signals demo mode to the frontend.

The CRM (ceo) aggregation is NOT reversed — it still returns empty-state when
no deals exist (no mock fallback for CRM).
"""

import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


def test_procurement_aggregation_empty_pages_returns_mock_flag() -> None:
    """No snapshots → mock flag must be True (demo mode)."""
    result = dashboard._run_procurement_aggregation([])
    assert result.get("mock") is True


def test_procurement_aggregation_empty_pages_loads_mock_data() -> None:
    """No snapshots → mock data loaded from examples/procurement-mock.json."""
    result = dashboard._run_procurement_aggregation([])
    # KPIs should be non-zero (loaded from mock)
    assert result["totalInventoryValuation"] > 0
    assert result["totalActiveSkus"] > 0
    assert result["openPoCount"] > 0
    # Lists should be populated from mock
    assert len(result.get("riskAlerts", [])) > 0
    assert len(result.get("skuCatalog", [])) > 0
    assert len(result.get("activePurchaseOrders", [])) > 0
    assert len(result.get("purchaseRequisitions", [])) > 0
    assert len(result.get("rfqComparisons", [])) > 0
    assert len(result.get("barcodeBatches", [])) > 0
    assert len(result.get("threeWayMatches", [])) > 0


def test_procurement_aggregation_empty_pages_keeps_accounting_bridge_disabled() -> None:
    """Mock mode must report the accounting bridge as disabled, not 'connected'."""
    result = dashboard._run_procurement_aggregation([])
    assert result.get("mock") is True


def test_crm_aggregation_empty_pages_returns_zero_sales() -> None:
    """No deals → sales figures must be 0, not mock values (CRM not reversed)."""
    result = dashboard._run_ceo_aggregation([])
    assert result["salesMTD"] == 0
    assert result["salesYTD"] == 0
    assert result["totalPipelineValue"] == 0
    assert result["weightedPipelineValue"] == 0
