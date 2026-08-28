"""Tests: HR recruitment workflow Phase 1 — applicant add, comments,
decisions, interview scheduling, waiting states, soft-remove, event timeline.
"""
import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402
from models import (  # noqa: E402
    Base, Department, HrCandidate, HrCandidateEvent, HrInterview,
    HrJobOpening, Tenant, User,
)


class FakeUpload:
    def __init__(self, filename: str, data: bytes):
        self.filename = filename
        self._data = data

    async def read(self):
        return self._data


@pytest.fixture()
def db_session(tmp_path, monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    session.add(Tenant(id=1, subdomain="local", company_name="Test Co", timezone="UTC", status="active"))
    session.add(User(id=1, tenant_id=1, email="hr@test.local", name="HR One", role="staff"))
    session.add(Department(
        id=1, tenant_id=1, name="hr", profile_name="hr-manager",
        status="active", provider_config={},
    ))
    session.add(HrJobOpening(
        tenant_id=1, notion_page_id="n-job", job_title="Backend Engineer",
        job_status="Test Ongoing", department="Engineering",
        employment_type="Full Time",
    ))
    session.commit()

    cfg = MagicMock()
    cfg.db_path = str(tmp_path / "web.db")
    monkeypatch.setattr(dashboard, "get_config", lambda: cfg)
    yield session
    session.close()
    engine.dispose()


def _user(db_session):
    return db_session.query(User).first()


def _job(db_session):
    return db_session.query(HrJobOpening).first()


def _candidate(db_session, status="Screening - Pending"):
    cand = HrCandidate(
        tenant_id=1, notion_page_id="n-cand", name="Alice Tan",
        role="Backend Engineer", status=status, candidate_type="fulltime",
    )
    db_session.add(cand)
    db_session.commit()
    db_session.refresh(cand)
    return cand


def test_add_applicant_creates_candidate_and_resume_file(db_session):
    job = _job(db_session)
    r = asyncio.run(dashboard.add_hr_applicant(
        job_id=job.id, name="hr", file=FakeUpload("alice.pdf", b"%PDF-1.4 resume"),
        applicant_name="Alice Tan", email="alice@example.com", phone_no="+60123456789",
        user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    c = r["candidate"]
    assert c["name"] == "Alice Tan"
    assert c["role"] == "Backend Engineer"
    assert c["status"] == "Resume Received"
    assert c["source"] == "Portal"
    assert c["date_entry"]  # upload timestamp
    assert c["resume_url"].startswith("/api/doc-uploads/")
    assert db_session.query(HrCandidateEvent).filter_by(candidate_id=c["id"]).count() == 2


def test_add_applicant_requires_name(db_session):
    job = _job(db_session)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.add_hr_applicant(
            job_id=job.id, name="hr", file=None, applicant_name="  ",
            email="", phone_no="", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_comment_appended_to_timeline(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.comment_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrCommentBody(note="Strong fit"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    ev = db_session.query(HrCandidateEvent).filter_by(candidate_id=cand.id).first()
    assert ev.event_type == "comment" and ev.note == "Strong fit"


def test_comment_requires_text(db_session):
    cand = _candidate(db_session)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.comment_hr_candidate(
            candidate_id=cand.id, body=dashboard.HrCommentBody(note="   "),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_decision_continue_after_1st_round(db_session):
    cand = _candidate(db_session, status="1st round of interview")
    r = asyncio.run(dashboard.decide_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrDecisionBody(decision="continue", comment="Good"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["status"] == "Schedule Manager Interview"


def test_decision_offer_after_manager_interview(db_session):
    cand = _candidate(db_session, status="Manager Interview")
    r = asyncio.run(dashboard.decide_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrDecisionBody(decision="offer", comment="Hire"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["status"] == "Offer Sent"


def test_decision_reject_from_interview_stage(db_session):
    cand = _candidate(db_session, status="Manager Interview")
    r = asyncio.run(dashboard.decide_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrDecisionBody(decision="reject", comment="No fit"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["status"] == "Rejected"


def test_decision_offer_rejected_from_wrong_stage(db_session):
    cand = _candidate(db_session, status="1st round of interview")
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.decide_hr_candidate(
            candidate_id=cand.id, body=dashboard.HrDecisionBody(decision="offer", comment="x"),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_schedule_creates_interview_and_moves_stage(db_session):
    cand = _candidate(db_session, status="Schedule 1st Round of Interview")
    r = asyncio.run(dashboard.schedule_hr_interview(
        candidate_id=cand.id,
        body=dashboard.HrScheduleBody(
            round="first", scheduled_at="2026-09-05T10:00",
            interviewer_name="Bob Manager", location="Meet link",
        ),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["status"] == "1st round of interview"
    iv = r["interview"]
    assert iv["round"] == "first" and iv["scheduled_at"] == "2026-09-05T10:00"
    assert iv["interviewer_name"] == "Bob Manager"
    # job matched by role
    assert iv["job_id"] == _job(db_session).id


def test_waiting_set_and_clear(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.set_hr_candidate_waiting(
        candidate_id=cand.id, body=dashboard.HrCommentBody(note="awaiting screening answers"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["waiting_reason"] == "awaiting screening answers"
    assert r["candidate"]["waiting_since"]
    r2 = asyncio.run(dashboard.set_hr_candidate_waiting(
        candidate_id=cand.id, body=dashboard.HrCommentBody(note=""),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r2["candidate"]["waiting_since"] is None
    assert r2["candidate"]["waiting_reason"] is None


def test_remove_soft_rejects_with_reason(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.remove_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrCommentBody(note="No response"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["status"] == "Rejected"
    assert r["candidate"]["removed_reason"] == "No response"
    # row retained for audit
    assert db_session.get(HrCandidate, cand.id) is not None


def test_add_to_pipeline_moves_into_schedule_stage(db_session):
    cand = _candidate(db_session, status="HR Review")
    r = asyncio.run(dashboard.add_hr_candidate_to_pipeline(
        candidate_id=cand.id, name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["candidate"]["in_pipeline"] is True
    assert r["candidate"]["status"] == "Schedule 1st Round of Interview"


def test_interview_status_update(db_session):
    cand = _candidate(db_session, status="Schedule 1st Round of Interview")
    r = asyncio.run(dashboard.schedule_hr_interview(
        candidate_id=cand.id,
        body=dashboard.HrScheduleBody(round="first", scheduled_at="2026-09-05T10:00"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    iv_id = r["interview"]["id"]
    r2 = asyncio.run(dashboard.update_hr_interview_status(
        interview_id=iv_id, body=dashboard.HrInterviewStatusBody(status="completed"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r2["interview"]["status"] == "completed"
