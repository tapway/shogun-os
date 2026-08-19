"""E2E-style tests for department access control and secret redaction.

Extends the existing test_require_department_access_unassigned_staff_raises_forbidden
in test_staff_access_and_activation.py with admin/owner bypass, staff-with-assignment,
and provider_config secret redaction.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

from departments import _redact_provider_config, require_department_access  # noqa: E402
from models import User  # noqa: E402


def _make_user(uid: int, role: str) -> User:
    return User(id=uid, tenant_id=1, email=f"{role}@example.com",
                name=role.title(), role=role, source="manual")


class _NoAssignmentResult:
    def scalar_one_or_none(self):
        return None


class _HasAssignmentResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _StubDB:
    def __init__(self, assignment=None):
        self._assignment = assignment

    def execute(self, _stmt):
        if self._assignment is None:
            return _NoAssignmentResult()
        return _HasAssignmentResult(self._assignment)


# ─── Bypass tests ─────────────────────────────────────────────────────────


def test_require_department_access_admin_bypasses():
    """Admin role must bypass the DB query entirely."""
    admin = _make_user(1, "admin")
    db = _StubDB(assignment=None)  # would fail if queried
    result = require_department_access(name="finance", user=admin, db=db)
    assert result is admin


def test_require_department_access_owner_bypasses():
    """Owner role must bypass the DB query entirely."""
    owner = _make_user(2, "owner")
    db = _StubDB(assignment=None)
    result = require_department_access(name="finance", user=owner, db=db)
    assert result is owner


# ─── Staff with/without assignment ───────────────────────────────────────


def test_require_department_access_staff_with_assignment_passes():
    """Staff with matching UserDepartment row must pass."""
    staff = _make_user(101, "user")
    assignment = MagicMock()  # truthy — represents a UserDepartment row
    db = _StubDB(assignment=assignment)
    result = require_department_access(name="finance", user=staff, db=db)
    assert result is staff


def test_require_department_access_staff_wrong_department_raises_403():
    """Staff assigned to 'sales' must be denied access to 'finance'."""
    staff = _make_user(102, "user")
    db = _StubDB(assignment=None)  # no matching assignment
    with pytest.raises(HTTPException) as exc_info:
        require_department_access(name="finance", user=staff, db=db)
    assert exc_info.value.status_code == 403


# ─── Secret redaction ─────────────────────────────────────────────────────


def test_redact_provider_config_masks_api_key():
    cfg = {"api_key": "sk-secret-123", "model": "gpt-4"}
    redacted = _redact_provider_config(cfg)
    assert redacted["api_key"] == "***"
    assert redacted["model"] == "gpt-4"  # non-secret preserved


def test_redact_provider_config_masks_bot_token():
    cfg = {"bot_token": "xoxb-secret", "webhook_url": "https://hooks.example.com"}
    redacted = _redact_provider_config(cfg)
    assert redacted["bot_token"] == "***"
    assert redacted["webhook_url"] == "https://hooks.example.com"


def test_redact_provider_config_empty_or_none():
    assert _redact_provider_config(None) == {}
    assert _redact_provider_config({}) == {}


def test_redact_provider_config_preserves_non_secret_keys():
    cfg = {"provider": "openrouter", "model": "claude-3", "base_url": "https://api.example.com"}
    redacted = _redact_provider_config(cfg)
    assert redacted["provider"] == "openrouter"
    assert redacted["model"] == "claude-3"
    assert redacted["base_url"] == "https://api.example.com"
