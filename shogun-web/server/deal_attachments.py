"""Deal attachment endpoints for the Shogun OS unified dashboard.

Every attachment is stored *inside the CRM brain*, versioned beside its deal
file at ``~/brain/deals/attachments/<slug>/``. Uploading persists three things:

  1. The binary bytes (versioned folder beside the deal markdown file).
  2. The deal's YAML frontmatter ``attachments:`` list entry.
  3. A line in ``~/brain/deals/activity-log.md``.

Authentication reuses Shogun's stateless HMAC session (``get_current_user``);
department authorisation reuses ``require_department_access`` so only users
granted the CRM module (or global admin/owner) can attach. File reads are
traversal-safe following the same ``Path(filename).name`` guard used by site
inspections and doc scans.
"""

from __future__ import annotations

import logging
import re as _re
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path as FPath, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import get_current_user
from config import get_config
from database import get_db
from departments import require_department_access
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/departments/{name}/dashboard", tags=["dashboard-deals"])

# Whitelisted extensions — reject everything else (no executables, archives, html).
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "csv", "png", "jpg", "jpeg", "gif", "webp", "txt", "md",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

# Fields that mark a deal file as non-deal (schema/activity/log/etc.) — never attach here.
_NON_DEAL_STEMS = {"readme", "_schema", "activity-log", "_risk_register", "templates"}


def _safe_slug(slug: str) -> str:
    """Normalise a deal slug to a safe folder token (alphanumerics + - _)."""
    s = _re.sub(r"[^A-Za-z0-9._-]", "-", slug.strip())
    s = _re.sub(r"-{2,}", "-", s).strip(".-")
    return s[:120]


def _resolve_deal_file(slug: str) -> Path:
    """Return the brain deal markdown file for ``slug``, or 404.

    Slugs may be plain (``habib-jewels-cctv-command-centre``) or already
    prefixed (``deals/<slug>``). The deal file must exist and carry deal
    frontmatter before any attachment is accepted.
    """
    slug = slug.strip().lstrip("/")
    if slug.startswith("deals/"):
        slug = slug[len("deals/"):]
    safe = _safe_slug(slug)
    if not safe or not _re.match(r"^[A-Za-z0-9._-]+\Z", safe):
        raise HTTPException(status_code=400, detail="Invalid deal slug")

    cfg = get_config()
    deals_dir = Path(cfg.brain_root).expanduser() / "deals"
    deal_file = deals_dir / f"{safe}.md"

    if safe.lower() in _NON_DEAL_STEMS or not deal_file.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Deal '{slug}' not found in the CRM brain",
        )
    return deal_file


def _attachments_dir_for_slug(slug: str) -> Path:
    """Ensure the versioned attachment folder exists for a deal slug."""
    safe = _safe_slug(slug)
    cfg = get_config()
    adir = Path(cfg.brain_root).expanduser() / "deals" / "attachments" / safe
    adir.mkdir(parents=True, exist_ok=True)
    return adir


