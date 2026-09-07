"""Tests: HR Training & Development — create programs, approval docs,
participants, certificate uploads.
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
    Base, Department, HrTraining, HrTrainingParticipant, Tenant, User,
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
    TestingSession = sessionmaker(bind=engine, autoflush=False)
    session = TestingSession()
    session.add(Tenant(id=1, subdomain="local", company_name="Test Co", timezone="UTC", status="active"))
    session.add(User(id=1, tenant_id=1, email="hr@test.local", name="HR One", role="staff"))
    session.add(Department(
        id=1, tenant_id=1, name="hr", profile_name="hr-manager",
        status="active", provider_config={},
    ))
    # Pre-existing Notion-synced training (must survive untouched)
    session.add(HrTraining(
        tenant_id=1, notion_page_id="n-train", training_name="Notion Synced Course",
        staff_name="Existing Staff", training_charges=1000.0,
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


def _create(db_session, **form):
    defaults = dict(
        training_name="AWS Certification", staff_name="Ali Bin Abu",
        trainer_name="Cloud Academy", training_format="Online",
        start_date="2026-09-01", end_date="2026-09-05",
        training_charges="3500", exam_included=True, bond_agreement=False,
    )
    defaults.update(form)
    return asyncio.run(dashboard.create_hr_training(
        name="hr", approval_doc=None, user=_user(db_session), db=db_session,
        **defaults,
    ))


def test_create_training_program(db_session):
    r = _create(db_session)
    assert r["ok"] is True
    t = r["training"]
    assert t["training_name"] == "AWS Certification"
    assert t["training_charges"] == 3500.0
    assert t["exam_included"] is True
    assert t["bond_agreement"] is False
    assert t["notion_page_id"].startswith("local-")
    # existing Notion-synced row untouched
    old = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    assert old.training_name == "Notion Synced Course"


def test_create_training_requires_name(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, training_name="   ")
    assert ei.value.status_code == 422


def test_create_training_bad_charges(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, training_charges="abc")
    assert ei.value.status_code == 422


def test_create_training_with_approval_doc(db_session):
    r = asyncio.run(dashboard.create_hr_training(
        name="hr", approval_doc=FakeUpload("approval.pdf", b"%PDF-1.4 approved"),
        training_name="Safety Training", staff_name="", trainer_name="",
        training_format="", start_date="", end_date="", training_charges="",
        exam_included=False, bond_agreement=False,
        user=_user(db_session), db=db_session,
    ))
    assert r["training"]["approval_doc_url"].startswith("/api/doc-uploads/")


def test_upload_approval_doc_to_existing_training(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    r = asyncio.run(dashboard.upload_hr_training_approval_doc(
        training_id=t.id, name="hr", file=FakeUpload("approve.pdf", b"%PDF-1.4"),
        user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["training"]["approval_doc_url"].startswith("/api/doc-uploads/")


def test_add_participant(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    r = asyncio.run(dashboard.add_hr_training_participant(
        training_id=t.id,
        body=dashboard.HrTrainingParticipantBody(staff_name="Bob Lee", department="Sales"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["participant"]["staff_name"] == "Bob Lee"
    assert r["participant"]["department"] == "Sales"
    assert r["participant"]["cert_url"] is None


def test_add_duplicate_participant_rejected(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    asyncio.run(dashboard.add_hr_training_participant(
        training_id=t.id,
        body=dashboard.HrTrainingParticipantBody(staff_name="Bob Lee"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.add_hr_training_participant(
            training_id=t.id,
            body=dashboard.HrTrainingParticipantBody(staff_name="Bob Lee"),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_add_participant_requires_name(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.add_hr_training_participant(
            training_id=t.id,
            body=dashboard.HrTrainingParticipantBody(staff_name="   "),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_upload_certificate(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    r = asyncio.run(dashboard.add_hr_training_participant(
        training_id=t.id,
        body=dashboard.HrTrainingParticipantBody(staff_name="Carol Tan"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    pid = r["participant"]["id"]
    r2 = asyncio.run(dashboard.upload_hr_training_certificate(
        training_id=t.id, participant_id=pid, name="hr",
        file=FakeUpload("cert.pdf", b"%PDF-1.4 certificate"),
        user=_user(db_session), db=db_session,
    ))
    assert r2["ok"] is True
    assert r2["participant"]["cert_url"].startswith("/api/doc-uploads/")
    assert r2["participant"]["cert_uploaded_at"]


def test_certificate_wrong_training_rejected(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    other = _create(db_session)
    r = asyncio.run(dashboard.add_hr_training_participant(
        training_id=t.id,
        body=dashboard.HrTrainingParticipantBody(staff_name="Dave Ng"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    pid = r["participant"]["id"]
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.upload_hr_training_certificate(
            training_id=other["training"]["id"], participant_id=pid, name="hr",
            file=FakeUpload("cert.pdf", b"%PDF-1.4"),
            user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 404


def test_remove_participant(db_session):
    t = db_session.query(HrTraining).filter_by(notion_page_id="n-train").first()
    r = asyncio.run(dashboard.add_hr_training_participant(
        training_id=t.id,
        body=dashboard.HrTrainingParticipantBody(staff_name="Eve Lim"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    pid = r["participant"]["id"]
    r2 = asyncio.run(dashboard.remove_hr_training_participant(
        training_id=t.id, participant_id=pid, name="hr",
        user=_user(db_session), db=db_session,
    ))
    assert r2["ok"] is True
    assert db_session.query(HrTrainingParticipant).filter_by(id=pid).first() is None
