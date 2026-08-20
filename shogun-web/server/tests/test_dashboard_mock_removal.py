"""Tests for procurement dashboard aggregation with mock fallback.

The procurement dashboard loads mock data from examples/procurement-mock.json
as fallback when gbrain snapshots are empty, so users can view all tabs
immediately. Brain markdown data (suppliers, approval matrix, safety stock)
takes priority over mock for the relevant fields.
"""

import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


def test_procurement_aggregation_empty_pages_returns_mock_valuation() -> None:
    """No snapshots → mock fallback provides non-zero valuation figures."""
    result = dashboard._run_procurement_aggregation([])
    # Mock fallback should provide these values from procurement-mock.json
    assert result["totalInventoryValuation"] > 0
    assert result["totalActiveSkus"] > 0
    assert result["openPoCount"] > 0
    assert result["procurementSpendMtd"] > 0
    # Mock flag should be True
    assert result["mock"] is True


def test_procurement_aggregation_empty_pages_returns_mock_lists() -> None:
    """No snapshots → mock fallback populates tab lists for display."""
    result = dashboard._run_procurement_aggregation([])
    # These should come from mock data
    assert len(result.get("skuCatalog", [])) > 0
    assert len(result.get("poPipeline", [])) > 0
    assert len(result.get("stockMovements", [])) > 0
    assert len(result.get("activePurchaseOrders", [])) > 0
    assert len(result.get("vendorSpendConcentration", [])) > 0


def test_procurement_aggregation_empty_pages_has_mock_flag() -> None:
    """Empty state should set mock=True so UI knows it's demo data."""
    result = dashboard._run_procurement_aggregation([])
    assert result.get("mock") is True


def test_crm_aggregation_empty_pages_returns_zero_sales() -> None:
    """No deals → sales figures must be 0, not mock values."""
    result = dashboard._run_ceo_aggregation([])
    assert result["salesMTD"] == 0
    assert result["salesYTD"] == 0
    assert result["totalPipelineValue"] == 0
    assert result["weightedPipelineValue"] == 0
