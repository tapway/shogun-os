"""Regression test: _build_asset_trend must run non-blocking.

Pins the async + cached implementation so it can't silently regress
to sequential subprocess calls that freeze the FastAPI event loop.
"""
import asyncio
import sys
import time
import os
from unittest.mock import patch, MagicMock

# Add server dir to path so we can import dashboard functions
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_build_asset_trend_async_uses_thread_pool():
    """_build_asset_trend_async must delegate to asyncio.to_thread,
    not call _build_asset_trend directly in the event loop."""
    from server.dashboard import _build_asset_trend_async

    with patch("server.dashboard._build_asset_trend", return_value=[{"month": "Jan", "current": 100, "non_current": 200}]) as mock_sync:
        with patch("server.dashboard._ASSET_TREND_CACHE", {"data": [], "ts": 0}):
            with patch("server.dashboard._ASSET_TREND_TTL", 0):
                result = asyncio.run(_build_asset_trend_async())
                assert result == [{"month": "Jan", "current": 100, "non_current": 200}]
                assert mock_sync.call_count == 1


def test_build_asset_trend_async_uses_cache():
    """Second call within TTL must return cached result without re-computing."""
    from server.dashboard import _build_asset_trend_async

    cached_data = [{"month": "Feb", "current": 999, "non_current": 888}]
    with patch("server.dashboard._build_asset_trend", return_value=cached_data) as mock_sync:
        with patch("server.dashboard._ASSET_TREND_CACHE", {"data": cached_data, "ts": time.time()}) as mock_cache:
            with patch("server.dashboard._ASSET_TREND_TTL", 3600):
                result = asyncio.run(_build_asset_trend_async())
                assert result == cached_data
                assert mock_sync.call_count == 0  # didn't re-compute


def test_match_qbo_actuals_to_budget_tags_confidence():
    """Budget matching must tag each item with match_confidence."""
    from server.dashboard import _match_qbo_actuals_to_budget

    budget_items = [
        {"account_name": "Salaries", "budget_ytd": 50000},
        {"account_name": "Hardware", "budget_ytd": 100000},
        {"account_name": "Nonexistent Account", "budget_ytd": 5000},
    ]
    pl = {
        "revenue_accounts": [],
        "expense_accounts": [
            {"account_name": "Salaries", "amount": 55000},
            {"account_name": "Hardware Costs", "amount": 95000},
        ],
    }
    result = _match_qbo_actuals_to_budget(budget_items, pl)
    assert len(result) == 3
    # Salaries → exact match → high confidence
    assert result[0]["match_confidence"] == "high"
    assert result[0]["actual_ytd"] == 55000
    # Hardware → substring match → medium confidence
    assert result[1]["match_confidence"] == "medium"
    # Nonexistent → no match → none
    assert result[2]["match_confidence"] == "none"
    assert result[2]["actual_ytd"] == 0


def test_match_confidence_does_not_false_positive_salaries_payable():
    """Salaries must NOT match Salaries Payable with high confidence."""
    from server.dashboard import _match_qbo_actuals_to_budget

    budget_items = [{"account_name": "Salaries", "budget_ytd": 50000}]
    pl = {
        "revenue_accounts": [],
        "expense_accounts": [
            {"account_name": "Salaries Payable", "amount": 30000},
        ],
    }
    result = _match_qbo_actuals_to_budget(budget_items, pl)
    # "Salaries" is a substring of "Salaries Payable" → medium, not high
    assert result[0]["match_confidence"] == "medium"
