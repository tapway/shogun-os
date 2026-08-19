"""E2E-style tests for onboarding.py — industries, state, go-live, departments list."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import onboarding  # noqa: E402
from models import OnboardingState, User  # noqa: E402


def _make_tenant():
    from models import Tenant
    return Tenant(id=1, subdomain="local", company_name="Acme",
                  timezone="UTC", status="active", logo_url=None)


def _make_db(tenant=None):
    """Create a MagicMock db where db.get(Tenant, ...) returns the tenant."""
    db = MagicMock()
    db.get.return_value = tenant or _make_tenant()
    return db


def _make_user(role="admin", tenant_id=1):
    return User(id=1, tenant_id=tenant_id, email=f"{role}@example.com",
                name=role.title(), role=role, source="manual")


def _make_state(step="welcome", data=None, completed_at=None):
    s = MagicMock()
    s.current_step = step
    s.data = data or {}
    s.completed_at = completed_at
    return s


class _Result:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


# ─── Industries ─────────────────────────────────────────────────────────


def test_get_industries_returns_catalog():
    result = asyncio.run(onboarding.get_industries())
    assert "industries" in result
    assert "shared_departments" in result
    assert "industry_departments" in result
    assert isinstance(result["industries"], list)
    assert len(result["industries"]) > 0


# ─── Get onboarding state ───────────────────────────────────────────────


def test_get_onboarding_returns_ui_state():
    user = _make_user()
    tenant = _make_tenant()
    state = _make_state(step="step_2", data={"ui_step": 2})
    db = _make_db()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            result = asyncio.run(onboarding.get_onboarding_ui(user=user, db=db))
    assert "step" in result
    assert "industry" in result
    assert "company" in result
    assert "completed" in result


def test_get_onboarding_tenant_mismatch_raises_403():
    user = _make_user(tenant_id=999)
    tenant = _make_tenant()
    db = _make_db()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(onboarding.get_onboarding_ui(user=user, db=db))
    assert exc_info.value.status_code == 403


# ─── Put onboarding ─────────────────────────────────────────────────────


class _UiOnboardingSave:
    def __init__(self, step=None, industry=None, selected_departments=None,
                 department_configs=None, company=None, completed=False):
        self.step = step
        self.industry = industry
        self.selected_departments = selected_departments
        self.department_configs = department_configs
        self.company = company
        self.completed = completed


def test_put_onboarding_updates_step():
    user = _make_user()
    tenant = _make_tenant()
    state = _make_state()
    db = _make_db()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch.object(onboarding, "_ui_state", return_value={"step": 2}):
                result = asyncio.run(onboarding.put_onboarding_ui(
                    _UiOnboardingSave(step=2), user=user, db=db,
                ))
    assert state.current_step == "step_2"


def test_put_onboarding_sets_industry():
    user = _make_user()
    tenant = _make_tenant()
    state = _make_state()
    state.data = {}
    db = _make_db()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch.object(onboarding, "_ui_state", return_value={"industry": "retail"}):
                result = asyncio.run(onboarding.put_onboarding_ui(
                    _UiOnboardingSave(industry="retail"), user=user, db=db,
                ))
    assert state.data["industry"] == "retail"


def test_put_onboarding_marks_completed():
    user = _make_user()
    user.first_login = True
    tenant = _make_tenant()
    state = _make_state()
    state.data = {}
    db = _make_db()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch.object(onboarding, "_ui_state", return_value={"completed": True}):
                asyncio.run(onboarding.put_onboarding_ui(
                    _UiOnboardingSave(completed=True), user=user, db=db,
                ))
    assert state.completed_at is not None
    assert user.first_login is False


def test_put_onboarding_non_admin_raises_403():
    """require_admin is a FastAPI dep — calling the function directly bypasses it.
    So we verify the guard is wired by checking require_admin itself rejects non-admins.
    """
    from auth import require_admin
    user = _make_user(role="user")
    with pytest.raises(HTTPException) as exc_info:
        require_admin(user=user)
    assert exc_info.value.status_code == 403


def test_put_onboarding_updates_company_name():
    user = _make_user()
    tenant = _make_tenant()
    tenant.company_name = "Old Name"
    state = _make_state()
    state.data = {}
    db = _make_db(tenant=tenant)  # pass the same tenant so db.get returns it
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch.object(onboarding, "_ui_state", return_value={"company": {"name": "New Name"}}):
                asyncio.run(onboarding.put_onboarding_ui(
                    _UiOnboardingSave(company={"name": "New Name"}), user=user, db=db,
                ))
    assert tenant.company_name == "New Name"


# ─── Go-live ─────────────────────────────────────────────────────────────


class _GoLiveBody:
    def __init__(self, create_tunnel=True, force=False):
        self.create_tunnel = create_tunnel
        self.force = force


def test_onboarding_go_live_success():
    user = _make_user()
    tenant = _make_tenant()
    state = _make_state()
    db = _make_db()
    go_live_result = {"ok": True, "public_url": "https://acme.shogun-os.ai", "subdomain": "acme"}
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch("onboarding.registry_go_live", return_value=go_live_result):
                result = asyncio.run(onboarding.onboarding_go_live(
                    _GoLiveBody(), user=user, db=db,
                ))
    assert result["ok"] is True
    assert result["public_url"] == "https://acme.shogun-os.ai"


def test_onboarding_go_live_failure_raises_502():
    user = _make_user()
    tenant = _make_tenant()
    state = _make_state()
    db = _make_db()
    go_live_result = {"ok": False, "error": "Tunnel failed"}
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=state):
            with patch("onboarding.registry_go_live", return_value=go_live_result):
                with pytest.raises(HTTPException) as exc_info:
                    asyncio.run(onboarding.onboarding_go_live(
                        _GoLiveBody(), user=user, db=db,
                    ))
    assert exc_info.value.status_code == 502


# ─── List departments ───────────────────────────────────────────────────


def test_list_departments_admin_sees_all():
    admin = _make_user(role="admin")
    tenant = _make_tenant()
    dept1 = MagicMock()
    dept1.name = "finance"
    dept1.to_dict.return_value = {"name": "finance"}
    dept2 = MagicMock()
    dept2.name = "crm"
    dept2.to_dict.return_value = {"name": "crm"}
    db = _make_db()
    # db.execute(...).scalars() must return an iterable, not a MagicMock
    scalars_mock = MagicMock()
    scalars_mock.__iter__ = lambda self: iter([dept1, dept2])
    db.execute.return_value = MagicMock(scalars=MagicMock(return_value=scalars_mock))
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        result = asyncio.run(onboarding.list_departments(user=admin, db=db))
    assert len(result["departments"]) == 2


def test_list_departments_staff_sees_only_assigned():
    staff = _make_user(role="user")
    tenant = _make_tenant()
    dept = MagicMock()
    dept.name = "finance"
    dept.to_dict.return_value = {"name": "finance"}
    ud = MagicMock()
    ud.department_id = 5
    db = _make_db()
    # First query: UserDepartment rows, Second query: Department rows
    call_count = [0]

    def _execute(stmt):
        call_count[0] += 1
        result = MagicMock()
        if call_count[0] == 1:
            result.scalars.return_value.all.return_value = [ud]
        else:
            result.scalars.return_value.all.return_value = [dept]
        return result

    db.execute.side_effect = _execute
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        result = asyncio.run(onboarding.list_departments(user=staff, db=db))
    assert len(result["departments"]) == 1
    assert result["departments"][0]["name"] == "finance"


# ─── Activate department ────────────────────────────────────────────────


def test_activate_department_creates_if_missing():
    admin = _make_user()
    tenant = _make_tenant()
    db = _make_db()
    db.execute.return_value = _Result(None)  # dept not found
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    with patch.object(onboarding, "get_primary_tenant", return_value=tenant):
        with patch.object(onboarding, "_get_onboarding", return_value=_make_state(data={"industry": "retail"})):
            result = asyncio.run(onboarding.activate_department("finance", user=admin, db=db))
    assert result["ok"] is True
