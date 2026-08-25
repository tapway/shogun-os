#!/usr/bin/env python3
"""
Sync external project-dashboard data (projects + tasks) into the ShogunOS database.

Reads two JSON endpoints from the source project tracker and upserts them
into the portal SQLite database.

Phase 1: cross-server HTTP sync — set PROJECT_DASHBOARD_API_URL to the remote
         instance (e.g. in .env).
Phase 2: same-server — point PROJECT_DASHBOARD_API_URL at the local instance
         (e.g. http://localhost:3000); same script, different URL.

Endpoints consumed (relative to PROJECT_DASHBOARD_API_URL):
  GET /api/projects  -> list of project objects (with nested goals/risks/team/dod)
  GET /api/tasks     -> list of task objects
"""

import json
import os
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add shogun-web/server to path so `models` / `database` resolve when run
# from the repo root (matches how other scripts/ entry points are invoked).
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
SERVER_DIR = REPO_ROOT / "shogun-web" / "server"
sys.path.insert(0, str(SERVER_DIR))

from database import get_session_factory  # noqa: E402
from models import Base, DefinitionOfDone, Goal, Project, Risk, Task, TeamMember  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Source base URL. Same convention as CRM_API_URL in dashboard.py:
# no hardcoded default — configure via .env on the deployed machine.
PROJECT_DASHBOARD_API_URL = os.environ.get("PROJECT_DASHBOARD_API_URL", "").rstrip("/")


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO date string to timezone-aware datetime."""
    if not date_str:
        return None
    try:
        if "T" in date_str:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        return None


def generate_task_id(task_data: Dict[str, Any], index: int) -> str:
    """Use the source task id when present; synthesize a stable one otherwise."""
    return task_data.get("id") or f"T-{index:04d}"


def fetch_from_api(endpoint: str) -> Optional[List[Dict[str, Any]]]:
    """Fetch a JSON list from PROJECT_DASHBOARD_API_URL/api/<endpoint>."""
    import urllib.error
    import urllib.request

    url = f"{PROJECT_DASHBOARD_API_URL}/api/{endpoint}"
    logger.info("Fetching %s", url)

    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "ShogunOS-ProjectSync/1.0")
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            if not isinstance(data, list):
                logger.error("Unexpected payload from %s (expected a JSON list)", endpoint)
                return None
            logger.info("Fetched %d items from %s", len(data), endpoint)
            return data
    except urllib.error.HTTPError as e:
        logger.error("HTTP error fetching %s: %s %s", endpoint, e.code, e.reason)
        return None
    except urllib.error.URLError as e:
        logger.error("URL error fetching %s: %s", endpoint, e.reason)
        return None
    except json.JSONDecodeError as e:
        logger.error("JSON decode error for %s: %s", endpoint, e)
        return None


def sync_goals(db, project: Project, goals_data: List[Dict[str, Any]]) -> None:
    """Upsert project goals (keyed by project_id + goal ref)."""
    from sqlalchemy import select

    new_refs = {g.get("id") for g in goals_data if g.get("id")}
    for goal in list(project.goals):
        if goal.goal_ref not in new_refs:
            db.delete(goal)

    for goal_data in goals_data:
        goal_ref = goal_data.get("id")
        if not goal_ref:
            continue
        goal = db.execute(
            select(Goal).where(Goal.project_id == project.id).where(Goal.goal_ref == goal_ref)
        ).scalar_one_or_none()
        if not goal:
            goal = Goal(goal_ref=goal_ref, project_id=project.id)
            db.add(goal)
        goal.project_id = project.id
        goal.description = goal_data.get("description")
        goal.kpi = goal_data.get("kpi")
        goal.measure = goal_data.get("measure")
        goal.deadline = parse_date(goal_data.get("deadline"))
        goal.status = goal_data.get("status")


def sync_tasks(db, project: Project, tasks_data: List[Dict[str, Any]]) -> None:
    """Upsert project tasks (keyed by task id)."""
    new_ids = {generate_task_id(t, i) for i, t in enumerate(tasks_data)}
    for task in list(project.tasks):
        if task.id not in new_ids:
            db.delete(task)

    for idx, task_data in enumerate(tasks_data):
        task_id = generate_task_id(task_data, idx)
        task = db.get(Task, task_id)
        if not task:
            task = Task(id=task_id, project_id=project.id)
            db.add(task)
        task.notion_page_id = task_data.get("notionPageId")
        task.project_id = project.id
        task.project_name = project.name
        task.title = task_data.get("title")
        task.owner = task_data.get("owner")
        task.created = parse_date(task_data.get("created"))
        task.deadline = parse_date(task_data.get("deadline"))
        task.priority = task_data.get("priority")
        task.status = task_data.get("status")
        task.notes = task_data.get("notes")
        task.completed = parse_date(task_data.get("completed"))
        task.depends_on = task_data.get("dependsOn", [])


def sync_risks(db, project: Project, risks_data: List[Dict[str, Any]]) -> None:
    """Replace project risks (no stable ids in source)."""
    for risk in list(project.risks):
        db.delete(risk)
    for risk_data in risks_data:
        db.add(Risk(
            project_id=project.id,
            description=risk_data.get("description"),
            impact=risk_data.get("impact"),
            mitigation=risk_data.get("mitigation"),
        ))


def sync_team_members(db, project: Project, members_data: List[Dict[str, Any]]) -> None:
    """Replace project team members (no stable ids in source)."""
    for member in list(project.team_members):
        db.delete(member)
    for member_data in members_data:
        db.add(TeamMember(
            project_id=project.id,
            name=member_data.get("name"),
            role=member_data.get("role"),
        ))


def sync_dod_items(db, project: Project, dod_data: List[Dict[str, Any]]) -> None:
    """Replace definition-of-done items (no stable ids in source)."""
    for dod in list(project.dod_items):
        db.delete(dod)
    for dod_data in dod_data:
        db.add(DefinitionOfDone(
            project_id=project.id,
            criteria=dod_data.get("criteria"),
            acceptance=dod_data.get("acceptance"),
            uat_test_case_id=dod_data.get("uatTestCaseId"),
            passed=bool(dod_data.get("passed", False)),
        ))


def sync_projects(db, projects_data: List[Dict[str, Any]]) -> int:
    """Upsert projects and their nested data. Returns number synced."""
    synced = 0
    for proj_data in projects_data:
        project_id = proj_data.get("id")
        if not project_id:
            logger.warning("Skipping project without ID: %s", proj_data.get("name", "Unknown"))
            continue

        project = db.get(Project, project_id)
        if not project:
            project = Project(id=project_id)
            db.add(project)
            logger.info("Created project: %s", project_id)

        project.notion_page_id = proj_data.get("notionPageId")
        project.name = proj_data.get("name", "")
        project.client = proj_data.get("client")
        project.pm = proj_data.get("pm")
        project.status = proj_data.get("status")
        project.product = proj_data.get("product")
        project.value_rm = proj_data.get("valueRm")
        project.gate = proj_data.get("gate")
        project.gate_status = proj_data.get("gateStatus")
        project.start_date = parse_date(proj_data.get("startDate"))
        project.target_end = parse_date(proj_data.get("targetEnd"))
        project.actual_end = parse_date(proj_data.get("actualEnd"))
        project.charter_link = proj_data.get("charterLink")
        project.sow_link = proj_data.get("sowLink")
        project.racl_link = proj_data.get("raclLink")
        project.handover_status = proj_data.get("handoverStatus")

        sync_goals(db, project, proj_data.get("goals", []))
        sync_tasks(db, project, proj_data.get("tasks", []))
        sync_risks(db, project, proj_data.get("risks", []))
        sync_team_members(db, project, proj_data.get("teamMembers", []))
        sync_dod_items(db, project, proj_data.get("dodItems", []))
        synced += 1
    return synced


def main() -> int:
    logger.info("=" * 60)
    logger.info("Project dashboard sync")

    if not PROJECT_DASHBOARD_API_URL:
        logger.error(
            "PROJECT_DASHBOARD_API_URL is not set. Configure it in .env "
            "(same convention as CRM_API_URL)."
        )
        return 2

    logger.info("API URL: %s", PROJECT_DASHBOARD_API_URL)

    projects_data = fetch_from_api("projects")
    if projects_data is None:
        logger.error("Failed to fetch projects data")
        return 1

    tasks_data = fetch_from_api("tasks")
    if tasks_data is None:
        logger.error("Failed to fetch tasks data")
        return 1

    logger.info("Fetched %d projects, %d tasks", len(projects_data), len(tasks_data))

    # Attach tasks to their projects
    tasks_by_project: Dict[str, List[Dict[str, Any]]] = {}
    for task in tasks_data:
        proj_id = task.get("projectId") or task.get("project")
        if proj_id:
            tasks_by_project.setdefault(proj_id, []).append(task)
    for proj in projects_data:
        proj_id = proj.get("id")
        if proj_id and proj_id in tasks_by_project:
            proj["tasks"] = tasks_by_project[proj_id]

    try:
        SessionLocal = get_session_factory()
        db = SessionLocal()
        try:
            # Ensure project-dashboard tables exist (no-op if already present)
            Base.metadata.create_all(bind=db.get_bind())
            synced_count = sync_projects(db, projects_data)
            db.commit()
            logger.info("Successfully synced %d projects", synced_count)
            return 0
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as e:
        logger.exception("Database error: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
