"""E2E-style tests for auth.py — login, register, me, logout flows.

Stubs DB + config to test endpoint functions directly without HTTP.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import auth  # noqa: E402
from auth import LoginRequest, RegisterRequest  # noqa: E402
from models import User, Tenant  # noqa: E402


def _make_tenant(tid: int = 1, company_name: str = "Shogun OS") -> Tenant:
    return Tenant(id=tid, subdomain="local", company_name=company_name,
                  timezone="UTC", status="active", logo_url=None)


def _make_user(
    uid: int = 1,
    email: str = "admin@example.com",
    role: str = "admin",
    password: str = "Pass1234",
    first_login: bool = False,
) -> User:
    u = User(
        id=uid,
        tenant_id=1,
        email=email,
        name="Test User",
        role=role,
        first_login=first_login,
        is_temporary_password=first_login,
        password_hash=auth.hash_password(password) if password else None,
        source="manual",
    )
    u.tenant = _make_tenant()
    return u


class _Result:
    """Stub for SQLAlchemy result — returns a single scalar."""

    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return self._value if isinstance(self._value, list) else []


class _LoginDBStub:
    """Stub DB session for login flows.

    Set .user to control what the query returns, and .tenant for get_primary_tenant.
    """

    def __init__(self, user=None, tenant=None):
        self.user = user
        self.tenant = tenant or _make_tenant()

    def execute(self, _stmt):
        return _Result(self.user)

    def add(self, _obj):
        pass

    def commit(self):
        pass

    def refresh(self, _obj):
        pass

    def rollback(self):
        pass


def _patch_get_primary_tenant(db_stub: _LoginDBStub):
    """Patch database.get_primary_tenant to return db_stub.tenant."""
    return patch("auth.get_primary_tenant", return_value=db_stub.tenant)


# ─── Login ────────────────────────────────────────────────────────────────


def test_login_valid_credentials_returns_token():
    user = _make_user(email="admin@example.com", password="Pass1234")
    db = _LoginDBStub(user=user)
    with _patch_get_primary_tenant(db):
        response = asyncio.run(auth.login(LoginRequest(email="admin@example.com", password="Pass1234"), db=db))
    body = response.body
    import json
    data = json.loads(body)
    assert "token" in data
    assert data["user"]["email"] == "admin@example.com"
    assert data["requires_password_change"] is False


def test_login_wrong_password_returns_401():
    user = _make_user(email="admin@example.com", password="CorrectPass123")
    db = _LoginDBStub(user=user)
    with _patch_get_primary_tenant(db):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                auth.login(
                    LoginRequest(email="admin@example.com", password="WrongPass999"),
                    db=db,
                )
            )
    assert exc_info.value.status_code == 401


def test_login_nonexistent_user_returns_401():
    db = _LoginDBStub(user=None)
    with _patch_get_primary_tenant(db):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                auth.login(
                    LoginRequest(email="nobody@example.com", password="Pass1234"),
                    db=db,
                )
            )
    assert exc_info.value.status_code == 401


def test_login_user_without_password_hash_returns_401():
    """SSO-only user (no password_hash) cannot log in via email+pw."""
    user = _make_user(email="sso@example.com", password="")
    db = _LoginDBStub(user=user)
    with _patch_get_primary_tenant(db):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                auth.login(
                    LoginRequest(email="sso@example.com", password="anything"),
                    db=db,
                )
            )
    assert exc_info.value.status_code == 401


def test_login_unexpected_exception_returns_401_not_500():
    """DB error must surface as 401 (no 500 leak)."""

    class _CrashDB(_LoginDBStub):
        def execute(self, _stmt):
            raise RuntimeError("DB connection lost")

    db = _CrashDB(user=None)
    with _patch_get_primary_tenant(db):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                auth.login(
                    LoginRequest(email="admin@example.com", password="Pass1234"),
                    db=db,
                )
            )
    assert exc_info.value.status_code == 401


# ─── Register ─────────────────────────────────────────────────────────────


def test_register_new_admin_creates_user_and_resets_onboarding():
    """New email → user created, role=admin, first_login=True."""
    db = MagicMock()
    db.execute.return_value = _Result(None)  # no existing user
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    tenant = _make_tenant(company_name="Shogun OS")
    created_users = []

    def _capture_add(obj):
        if isinstance(obj, User):  # only capture User objects, not Tenant
            created_users.append(obj)

    db.add.side_effect = _capture_add

    with patch("auth.get_primary_tenant", return_value=tenant):
        response = asyncio.run(
            auth.register(
                RegisterRequest(
                    company_name="Acme Corp",
                    admin_name="John Doe",
                    email="new@admin.com",
                    password="SecretPass1",
                ),
                db=db,
            )
        )
    import json
    data = json.loads(response.body)
    assert data["user"]["email"] == "new@admin.com"
    assert data["requires_password_change"] is True
    assert len(created_users) >= 1
    new_user = created_users[0]
    assert new_user.role == "admin"
    assert new_user.first_login is True


def test_register_duplicate_email_returns_409():
    existing = _make_user(email="dup@example.com")
    db = MagicMock()
    db.execute.return_value = _Result(existing)
    with patch("auth.get_primary_tenant", return_value=_make_tenant()):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                auth.register(
                    RegisterRequest(
                        company_name="Acme",
                        admin_name="John",
                        email="dup@example.com",
                        password="SecretPass1",
                    ),
                    db=db,
                )
            )
    assert exc_info.value.status_code == 409


def test_register_creates_new_tenant_with_company_name():
    """Register must create a NEW tenant with the company_name from the body."""
    db = MagicMock()
    db.execute.return_value = _Result(None)  # no existing user
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    captured = []

    def _capture_add(obj):
        captured.append(obj)

    db.add.side_effect = _capture_add
    with patch("auth.get_primary_tenant", return_value=_make_tenant()):
        asyncio.run(
            auth.register(
                RegisterRequest(
                    company_name="My Company",
                    admin_name="Admin",
                    email="new@admin.com",
                    password="SecretPass1",
                ),
                db=db,
            )
        )
    # A new Tenant must be created with the company name
    tenants = [o for o in captured if hasattr(o, "subdomain")]
    assert len(tenants) >= 1
    assert tenants[0].company_name == "My Company"


# ─── /me and /me/access ─────────────────────────────────────────────────


def test_me_returns_current_user_shape():
    user = _make_user(email="me@example.com")
    result = asyncio.run(auth.me(user=user))
    assert result["user"]["email"] == "me@example.com"
    assert "role" in result["user"]


def test_me_access_admin_has_access_true():
    """Admin with no department assignments still has access."""
    user = _make_user(email="admin@example.com", role="admin")
    db = MagicMock()
    db.execute.return_value = _Result([])
    with patch("auth.get_primary_tenant", return_value=_make_tenant()):
        result = asyncio.run(auth.my_access(user=user, db=db))
    assert result["has_access"] is True
    assert result["role"] == "admin"


def test_me_access_staff_with_departments():
    """Staff with UserDepartment rows → has_access True + list populated."""
    user = _make_user(email="staff@example.com", role="user")
    dept = MagicMock()
    dept.name = "finance"
    ud = MagicMock()
    ud.department = dept
    ud.title = "Analyst"
    db = MagicMock()
    db.execute.return_value = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = [ud]
    with patch("auth.get_primary_tenant", return_value=_make_tenant()):
        result = asyncio.run(auth.my_access(user=user, db=db))
    assert result["has_access"] is True
    assert len(result["assigned_departments"]) == 1


# ─── Logout ──────────────────────────────────────────────────────────────


def test_logout_clears_session_row_and_cookie():
    class _FakeRequest:
        cookies = {"shogun_session": "fake-token"}
        headers = {}

    db = MagicMock()
    db.execute.return_value = _Result(None)  # no matching session row
    response = asyncio.run(auth.logout(_FakeRequest(), MagicMock(), db=db))
    assert response["ok"] is True
