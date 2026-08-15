"""Regression coverage for staff activation after their first password change."""

import asyncio
import sys
from pathlib import Path

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import ChangePasswordRequest, change_password, hash_password
from departments import require_department_access
from models import User


class _SessionStub:
    def add(self, _user: User) -> None:
        pass

    def commit(self) -> None:
        pass

    def refresh(self, _user: User) -> None:
        pass


def test_change_password_first_login_staff_clears_temporary_password_status() -> None:
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
    assert staff.is_temporary_password is False


class _NoDepartmentAssignmentSessionStub:
    class _Result:
        def scalar_one_or_none(self) -> None:
            return None

    def execute(self, _statement: object) -> _Result:
        return self._Result()


def test_require_department_access_unassigned_staff_raises_forbidden() -> None:
    staff = User(
        id=101,
        tenant_id=1,
        email="staff@example.com",
        name="Staff Member",
        role="user",
    )
    admin = User(
        id=102,
        tenant_id=1,
        email="admin@example.com",
        name="Administrator",
        role="admin",
    )
    db = _NoDepartmentAssignmentSessionStub()

    try:
        require_department_access(name="finance", user=staff, db=db)
    except HTTPException as error:
        assert error.status_code == 403
    else:
        raise AssertionError("Unassigned staff must be denied department access")

    assert require_department_access(name="finance", user=admin, db=db) is admin
