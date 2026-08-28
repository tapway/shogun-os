"""Tests: HR Onboarding Checklist — HR-managed template, per-staff tick-off,
completion marks onboarding Done.
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
from dashboard import _DEFAULT_ONBOARDING_CHECKLIST, _seed_default_checklist_items  # noqa: E402
from models import (  # noqa: E402
    Base, Department, HrOnboardingChecklistItem, HrOnboardingChecklistProgress,
    HrOnboardingTask, Tenant, User,
)


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
    session.add(HrOnboardingTask(
        tenant_id=1, notion_page_id="n-ob-1", staff_name="Alice Tan",
        department="Engineering", status="In progress",
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


def _add_item(db_session, title, desc=None):
    r = asyncio.run(dashboard.add_hr_checklist_item(
        body=dashboard.HrChecklistItemBody(title=title, description=desc),
        name="hr", user=_user(db_session), db=db_session,
    ))
    return r["item"]


def _toggle(db_session, item_id, staff, completed):
    return asyncio.run(dashboard.toggle_hr_checklist_item(
        item_id=item_id,
        body=dashboard.HrChecklistToggleBody(staff_name=staff, completed=completed),
        name="hr", user=_user(db_session), db=db_session,
    ))


def test_add_checklist_item(db_session):
    item = _add_item(db_session, "Sign employment contract", "Collect IC + bank details")
    assert item["title"] == "Sign employment contract"
    assert item["description"] == "Collect IC + bank details"
    assert item["sort_order"] == 1
    assert item["created_by"] == "HR One"


def test_add_items_increment_sort_order(db_session):
    a = _add_item(db_session, "First")
    b = _add_item(db_session, "Second")
    c = _add_item(db_session, "Third")
    assert (a["sort_order"], b["sort_order"], c["sort_order"]) == (1, 2, 3)


def test_add_item_requires_title(db_session):
    with pytest.raises(HTTPException) as ei:
        asyncio.run(dashboard.add_hr_checklist_item(
            body=dashboard.HrChecklistItemBody(title="   "),
            name="hr", user=_user(db_session), db=db_session,
        ))
    assert ei.value.status_code == 422


def test_update_checklist_item(db_session):
    item = _add_item(db_session, "Old title")
    r = asyncio.run(dashboard.update_hr_checklist_item(
        item_id=item["id"],
        body=dashboard.HrChecklistItemBody(title="New title", description="Extra"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["item"]["title"] == "New title"
    assert r["item"]["description"] == "Extra"


def test_delete_checklist_item_removes_progress(db_session):
    item = _add_item(db_session, "To remove")
    _toggle(db_session, item["id"], "Alice Tan", True)
    assert db_session.query(HrOnboardingChecklistProgress).count() == 1
    r = asyncio.run(dashboard.delete_hr_checklist_item(
        item_id=item["id"], name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["ok"] is True
    assert db_session.query(HrOnboardingChecklistItem).count() == 0
    assert db_session.query(HrOnboardingChecklistProgress).count() == 0


def test_toggle_records_completion(db_session):
    item = _add_item(db_session, "Setup laptop")
    r = _toggle(db_session, item["id"], "Alice Tan", True)
    assert r["ok"] is True
    assert r["done_count"] == 1
    assert r["total_items"] == 1
    assert r["all_done"] is True
    p = db_session.query(HrOnboardingChecklistProgress).first()
    assert p.completed is True
    assert p.completed_by == "HR One"
    assert p.completed_at


def test_toggle_requires_staff_name(db_session):
    item = _add_item(db_session, "Setup laptop")
    with pytest.raises(HTTPException) as ei:
        _toggle(db_session, item["id"], "   ", True)
    assert ei.value.status_code == 422


def test_all_items_done_marks_onboarding_done(db_session):
    i1 = _add_item(db_session, "Contract")
    i2 = _add_item(db_session, "Laptop")
    task = db_session.query(HrOnboardingTask).first()
    assert task.status == "In progress"

    r1 = _toggle(db_session, i1["id"], "Alice Tan", True)
    assert r1["all_done"] is False
    r2 = _toggle(db_session, i2["id"], "Alice Tan", True)
    assert r2["all_done"] is True

    db_session.expire_all()
    task = db_session.query(HrOnboardingTask).first()
    assert task.status == "Done"


def test_untick_after_completion_reverts_status(db_session):
    i1 = _add_item(db_session, "Contract")
    i2 = _add_item(db_session, "Laptop")
    _toggle(db_session, i1["id"], "Alice Tan", True)
    _toggle(db_session, i2["id"], "Alice Tan", True)
    db_session.expire_all()
    assert db_session.query(HrOnboardingTask).first().status == "Done"

    r = _toggle(db_session, i2["id"], "Alice Tan", False)
    assert r["all_done"] is False
    db_session.expire_all()
    task = db_session.query(HrOnboardingTask).first()
    assert task.status == "In progress"


def test_progress_isolated_per_staff(db_session):
    db_session.add(HrOnboardingTask(
        tenant_id=1, notion_page_id="n-ob-2", staff_name="Bob Lee",
        department="Sales", status="In progress",
    ))
    db_session.commit()
    item = _add_item(db_session, "Contract")

    r_alice = _toggle(db_session, item["id"], "Alice Tan", True)
    r_bob = _toggle(db_session, item["id"], "Bob Lee", False)
    assert r_alice["done_count"] == 1
    assert r_bob["done_count"] == 0
    assert db_session.query(HrOnboardingChecklistProgress).count() == 2


def test_no_checklist_items_never_all_done(db_session):
    # No items defined: toggling is impossible (item 404), completion never true
    with pytest.raises(HTTPException) as ei:
        _toggle(db_session, 999, "Alice Tan", True)
    assert ei.value.status_code == 404


def test_section_round_trip(db_session):
    item = _add_item(db_session, "Add to Slack", desc="Office-News, Happy-Hour")
    # set section via update
    r = asyncio.run(dashboard.update_hr_checklist_item(
        item_id=item["id"],
        body=dashboard.HrChecklistItemBody(title="Add to Slack", description="Office-News, Happy-Hour", section="Accounts Activation"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["item"]["section"] == "Accounts Activation"


def test_create_with_section(db_session):
    r = asyncio.run(dashboard.add_hr_checklist_item(
        body=dashboard.HrChecklistItemBody(title="Welcome Email", section="HR Documents"),
        name="hr", user=_user(db_session), db=db_session,
    ))
    assert r["item"]["section"] == "HR Documents"


def test_seed_default_checklist_items(db_session):
    _seed_default_checklist_items(db_session, 1)
    items = db_session.query(HrOnboardingChecklistItem).order_by(HrOnboardingChecklistItem.sort_order).all()
    assert len(items) == len(_DEFAULT_ONBOARDING_CHECKLIST)
    sections = {i.section for i in items}
    assert sections == {"HR Documents", "On-The-Day Adhoc", "Accounts Activation"}
    # HR Documents items present
    hr_docs = [i.title for i in items if i.section == "HR Documents"]
    assert "Create gdrive folder in Employee Files (HR)" in hr_docs
    assert "Welcome Email" in hr_docs


def test_seed_is_idempotent(db_session):
    _seed_default_checklist_items(db_session, 1)
    _seed_default_checklist_items(db_session, 1)
    count = db_session.query(HrOnboardingChecklistItem).count()
    assert count == len(_DEFAULT_ONBOARDING_CHECKLIST)


def test_seed_skipped_when_items_exist(db_session):
    _add_item(db_session, "Custom Item")
    _seed_default_checklist_items(db_session, 1)
    count = db_session.query(HrOnboardingChecklistItem).count()
    assert count == 1  # only the custom item, no defaults
