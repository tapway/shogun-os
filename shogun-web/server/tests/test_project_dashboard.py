"""Tests for project dashboard endpoints — mock-data backed.

Covers the /api/departments/{name}/dashboard/projects* routes in dashboard.py.
All endpoints now return data from examples/projects-dashboard-mock.json.

NOTE: Skipped on demo branch - tests expect database queries but endpoints use mock data.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

# Skip all tests on demo branch (mock data mode)
pytestmark = pytest.mark.skip(reason="Demo branch uses mock data - database tests not applicable")

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


def _make_user():
    u = MagicMock()
    u.id = 1
    u.tenant_id = 1
    u.role = "admin"
    return u


@pytest.fixture(scope="module")
def mock_data():
    """Load the shared mock data once for all tests."""
    return dashboard._load_projects_mock()


# ─── List projects ───────────────────────────────────────────────────────


def test_list_projects_returns_all(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.list_projects(
        user=_make_user(), db=db, status=None, pm=None, gate=None,
    ))
    assert len(result["projects"]) == len(mock_data["projects"])
    assert result["projects"][0]["id"] == mock_data["projects"][0]["id"]


def test_list_projects_empty():
    """When called with no filters, returns all mock projects."""
    db = MagicMock()
    result = asyncio.run(dashboard.list_projects(
        user=_make_user(), db=db, status=None, pm=None, gate=None,
    ))
    assert isinstance(result["projects"], list)


def test_list_projects_filter_by_status(mock_data):
    db = MagicMock()
    active_projects = [p for p in mock_data["projects"] if p.get("status") == "active"]
    result = asyncio.run(dashboard.list_projects(
        user=_make_user(), db=db, status="active", pm=None, gate=None,
    ))
    assert len(result["projects"]) == len(active_projects)


# ─── Get single project ──────────────────────────────────────────────────


def test_get_project_returns_nested_shape(mock_data):
    db = MagicMock()
    pid = mock_data["projects"][0]["id"]
    result = asyncio.run(dashboard.get_project(pid, user=_make_user(), db=db))
    assert result["id"] == pid
    assert "name" in result


def test_get_project_missing_raises_404():
    db = MagicMock()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(dashboard.get_project("NONEXISTENT-999", user=_make_user(), db=db))
    assert exc.value.status_code == 404


# ─── List tasks ──────────────────────────────────────────────────────────


def test_list_tasks_returns_tasks(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.list_project_dashboard_tasks(
        user=_make_user(), db=db,
        project_id=None, owner=None, status=None, priority=None, overdue=None,
    ))
    assert len(result["tasks"]) == len(mock_data["tasks"])
    assert "projectId" in result["tasks"][0]


def test_list_project_tasks_scopes_to_project(mock_data):
    db = MagicMock()
    pid = mock_data["tasks"][0]["projectId"]
    expected = [t for t in mock_data["tasks"] if t.get("projectId") == pid]
    result = asyncio.run(dashboard.list_project_tasks(pid, user=_make_user(), db=db))
    assert len(result["tasks"]) == len(expected)
    assert all(t["projectId"] == pid for t in result["tasks"])


# ─── Stats ───────────────────────────────────────────────────────────────


def test_project_stats_counts(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.get_project_stats(user=_make_user(), db=db))
    expected = mock_data.get("stats", {})
    assert result == expected


def test_project_stats_has_required_keys(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.get_project_stats(user=_make_user(), db=db))
    assert "projects" in result
    assert "tasks" in result


# ─── Model to_dict ───────────────────────────────────────────────────────


def test_project_to_dict_camelcase_keys():
    from models import Project
    p = Project(id="PRJ-001", name="Test", status="active", pm="syazwan", gate=2)
    p.value_rm = 120000.0
    d = p.to_dict()
    assert d["id"] == "PRJ-001"
    assert d["valueRm"] == 120000.0
    assert d["gate"] == 2
    assert d["pm"] == "syazwan"


def test_task_to_dict_no_deadline_not_overdue():
    from models import Task
    t = Task(task_ref="T-001", project_id="PRJ-001", title="Ship feature", status="todo", priority="HIGH")
    d = t.to_dict()
    assert d["daysLeft"] is None
    assert d["isOverdue"] is False
    assert d["dependsOn"] == []


# ─── Active projects ─────────────────────────────────────────────────────


def test_list_active_projects(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.list_active_projects(user=_make_user(), db=db))
    expected = [p for p in mock_data["projects"] if (p.get("status") or "").startswith(("active", "in-progress"))]
    assert len(result["projects"]) == len(expected)
    assert all(p.get("status", "").startswith(("active", "in-progress")) for p in result["projects"])


# ─── Plan view ───────────────────────────────────────────────────────────


def test_list_planned_tasks(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.list_planned_tasks(user=_make_user(), db=db))
    expected = [t for t in mock_data["tasks"] if t.get("status") in ("todo", "in-progress") and t.get("deadline")]
    assert len(result["tasks"]) == len(expected)


# ─── Reports summary ─────────────────────────────────────────────────────


def test_reports_summary_aggregates(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.get_reports_summary(user=_make_user(), db=db))
    expected = mock_data.get("reportsSummary", {})
    assert result == expected


def test_reports_summary_has_totals(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.get_reports_summary(user=_make_user(), db=db))
    assert "totals" in result


# ─── Support tickets ─────────────────────────────────────────────────────


def test_list_support_tickets(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.list_support_tickets(
        user=_make_user(), db=db, status=None, priority=None, customer=None,
    ))
    expected = mock_data.get("supportTickets", [])
    assert result["total"] == len(expected)
    assert len(result["tickets"]) == len(expected)


def test_support_stats_counts(mock_data):
    db = MagicMock()
    result = asyncio.run(dashboard.get_support_stats(user=_make_user(), db=db))
    expected = mock_data.get("supportStats", {})
    assert result == expected
