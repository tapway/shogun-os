"""E2E-style tests for dashboard.py aggregation helpers — safe_float, safe_int,
and finance/procurement/CRM aggregation with empty pages (no crash).
"""

import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


# ─── safe_float ──────────────────────────────────────────────────────────


def test_safe_float_handles_none():
    assert dashboard._safe_float(None) == 0.0


def test_safe_float_handles_empty_string():
    assert dashboard._safe_float("") == 0.0


def test_safe_float_handles_invalid_string():
    assert dashboard._safe_float("abc") == 0.0


def test_safe_float_passes_valid_integer():
    assert dashboard._safe_float(42) == 42.0


def test_safe_float_passes_valid_string():
    assert dashboard._safe_float("123.45") == 123.45


def test_safe_float_uses_default_on_invalid():
    assert dashboard._safe_float("abc", default=99.9) == 99.9


# ─── safe_int ────────────────────────────────────────────────────────────


def test_safe_int_handles_none():
    assert dashboard._safe_int(None) == 0


def test_safe_int_handles_empty_string():
    assert dashboard._safe_int("") == 0


def test_safe_int_handles_invalid_string():
    assert dashboard._safe_int("abc") == 0


def test_safe_int_truncates_float_string():
    assert dashboard._safe_int("42.9") == 42


def test_safe_int_passes_valid_integer():
    assert dashboard._safe_int(7) == 7


# ─── Aggregation: empty pages ─────────────────────────────────────────────


def test_finance_aggregation_returns_mock_ledger():
    """Finance aggregation serves the aligned mock ledger (no QBO, no snapshots).

    Every figure must come from examples/finance-budget.json and reconcile:
    mock flag set, non-zero KPIs, aging buckets sum to totals, BS identity.
    """
    result = dashboard._run_finance_aggregation([])
    assert isinstance(result, dict)
    assert result["mock"] is True
    # Headline KPIs populated from the mock ledger
    assert result["totalLiquidCash"] > 0
    assert result["revenueYTD"] > 0
    assert result["totalAR"] > 0
    assert result["totalAP"] > 0
    # Internal consistency: AR aging buckets sum to totalAR
    aging = result["arAging"]
    assert sum(aging.values()) == result["totalAR"]
    # Balance-sheet identity: assets = liabilities + equity
    assert round(result["totalCurrentAssets"] + result["totalNonCurrentAssets"]) == round(result["totalAssets"])
    assert round(result["totalLiabilities"] + result["totalEquity"]) == round(result["totalAssets"])
    # Bank balances reconcile with liquid cash
    assert sum(b["balance_myr"] for b in result["bankAccounts"]) == result["totalLiquidCash"]


def test_procurement_aggregation_empty_pages_no_crash():
    """Procurement aggregation with no pages must not crash."""
    result = dashboard._run_procurement_aggregation([])
    assert isinstance(result, dict)
    assert len(result) > 0


def test_crm_aggregation_empty_pages_no_crash():
    """CRM CEO aggregation with no pages must not crash."""
    result = dashboard._run_ceo_aggregation([])
    assert isinstance(result, dict)
    assert len(result) > 0


def test_procurement_aggregation_returns_expected_keys():
    """Verify procurement result has the keys the frontend expects."""
    result = dashboard._run_procurement_aggregation([])
    expected_keys = [
        "totalInventoryValuation", "totalActiveSkus", "lowStockAlerts",
        "deadSlowStockCapital", "openPoCount", "procurementSpendMtd",
    ]
    for key in expected_keys:
        assert key in result, f"Missing key: {key}"


def test_crm_aggregation_returns_expected_keys():
    """Verify CRM result has the keys the frontend expects."""
    result = dashboard._run_ceo_aggregation([])
    expected_keys = ["salesMTD", "salesQTD", "salesYTD", "totalPipelineValue", "weightedPipelineValue"]
    for key in expected_keys:
        assert key in result, f"Missing key: {key}"


def test_parse_frontmatter_none_returns_empty():
    assert dashboard._parse_frontmatter(None) == {}


def test_parse_frontmatter_empty_dict_returns_empty():
    assert dashboard._parse_frontmatter({}) == {}
