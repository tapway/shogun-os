"""Email templates and dunning email sending.

Endpoints:
  GET    /api/departments/{name}/email-templates
      Returns all email templates for the department.

  POST   /api/departments/{name}/email-templates
      Body: { name, scenario, subject_template, body_template }
      Creates a new template.

  PUT    /api/departments/{name}/email-templates/{template_id}
      Body: { name, scenario, subject_template, body_template }
      Updates an existing template.

  DELETE /api/departments/{name}/email-templates/{template_id}
      Deletes a template.

  POST   /api/departments/{name}/email-templates/draft
      Body: { template_id, context: { company, amount_due, overdue_days, invoice_no, ... } }
      Calls the LLM to generate a polished email draft from the template + context.

  POST   /api/departments/{name}/email-templates/send
      Body: { to, subject, body }
      Sends an email via SMTP using the department's email comms channel credentials.

Storage: ~/.shogun-os/email-templates.json (file-backed, keyed by department).
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from departments import require_department_access
from gateway import _get_llm_credentials
from models import Department, User

logger = logging.getLogger(__name__)
router = APIRouter()

_TEMPLATES_FILE = pathlib.Path.home() / ".shogun-os" / "email-templates.json"

# Default templates seeded on first use. These give the user a starting point
# for dunning emails and can be freely edited/deleted.
_DEFAULT_TEMPLATES: List[dict] = [
    {
        "id": "dunning-reminder-1",
        "name": "Reminder — First Notice",
        "scenario": "dunning_reminder",
        "subject_template": "Overdue Invoice {invoice_no} — {company}",
        "body_template": (
            "Dear {company},\n\n"
            "We hope this email finds you well. This is a friendly reminder "
            "that Invoice {invoice_no} for RM {amount_due} is now {overdue_days} days overdue.\n\n"
            "We kindly request your attention to settle this invoice at your earliest convenience. "
            "If payment has already been made, please disregard this notice.\n\n"
            "Should you have any questions or require further clarification, "
            "please do not hesitate to contact us.\n\n"
            "Thank you for your prompt attention to this matter.\n\n"
            "Best regards,\n"
            "Finance Team"
        ),
    },
    {
        "id": "dunning-reminder-2",
        "name": "Reminder — Second Notice",
        "scenario": "dunning_reminder",
        "subject_template": "URGENT: Overdue Invoice {invoice_no} — {company}",
        "body_template": (
            "Dear {company},\n\n"
            "We are writing to follow up on Invoice {invoice_no} for RM {amount_due}, "
            "which is now {overdue_days} days overdue.\n\n"
            "Despite our previous reminder, we have yet to receive payment. "
            "We urgently request that you settle this outstanding amount within 7 days.\n\n"
            "If there is an issue or concern regarding this invoice, please contact us immediately "
            "so we can assist you.\n\n"
            "Thank you for your cooperation.\n\n"
            "Best regards,\n"
            "Finance Team"
        ),
    },
    {
        "id": "dunning-final-demand",
        "name": "Final Demand",
        "scenario": "dunning_final",
        "subject_template": "FINAL DEMAND: Invoice {invoice_no} — {company}",
        "body_template": (
            "Dear {company},\n\n"
            "This is our final demand for payment of Invoice {invoice_no} for RM {amount_due}, "
            "which is now {overdue_days} days overdue.\n\n"
            "Despite multiple reminders, payment has not been received. "
            "If payment is not made within 14 days, we will have no option but to escalate "
            "this matter to our legal team for further action.\n\n"
            "Please treat this matter with the urgency it requires.\n\n"
            "Best regards,\n"
            "Finance Team"
        ),
    },
]


def _load_templates() -> Dict[str, List[dict]]:
    """Load all templates from the JSON file. Returns {dept_key: [templates]}."""
    if not _TEMPLATES_FILE.exists():
        return {}
    try:
        data = json.loads(_TEMPLATES_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to load email templates: %s", e)
        return {}


def _save_templates(data: Dict[str, List[dict]]) -> None:
    _TEMPLATES_FILE.parent.mkdir(parents=True, exist_ok=True)
    _TEMPLATES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _get_dept_templates(dept_key: str) -> List[dict]:
    """Get templates for a department, seeding defaults on first access."""
    all_templates = _load_templates()
    if dept_key not in all_templates:
        all_templates[dept_key] = list(_DEFAULT_TEMPLATES)
        _save_templates(all_templates)
    return all_templates[dept_key]


def _get_dept(db: Session, tenant_id: int, name: str) -> Department:
    from sqlalchemy import select
    dept = db.execute(
        select(Department).where(
            Department.tenant_id == tenant_id,
            Department.name == name,
        )
    ).scalar_one_or_none()
    if dept is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept


def _get_email_channel_config(dept: Department) -> Optional[dict]:
    """Extract SMTP credentials from the department's email comms channel."""
    provider_cfg = dept.provider_config or {}
    channels = provider_cfg.get("comms_channels") or []
    for ch in channels:
        if ch.get("key") == "email":
            return ch
    return None


