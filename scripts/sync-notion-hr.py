#!/usr/bin/env python3
"""sync-notion-hr.py — Sync Notion HR workspace into ShogunOS SQLite + gbrain.

Pulls all 8 databases from the Notion HR dashboard, downloads file attachments,
upserts rows into the ShogunOS portal SQLite DB, and writes employee profiles
to the gbrain hr/ source as brain pages.

Usage:
    export NOTION_API_KEY=ntn_...
    python scripts/sync-notion-hr.py                # sync all
    python scripts/sync-notion-hr.py --verify        # verify formulas match
    python scripts/sync-notion-hr.py --dry-run       # show counts, no writes
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError
from urllib.request import Request, urlopen

# ── Config ──────────────────────────────────────────────────────────────
NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
NOTION_VERSION = "2025-09-03"
HR_ROOT_PAGE_ID = "17574108-5eae-802d-9802-d03bc9f1e113"

# Data source IDs (discovered via API exploration)
DATA_SOURCES = {
    "employee_directory": "17574108-5eae-8159-bb1b-000ba3fe4b5c",
    "job_openings":       "17574108-5eae-8181-af00-000b01e0519a",
    "job_secured":        "1b574108-5eae-8167-97af-000b159f63ea",
    "hiring_board":       "1a474108-5eae-805d-afe0-000ba2e6a5e3",
    "internship_hiring":  "1ae74108-5eae-81e5-b051-000b40acc8ac",
    "freelancer_hiring":  "1af74108-5eae-81a2-b4e3-000b298a5db2",
    "virtual_bench":      "1c174108-5eae-813e-a0c6-000bdd13acec",
    "onboarding_task":    "17574108-5eae-81e7-8132-000b9e1635b8",
    "performance_review": "17574108-5eae-8127-bffc-000b322b524a",
    "equipment_tracker":  "17574108-5eae-81f8-8158-000b0a490ab8",
    "training_dev":       "17574108-5eae-8141-a743-000b41e6bc21",
    "trainer_details":    "17574108-5eae-8140-ad23-000b3cc9bad3",
    "meeting_minutes":    "17574108-5eae-8136-8194-000bdb29206e",
    "meeting_action_items": "17574108-5eae-81a7-b1ca-000b77bad9c7",
    "meeting_attendees":  "17574108-5eae-815d-9059-000b14470dd1",
}

ASSET_DIR = Path.home() / ".shogun-os" / "hr-assets"
SHOGUN_DB_PATH = Path.home() / ".shogun-os" / "web.db"

# Add server dir to path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
SERVER_DIR = SCRIPT_DIR.parent / "shogun-web" / "server"
sys.path.insert(0, str(SERVER_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("notion-hr-sync")


# ── Notion API helpers ──────────────────────────────────────────────────

def _headers() -> dict:
    if not NOTION_API_KEY:
        raise RuntimeError("NOTION_API_KEY env var not set")
    return {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _post(url: str, body: dict) -> dict:
    req = Request(url, data=json.dumps(body).encode(), headers=_headers(), method="POST")
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def _get(url: str) -> dict:
    req = Request(url, headers=_headers(), method="GET")
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def query_data_source(ds_id: str) -> List[dict]:
    """Fetch ALL rows from a Notion data source, paginating."""
    all_rows: List[dict] = []
    cursor = None
    while True:
        body: dict = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        data = _post(f"https://api.notion.com/v1/data_sources/{ds_id}/query", body)
        all_rows.extend(data.get("results", []))
        if data.get("has_more") and data.get("next_cursor"):
            cursor = data["next_cursor"]
            time.sleep(0.4)  # respect rate limit
        else:
            break
    return all_rows


# ── Property extractors ─────────────────────────────────────────────────

def prop_str(row: dict, name: str) -> str:
    """Extract string from select/status/rich_text/title property."""
    p = row.get("properties", {}).get(name, {})
    ptype = p.get("type", "")
    if ptype == "title" and p.get("title"):
        return p["title"][0].get("plain_text", "") if p["title"] else ""
    if ptype == "rich_text" and p.get("rich_text"):
        return p["rich_text"][0].get("plain_text", "") if p["rich_text"] else ""
    if ptype == "select" and p.get("select"):
        return p["select"].get("name", "")
    if ptype == "status" and p.get("status"):
        return p["status"].get("name", "")
    if ptype == "email" and p.get("email"):
        return p["email"]
    if ptype == "phone_number" and p.get("phone_number"):
        return p["phone_number"]
    if ptype == "url" and p.get("url"):
        return p["url"]
    return ""


def prop_title(row: dict, name: str = "Name") -> str:
    """Extract the title property value — finds it by type, not by name.

    Some Notion databases (e.g. the Internship Hiring Tracker) have the title
    property named as an empty string '', so looking it up by name fails.
    This function first tries the given name, then falls back to finding
    any property of type 'title'.
    """
    props = row.get("properties", {})
    # Try exact name match first
    p = props.get(name, {})
    if p.get("type") == "title" and p.get("title"):
        return p["title"][0].get("plain_text", "") if p["title"] else ""
    # Fallback: find any property of type 'title'
    for pname, pval in props.items():
        if pval.get("type") == "title" and pval.get("title"):
            return pval["title"][0].get("plain_text", "") if pval["title"] else ""
    return ""


def prop_multi(row: dict, name: str) -> str:
    """Extract comma-joined string from multi_select."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "multi_select" and p.get("multi_select"):
        return ", ".join(o.get("name", "") for o in p["multi_select"])
    return ""


