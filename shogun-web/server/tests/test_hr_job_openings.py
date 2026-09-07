"""Tests: portal job-opening creation — storage, JD upload/link, validation
guards, audit-failure tolerance, Notion-formula deadline (App Start + 90d).
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
    Base, Department, HrJobOpening, Tenant, User,
)


class FakeUpload:
    """Minimal UploadFile stand-in (filename + async read)."""

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
    session.add(User(id=1, tenant_id=1, email="staff@test.local", name="Staff One", role="staff"))
    session.add(Department(
        id=1, tenant_id=1, name="hr", profile_name="hr-manager",
        status="active", provider_config={},
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


def _create(db_session, **overrides):
    kwargs = dict(
        name="hr", file=None, job_title="Backend Engineer", department="Engineering",
        employment_type="Full Time", experience="3+ years", budget_max="9000",
        hiring_manager="Jane Doe", application_start="2026-08-01",
        job_status="Not Initiated", job_description="Build APIs.", jd_link="",
        user=_user(db_session), db=db_session,
    )
    kwargs.update(overrides)
    return asyncio.run(dashboard.create_hr_job_opening(**kwargs))


def test_create_happy_path(db_session):
    r = _create(db_session)
    assert r["ok"] is True
    job = r["job"]
    assert job["job_title"] == "Backend Engineer"
    assert job["notion_page_id"].startswith("local-")
    assert job["department"] == "Engineering"
    assert job["budget_max"] == 9000.0
    assert job["deadline"] == "2026-10-30"  # 2026-08-01 + 90 days
    assert isinstance(job["days_left"], int)
    assert job["overdue"] == ""  # deadline is 64 days in the future — not overdue
    row = db_session.query(HrJobOpening).filter(HrJobOpening.job_title == "Backend Engineer").first()
    assert row is not None
    assert row.tenant_id == 1


def test_create_with_jd_file(db_session, tmp_path):
    f = FakeUpload("role-desc.pdf", b"%PDF-1.4 test")
    r = _create(db_session, file=f)
    url = r["job"]["jd_file_url"]
    assert url and url.startswith("/api/doc-uploads/")
    saved = tmp_path / "dashboard_uploads" / url.rsplit("/", 1)[-1]
    assert saved.read_bytes() == b"%PDF-1.4 test"


def test_create_with_jd_link(db_session):
    r = _create(db_session, jd_link="https://example.com/jd")
    assert r["job"]["jd_link"] == "https://example.com/jd"


def test_create_rejects_bad_extension(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, file=FakeUpload("evil.exe", b"MZ"))
    assert ei.value.status_code == 422


def test_create_rejects_missing_title(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, job_title="   ")
    assert ei.value.status_code == 422


def test_create_rejects_bad_budget(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, budget_max="many")
    assert ei.value.status_code == 422


def test_create_tolerates_audit_failure(db_session):
    # The audit module cannot import on this branch (models.AuditLog absent) —
    # creation must still succeed and return the fresh row.
    r = _create(db_session)
    assert r["ok"] is True
    assert db_session.query(HrJobOpening).count() == 1