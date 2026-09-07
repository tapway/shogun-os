"""Tests: HR Equipment Tracker workflow — add, edit, return, per-equipment logs."""
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
    Base, Department, HrEquipment, HrEquipmentLog, Tenant, User,
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
    session.commit()

    cfg = MagicMock()
    cfg.db_path = str(tmp_path / "web.db")
    monkeypatch.setattr(dashboard, "get_config", lambda: cfg)
    yield session
    session.close()
    engine.dispose()


def _user(db_session):
    return db_session.query(User).first()


def _make_eq(db_session, **kwargs):
    eq = HrEquipment(
        tenant_id=1,
        notion_page_id=kwargs.pop("notion_page_id", "n-eq"),
        equipment_name=kwargs.pop("equipment_name", "MacBook Pro 14"),
        **kwargs,
    )
    db_session.add(eq)
    db_session.commit()
    db_session.refresh(eq)
    return eq


def _create(db_session, **form):
    defaults = dict(
        equipment_name="MacBook Pro 14", item_number="EQ-001", category="Laptop",
        condition="Good", assigned_to="Alice Tan", amount="8500",
        purchase_date="2026-01-15", return_due_date="",
    )
    defaults.update(form)
    return asyncio.run(dashboard.create_hr_equipment(
        name="hr", image=None, signature_doc=None, user=_user(db_session),
        db=db_session, **defaults,
    ))


def test_create_equipment_with_fields_and_log(db_session):
    r = _create(db_session)
    assert r["ok"] is True
    eq = r["equipment"]
    assert eq["equipment_name"] == "MacBook Pro 14"
    assert eq["item_number"] == "EQ-001"
    assert eq["amount"] == 8500.0
    assert eq["returned"] is False
    assert eq["notion_page_id"].startswith("local-")
    logs = db_session.query(HrEquipmentLog).filter_by(equipment_id=eq["id"]).all()
    assert len(logs) == 1
    assert logs[0].event_type == "created"
    assert logs[0].actor == "HR One"


def test_create_equipment_requires_name(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, equipment_name="   ")
    assert ei.value.status_code == 422


def test_create_equipment_bad_amount(db_session):
    with pytest.raises(HTTPException) as ei:
        _create(db_session, amount="not-a-number")
    assert ei.value.status_code == 422


def test_create_equipment_uploads_image_and_signature(db_session):
    r = asyncio.run(dashboard.create_hr_equipment(
        name="hr",
        image=FakeUpload("mac.png", b"\x89PNG fake"),
        signature_doc=FakeUpload("loan.pdf", b"%PDF-1.4 signed"),
        equipment_name="Monitor", item_number="", category="", condition="",
        assigned_to="", amount="", purchase_date="", return_due_date="",
        user=_user(db_session), db=db_session,
    ))
    eq = r["equipment"]
    assert eq["image_url"].startswith("/api/doc-uploads/")
    assert eq["signature_doc_url"].startswith("/api/doc-uploads/")


def test_create_equipment_rejects_bad_image_ext(db_session):
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.create_hr_equipment(
            name="hr", image=FakeUpload("evil.exe", b"MZ"), signature_doc=None,
            equipment_name="Monitor", item_number="", category="", condition="",
            assigned_to="", amount="", purchase_date="", return_due_date="",
            user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_edit_equipment_logs_only_changed_fields(db_session):
    eq = _make_eq(db_session, item_number="EQ-001", amount=8500.0)
    r = asyncio.run(dashboard.update_hr_equipment(
        equipment_id=eq.id,
        body=dashboard.HrEquipmentEditBody(
            item_number="EQ-001",            # unchanged
            assigned_to="Bob Lee",           # changed
            amount="9000",                   # changed
        ),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert r["equipment"]["assigned_to"] == "Bob Lee"
    assert r["equipment"]["amount"] == 9000.0
    logs = db_session.query(HrEquipmentLog).filter_by(equipment_id=eq.id).all()
    assert len(logs) == 1
    assert logs[0].event_type == "edited"
    assert "Assigned to" in logs[0].detail
    assert "Item number" not in logs[0].detail


def test_edit_no_change_no_log(db_session):
    eq = _make_eq(db_session, item_number="EQ-001")
    r = asyncio.run(dashboard.update_hr_equipment(
        equipment_id=eq.id,
        body=dashboard.HrEquipmentEditBody(item_number="EQ-001"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert db_session.query(HrEquipmentLog).filter_by(equipment_id=eq.id).count() == 0


def test_edit_rejects_empty_name(db_session):
    eq = _make_eq(db_session)
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.update_hr_equipment(
            equipment_id=eq.id,
            body=dashboard.HrEquipmentEditBody(equipment_name="   "),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_return_equipment_sets_flag_and_logs(db_session):
    eq = _make_eq(db_session, assigned_to="Alice Tan", return_due_date="2020-01-01")
    assert eq.is_overdue() is True  # overdue before return
    r = asyncio.run(dashboard.return_hr_equipment(
        equipment_id=eq.id,
        body=dashboard.HrEquipmentReturnBody(return_date="2026-08-28", condition="Good", note="Checked"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    eqd = r["equipment"]
    assert eqd["returned"] is True
    assert eqd["return_date"] == "2026-08-28"
    assert eqd["condition"] == "Good"
    assert eqd["is_overdue"] is False  # returned items are never overdue
    logs = db_session.query(HrEquipmentLog).filter_by(equipment_id=eq.id).all()
    assert len(logs) == 1
    assert logs[0].event_type == "returned"
    assert "Alice Tan" in logs[0].detail
    assert "Checked" in logs[0].detail


def test_return_twice_rejected(db_session):
    eq = _make_eq(db_session, returned=True, return_date="2026-01-01")
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.return_hr_equipment(
            equipment_id=eq.id,
            body=dashboard.HrEquipmentReturnBody(),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_full_lifecycle_logs_per_equipment(db_session):
    r = _create(db_session, equipment_name="Projector", item_number="PRJ-9")
    eq_id = r["equipment"]["id"]
    asyncio.run(dashboard.update_hr_equipment(
        equipment_id=eq_id,
        body=dashboard.HrEquipmentEditBody(condition="Fair"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    asyncio.run(dashboard.return_hr_equipment(
        equipment_id=eq_id,
        body=dashboard.HrEquipmentReturnBody(return_date="2026-08-28"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    logs = db_session.query(HrEquipmentLog).filter_by(equipment_id=eq_id).order_by(HrEquipmentLog.id).all()
    assert [l.event_type for l in logs] == ["created", "edited", "returned"]
