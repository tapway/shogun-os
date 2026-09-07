"""E2E-style tests for email_templates.py — CRUD, draft, send.

Uses tmp_path to isolate the file-backed template store.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import email_templates as et  # noqa: E402
from email_templates import _fallback_draft  # noqa: E402
from models import User  # noqa: E402


def _make_user(role="admin"):
    return User(id=1, tenant_id=1, email=f"{role}@example.com",
                name=role.title(), role=role, source="manual")


# ─── Template CRUD (file-backed) ────────────────────────────────────────
# We patch _TEMPLATES_FILE to a tmp dir so tests are isolated.


def _patch_templates_file(tmp_path):
    """Patch the module-level _TEMPLATES_FILE to a tmp path."""
    tmp_file = tmp_path / "email-templates.json"
    return patch.object(et, "_TEMPLATES_FILE", tmp_file)


def test_list_email_templates_returns_list(tmp_path):
    user = _make_user()
    db = MagicMock()
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            result = asyncio.run(et.list_email_templates(name="finance", user=user, db=db))
    assert "templates" in result
    assert isinstance(result["templates"], list)


def test_create_email_template_returns_template(tmp_path):
    user = _make_user()
    db = MagicMock()
    body = {
        "name": "Welcome Email",
        "scenario": "onboarding",
        "subject_template": "Welcome {company}",
        "body_template": "Hello {company}",
    }
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            result = asyncio.run(et.create_email_template(body=body, name="finance", user=user, db=db))
    assert "template" in result
    assert result["template"]["name"] == "Welcome Email"
    assert result["template"]["id"]  # generated


def test_update_email_template_changes_fields(tmp_path):
    user = _make_user()
    db = MagicMock()
    # First create, then update
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            asyncio.run(et.create_email_template(
                body={"name": "Test", "subject_template": "Old", "body_template": "Old body"},
                name="finance", user=user, db=db,
            ))
            result = asyncio.run(et.update_email_template(
                body={"name": "Updated Name"},
                name="finance", template_id="test",
                user=user, db=db,
            ))
    assert result["template"]["name"] == "Updated Name"


def test_delete_email_template_returns_deleted(tmp_path):
    user = _make_user()
    db = MagicMock()
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            asyncio.run(et.create_email_template(
                body={"name": "ToDelete"},
                name="finance", user=user, db=db,
            ))
            result = asyncio.run(et.delete_email_template(
                name="finance", template_id="todelete",
                user=user, db=db,
            ))
    assert result["deleted"] == "todelete"


def test_update_email_template_not_found_returns_404(tmp_path):
    user = _make_user()
    db = MagicMock()
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            with pytest.raises(HTTPException) as exc_info:
                asyncio.run(et.update_email_template(
                    body={"name": "X"},
                    name="finance", template_id="nonexistent",
                    user=user, db=db,
                ))
    assert exc_info.value.status_code == 404


def test_delete_email_template_not_found_returns_404(tmp_path):
    user = _make_user()
    db = MagicMock()
    with _patch_templates_file(tmp_path):
        with patch.object(et, "require_department_access", return_value=user):
            with pytest.raises(HTTPException) as exc_info:
                asyncio.run(et.delete_email_template(
                    name="finance", template_id="nonexistent",
                    user=user, db=db,
                ))
    assert exc_info.value.status_code == 404


# ─── Draft generation ────────────────────────────────────────────────────


def test_draft_email_template_fallback_when_no_api_key(tmp_path):
    """When LLM creds have no api_key, must fall back to variable substitution."""
    user = _make_user()
    db = MagicMock()
    template = {
        "id": "test", "name": "Test", "scenario": "general",
        "subject_template": "Invoice {invoice_no}",
        "body_template": "Dear {company}, your invoice {invoice_no} is overdue.",
    }
    context = {"invoice_no": "INV-001", "company": "Acme Corp"}
    with _patch_templates_file(tmp_path):
        # Seed the template first
        with patch.object(et, "require_department_access", return_value=user):
            asyncio.run(et.create_email_template(
                body=template, name="finance", user=user, db=db,
            ))
            with patch.object(et, "_get_llm_credentials", return_value={"api_key": "", "api_base": "", "model": ""}):
                result = asyncio.run(et.generate_email_draft(
                    body={"template_id": "test", "context": context},
                    name="finance", user=user, db=db,
                ))
    assert "subject" in result
    assert "body" in result
    assert "INV-001" in result["subject"]
    assert "Acme Corp" in result["body"]


def test_fallback_draft_substitutes_variables():
    template = {"subject_template": "Hello {name}", "body_template": "Welcome {name} to {company}"}
    context = {"name": "John", "company": "Acme"}
    result = _fallback_draft(template, context)
    assert result["subject"] == "Hello John"
    assert result["body"] == "Welcome John to Acme"
    assert result["source"] == "template"


# ─── Send email ───────────────────────────────────────────────────────────


def test_send_email_no_channel_configured_returns_400(tmp_path):
    """No email comms channel → 400."""
    user = _make_user()
    db = MagicMock()
    dept = MagicMock()
    dept.provider_config = {"comms_channels": []}  # no email channel
    db.execute.return_value = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = dept

    class _Tenant:
        id = 1
    with patch.object(et, "require_department_access", return_value=user):
        with patch("database.get_primary_tenant", return_value=_Tenant()):
            with patch.object(et, "_get_dept", return_value=dept):
                with pytest.raises(HTTPException) as exc_info:
                    asyncio.run(et.send_email(
                        body={"to": "x@y.com", "subject": "Test", "body": "Hello"},
                        name="finance", user=user, db=db,
                    ))
    assert exc_info.value.status_code == 400


# ─── HR recruitment template seeding ────────────────────────────────────


def test_hr_department_seeds_recruitment_templates(tmp_path):
    """HR department gets recruitment-workflow templates on first access."""
    with _patch_templates_file(tmp_path):
        templates = et._get_dept_templates("hr")
    ids = [t["id"] for t in templates]
    assert "recruitment-screening-questions" in ids
    assert "recruitment-interview-schedule" in ids
    assert "recruitment-interview-feedback" in ids
    assert "recruitment-offer-letter" in ids
    assert "recruitment-welcome-new-hire" in ids
    assert "recruitment-rejection" in ids


def test_non_hr_department_gets_no_recruitment_templates(tmp_path):
    """Finance (and others) do NOT get recruitment templates."""
    with _patch_templates_file(tmp_path):
        templates = et._get_dept_templates("finance")
    ids = [t["id"] for t in templates]
    assert "recruitment-screening-questions" not in ids
    assert "dunning-reminder-1" in ids


def test_hr_seeding_is_idempotent(tmp_path):
    """Calling _get_dept_templates('hr') twice does not duplicate templates."""
    with _patch_templates_file(tmp_path):
        first = et._get_dept_templates("hr")
        second = et._get_dept_templates("hr")
    assert len(first) == len(second)


def test_hr_seeding_skipped_if_user_already_has_one(tmp_path):
    """If user created/deleted templates leaving any recruitment id, no re-seed."""
    with _patch_templates_file(tmp_path):
        et._get_dept_templates("hr")  # seed
        # Simulate user deleting all but one recruitment template
        all_t = et._load_templates()
        all_t["hr"] = [t for t in all_t["hr"] if t["id"] != "recruitment-rejection"]
        et._save_templates(all_t)
        again = et._get_dept_templates("hr")
    ids = [t["id"] for t in again]
    assert "recruitment-rejection" not in ids  # stays deleted


def test_recruitment_fallback_draft_substitutes_placeholders():
    """Screening template placeholders substitute via fallback draft."""
    template = next(t for t in et._HR_RECRUITMENT_TEMPLATES if t["id"] == "recruitment-screening-questions")
    context = {
        "candidate_name": "Alice Tan",
        "job_title": "Backend Engineer",
        "screening_link": "https://drive.example/screening.pdf",
        "hr_name": "HR Team",
        "company_name": "Test Co",
    }
    result = _fallback_draft(template, context)
    assert "Alice Tan" in result["body"]
    assert "Backend Engineer" in result["subject"]
    assert "https://drive.example/screening.pdf" in result["body"]
    assert "{candidate_name}" not in result["body"]
