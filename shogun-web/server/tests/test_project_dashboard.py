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

# ─── Active projects ─────────────────────────────────────────────────────


def test_list_active_projects():
    db = MagicMock()
    db.execute.return_value = _Result([_make_project()])
    result = asyncio.run(dashboard.list_active_projects(user=_make_user(), db=db))
    assert len(result["projects"]) == 1
    assert result["projects"][0]["status"] == "active"


# ─── Plan view ───────────────────────────────────────────────────────────


def test_list_planned_tasks():
    db = MagicMock()
    db.execute.return_value = _Result([_make_task(), _make_task("T-002")])
    result = asyncio.run(dashboard.list_planned_tasks(user=_make_user(), db=db))
    assert len(result["tasks"]) == 2


# ─── Reports summary ─────────────────────────────────────────────────────


def test_reports_summary_aggregates():
    db = MagicMock()
    proj = _make_project()
    task_done = _make_task("T-001", status="done")
    task_open = _make_task("T-002", status="todo")
    # first call: projects, second call: tasks
    db.execute.side_effect = [_Result([proj]), _Result([task_done, task_open])]
    result = asyncio.run(dashboard.get_reports_summary(user=_make_user(), db=db))
    assert result["totals"]["projects"] == 1
    assert result["totals"]["tasks"] == 2
    assert result["totals"]["openTasks"] == 1
    assert result["totals"]["activeProjects"] == 1
    assert result["projectsByPm"] == {"syazwan": 1}
    assert result["projects"][0]["completionPct"] == 50


# ─── Support tickets ─────────────────────────────────────────────────────


def test_list_support_tickets():
    from models import SupportTicket

    db = MagicMock()
    ticket = SupportTicket(id="TS-2026-001", title="Test ticket", status="Open", priority="P3")
    db.execute.return_value = _Result([ticket])
    result = asyncio.run(dashboard.list_support_tickets(user=_make_user(), db=db))
    assert result["total"] == 1
    assert result["tickets"][0]["id"] == "TS-2026-001"
    assert result["tickets"][0]["status"] == "Open"


def test_support_stats_counts():
    from models import SupportTicket

    db = MagicMock()
    tickets = [
        SupportTicket(id="TS-1", status="Open", priority="P2", customer="Acme"),
        SupportTicket(id="TS-2", status="Closed", priority="P3", customer="Acme"),
        SupportTicket(id="TS-3", status="Resolved", priority="P3", customer="Beta"),
    ]
    db.execute.return_value = _Result(tickets)
    result = asyncio.run(dashboard.get_support_stats(user=_make_user(), db=db))
    assert result["totals"]["tickets"] == 3
    assert result["totals"]["open"] == 1
    assert result["totals"]["closedOrResolved"] == 2
    assert result["byPriority"]["P3"] == 2
    assert result["topCustomers"]["Acme"] == 2
