"""E2E-style tests for dashboard.py aggregation helpers — safe_float, safe_int,
and finance/procurement/CRM aggregation with empty pages (no crash).
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import patch

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


def test_finance_aggregation_empty_pages_returns_safe_defaults():
    """Finance aggregation with no snapshots must not crash and return zeros.

    QBO is OFF by default (gbrain-first), so no subprocess/network call runs
    at all. The empty-state payload carries dataSource="empty" and mock=False
    (never fabricated demo data).
    """
    with patch("dashboard._fetch_finance_snapshots", return_value={}):
        result = asyncio.run(dashboard._run_finance_aggregation([]))
    assert isinstance(result, dict)
    # Must have keys, even if all zero/empty
    assert len(result) > 0
    assert result["mock"] is False
    assert result["dataSource"] == "empty"


def test_finance_aggregation_reads_gbrain_snapshots():
    """With accounting bridge unavailable, gbrain snapshots fill BvA/compliance.

    Tabs 1-5 return empty-state (bridge not mocked), but BvA budget and
    compliance data still come from gbrain snapshots.
    """
    snaps = {
        "finance/snapshots/bva": {
            "departments": [{"department": "Engineering", "variance_pct": 5.0}],
            "line_items": [{"account_name": "Salaries", "budget_ytd": 100000}],
            "unit_economics": {"gross_margin_pct": 42.0, "contribution_margin_pct": 28.0,
                               "cac": 1200, "ltv": 8400, "ltv_cac_ratio": 7.0},
        },
        "finance/snapshots/compliance": {
            "close_checklist": [{"task": "Bank reconciliation", "status": "Done"}],
            "statutory_schedule": [{"filing": "SST-02", "due_date": "2026-10-31"}],
        },
        "finance/snapshots/concentration": {
            "clients": [{"name": "Acme Corp", "revenue_pct": 25.0}],
        },
    }
    with patch("dashboard._fetch_finance_snapshots", return_value=snaps):
        result = asyncio.run(dashboard._run_finance_aggregation([]))
    # Accounting bridge not available in test → dataSource is "empty"
    assert result["dataSource"] == "empty"
    assert result["mock"] is False
    # Tabs 1-5 are zero/empty (no accounting bridge)
    assert result["totalLiquidCash"] == 0.0
    assert result["revenueYTD"] == 0.0
    # But BvA budget + compliance still come from gbrain
    assert len(result["bvaDepartments"]) == 1
    assert result["bvaDepartments"][0]["department"] == "Engineering"
    assert len(result["closeChecklist"]) == 1
    assert result["unitEconomics"]["gross_margin_pct"] == 42.0
    # Concentration risk alert generated
    assert any(a["type"] == "concentration" for a in result["riskAlerts"])


def test_finance_aggregation_calls_accounting_bridge():
    """Accounting-first data path: bridge fetchers ARE invoked for tabs 1-5."""
    mock_bs = {
        "total_assets": 500000, "total_liabilities": 200000,
        "total_equity": 300000, "total_current_liabilities": 80000,
        "asset_accounts": [
            {"account_name": "Cash - Maybank", "amount": 350000},
            {"account_name": "Accounts Receivable", "amount": 150000},
        ],
    }
    mock_pl = {"total_revenue": 100000, "total_expenses": 80000,
               "net_profit": 20000, "revenue_accounts": [], "expense_accounts": []}
    with patch("dashboard._fetch_finance_snapshots", return_value={}), \
         patch("dashboard._fetch_accounting_balance_sheet", return_value=mock_bs), \
         patch("dashboard._fetch_accounting_profit_loss", return_value=mock_pl), \
         patch("dashboard._fetch_accounting_ar_invoices", return_value={"invoices": []}), \
         patch("dashboard._fetch_accounting_ap_bills", return_value={"bills": []}):
        result = asyncio.run(dashboard._run_finance_aggregation([]))
    assert result["dataSource"] == "accounting"
    assert result["revenueYTD"] == 100000
    assert result["totalAssets"] == 500000
    assert result["totalLiquidCash"] == 350000
    assert result["totalLiabilities"] == 200000


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