# ─── Template CRUD ───────────────────────────────────────────────────────

@router.get("/departments/{name}/email-templates")
async def list_email_templates(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List all email templates for the department."""
    require_department_access(name=name, user=user, db=db)
    dept_key = name.lower().strip()
    templates = _get_dept_templates(dept_key)
    return {"templates": templates}


@router.post("/departments/{name}/email-templates")
async def create_email_template(
    body: Dict[str, Any] = Body(...),
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new email template."""
    require_department_access(name=name, user=user, db=db)
    dept_key = name.lower().strip()
    all_templates = _load_templates()
    dept_templates = all_templates.get(dept_key, [])

    # Generate a simple ID from the name
    raw_id = body.get("name", "template").lower().strip()
    template_id = re.sub(r"[^a-z0-9]+", "-", raw_id).strip("-")
    # Ensure uniqueness
    existing_ids = {t["id"] for t in dept_templates}
    base_id = template_id
    counter = 2
    while template_id in existing_ids:
        template_id = f"{base_id}-{counter}"
        counter += 1

    new_template = {
        "id": template_id,
        "name": body.get("name", "Untitled Template"),
        "scenario": body.get("scenario", "general"),
        "subject_template": body.get("subject_template", ""),
        "body_template": body.get("body_template", ""),
    }
    dept_templates.append(new_template)
    all_templates[dept_key] = dept_templates
    _save_templates(all_templates)
    logger.info("Created email template '%s' for department '%s'", template_id, dept_key)
    return {"template": new_template}


@router.put("/departments/{name}/email-templates/{template_id}")
async def update_email_template(
    body: Dict[str, Any] = Body(...),
    name: str = Path(...),
    template_id: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update an existing email template."""
    require_department_access(name=name, user=user, db=db)
    dept_key = name.lower().strip()
    all_templates = _load_templates()
    dept_templates = all_templates.get(dept_key, [])

    for t in dept_templates:
        if t["id"] == template_id:
            t["name"] = body.get("name", t["name"])
            t["scenario"] = body.get("scenario", t["scenario"])
            t["subject_template"] = body.get("subject_template", t["subject_template"])
            t["body_template"] = body.get("body_template", t["body_template"])
            all_templates[dept_key] = dept_templates
            _save_templates(all_templates)
            return {"template": t}

    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")


@router.delete("/departments/{name}/email-templates/{template_id}")
async def delete_email_template(
    name: str = Path(...),
    template_id: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete an email template."""
    require_department_access(name=name, user=user, db=db)
    dept_key = name.lower().strip()
    all_templates = _load_templates()
    dept_templates = all_templates.get(dept_key, [])

    original_len = len(dept_templates)
    dept_templates = [t for t in dept_templates if t["id"] != template_id]
    if len(dept_templates) == original_len:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

    all_templates[dept_key] = dept_templates
    _save_templates(all_templates)
    return {"deleted": template_id}


# ─── LLM Draft Generation ─────────────────────────────────────────────────

@router.post("/departments/{name}/email-templates/draft")
async def generate_email_draft(
    body: Dict[str, Any] = Body(...),
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Generate a polished email draft using the LLM.

    Body: {
        template_id: str,
        context: { company, amount_due, overdue_days, invoice_no, ... },
        custom_instructions: str (optional, e.g. "tone: firmer")
    }

    The LLM takes the template body + context variables and produces a
    professional, ready-to-send email. If LLM is unavailable, falls back
    to simple variable substitution in the template.
    """
    require_department_access(name=name, user=user, db=db)
    dept_key = name.lower().strip()
    templates = _get_dept_templates(dept_key)
    template_id = body.get("template_id", "")
    template = next((t for t in templates if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

    context = body.get("context", {})
    custom_instructions = body.get("custom_instructions", "")

    # Build the variable string for the LLM
    context_lines = [f"- {k}: {v}" for k, v in context.items()]
    context_str = "\n".join(context_lines)

    system_prompt = (
        "You are a professional finance email writer. Generate a polished, "
        "ready-to-send email based on the template and context provided.\n\n"
        "Rules:\n"
        "- Use the template as the structural guide, but improve the language.\n"
        "- Fill in all context variables naturally.\n"
        "- Keep it professional, concise, and clear.\n"
        "- Output format: a JSON object with 'subject' and 'body' fields.\n"
        "- The body should be plain text (not HTML or markdown).\n"
        "- Do NOT include the sender's signature — it will be appended.\n"
    )
    if custom_instructions:
        system_prompt += f"\nAdditional instructions: {custom_instructions}\n"

    user_prompt = (
        f"=== TEMPLATE ===\n"
        f"Subject template: {template.get('subject_template', '')}\n"
        f"Body template:\n{template.get('body_template', '')}\n\n"
        f"=== CONTEXT VARIABLES ===\n{context_str}\n\n"
        f"Generate the email as JSON: {{\"subject\": \"...\", \"body\": \"...\"}}"
    )

    creds = _get_llm_credentials()
    api_key = creds.get("api_key", "")
    if not api_key:
        # Fallback: simple variable substitution
        return _fallback_draft(template, context)

    api_base = creds["api_base"].rstrip("/")
    model = creds["model"]
    url = f"{api_base}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                # Try to parse JSON from the LLM output
                return _parse_llm_draft(content, template, context)
            logger.warning("LLM draft generation returned %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("LLM draft generation failed: %s", exc)

    # Fallback
    return _fallback_draft(template, context)


def _parse_llm_draft(content: str, template: dict, context: dict) -> dict:
    """Parse LLM JSON output, with fallback to variable substitution."""
    # Try to extract JSON from the content
    try:
        # LLMs sometimes wrap JSON in ```json ... ``` fences
        content_clean = content.strip()
        if content_clean.startswith("```"):
            content_clean = re.sub(r"^```(?:json)?\s*", "", content_clean)
            content_clean = re.sub(r"\s*```$", "", content_clean)
        result = json.loads(content_clean)
        if "subject" in result and "body" in result:
            return {"subject": result["subject"], "body": result["body"], "source": "llm"}
    except (json.JSONDecodeError, TypeError):
        pass
    # If JSON parse fails, try to split by Subject: and Body: markers
    return _fallback_draft(template, context)


def _fallback_draft(template: dict, context: dict) -> dict:
    """Simple variable substitution fallback when LLM is unavailable."""
    subject = template.get("subject_template", "")
    body = template.get("body_template", "")
    for key, val in context.items():
        placeholder = "{" + key + "}"
        subject = subject.replace(placeholder, str(val))
        body = body.replace(placeholder, str(val))
    return {"subject": subject, "body": body, "source": "template"}


# ─── SMTP Send ────────────────────────────────────────────────────────────

@router.post("/departments/{name}/email-templates/send")
async def send_email(
    body: Dict[str, Any] = Body(...),
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Send an email via SMTP using the department's email comms channel.

    Body: { to: str, subject: str, body: str }
    Requires the department to have an 'email' comms channel configured with
    SMTP credentials (smtp_host, smtp_password, email_address).
    """
    require_department_access(name=name, user=user, db=db)
    from database import get_primary_tenant

    tenant_id = get_primary_tenant(db)
    dept = _get_dept(db, tenant_id, name)

    email_channel = _get_email_channel_config(dept)
    if not email_channel:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="No email comms channel configured for this department. "
                   "Configure SMTP credentials in Settings → Comms → Email first.",
        )

    creds = email_channel.get("credentials") or {}
    smtp_host = creds.get("smtp_host", "")
    smtp_password = creds.get("smtp_password", "")
    from_addr = creds.get("email_address", "")

    # Check for masked password — can't authenticate with "***"
    if smtp_password == "***":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="SMTP password is masked. Re-enter the password in Settings → Comms → Email.",
        )

    if not smtp_host or not smtp_password or not from_addr:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Email channel missing required SMTP credentials "
                   "(smtp_host, smtp_password, email_address).",
        )

    to_addr = body.get("to", "").strip()
    subject = body.get("subject", "").strip()
    email_body = body.get("body", "").strip()

    if not to_addr or not subject or not email_body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="to, subject, and body are required")

    # Build the email message
    msg = MIMEMultipart("alternative")
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.attach(MIMEText(email_body, "plain"))

    # Determine SMTP port and TLS
    smtp_port = 587  # Default to STARTTLS
    use_ssl = False

    # Try to send
    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=30) as server:
                server.login(from_addr, smtp_password)
                server.sendmail(from_addr, [to_addr], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(from_addr, smtp_password)
                server.sendmail(from_addr, [to_addr], msg.as_string())
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_addr, exc)
        raise HTTPException(
            status.HTTP_502_BAD_REQUEST,
            detail=f"Failed to send email: {exc}",
        )

    logger.info("Email sent from %s to %s (subject: %s)", from_addr, to_addr, subject[:50])
    return {"sent": True, "to": to_addr, "subject": subject}