def prop_people_name(row: dict, name: str) -> str:
    """Extract first person's name from a people property."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "people" and p.get("people"):
        return p["people"][0].get("name", "")
    return ""


def prop_date(row: dict, name: str) -> str:
    """Extract date string from date property."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "date" and p.get("date"):
        return p["date"].get("start", "") or ""
    if p.get("type") == "created_time" and p.get("created_time"):
        return p["created_time"]
    if p.get("type") == "last_edited_time" and p.get("last_edited_time"):
        return p["last_edited_time"]
    return ""


def prop_number(row: dict, name: str) -> Optional[float]:
    """Extract number from number property."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "number":
        return p.get("number")
    return None


def prop_bool(row: dict, name: str) -> bool:
    """Extract bool from checkbox property."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "checkbox":
        return bool(p.get("checkbox"))
    return False


def prop_file_url(row: dict, name: str) -> str:
    """Extract first file URL from files property (Notion-hosted S3, expiring)."""
    p = row.get("properties", {}).get(name, {})
    if p.get("type") == "files" and p.get("files"):
        f = p["files"][0]
        if f.get("type") == "file":
            return f.get("file", {}).get("url", "")
        if f.get("type") == "external":
            return f.get("external", {}).get("url", "")
    return ""


# ── Sync logic ──────────────────────────────────────────────────────────

