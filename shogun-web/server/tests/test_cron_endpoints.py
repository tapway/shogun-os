"""E2E-style tests for department cron endpoints — list, create, update, delete.

These are the /api/departments/{department_name}/crons routes defined in departments.py.
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

import departments  # noqa: E402
from models import CronJob  # noqa: E402


def _make_user(role="admin"):
    u = MagicMock()
    u.id = 1
    u.tenant_id = 1
    u.role = role
    return u


class _Result:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def all(self):
        return self._value if isinstance(self._value, list) else []


def _make_cron(cid="c1", dept="finance", name="Daily Report"):
    return CronJob(id=cid, department=dept, name=name, schedule="0 9 * * *",
                   prompt="Generate daily report", skill_id="", enabled=True,
                   deliver_channel_id="", deliver_channel_name="")


# ─── List crons ──────────────────────────────────────────────────────────


def test_list_crons_returns_list():
    admin = _make_user()
    db = MagicMock()
    cron1 = _make_cron("c1", "finance", "Report A")
    cron2 = _make_cron("c2", "finance", "Report B")
    db.execute.return_value = _Result([cron1, cron2])
    result = asyncio.run(departments.get_department_crons("finance", user=admin, db=db))
    assert result["ok"] is True
    assert len(result["crons"]) == 2
    assert result["crons"][0]["id"] == "c1"


def test_list_crons_empty_returns_empty_list():
    admin = _make_user()
    db = MagicMock()
    db.execute.return_value = _Result([])
    result = asyncio.run(departments.get_department_crons("finance", user=admin, db=db))
    assert result["ok"] is True
    assert result["crons"] == []


# ─── Create cron ─────────────────────────────────────────────────────────


def test_create_cron_persists_and_returns_with_id():
    admin = _make_user()
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    # _resolve_channel_name queries db.execute → return empty
    db.execute.return_value = _Result(None)
    body = {"name": "Daily Summary", "prompt": "Summarize today", "schedule": "0 9 * * *"}
    result = asyncio.run(departments.create_department_cron("finance", body=body, user=admin, db=db))
    assert result["ok"] is True
    assert result["cron"]["name"] == "Daily Summary"
    assert result["cron"]["id"]  # generated


def test_create_cron_missing_prompt_raises_400():
    admin = _make_user()
    db = MagicMock()
    body = {"name": "No Prompt", "prompt": ""}  # empty prompt
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(departments.create_department_cron("finance", body=body, user=admin, db=db))
    assert exc_info.value.status_code == 400


def test_create_cron_default_schedule_when_missing():
    admin = _make_user()
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    db.execute.return_value = _Result(None)
    body = {"name": "Test", "prompt": "Do thing"}
    result = asyncio.run(departments.create_department_cron("finance", body=body, user=admin, db=db))
    assert result["cron"]["schedule"] == "0 9 * * 1-5"  # default


# ─── Update cron ──────────────────────────────────────────────────────────


def test_update_cron_changes_fields():
    admin = _make_user()
    cron = _make_cron("c1", "finance", "Old Name")
    cron.enabled = True
    db = MagicMock()
    db.execute.return_value = _Result(cron)
    db.commit = MagicMock()
    db.refresh = MagicMock()
    body = {"name": "New Name", "enabled": False}
    result = asyncio.run(departments.update_department_cron("finance", "c1", body=body, user=admin, db=db))
    assert result["ok"] is True
    assert result["cron"]["name"] == "New Name"
    assert result["cron"]["enabled"] is False


def test_update_cron_not_found_returns_404():
    admin = _make_user()
    db = MagicMock()
    db.execute.return_value = _Result(None)
    body = {"name": "X"}
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(departments.update_department_cron("finance", "nonexistent", body=body, user=admin, db=db))
    assert exc_info.value.status_code == 404


# ─── Delete cron ──────────────────────────────────────────────────────────


def test_delete_cron_returns_ok():
    admin = _make_user()
    cron = _make_cron("c1", "finance", "To Delete")
    db = MagicMock()
    db.execute.return_value = _Result(cron)
    db.delete = MagicMock()
    db.commit = MagicMock()
    result = asyncio.run(departments.delete_department_cron("finance", "c1", user=admin, db=db))
    assert result["ok"] is True


def test_delete_cron_not_found_returns_404():
    admin = _make_user()
    db = MagicMock()
    db.execute.return_value = _Result(None)
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(departments.delete_department_cron("finance", "nonexistent", user=admin, db=db))
    assert exc_info.value.status_code == 404
