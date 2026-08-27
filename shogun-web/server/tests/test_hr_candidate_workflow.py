"""Tests: HR candidate workflow — AI extraction (LLM + fallback), HR/Manager
review taps, and add-to-pipeline flag.
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
import gateway  # noqa: E402
from models import (  # noqa: E402
    Base, Department, HrCandidate, Tenant, User,
)


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
    session.add(User(id=1, tenant_id=1, email="staff@test.local", name="Staff One", role="staff"))
    session.add(Department(
        id=1, tenant_id=1, name="hr", profile_name="hr-manager",
        status="active", provider_config={},
    ))
    session.commit()
    yield session
    session.close()
    engine.dispose()


def _user(db_session):
    return db_session.query(User).first()


def _candidate(db_session, tenant_id=1, **overrides):
    cand = HrCandidate(
        tenant_id=tenant_id, notion_page_id=f"n-{tenant_id}",
        name="Alice Tan", email="alice@example.com", phone_no="+6012",
        role="Backend Engineer", status="Screening - Pending",
        source="LinkedIn", candidate_type="fulltime",
    )
    for k, v in overrides.items():
        setattr(cand, k, v)
    db_session.add(cand)
    db_session.commit()
    db_session.refresh(cand)
    return cand


def test_extract_fallback_when_no_docs_and_no_llm(db_session, monkeypatch):
    async def _no_llm(*args, **kwargs):
        return None
    monkeypatch.setattr(gateway, "_call_deepseek", _no_llm)
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.extract_hr_candidate(
        candidate_id=cand.id, name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["extract"]["source"] == "fallback"
    assert r["candidate"]["ai_summary"] == "" or r["candidate"]["ai_summary"] is None
    assert r["candidate"]["extracted_at"]
    db_session.refresh(cand)
    assert cand.extracted_at is not None


def test_extract_with_llm_results(db_session, monkeypatch):
    async def _fake_deepseek(prompt, system_prompt="", max_tokens=2048):
        return ('{"summary":"Great fit","skills":["Python","SQL"],'
                '"experience":[{"title":"Dev","company":"ACME","period":"2020-2023"}],'
                '"education":["BSc CS"],"screening_answers":[],'
                '"key_details":{"notice_period":"1 month"}}')
    monkeypatch.setattr(gateway, "_call_deepseek", _fake_deepseek)
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.extract_hr_candidate(
        candidate_id=cand.id, name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["extract"]["source"] == "ai"
    assert r["extract"]["skills"] == ["Python", "SQL"]
    assert r["candidate"]["ai_summary"] == "Great fit"


def test_review_hr_and_manager(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.review_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrCandidateReviewBody(kind="hr"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["candidate"]["hr_reviewed"] is True
    assert r["candidate"]["manager_reviewed"] is False

    r = asyncio.run(dashboard.review_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrCandidateReviewBody(kind="manager"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["candidate"]["manager_reviewed"] is True
    db_session.refresh(cand)
    assert cand.hr_reviewed_at and cand.manager_reviewed_at


def test_review_rejects_bad_kind(db_session):
    cand = _candidate(db_session)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.review_hr_candidate(
            candidate_id=cand.id, body=dashboard.HrCandidateReviewBody(kind="ceo"),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_add_to_pipeline(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.add_hr_candidate_to_pipeline(
        candidate_id=cand.id, name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["candidate"]["in_pipeline"] is True
    db_session.refresh(cand)
    assert cand.in_pipeline is True


def test_extract_wrong_tenant_404(db_session):
    cand = _candidate(db_session, tenant_id=2)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.extract_hr_candidate(
            candidate_id=cand.id, name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 404


def test_move_candidate_updates_status(db_session):
    cand = _candidate(db_session)
    r = asyncio.run(dashboard.move_hr_candidate(
        candidate_id=cand.id, body=dashboard.HrCandidateMoveBody(status="HR Review"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["candidate"]["status"] == "HR Review"
    db_session.refresh(cand)
    assert cand.status == "HR Review"


def test_move_candidate_rejects_empty_status(db_session):
    cand = _candidate(db_session)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.move_hr_candidate(
            candidate_id=cand.id, body=dashboard.HrCandidateMoveBody(status="   "),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_move_candidate_wrong_tenant_404(db_session):
    cand = _candidate(db_session, tenant_id=2)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.move_hr_candidate(
            candidate_id=cand.id, body=dashboard.HrCandidateMoveBody(status="Hired"),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 404
