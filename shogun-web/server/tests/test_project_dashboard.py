"""Tests for project dashboard endpoints — models, filters, stats.

Covers the /api/departments/{name}/dashboard/projects* routes in dashboard.py
and the Project/Task model round-trips.
"""

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
from models import Project, Task  # noqa: E402


def _make_user():
    u = MagicMock()
    u.id = 1
    u.tenant_id = 1
    u.role = "admin"
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


def _make_project(pid="PRJ-001", name="Test Project", status="active", pm="syazwan", gate=2):
    return Project(id=pid, name=name, status=status, pm=pm, gate=gate)


def _make_task(ref="T-001", pid="PRJ-001", title="Ship feature", status="todo", priority="HIGH"):
    return Task(task_ref=ref, project_id=pid, title=title, status=status, priority=priority)


# ─── List projects ───────────────────────────────────────────────────────


def test_list_projects_returns_all():
    db = MagicMock()
    db.execute.return_value = _Result([_make_project(), _make_project("PRJ-002", "Other")])
    result = asyncio.run(dashboard.list_projects(user=_make_user(), db=db))
    assert len(result["projects"]) == 2
    assert result["projects"][0]["id"] == "PRJ-001"
    assert result["projects"][0]["name"] == "Test Project"


def test_list_projects_empty():
    db = MagicMock()
    db.execute.return_value = _Result([])
    result = asyncio.run(dashboard.list_projects(user=_make_user(), db=db))
    assert result["projects"] == []


# ─── Get single project ──────────────────────────────────────────────────


def test_get_project_returns_nested_shape():
    db = MagicMock()
    db.get.return_value = _make_project()
    result = asyncio.run(dashboard.get_project("PRJ-001", user=_make_user(), db=db))
    assert result["id"] == "PRJ-001"
    assert result["goals"] == []
    assert result["tasks"] == []
    assert result["risks"] == []


def test_get_project_missing_raises_404():
    db = MagicMock()
    db.get.return_value = None
    with pytest.raises(HTTPException) as exc:
        asyncio.run(dashboard.get_project("PRJ-999", user=_make_user(), db=db))
    assert exc.value.status_code == 404


# ─── List tasks ──────────────────────────────────────────────────────────


def test_list_tasks_returns_tasks():
    db = MagicMock()
    db.execute.return_value = _Result([_make_task(), _make_task("T-002")])
    result = asyncio.run(dashboard.list_project_dashboard_tasks(user=_make_user(), db=db))
    assert len(result["tasks"]) == 2
    # Composite id: <projectId>-<taskRef>
    assert result["tasks"][0]["id"] == "PRJ-001-T-001"
    assert result["tasks"][0]["taskRef"] == "T-001"
    assert result["tasks"][0]["projectId"] == "PRJ-001"


def test_list_project_tasks_scopes_to_project():
    db = MagicMock()
    db.execute.return_value = _Result([_make_task()])
    result = asyncio.run(dashboard.list_project_tasks("PRJ-001", user=_make_user(), db=db))
    assert len(result["tasks"]) == 1
    assert result["tasks"][0]["projectId"] == "PRJ-001"


# ─── Stats ───────────────────────────────────────────────────────────────


def test_project_stats_counts():
    db = MagicMock()
    # 5 scalar() calls: total projects, active, total tasks, completed, overdue
    db.execute.return_value = MagicMock(scalar=MagicMock(side_effect=[46, 27, 490, 303, 12]))
    result = asyncio.run(dashboard.get_project_stats(user=_make_user(), db=db))
    assert result == {
        "projects": {"total": 46, "active": 27},
        "tasks": {"total": 490, "completed": 303, "overdue": 12},
    }


def test_project_stats_none_defaults_to_zero():
    db = MagicMock()
    db.execute.return_value = MagicMock(scalar=MagicMock(side_effect=[None, None, None, None, None]))
    result = asyncio.run(dashboard.get_project_stats(user=_make_user(), db=db))
    assert result["projects"]["total"] == 0
    assert result["tasks"]["overdue"] == 0


# ─── Model to_dict ───────────────────────────────────────────────────────


def test_project_to_dict_camelcase_keys():
    p = _make_project()
    p.value_rm = 120000.0
    d = p.to_dict()
    assert d["id"] == "PRJ-001"
    assert d["valueRm"] == 120000.0
    assert d["gate"] == 2
    assert d["pm"] == "syazwan"


def test_task_to_dict_no_deadline_not_overdue():
    t = _make_task()
    d = t.to_dict()
    assert d["daysLeft"] is None
    assert d["isOverdue"] is False
    assert d["dependsOn"] == []
