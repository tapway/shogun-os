"""E2E-style tests for dashboard.py config endpoint — tab structure per department."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402
from models import Department  # noqa: E402


def _make_tenant():
    t = MagicMock()
    t.id = 1
    return t


def _make_user():
    u = MagicMock()
    u.id = 1
    u.tenant_id = 1
    return u


def _make_dept(name="finance"):
    d = MagicMock()
    d.tenant_id = 1
    d.name = name
    return d


class _Result:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value

    def scalar_one_or_none(self):
        return self._value


def _call_dashboard_config(name):
    """Call get_dashboard_config directly (it uses db.query, not select)."""
    user = _make_user()
    tenant = _make_tenant()
    dept = _make_dept(name)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = dept
    with patch_db():
        return asyncio.run(dashboard.get_dashboard_config(name=name, user=user, db=db))


def patch_db():
    """Patch get_primary_tenant in dashboard module."""
    from unittest.mock import patch
    return patch.object(dashboard, "get_primary_tenant", return_value=_make_tenant())


# ─── Tab structure ───────────────────────────────────────────────────────


def test_get_dashboard_config_crm_returns_6_tabs():
    result = asyncio.run(_call_dashboard_config_inner("crm"))
    assert result["enabled"] is True
    tab_ids = [t["id"] for t in result["tabs"]]
    assert "overview" in tab_ids
    assert "deals" in tab_ids
    assert "companies" in tab_ids
    assert "search" in tab_ids
    assert len(result["tabs"]) == 6


def test_get_dashboard_config_finance_returns_8_tabs():
    result = asyncio.run(_call_dashboard_config_inner("finance"))
    assert result["enabled"] is True
    tab_ids = [t["id"] for t in result["tabs"]]
    assert "overview" in tab_ids
    assert "cashflow" in tab_ids
    assert "cash" in tab_ids
    assert "ar" in tab_ids
    assert "ap" in tab_ids
    assert "bva" in tab_ids
    assert "margins" in tab_ids
    assert "scan" in tab_ids
    assert len(result["tabs"]) == 8


def test_get_dashboard_config_procurement_returns_9_tabs():
    result = asyncio.run(_call_dashboard_config_inner("procurement"))
    assert result["enabled"] is True
    tab_ids = [t["id"] for t in result["tabs"]]
    assert "pulse" in tab_ids
    assert "requisitions" in tab_ids
    assert "sourcing" in tab_ids
    assert "po" in tab_ids
    assert "inventory" in tab_ids
    assert "barcode" in tab_ids
    assert "matching" in tab_ids
    assert "bridge" in tab_ids
    assert "scan" in tab_ids
    assert len(result["tabs"]) == 9


def test_get_dashboard_config_facility_returns_4_tabs():
    result = asyncio.run(_call_dashboard_config_inner("facility"))
    assert result["enabled"] is True
    tab_ids = [t["id"] for t in result["tabs"]]
    assert "units" in tab_ids
    assert "inspect" in tab_ids
    assert "records" in tab_ids
    assert "scan" in tab_ids
    assert len(result["tabs"]) == 4


def test_get_dashboard_config_unknown_returns_disabled():
    result = asyncio.run(_call_dashboard_config_inner("nonexistent"))
    assert result["enabled"] is False
    assert result["tabs"] == []


# ─── Helper ──────────────────────────────────────────────────────────────


def _call_dashboard_config_inner(name):
    """Direct call to get_dashboard_config with stubbed db + tenant."""
    user = _make_user()
    dept = _make_dept(name)
    db = MagicMock()
    # db.query(Department).filter(...).first() — must return a dept for non-404
    db.query.return_value.filter.return_value.first.return_value = dept
    with patch_db():
        return dashboard.get_dashboard_config(name=name, user=user, db=db)
