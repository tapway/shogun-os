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
    """Snapshot pages (contract keys) flow through to the camelCase payload."""
    snaps = {
        "finance/snapshots/cash": {
            "total_liquid_cash": 1240000.0,
            "net_monthly_burn": 95000.0,
            "cash_runway_months": 13.0,
            "bank_accounts": [{"name": "Maybank Current", "balance": 820000.0, "currency": "MYR"}],
        },
        "finance/snapshots/pl": {
            "revenue_mtd": 410000.0,
            "revenue_ytd": 2980000.0,
            "gross_margin_pct": 42.0,
            "ebitda_margin_pct": 18.0,
        },
        "finance/snapshots/ar": {
            "total_ar": 612000.0,
            "bucket_0_30": 340000.0,
            "bucket_31_60": 180000.0,
            "bucket_61_90": 68000.0,
            "bucket_90_plus": 24000.0,
            "dso": 41.0,
            "ar_invoices": [{
                "invoice": "INV-2026-0888", "client": "Acme Corp",
                "amount": 18000.0, "days_overdue": 96,
            }],
        },
        "finance/snapshots/ap": {
            "total_ap": 248000.0,
            "ap_overdue": 32000.0,
            "dpo": 38.0,
            "bills": [{
                "bill": "BILL-2026-0421", "vendor": "NexTech Distribution",
                "amount": 12400.0, "due_date": "2026-08-12",
            }],
        },
    }
    with patch("dashboard._fetch_finance_snapshots", return_value=snaps):
        result = asyncio.run(dashboard._run_finance_aggregation([]))
    assert result["dataSource"] == "gbrain"
    assert result["mock"] is False
    assert result["totalLiquidCash"] == 1240000.0
    assert result["revenueYTD"] == 2980000.0
    assert result["cashRunwayMonths"] == 13.0
    # bank balance normalized to balance_myr for the UI
    assert result["bankAccounts"][0]["balance_myr"] == 820000.0
    # short contract keys normalized to the UI item shape
    inv = result["arInvoices"][0]
    assert inv["invoice_no"] == "INV-2026-0888"
    assert inv["customer"] == "Acme Corp"
    assert inv["bucket"] == "90+"
    bill = result["apBills"][0]
    assert bill["bill_no"] == "BILL-2026-0421"
    assert bill["match_status"] == "Matched"


def test_finance_aggregation_never_calls_qbo():
    """gbrain-only data path: QBO fetchers must never be invoked."""
    with patch("dashboard._fetch_finance_snapshots", return_value={}), \
         patch("dashboard._fetch_qbo_balance_sheet") as mock_bs, \
         patch("dashboard._fetch_qbo_profit_loss") as mock_pl:
        asyncio.run(dashboard._run_finance_aggregation([]))
    mock_bs.assert_not_called()
    mock_pl.assert_not_called()


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
