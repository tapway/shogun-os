"""E2E-style tests for staff.py CRUD endpoints.

Covers: create (temp password, duplicate, role guard, assignment, manager),
get (404, wrong tenant), update (fields, assignments, role guard),
delete (self-deletion guard), reset-password.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import staff  # noqa: E402
from auth import hash_password  # noqa: E402
from models import Department, User  # noqa: E402
from staff import (  # noqa: E402
    AssignmentPayload,
    CreateStaffPayload,
    RoleUpdatePayload,
    UpdateStaffPayload,
)


def _make_tenant():
    from models import Tenant
    return Tenant(id=1, subdomain="local", company_name="Acme",
                  timezone="UTC", status="active", logo_url=None)


def _make_user(uid=1, role="admin"):
    return User(
        id=uid,
        tenant_id=1,
        email=f"{role}@example.com",
        name=role.title(),
        role=role,
        first_login=False,
        is_temporary_password=False,
        password_hash=hash_password("pass1234"),
        source="manual",
    )


class _Result:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return self._value if isinstance(self._value, list) else []


class _StaffDB:
    """Configurable stub for staff endpoints.

    Uses a queue of results — each db.execute() call pops the next result.
    This lets us control what each query returns in order.
    """

    def __init__(self, existing_user=None, dept_result=None, manager_result=None, assignments=None):
        self._results = []
        if existing_user is not None:
            self._results.append(_Result(existing_user))
        else:
            self._results.append(_Result(None))
        if manager_result is not None:
            self._results.append(_Result(manager_result))
        if dept_result is not None:
            self._results.append(_Result(dept_result))
        self._assignments = assignments or []
        self.added = []
        self.committed = False
        self._call_idx = 0

    def execute(self, stmt):
        if self._call_idx < len(self._results):
            result = self._results[self._call_idx]
        else:
            result = _Result(self._assignments)
        self._call_idx += 1
        return result

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass

    def delete(self, obj):
        pass

    def get(self, model, _id):
        # Modified staff.py calls db.get(Tenant, user.tenant_id) for tenant lookup
        from models import Tenant
        if model is Tenant:
            return _make_tenant()
        return None


def _patch_tenant(tenant=None):
    return patch.object(staff, "get_primary_tenant", return_value=tenant or _make_tenant())


# ─── Create staff ────────────────────────────────────────────────────────


def test_create_staff_generates_temp_password():
    admin = _make_user(1, "admin")
    db = _StaffDB(existing_user=None, dept_result=None, assignments=[])

    # Patch _staff_response to avoid complex assignment query
    with _patch_tenant():
        with patch.object(staff, "_staff_response", return_value={"id": 99, "email": "new@example.com"}):
            with patch("brain_sync.sync_staff_to_brain"):
                result = asyncio_create(CreateStaffPayload(
                    email="new@example.com",
                    name="New Staff",
                    role="user",
                ), admin, db)
    assert result["ok"] is True
    assert "temporary_password" in result["user"]
    assert len(result["user"]["temporary_password"]) >= 8


def test_create_staff_duplicate_email_returns_409():
    admin = _make_user(1, "admin")
    existing = _make_user(2, "user")
    existing.email = "dup@example.com"
    db = _StaffDB(existing_user=existing)
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_create(CreateStaffPayload(
                email="dup@example.com",
                name="Dup",
                role="user",
            ), admin, db)
    assert exc_info.value.status_code == 409


def test_create_staff_hr_cannot_set_admin_role():
    hr = _make_user(1, "hr_manager")
    db = _StaffDB(existing_user=None)
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_create(CreateStaffPayload(
                email="new@example.com",
                name="New",
                role="admin",
            ), hr, db)
    assert exc_info.value.status_code == 403


def test_create_staff_assigns_to_department():
    admin = _make_user(1, "admin")
    dept = MagicMock()
    dept.id = 5
    dept.name = "finance"
    db = _StaffDB(existing_user=None, dept_result=dept, assignments=[])

    def _real_staff_response(user, _db):
        return {"id": 99, "email": user.email, "assignments": []}

    with _patch_tenant():
        with patch.object(staff, "_staff_response", side_effect=_real_staff_response):
            with patch("brain_sync.sync_staff_to_brain"):
                result = asyncio_create(CreateStaffPayload(
                    email="new@example.com",
                    name="New",
                    role="user",
                    assignments=[AssignmentPayload(department="finance", title="Analyst")],
                ), admin, db)
    # Verify a UserDepartment was added
    added_types = [type(a).__name__ for a in db.added]
    assert "UserDepartment" in added_types or len(db.added) >= 2  # user + assignment


def test_create_staff_resolves_manager_by_email():
    admin = _make_user(1, "admin")
    manager = _make_user(2, "admin")
    manager.email = "mgr@example.com"
    # First query: existing_user=None, Second query (manager lookup): manager
    db = _StaffDB(existing_user=None, manager_result=manager, assignments=[])

    captured_user = []

    def _real_staff_response(user, _db):
        captured_user.append(user)
        return {"id": 99, "email": user.email, "manager_id": user.manager_id}

    with _patch_tenant():
        with patch.object(staff, "_staff_response", side_effect=_real_staff_response):
            with patch("brain_sync.sync_staff_to_brain"):
                result = asyncio_create(CreateStaffPayload(
                    email="new@example.com",
                    name="New",
                    role="user",
                    manager_email="mgr@example.com",
                ), admin, db)
    assert result["user"]["manager_id"] == 2 or captured_user[0].manager_id == 2


# ─── Get staff ────────────────────────────────────────────────────────────


def test_get_staff_not_found_returns_404():
    admin = _make_user(1, "admin")
    db = MagicMock()
    # db.get(Tenant, ...) → tenant; db.get(User, ...) → None (not found)
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else None
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_get(staff_id=999, user=admin, db=db)
    assert exc_info.value.status_code == 404


def test_get_staff_wrong_tenant_returns_404():
    admin = _make_user(1, "admin")
    other_user = _make_user(2, "user")
    other_user.tenant_id = 999  # different tenant
    db = MagicMock()
    # db.get(Tenant, ...) → tenant(id=1); db.get(User, ...) → other_user(tenant_id=999)
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else other_user
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_get(staff_id=2, user=admin, db=db)
    assert exc_info.value.status_code == 404


# ─── Update staff ──────────────────────────────────────────────────────────


def test_update_staff_changes_name_and_phone():
    admin = _make_user(1, "admin")
    target = _make_user(2, "user")
    target.id = 2
    db = MagicMock()
    # db.get(Tenant, ...) → tenant; db.get(User, ...) → target
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else target

    def _staff_resp(user, _db):
        return {"id": 2, "name": user.name, "phone": user.phone}

    with _patch_tenant():
        with patch.object(staff, "_staff_response", side_effect=_staff_resp):
            with patch("brain_sync.sync_staff_to_brain"):
                result = asyncio_update(
                    staff_id=2,
                    body=UpdateStaffPayload(name="Updated Name", phone="+1234567890"),
                    user=admin,
                    db=db,
                )
    assert result["ok"] is True
    assert target.name == "Updated Name"
    assert target.phone == "+1234567890"


def test_update_staff_hr_cannot_promote_to_admin():
    hr = _make_user(1, "hr_manager")
    target = _make_user(2, "user")
    target.id = 2
    db = MagicMock()
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else target
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_update(
                staff_id=2,
                body=UpdateStaffPayload(role="admin"),
                user=hr,
                db=db,
            )
    assert exc_info.value.status_code == 403


# ─── Delete staff ──────────────────────────────────────────────────────────


def test_delete_staff_prevents_self_deletion():
    admin = _make_user(1, "admin")
    admin.id = 1
    db = MagicMock()
    # db.get(Tenant, ...) → tenant; db.get(User, ...) → admin (target == admin)
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else admin
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_delete(staff_id=1, user=admin, db=db)
    assert exc_info.value.status_code == 400


def test_delete_staff_not_found_returns_404():
    admin = _make_user(1, "admin")
    db = MagicMock()
    # db.get(Tenant, ...) → tenant; db.get(User, ...) → None (not found)
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else None
    with _patch_tenant():
        with pytest.raises(HTTPException) as exc_info:
            asyncio_delete(staff_id=999, user=admin, db=db)
    assert exc_info.value.status_code == 404


# ─── Reset password ────────────────────────────────────────────────────────


def test_reset_staff_password_generates_new_temp():
    admin = _make_user(1, "admin")
    target = _make_user(2, "user")
    target.id = 2
    old_hash = target.password_hash
    db = MagicMock()
    db.get.side_effect = lambda model, _id: _make_tenant() if model.__name__ == "Tenant" else target
    with _patch_tenant():
        result = asyncio_reset(staff_id=2, user=admin, db=db)
    assert result["ok"] is True
    assert target.password_hash != old_hash  # changed
    assert target.is_temporary_password is True
    assert target.first_login is True


# ─── Helpers: call async endpoints ──────────────────────────────────────

def asyncio_create(body, user, db):
    import asyncio
    return asyncio.run(staff.create_staff(body, user=user, db=db))


def asyncio_get(staff_id, user, db):
    import asyncio
    return asyncio.run(staff.get_staff(staff_id, user=user, db=db))


def asyncio_update(staff_id, body, user, db):
    import asyncio
    return asyncio.run(staff.update_staff(staff_id, body=body, user=user, db=db))


def asyncio_delete(staff_id, user, db):
    import asyncio
    return asyncio.run(staff.delete_staff(staff_id, user=user, db=db))


def asyncio_reset(staff_id, user, db):
    import asyncio
    return asyncio.run(staff.reset_staff_password(staff_id, user=user, db=db))
