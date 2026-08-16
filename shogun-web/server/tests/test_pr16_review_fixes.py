"""Regression tests for PR #16 review fixes.

Covers:
1. (Critical #1) Finance aggregation must NEVER crash on the empty-state path
   (no live QBO + no gbrain snapshots). The original code raised
   UnboundLocalError because `mock_data` was only bound inside the
   `if has_live_qbo:` branch but read inside the `else:` empty-state block.
2. (Critical #1) Demo/fabricated data from examples/finance-budget.json must
   be gated behind SEED_DEMO_BRAIN (default OFF). A fresh install must show
   an empty state, NOT fabricated RM financials.
3. (Warning #3) change_password must clear the temporary-password status so a
   first-login staff member is not forced to reset their password again on
   their next session (the derived `must_change_password`).
"""

import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dashboard
from auth import ChangePasswordRequest, change_password, hash_password
from models import User


class _SessionStub:
    def add(self, _user: User) -> None:
        pass

    def commit(self) -> None:
        pass

    def refresh(self, _user: User) -> None:
        pass


# ──────────────────────────────────────────────────────────────────────────
# 1. Empty-state path must not crash
# ──────────────────────────────────────────────────────────────────────────

def _no_qbo_fetch(*_args, **_kwargs):
    """Simulate live QBO being unavailable for every fetch."""
    return {"error": "QBO unavailable"}


def test_finance_empty_state_returns_payload_without_crashing() -> None:
    """No snapshots + no live QBO → return empty-state dict, don't raise.

    Regression for UnboundLocalError: `mock_data` was read in the else branch
    but only bound in the has_live_qbo branch.
    """
    with patch.object(dashboard, "_fetch_qbo_balance_sheet", side_effect=_no_qbo_fetch), \
         patch.object(dashboard, "_fetch_qbo_profit_loss", side_effect=_no_qbo_fetch):
        # pages=[] → no snapshots; QBO mocked → no live data; SEED_DEMO_BRAIN default off
        result = asyncio.run(dashboard._run_finance_aggregation([]))

    assert isinstance(result, dict)
    assert result.get("mock") is False, "empty state must not be flagged as mock"
    assert result.get("totalAssets", 0) == 0, "no fabricated assets on empty state"


def test_finance_empty_state_yields_no_demo_concentration() -> None:
    """Empty state must not surface fabricated client concentration figures."""
    with patch.object(dashboard, "_fetch_qbo_balance_sheet", side_effect=_no_qbo_fetch), \
         patch.object(dashboard, "_fetch_qbo_profit_loss", side_effect=_no_qbo_fetch):
        result = asyncio.run(dashboard._run_finance_aggregation([]))

    assert result.get("clientConcentration", []) == []
    assert result.get("bvaLineItems", []) == []


# ──────────────────────────────────────────────────────────────────────────
# 2. Demo data gated behind SEED_DEMO_BRAIN
# ──────────────────────────────────────────────────────────────────────────

def _live_qbo_fetch_balance_sheet(*_args, **_kwargs):
    """A minimal valid balance sheet (no 'error' key)."""
    return {
        "asset_accounts": [
            {"account_name": "Cash", "amount": 10000.0, "type": "Asset"},
        ],
    }


def _live_qbo_fetch_pl(*_args, **_kwargs):
    """A minimal valid P&L (no 'error' key)."""
    return {
        "revenue_accounts": [{"account_name": "Service Revenue", "amount": 50000.0}],
        "expense_accounts": [{"account_name": "Salaries", "amount": 20000.0}],
    }


def test_live_qbo_without_seed_demo_brain_does_not_load_demo_json() -> None:
    """Per-review: default (SEED_DEMO_BRAIN unset) must NOT serve fabricated demo data,
    even when live QBO is present."""
    with patch.object(dashboard, "_fetch_qbo_balance_sheet", side_effect=_live_qbo_fetch_balance_sheet), \
         patch.object(dashboard, "_fetch_qbo_profit_loss", side_effect=_live_qbo_fetch_pl), \
         patch.dict(os.environ, {}, clear=False):
        if "SEED_DEMO_BRAIN" in os.environ:
            del os.environ["SEED_DEMO_BRAIN"]
        result = asyncio.run(dashboard._run_finance_aggregation([]))

    assert result.get("mock") is False, "demo data should be off by default"
    assert result.get("clientConcentration", []) == [], \
        "fabricated concentration must not render without SEED_DEMO_BRAIN"


# ──────────────────────────────────────────────────────────────────────────
# 3. change_password clears temporary-password status
# ──────────────────────────────────────────────────────────────────────────

def test_change_password_clears_temporary_password_status() -> None:
    """A first-login staff member on a temporary password who changes it must
    NOT be forced to change it again (must_change_password must become False)."""
    staff = User(
        tenant_id=1,
        email="new.staff@example.com",
        name="New Staff",
        role="user",
        password_hash=hash_password("TempPass123"),
        first_login=True,
        is_temporary_password=True,
    )

    asyncio.run(
        change_password(
            ChangePasswordRequest(
                current_password="TempPass123",
                new_password="PermanentPass123",
            ),
            user=staff,
            db=_SessionStub(),
        )
    )

    assert staff.first_login is False
    assert staff.is_temporary_password is False, \
        "change_password must clear the temporary-password flag"
    # Derived property used by the API must now be False → user not forced to re-change.
    response = staff.to_dict() if hasattr(staff, "to_dict") else _user_response_shim(staff)
    must_change = response.get("must_change_password")
    assert must_change is False, "must_change_password must be False after a real password change"


def _user_response_shim(user: User) -> dict:
    """Fallback reading of the derived must_change_password attr if no to_dict."""
    try:
        return {
            "is_temporary_password": user.is_temporary_password,
            "must_change_password": bool(user.first_login or user.is_temporary_password),
        }
    except AttributeError:
        return {}


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))