def _append_attachment_to_frontmatter(deal_file: Path, entry: dict) -> str:
    """Rewrite a deal file's frontmatter to include an ``attachments:`` entry."""
    import yaml as _yaml

    original = deal_file.read_text(encoding="utf-8")
    m = _re.match(r"^---\n(.*?)\n(?:---|\.\.\.)\n", original, _re.DOTALL)
    if not m:
        raise HTTPException(status_code=500, detail="Deal frontmatter could not be parsed")
    try:
        fm = _yaml.safe_load(m.group(1)) or {}
    except Exception:
        fm = {}
    if not isinstance(fm, dict):
        fm = {}

    # If attachments is a string or bad shape, reset to a list.
    existing = fm.get("attachments")
    if not isinstance(existing, list):
        existing = []
    existing.append(entry)
    fm["attachments"] = existing
    fm["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # Dump YAML the same way the rest of the CRM brain writes it (block style).
    new_fm = (
        "---\n"
        + _yaml.dump(fm, default_flow_style=False, allow_unicode=True, sort_keys=False).strip()
        + "\n---\n"
    )
    new_text = new_fm + original[m.end():]
    deal_file.write_text(new_text, encoding="utf-8")
    return new_text


def _log_activity(slug: str, entry: dict) -> None:
    """Append a line to the CRM brain activity log."""
    cfg = get_config()
    log_path = Path(cfg.brain_root).expanduser() / "deals" / "activity-log.md"
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as f:
            f.write(
                f"- **{entry['at']}**: 📎 Attachment added to deal **{slug}** — "
                f"`{entry['name']}` ({entry['size']} bytes) by {entry.get('uploaded_by', 'unknown')}"
                + (f" — {entry['note']}" if entry.get("note") else "")
                + "\n"
            )
    except OSError as exc:
        logger.warning("Could not write activity log: %s", exc)


@router.post("/deals/{slug}/attachments")
async def upload_deal_attachment(
    name: str = FPath(...),
    slug: str = FPath(...),
    file: UploadFile = File(...),
    note: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Upload an attachment for a deal and persist it to the CRM brain."""
    # Authorise: global admin/owner or staff with the matching department.
    require_department_access(name=name, user=user, db=db)

    deal_file = _resolve_deal_file(slug)

    raw_name = (file.filename or "attachment").strip()
    safe_name = Path(raw_name).name  # strip any path components
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    adir = _attachments_dir_for_slug(slug)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    # Collision-safe: append a short token if the exact timestamped name exists.
    dest = adir / f"{ts}_{safe_name}"
    counter = 1
    while dest.exists():
        dest = adir / f"{ts}_{counter}_{safe_name}"
        counter += 1
    dest.write_bytes(data)

    actor = user.name or user.email
    entry = {
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "name": dest.name,
        "original_name": safe_name,
        "path": str(dest.relative_to(Path(get_config().brain_root).expanduser())),
        "size": len(data),
        "uploaded_by": actor,
        "note": (note or "").strip(),
    }

    try:
        _append_attachment_to_frontmatter(deal_file, entry)
    except HTTPException:
        # If we could not write frontmatter, still keep the bytes but be honest.
        dest.unlink(missing_ok=True)
        raise

    _log_activity(slug, entry)

    return {
        "ok": True,
        "slug": slug,
        "attachment": entry,
        "deal_file": str(deal_file.relative_to(Path(get_config().brain_root).expanduser())),
    }


@router.get("/deals/{slug}/attachments")
async def list_deal_attachments(
    name: str = FPath(...),
    slug: str = FPath(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List attachments stored for a deal, newest first."""
    require_department_access(name=name, user=user, db=db)
    _resolve_deal_file(slug)  # 404 guard — deal must exist
    adir = _attachments_dir_for_slug(slug)
    files: List[dict] = []
    for p in sorted(adir.iterdir(), key=lambda x: x.name, reverse=True):
        if p.is_file():
            files.append(
                {
                    "name": p.name,
                    "size": p.stat().st_size,
                    "path": f"deals/attachments/{_safe_slug(slug)}/{p.name}",
                    "modified": datetime.fromtimestamp(
                        p.stat().st_mtime, tz=timezone.utc
                    ).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                }
            )
    return {"slug": slug, "attachments": files, "total": len(files)}


@router.get("/deals/{slug}/attachments/{filename}")
async def serve_deal_attachment(
    name: str = FPath(...),
    slug: str = FPath(...),
    filename: str = FPath(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Serve a stored attachment (auth required, traversal-safe)."""
    require_department_access(name=name, user=user, db=db)
    _resolve_deal_file(slug)
    safe_name = Path(filename).name  # prevent path traversal
    adir = _attachments_dir_for_slug(slug)
    file_path = adir / safe_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Attachment not found")
    return FileResponse(file_path, filename=safe_name)