def sync_employees(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Employee Directory rows into hr_employees."""
    from models import HrEmployee
    stats = {"table": "hr_employees", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrEmployee).filter(HrEmployee.notion_page_id == nid).first()
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "employees_name": prop_people_name(row, "Employees Name"),
                "department": prop_str(row, "Department"),
                "role": prop_str(row, "Role"),
                "manager_name": prop_people_name(row, "Manager") or None,
                "date_of_hire": prop_date(row, "Date of Hire") or None,
                "phone_number": prop_str(row, "Phone Number") or None,
                "linkedin_profile": prop_str(row, "LinkedIn Profile") or None,
                "q1": prop_str(row, "Q1") or None,
                "q2": prop_str(row, "Q2") or None,
                "q3": prop_str(row, "Q3") or None,
                "q4": prop_str(row, "Q4") or None,
                "leave_taken": prop_str(row, "Leave Taken") or None,
            }
            # Profile picture: store the raw external URL for the portal UI
            # and only download real hosted (Notion S3) files. Drive viewer
            # links are turned into thumbnails by the frontend.
            pic_url = prop_file_url(row, "Profile Picture")
            data["profile_picture_url"] = pic_url or None
            data["profile_picture_path"] = None
            if pic_url and ("amazonaws.com" in pic_url or "notion-static.com" in pic_url):
                data["profile_picture_path"] = _download_asset(pic_url, f"employees/{nid}_pic")
            file_url = prop_file_url(row, "Employee File")
            # Store the raw link (Notion external URL, e.g. Google Drive) for
            # the portal UI. Only attempt a local download for real hosted files.
            data["employee_file_url"] = file_url or None
            if file_url and ("amazonaws.com" in file_url or "notion-static.com" in file_url):
                data["employee_file_path"] = _download_asset(file_url, f"employees/{nid}_file")

            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrEmployee(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_job_openings(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Job Openings rows into hr_job_openings.

    Also handles Job Secured (same schema, status='Hired').
    """
    from models import HrJobOpening
    stats = {"table": "hr_job_openings", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrJobOpening).filter(HrJobOpening.notion_page_id == nid).first()
            budget = prop_number(row, "Budget (Max)")
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "job_title": prop_str(row, "Job Title ") or prop_str(row, "Job Title"),
                "job_status": prop_str(row, "Job Status") or "Not Initiated",
                "department": prop_multi(row, "Department"),
                "employment_type": prop_str(row, "Employment Type"),
                "experience": prop_str(row, "Experience"),
                "budget_max": budget,
                "hiring_manager": prop_people_name(row, "Hiring Manager") or None,
                "application_start": prop_date(row, "Application Start") or None,
                "job_description": prop_str(row, "Job Description") or None,
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrJobOpening(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_candidates(rows: list, db, tenant_id: int, dry_run: bool = False, candidate_type: str = "fulltime") -> dict:
    """Upsert Hiring Board rows into hr_candidates.

    candidate_type: fulltime, internship, freelancer, or virtual_bench.
    Property names vary slightly between trackers (e.g. 'Screening Answers'
    vs 'Screening Answer', 'HR Review?' vs 'HR Review'). We try both.
    """
    from models import HrCandidate
    stats = {"table": f"hr_candidates ({candidate_type})", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrCandidate).filter(HrCandidate.notion_page_id == nid).first()
            # Try both property name variants
            screening = prop_str(row, "Screening Answers") or prop_str(row, "Screening Answer")
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "name": prop_title(row, "Name"),
                "email": prop_str(row, "Email") or None,
                "phone_no": prop_str(row, "Phone No.") or None,
                "role": prop_str(row, "Role") or None,
                "status": prop_str(row, "Status") or "Screening - Pending",
                "source": prop_str(row, "Source") or None,
                "resume_url": prop_str(row, "Resume") or None,
                "screening_answers_url": screening or None,
                "candidate_type": candidate_type,
                "date_entry": prop_date(row, "Date Entry") or None,
                "last_edited": prop_date(row, "Last Edited") or None,
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrCandidate(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_onboarding(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Onboarding tasks into hr_onboarding_tasks."""
    from models import HrOnboardingTask
    stats = {"table": "hr_onboarding_tasks", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrOnboardingTask).filter(HrOnboardingTask.notion_page_id == nid).first()
            days = prop_number(row, "Days")
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "staff_name": prop_str(row, "Staff Name"),
                "department": prop_str(row, "Department"),
                "start_date": prop_date(row, "Start Date") or None,
                "end_date": prop_date(row, "End Date") or None,
                "status": prop_str(row, "Status") or "Not started",
                "days": int(days) if days is not None else None,
                "assigned_to": prop_people_name(row, "Assigned to Employee") or None,
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrOnboardingTask(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_performance(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Performance Reviews into hr_performance_reviews."""
    from models import HrPerformanceReview
    stats = {"table": "hr_performance_reviews", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrPerformanceReview).filter(HrPerformanceReview.notion_page_id == nid).first()
            # Employee Name from Directory is a relation — we can't easily resolve FK
            # without cross-DB lookup, so store the relation ID for now.
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "quarterly_performance": prop_str(row, "Quarterly performance"),
                "department": prop_str(row, "Department") or None,
                "performance_rating": prop_str(row, "Performance Rating") or None,
                "performance_level": prop_str(row, "Performance Level ") or None,
                "review_date": prop_date(row, "Review Date") or None,
                "areas_of_improvement": prop_str(row, "Areas of Improvement") or None,
                "action_items": prop_multi(row, "Action Items/Next goals") or None,
            }
            # Download attachments
            att_url = prop_file_url(row, "Attachments")
            if att_url:
                data["attachments_path"] = _download_asset(att_url, f"reviews/{nid}_att")
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrPerformanceReview(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_equipment(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Equipment Tracker into hr_equipment."""
    from models import HrEquipment
    stats = {"table": "hr_equipment", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrEquipment).filter(HrEquipment.notion_page_id == nid).first()
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "equipment_name": prop_str(row, "Equipment name"),
                "category": prop_multi(row, "Category"),
                "condition": prop_str(row, "Condition") or None,
                "assigned_to": prop_str(row, "Assigned to ") or None,
                "purchase_date": prop_date(row, "Purchase Date") or None,
                "return_due_date": prop_date(row, "Return Due date") or None,
            }
            loan_url = prop_file_url(row, "Loan Document")
            if loan_url:
                data["loan_document_path"] = _download_asset(loan_url, f"equipment/{nid}_loan")
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrEquipment(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_training(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Training and Development into hr_training."""
    from models import HrTraining
    stats = {"table": "hr_training", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrTraining).filter(HrTraining.notion_page_id == nid).first()
            charges = prop_number(row, "Training Charges")
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "training_name": prop_str(row, "Training name"),
                "staff_name": prop_people_name(row, "Staff Name") or None,
                "training_format": prop_str(row, "Training Format") or None,
                "start_date": prop_date(row, "Start Date") or None,
                "end_date": prop_date(row, "Training End Date") or None,
                "training_charges": charges,
                "exam_included": prop_bool(row, "Exam Included"),
                "bond_agreement": prop_bool(row, "Bond Agreement"),
                "feedback_form_url": prop_str(row, "Feedback Form URL") or None,
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrTraining(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_trainers(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Trainer Details into hr_trainers."""
    from models import HrTrainer
    stats = {"table": "hr_trainers", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrTrainer).filter(HrTrainer.notion_page_id == nid).first()
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "name": prop_str(row, "Name"),
                "specialization": prop_multi(row, "Specialization"),
                "contact_email": prop_str(row, "Contact Email") or None,
                "phone_number": prop_str(row, "Phone Number") or None,
                "trainer_pic": prop_str(row, "Trainer Pic") or None,
            }
            quote_url = prop_file_url(row, "Trainer Quotation")
            if quote_url:
                data["trainer_quotation_path"] = _download_asset(quote_url, f"trainers/{nid}_quote")
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrTrainer(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_meetings(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Meeting Minutes into hr_meetings."""
    from models import HrMeeting
    stats = {"table": "hr_meetings", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrMeeting).filter(HrMeeting.notion_page_id == nid).first()
            duration = prop_number(row, "Meeting Duration")
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "meeting_title": prop_title(row, "Meeting title"),
                "meeting_organizer": prop_people_name(row, "Meeting Organizer") or None,
                "meeting_duration": duration,
                "meeting_date": prop_date(row, "Meeting Date") or None,
                "follow_up_date": prop_date(row, "Follow-up Date") or None,
                "meeting_status": prop_str(row, "Meeting Status") or "Scheduled",
                "meeting_type": prop_multi(row, "Meeting Type"),
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrMeeting(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_meeting_action_items(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Meeting Action Items into hr_meeting_action_items."""
    from models import HrMeetingActionItem
    stats = {"table": "hr_meeting_action_items", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrMeetingActionItem).filter(HrMeetingActionItem.notion_page_id == nid).first()
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "action_description": prop_title(row, "Action Description"),
                "action_id": prop_str(row, "Action ID") or None,
                "action_owner": prop_people_name(row, "Action Owner") or None,
                "due_date": prop_date(row, "Due Date") or None,
                "status": prop_str(row, "Status") or "Open",
                "action_feedback": prop_str(row, "Action Feedback") or None,
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrMeetingActionItem(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


def sync_meeting_attendees(rows: list, db, tenant_id: int, dry_run: bool = False) -> dict:
    """Upsert Attendees and Absentees into hr_meeting_attendees."""
    from models import HrMeetingAttendee
    stats = {"table": "hr_meeting_attendees", "fetched": len(rows), "created": 0, "updated": 0, "errors": []}
    if dry_run:
        return stats
    for row in rows:
        try:
            nid = row["id"]
            existing = db.query(HrMeetingAttendee).filter(HrMeetingAttendee.notion_page_id == nid).first()
            data = {
                "tenant_id": tenant_id,
                "notion_page_id": nid,
                "name": prop_title(row, "Name"),
                "email": prop_str(row, "Email") or None,
                "department": prop_multi(row, "Department"),
                "status": prop_str(row, "Status"),
            }
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                stats["updated"] += 1
            else:
                db.add(HrMeetingAttendee(**data))
                stats["created"] += 1
        except Exception as e:
            stats["errors"].append(f"row {row.get('id','?')}: {e}")
    db.commit()
    return stats


# ── Asset download ─────────────────────────────────────────────────────

def _download_asset(url: str, basename: str) -> str:
    """Download a file from Notion S3 to local disk. Returns relative path."""
    if not url:
        return ""
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    # Determine extension from URL or default
    ext = ".png"
    lower = url.lower()
    for e in [".jpg", ".jpeg", ".png", ".pdf", ".webp", ".docx", ".xlsx"]:
        if e in lower:
            ext = e
            break
    filepath = ASSET_DIR / f"{basename}{ext}"
    if filepath.exists():
        return str(filepath)
    try:
        req = Request(url, headers={"User-Agent": "shogun-hr-sync/1.0"})
        with urlopen(req, timeout=30) as resp:
            filepath.write_bytes(resp.read())
        return str(filepath)
    except Exception as e:
        logger.warning("Failed to download asset %s: %s", basename, e)
        return ""


# ── gbrain sync ─────────────────────────────────────────────────────────

def sync_to_gbrain(db, tenant_id: int) -> dict:
    """Write employee profiles to gbrain hr/ source as brain pages."""
    from models import HrEmployee
    gbrain_hr_dir = Path.home() / "brain" / "hr"
    gbrain_hr_dir.mkdir(parents=True, exist_ok=True)
    employees = db.query(HrEmployee).filter(HrEmployee.tenant_id == tenant_id).all()
    written = 0
    for emp in employees:
        slug = emp.employees_name.lower().replace(" ", "-").replace("/", "-") or f"emp-{emp.id}"
        # Avoid duplicate pages — use notion_page_id in frontmatter
        slug = f"employee-{slug}"
        page_path = gbrain_hr_dir / f"{slug}.md"
        content = f"""---
type: person
notion_page_id: {emp.notion_page_id}
name: {emp.employees_name}
department: {emp.department}
role: {emp.role}
manager: {emp.manager_name or ''}
date_of_hire: {emp.date_of_hire or ''}
phone: {emp.phone_number or ''}
linkedin: {emp.linkedin_profile or ''}
---

# {emp.employees_name}

- **Department:** {emp.department}
- **Role:** {emp.role}
- **Manager:** {emp.manager_name or 'N/A'}
- **Date of Hire:** {emp.date_of_hire or 'N/A'}
- **Phone:** {emp.phone_number or 'N/A'}
- **LinkedIn:** {emp.linkedin_profile or 'N/A'}

## Quarterly Performance
- Q1: {emp.q1 or 'N/A'}
- Q2: {emp.q2 or 'N/A'}
- Q3: {emp.q3 or 'N/A'}
- Q4: {emp.q4 or 'N/A'}

## Leave
{emp.leave_taken or 'No leave data'}
"""
        page_path.write_text(content, encoding="utf-8")
        written += 1
    return {"table": "gbrain_hr_pages", "written": written}


# ── Verify formulas ─────────────────────────────────────────────────────

def verify_formulas(db, tenant_id: int) -> dict:
    """Verify our computed formula values match what Notion returned."""
    from models import HrEmployee, HrJobOpening, HrOnboardingTask
    results = {"checks": [], "passed": 0, "failed": 0}

    # 1. No. of Years (Employee Directory) — corrected tenure
    emps = db.query(HrEmployee).filter(HrEmployee.tenant_id == tenant_id).all()
    for emp in emps[:3]:
        d = emp.to_dict()
        if emp.date_of_hire:
            parts = emp.date_of_hire.split("-")
            hire = date(int(parts[0]), int(parts[1]), int(parts[2]))
            today = date.today()
            expected = today.year - hire.year
            if (today.month, today.day) < (hire.month, hire.day):
                expected -= 1
            expected = max(expected, 0)
            ok = d["no_of_years"] == expected
            results["checks"].append({
                "formula": "No. of Years",
                "entity": emp.employees_name,
                "expected": expected,
                "actual": d["no_of_years"],
                "passed": ok,
            })
            results["passed" if ok else "failed"] += 1

    # 2. Deadline + Days Left + Overdue (Job Openings)
    jobs = db.query(HrJobOpening).filter(HrJobOpening.tenant_id == tenant_id).all()
    for job in jobs[:3]:
        d = job.to_dict()
        if job.application_start:
            parts = job.application_start.split("-")
            start = date(int(parts[0]), int(parts[1]), int(parts[2]))
            expected_deadline = start + timedelta(days=90)
            ok_deadline = d["deadline"] == expected_deadline.isoformat()
            results["checks"].append({
                "formula": "Deadline",
                "entity": job.job_title,
                "expected": expected_deadline.isoformat(),
                "actual": d["deadline"],
                "passed": ok_deadline,
            })
            results["passed" if ok_deadline else "failed"] += 1

            expected_days = (expected_deadline - date.today()).days
            ok_days = d["days_left"] == expected_days
            results["checks"].append({
                "formula": "Days Left",
                "entity": job.job_title,
                "expected": expected_days,
                "actual": d["days_left"],
                "passed": ok_days,
            })
            results["passed" if ok_days else "failed"] += 1

            expected_overdue = "Overdue" if expected_days < 0 else None
            ok_overdue = d["overdue"] == expected_overdue
            results["checks"].append({
                "formula": "Overdue",
                "entity": job.job_title,
                "expected": expected_overdue,
                "actual": d["overdue"],
                "passed": ok_overdue,
            })
            results["passed" if ok_overdue else "failed"] += 1

    # 3. Task Status (Onboarding)
    tasks = db.query(HrOnboardingTask).filter(HrOnboardingTask.tenant_id == tenant_id).all()
    status_map = {
        "In progress": "🟡 Task Ongoing",
        "Done": "✅ Task Completed",
        "Not started": "⚪ Not started",
    }
    for task in tasks[:3]:
        d = task.to_dict()
        expected = status_map.get(task.status, "⚪ Not started")
        ok = d["task_status"] == expected
        results["checks"].append({
            "formula": "Task Status",
            "entity": task.staff_name,
            "expected": expected,
            "actual": d["task_status"],
            "passed": ok,
        })
        results["passed" if ok else "failed"] += 1

    return results


# ── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync Notion HR → ShogunOS")
    parser.add_argument("--verify", action="store_true", help="Verify formulas only")
    parser.add_argument("--dry-run", action="store_true", help="Show counts, no writes")
    args = parser.parse_args()

    if not NOTION_API_KEY:
        print("ERROR: Set NOTION_API_KEY env var first", file=sys.stderr)
        sys.exit(1)

    # Init DB
    from database import init_db, get_engine, get_primary_tenant
    from database import Session as DbSession
    from models import Base
    from sqlalchemy import create_engine

    db_path = SHOGUN_DB_PATH
    if not db_path.exists():
        # Fallback: try portal default location
        db_path = Path.home() / ".shogun-os" / "portal.db"
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(bind=engine)
    db = DbSession(engine)

    # Get or create primary tenant
    tenant = get_primary_tenant(db)
    if not tenant:
        from models import Tenant
        tenant = Tenant(subdomain="default", company_name="Shogun OS", timezone="UTC", status="active")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    tenant_id = tenant.id

    if args.verify:
        print("\n=== FORMULA VERIFICATION ===")
        results = verify_formulas(db, tenant_id)
        for check in results["checks"]:
            status = "✓" if check["passed"] else "✗"
            print(f"  {status} {check['formula']} ({check['entity']}): expected={check['expected']!r} actual={check['actual']!r}")
        print(f"\nPassed: {results['passed']}, Failed: {results['failed']}")
        return

    print(f"\n{'='*60}")
    print(f"Notion HR → ShogunOS Sync {'(DRY RUN)' if args.dry_run else '(LIVE)'}")
    print(f"{'='*60}")

    all_stats = []

    # Fetch + sync each database.
    # hiring trackers each need a candidate_type argument, so we handle
    # them separately from the simple single-arg syncs.
    simple_syncs = [
        ("employee_directory", sync_employees),
        ("job_openings", sync_job_openings),
        ("job_secured", sync_job_openings),  # same schema, goes into hr_job_openings too
        ("onboarding_task", sync_onboarding),
        ("performance_review", sync_performance),
        ("equipment_tracker", sync_equipment),
        ("training_dev", sync_training),
        ("trainer_details", sync_trainers),
        ("meeting_minutes", sync_meetings),
        ("meeting_action_items", sync_meeting_action_items),
        ("meeting_attendees", sync_meeting_attendees),
    ]
    hiring_trackers = [
        ("hiring_board", "fulltime"),
        ("internship_hiring", "internship"),
        ("freelancer_hiring", "freelancer"),
        ("virtual_bench", "virtual_bench"),
    ]

    all_stats = []

    for ds_key, sync_fn in simple_syncs:
        ds_id = DATA_SOURCES[ds_key]
        print(f"\n→ Fetching {ds_key}...")
        try:
            rows = query_data_source(ds_id)
            print(f"  Fetched {len(rows)} rows")
            stats = sync_fn(rows, db, tenant_id, dry_run=args.dry_run)
            all_stats.append(stats)
            print(f"  Created: {stats['created']}, Updated: {stats['updated']}")
            if stats["errors"]:
                print(f"  Errors: {len(stats['errors'])}")
                for e in stats["errors"][:3]:
                    print(f"    - {e}")
        except HTTPError as e:
            print(f"  ERROR: HTTP {e.code} — {e.read().decode()[:200]}")
            all_stats.append({"table": ds_key, "fetched": 0, "created": 0, "updated": 0, "errors": [str(e)]})

    for ds_key, ctype in hiring_trackers:
        ds_id = DATA_SOURCES[ds_key]
        print(f"\n→ Fetching {ds_key} ({ctype})...")
        try:
            rows = query_data_source(ds_id)
            print(f"  Fetched {len(rows)} rows")
            stats = sync_candidates(rows, db, tenant_id, dry_run=args.dry_run, candidate_type=ctype)
            all_stats.append(stats)
            print(f"  Created: {stats['created']}, Updated: {stats['updated']}")
            if stats["errors"]:
                print(f"  Errors: {len(stats['errors'])}")
                for e in stats["errors"][:3]:
                    print(f"    - {e}")
        except HTTPError as e:
            print(f"  ERROR: HTTP {e.code} — {e.read().decode()[:200]}")
            all_stats.append({"table": ds_key, "fetched": 0, "created": 0, "updated": 0, "errors": [str(e)]})

    # gbrain sync
    if not args.dry_run:
        print(f"\n→ Writing employee profiles to gbrain hr/...")
        gb_stats = sync_to_gbrain(db, tenant_id)
        all_stats.append(gb_stats)
        print(f"  Written: {gb_stats['written']} brain pages")

    # Summary
    print(f"\n{'='*60}")
    print("SYNC SUMMARY")
    print(f"{'='*60}")
    total_created = sum(s.get("created", 0) for s in all_stats)
    total_updated = sum(s.get("updated", 0) for s in all_stats)
    total_errors = sum(len(s.get("errors", [])) for s in all_stats)
    for s in all_stats:
        print(f"  {s.get('table','?'):30s}  fetched={s.get('fetched',0):4d}  created={s.get('created',0):4d}  updated={s.get('updated',0):4d}  errors={len(s.get('errors',[]))}")
    print(f"\nTotals: {total_created} created, {total_updated} updated, {total_errors} errors")

    # Verify
    if not args.dry_run:
        print(f"\n{'='*60}")
        print("FORMULA VERIFICATION")
        print(f"{'='*60}")
        results = verify_formulas(db, tenant_id)
        for check in results["checks"]:
            status = "✓" if check["passed"] else "✗"
            print(f"  {status} {check['formula']} ({check['entity']}): {check['actual']!r}")
        print(f"\nPassed: {results['passed']}, Failed: {results['failed']}")

    db.close()


if __name__ == "__main__":
    main()
