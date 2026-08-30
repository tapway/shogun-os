"""Regression tests: the finance mock ledger must stay internally aligned.

Replaces the old QBO helper tests — the dashboard now serves a single
fictional ledger from examples/finance-budget.json (no QBO, no snapshots),
so the correctness bar is: every tab reads the same data and it all
reconciles (BS identity, aging sums, bank balances = liquid cash).
"""

import json
import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
_REPO = _SERVER.parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))
if str(_REPO / "scripts") not in sys.path:
    sys.path.insert(0, str(_REPO / "scripts"))

import dashboard  # noqa: E402
import generate_finance_mock as gen  # noqa: E402


def _load_mock_json() -> dict:
    with open(gen.TARGET, "r", encoding="utf-8") as f:
        return json.load(f)["dashboard_mock"]


def test_mock_json_passes_all_invariants() -> None:
    """The checked-in ledger must satisfy every generator invariant."""
    assert gen.validate(_load_mock_json()) == []


def test_aggregation_serves_the_mock_ledger() -> None:
    """API payload values must match the JSON field-for-field."""
    result = dashboard._run_finance_aggregation([])
    mock = _load_mock_json()
    assert result["mock"] is True
    for key in ("totalLiquidCash", "revenueYTD", "totalAR", "totalAP",
                "arAging", "apBills", "bvaLineItems", "clientConcentration",
                "monthlyPlTrend", "bankAccounts", "assetTrend"):
        assert result[key] == mock[key], f"payload mismatch: {key}"


def test_derived_ratios_reconcile() -> None:
    """Ratios computed server-side must agree with the ledger totals."""
    result = dashboard._run_finance_aggregation([])
    mock = _load_mock_json()
    assert abs(result["debtToEquity"] - mock["totalLiabilities"] / mock["totalEquity"]) < 1e-9
    assert result["netWorkingCapital"] == (
        mock["totalCurrentAssets"] - mock["totalCurrentLiabilities"])
    assert abs(result["arToApCoverage"] - mock["totalAR"] / mock["totalAP"]) < 1e-9
