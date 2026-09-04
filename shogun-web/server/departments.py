"""Department detail, gbrain proxy, docs listing, and status endpoints."""

from __future__ import annotations

import json
import logging
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional



import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import get_current_user
from config import get_config
from database import get_db, get_primary_tenant
from gateway import _get_llm_credentials
from models import Tenant, CronJob, Department, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/departments", tags=["departments"])


def _safe_rglob(root: Path, pattern: str):
    """Yield files matching *pattern* under *root*, skipping all symlinks.

    Plain ``Path.rglob`` follows symlinks by default, which can cause:
    - Traversal outside the intended directory (security risk).
    - Infinite loops when a symlink points to an ancestor directory.

    This implementation uses ``os.walk`` with ``followlinks=False`` so that
    symlinked *directories* are never descended into, and then matches the
    requested pattern against each non-symlink file entry.
    """
    import fnmatch
    import os as _os

    for dirpath, dirnames, filenames in _os.walk(str(root), followlinks=False):
        # os.walk gives us dirnames in-place; filter out any that are symlinks
        # (belt-and-suspenders: followlinks=False already prevents descent, but
        # some platforms may still surface them).
        dirnames[:] = [
            d for d in dirnames
            if not (Path(dirpath) / d).is_symlink()
        ]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            if fpath.is_symlink():
                continue
            if fnmatch.fnmatch(fname, pattern):
                yield fpath


def _get_dept(db: Session, tenant_id: int, name: str) -> Department:
    dept = db.execute(
        select(Department).where(Department.tenant_id == tenant_id, Department.name == name)
    ).scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept


def require_department_access(
    *, name: str, user: User, db: Session
) -> User:
    """Authorize ``user`` for department ``name``.

    Global admins/owners always pass. Staff must have a matching
    ``UserDepartment`` assignment to a department with this name.
    Returns the user on success; raises 403 otherwise.
    """
    if user.role in {"admin", "owner"}:
        return user

    from models import UserDepartment

    assignment = db.execute(
        select(UserDepartment)
        .join(Department, UserDepartment.department_id == Department.id)
        .where(
            UserDepartment.user_id == user.id,
            Department.name == name,
        )
    ).scalar_one_or_none()
    if assignment is not None:
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this department",
    )


def _redact_provider_config(cfg: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    out = dict(cfg or {})
    for key in list(out.keys()):
        if key.endswith(("_key", "_secret", "_token", "api_key", "password")) and out[key]:
            out[key] = "***"
    return out


def _port_open(host: str, port: int, timeout: float = 0.4) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@router.get("/{name}")
async def get_department(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return department detail with redacted provider config."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    data = dept.to_dict()
    data["provider_config"] = _redact_provider_config(dept.provider_config)
    data["gateway_ws_url"] = (
        f"ws://localhost:{dept.gateway_port}/ws" if dept.gateway_port else None
    )
    return {"department": data}


@router.get("/{name}/brain")
async def get_department_brain(
    name: str,
    q: Optional[str] = Query(default=None, description="Optional search query"),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Proxy a lightweight listing/search against gbrain for this department source."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    cfg = get_config()
    base = cfg.gbrain_base_url.rstrip("/")
    source = name  # gbrain source id typically matches department folder name

    headers = {"Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            if q:
                # Prefer hybrid search endpoint when available
                resp = await client.post(
                    f"{base}/api/search",
                    json={"query": q, "limit": limit, "source_id": source},
                    headers=headers,
                )
                if resp.status_code == 404:
                    resp = await client.get(
                        f"{base}/search",
                        params={"q": q, "limit": limit, "source": source},
                        headers=headers,
                    )
            else:
                resp = await client.get(
                    f"{base}/api/pages",
                    params={"limit": limit, "source_id": source},
                    headers=headers,
                )
                if resp.status_code == 404:
                    resp = await client.get(
                        f"{base}/pages",
                        params={"limit": limit, "source": source},
                        headers=headers,
                    )
    except httpx.HTTPError as exc:
        logger.warning("gbrain proxy error for %s: %s", name, exc)
        # Fall back to on-disk brain folder listing
        file_data = _list_brain_files(name, dept.profile_name, limit=limit)
        return {
            "ok": False,
            "error": f"gbrain unreachable: {exc}",
            "source": source,
            "pages": _list_brain_markdown(name, limit=limit),
            "files": file_data["files"],
            "folders": file_data["folders"],
            "fallback": "filesystem",
        }

    if resp.status_code >= 400:
        file_data = _list_brain_files(name, dept.profile_name, limit=limit)
        return {
            "ok": False,
            "error": resp.text[:500],
            "status_code": resp.status_code,
            "source": source,
            "pages": _list_brain_markdown(name, limit=limit),
            "files": file_data["files"],
            "folders": file_data["folders"],
            "fallback": "filesystem",
        }

    file_data = _list_brain_files(name, dept.profile_name, limit=limit, q=q)
    try:
        payload = resp.json()
    except Exception:
        payload = {"raw": resp.text[:2000]}

    return {
        "ok": True,
        "source": source,
        "department": dept.name,
        "profile_name": dept.profile_name,
        "result": payload,
        "files": file_data["files"],
        "folders": file_data["folders"],
    }


def _ensure_default_brain_docs(dept_name: str) -> None:
    """Ensure default brain markdown files exist for a department if ~/brain/<dept> is empty or missing.

    ⚠️  Gated behind SEED_DEMO_BRAIN env (default off). The seeded documents
    are fabricated demo data (Parkson, Aeon, fake contacts, fake RM figures)
    and must NOT be written into a real brain without explicit opt-in.
    """
    cfg = get_config()
    if not cfg.seed_demo_brain:
        return  # Do not seed fabricated demo data into a real brain.
    try:
        brain_root = Path(cfg.brain_root).expanduser() / dept_name.lower()
        if brain_root.is_dir() and any(brain_root.glob("**/*.md")):
            return  # Already has documents

        brain_root.mkdir(parents=True, exist_ok=True)
        key = dept_name.lower()

        if key == "crm":
            (brain_root / "key-accounts").mkdir(parents=True, exist_ok=True)
            (brain_root / "pipeline").mkdir(parents=True, exist_ok=True)
            (brain_root / "playbooks").mkdir(parents=True, exist_ok=True)

            (brain_root / "key-accounts" / "parkson-enterprise-agreement.md").write_text(
                "# Parkson Departmental Stores — Enterprise Account Overview\n\n"
                "## Executive Summary\nParkson Corporation is Shogun Retail Enterprise's largest wholesale customer in Malaysia, contributing **RM 1.45M YTD** in gross orders across 11 nationwide departmental store outlets.\n\n"
                "## Account Metadata\n- **Account Status**: Active Premier Partner\n- **Credit Terms**: 60 Days Net (RM 500,000 credit limit)\n- **Primary Owner**: Chee How (VP of Sales)\n- **Annual Contract Value (ACV)**: RM 2,800,000\n\n"
                "## Core Product Categories\n1. **Apparel & Fashion**: Premium corporate uniforms & designer outerwear.\n2. **Lifestyle & Home**: Household merchandise & eco-friendly kitchenware.\n\n"
                "## Account Contacts\n| Role | Contact Name | Email | Direct Line |\n|---|---|---|---|\n| Procurement Director | Tan Sri Kenneth | k.tan@parkson.com.my | +60 3-2143 8890 |\n| Category Buyer | Amanda Seong | a.seong@parkson.com.my | +60 3-2143 8892 |\n| Logistics Coordinator | Raymond Lim | r.lim@parkson.com.my | +60 3-2143 8895 |\n\n"
                "## Quarterly Performance & Revenue Target\n- **Q1 Delivered**: RM 650,000 (102% of target)\n- **Q2 Delivered**: RM 800,000 (105% of target)\n- **Q3 Forecast**: RM 750,000 (Pipeline Win Probability: **78%**)\n",
                encoding="utf-8"
            )

            (brain_root / "key-accounts" / "aeon-outlets-contract.md").write_text(
                "# Aeon Retail Outlets — Master Supply Contract\n\n"
                "## Account Overview\nAeon Retail Malaysia operates 28 hypermarkets and superstores. Shogun Retail Enterprise supplies consumer electronics and home accessories under a wholesale consignment model.\n\n"
                "## Key Deal Terms\n- **Contract Duration**: 24 Months (Expiring Dec 2027)\n- **Primary Owner**: Nazrul (Senior Account Manager)\n- **YTD Sales Revenue**: RM 1,180,000.00\n- **Consignment Discount Rate**: 18.5%\n\n"
                "## Top Selling SKUs at Aeon\n1. *Shogun Smart Home Hub v2* (SKU-ELE-001)\n2. *Ergonomic Lumbar Office Cushion* (SKU-LIF-004)\n3. *Wireless Noise-Canceling Headset* (SKU-ELE-008)\n\n"
                "## Recent Activity Notes\n- **2026-07-28**: Negotiated 15% increase in floor display space for Mid-Valley MegaMall outlet.\n- **2026-08-02**: Resolved minor delivery delay for Tebrau City JB store.\n",
                encoding="utf-8"
            )

            (brain_root / "pipeline" / "q3-wholesale-pipeline-review.md").write_text(
                "# Q3 B2B Wholesale Pipeline Forecast & Strategy\n\n"
                "## Executive Summary\nTotal active B2B wholesale pipeline stands at **RM 8,500,000.00** across 38 qualified opportunities. Weighted pipeline value is estimated at **RM 3,850,000.00** with an overall win-rate of **74%**.\n\n"
                "## Pipeline Stage Breakdown\n| Stage | Deal Count | Total Value (MYR) | Weighted Value |\n|---|---|---|---|\n| Lead | 10 | RM 1,500,000 | RM 300,000 |\n| Prospecting | 8 | RM 2,100,000 | RM 630,000 |\n| Qualified | 7 | RM 1,850,000 | RM 925,000 |\n| Quote Issued | 6 | RM 1,650,000 | RM 1,155,000 |\n| Tender Finalist | 3 | RM 900,000 | RM 720,000 |\n| Confirmed | 4 | RM 500,000 | RM 500,000 |\n\n"
                "## Strategic Action Items\n1. **Accelerate Lotus Supermarkets Tender**: Complete product testing by Aug 15.\n2. **Expand SOGO Fashion Range**: Offer 5% early-payment rebate on Q4 pre-orders.\n",
                encoding="utf-8"
            )

            (brain_root / "playbooks" / "lead-qualification-sop.md").write_text(
                "# Standard Operating Procedure: B2B Lead Qualification\n\n"
                "## BANT Qualification Framework\nEvery incoming sales lead must be qualified against the BANT framework before assignment:\n- **Budget**: Minimum annual retail purchasing budget of RM 100,000.\n- **Authority**: Primary decision maker must be Category Manager, Procurement Head, or C-Level.\n- **Need**: Urgent demand for retail apparel, electronics, or corporate gift merchandise.\n- **Timeline**: Decision horizon within 90 days.\n\n"
                "## Response SLA\n- **Inbound Contact Form**: Contact within **15 minutes**.\n- **WhatsApp Inquiry**: Contact within **5 minutes**.\n",
                encoding="utf-8"
            )

        elif key == "procurement":
            (brain_root / "suppliers").mkdir(parents=True, exist_ok=True)
            (brain_root / "purchase-orders").mkdir(parents=True, exist_ok=True)
            (brain_root / "inventory").mkdir(parents=True, exist_ok=True)

            (brain_root / "suppliers" / "textile-apparel-vendor-contract.md").write_text(
                "# Master Supplier Agreement — Master Textile Ltd\n\n"
                "## Supplier Profile\n- **Vendor Name**: Master Textile & Apparel Manufacturing Ltd\n- **Location**: Penang Free Industrial Zone, Malaysia\n- **Vendor ID**: VEN-APP-001\n- **Payment Terms**: 45 Days Net via Bank Transfer\n\n"
                "## Contract Details\n- **Scope**: Exclusive supply of organic cotton apparel and corporate uniform merchandise.\n- **Quality Assurance Target**: Defect rate strictly **< 0.5%** per production batch.\n- **Lead Time Guarantee**: 14 Days from Purchase Order receipt.\n\n"
                "## Key Contacts\n| Role | Contact Name | Email | Phone |\n|---|---|---|---|\n| Account Director | Mr. Robert Chen | r.chen@mastertextile.com | +60 4-643 1188 |\n| QA Manager | Sarah Hisham | s.hisham@mastertextile.com | +60 4-643 1192 |\n",
                encoding="utf-8"
            )

            (brain_root / "suppliers" / "electronics-oem-supplier-agreement.md").write_text(
                "# Consumer Electronics OEM Master Supply Agreement\n\n"
                "## Vendor Overview\n- **Vendor Name**: Apex Tech OEM Corporation\n- **Category**: Consumer Electronics & Smart Home Devices\n- **Vendor ID**: VEN-ELE-004\n- **Currency**: USD / MYR Fixed Exchange Rate Contract\n\n"
                "## SLA & Delivery Metrics\n- **Minimum Order Quantity (MOQ)**: 500 Units per order\n- **Warranty Support**: 24-Month full replacement warranty for defective units\n- **On-Time Delivery SLA**: 98.5% compliance\n\n"
                "## Pending Accounts Payable\n- **Current Unpaid Invoices**: RM 210,000.00 (Invoice #INV-2026-088 due Aug 25)\n",
                encoding="utf-8"
            )

            (brain_root / "purchase-orders" / "po-approval-matrix-2026.md").write_text(
                "# 2026 Procurement & Purchase Requisition Approval Matrix\n\n"
                "## Authority Financial Thresholds\nAll purchase requisitions (PR) and purchase orders (PO) must follow the corporate sign-off matrix below:\n\n"
                "| Requisition Amount (MYR) | Required Approvers | SLA Turnaround |\n|---|---|---|\n| Below RM 5,000 | Department Manager | 2 Hours |\n| RM 5,001 – RM 25,000 | Procurement Head | 6 Hours |\n| RM 25,001 – RM 100,000 | CFO + Procurement Head | 12 Hours |\n| Above RM 100,000 | CEO + CFO Board Sign-Off | 24 Hours |\n\n"
                "## Emergency Purchase Orders\nFor urgent stockouts affecting retail outlets, emergency POs up to RM 20,000 can be pre-approved via Slack slash command `/procure emergency`.\n",
                encoding="utf-8"
            )

            (brain_root / "inventory" / "safety-stock-policy-retail-stores.md").write_text(
                "# Retail Safety Stock & Reorder Buffer SOP\n\n"
                "## Objective\nTo prevent retail store stockouts while keeping total inventory holding costs optimized under RM 1.2M.\n\n"
                "## Category Buffer Levels\n- **Fast Moving Apparel**: 14 Days Safety Stock\n- **Consumer Electronics**: 10 Days Safety Stock\n- **Lifestyle & Home**: 21 Days Safety Stock\n",
                encoding="utf-8"
            )

        elif key == "finance":
            (brain_root / "reports").mkdir(parents=True, exist_ok=True)
            (brain_root / "reports" / "financial-statement-q2-2026.md").write_text(
                "# Q2 2026 Financial P&L Statement & Treasury Summary\n\n"
                "## Executive Revenue Summary\n- **Gross Sales YTD**: **RM 4,850,000.00**\n- **Net Operating Income**: RM 1,280,000.00\n- **Net Margin**: **26.4%**\n- **Cash Runway**: **18.4 Months**\n\n"
                "## Receivables & Payables\n- **Accounts Receivable (AR)**: RM 485,000.00 (10% credit terms with Parkson & Aeon)\n- **Accounts Payable (AP)**: RM 210,000.00 (Supplier invoices due within 30 days)\n",
                encoding="utf-8"
            )
    except Exception as exc:
        logger.warning("Could not auto-seed brain docs for %s: %s", dept_name, exc)


def _list_brain_files(dept_name: str, profile_name: str = "", *, limit: int = 500, q: Optional[str] = None) -> Dict[str, Any]:
    """List all folders and files under ~/brain/<dept> and ~/.hermes/profiles/<profile_name>, searching file content if q is provided."""
    _ensure_default_brain_docs(dept_name)
    cfg = get_config()
    brain_root = Path(cfg.brain_root).expanduser() / dept_name
    if not brain_root.is_dir():
        alt = Path(cfg.brain_root).expanduser() / f"{dept_name}"
        brain_root = alt if alt.is_dir() else brain_root

    profile_root = Path.home() / ".hermes" / "profiles" / profile_name if profile_name else None

    files: List[Dict[str, Any]] = []
    folders_set = set()

    query_str = q.strip().lower() if q and q.strip() else None

    sources = [(brain_root, "brain")]
    if profile_root and profile_root.is_dir():
        sources.append((profile_root, "profile"))

    for root_dir, category in sources:
        if not root_dir.is_dir():
            continue
        for path in sorted(_safe_rglob(root_dir, "*")):
            if not path.is_file() or path.name.startswith("."):
                continue
            rel = str(path.relative_to(root_dir)).replace("\\", "/")
            folder = str(Path(rel).parent).replace("\\", "/")

            snippet = None
            if query_str:
                name_match = query_str in path.name.lower() or query_str in rel.lower()
                content_match = False
                if path.suffix.lower() in [".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".py", ".js", ".ts", ".html"]:
                    try:
                        content_txt = path.read_text(encoding="utf-8", errors="ignore")
                        idx = content_txt.lower().find(query_str)
                        if idx >= 0:
                            content_match = True
                            start_i = max(0, idx - 40)
                            end_i = min(len(content_txt), idx + 100)
                            snippet = "..." + content_txt[start_i:end_i].replace("\n", " ") + "..."
                    except Exception:
                        pass
                if not (name_match or content_match):
                    continue

            if folder != ".":
                folders_set.add(f"{category}/{folder}" if category != "brain" else folder)

            item = {
                "slug": rel.rsplit(".", 1)[0] if "." in rel else rel,
                "rel_path": rel,
                "folder": folder if folder != "." else "",
                "category": category,
                "name": path.name,
                "full_path": str(path),
                "ext": path.suffix.lower(),
                "title": path.stem.replace("-", " ").replace("_", " ").title(),
            }
            if snippet:
                item["snippet"] = snippet

            files.append(item)
            if len(files) >= limit:
                break

    return {
        "files": files,
        "folders": sorted(list(folders_set)),
    }


def _list_brain_markdown(dept_name: str, *, limit: int = 50) -> List[Dict[str, Any]]:
    """List markdown pages under ~/brain/<dept> as a filesystem fallback."""
    data = _list_brain_files(dept_name, limit=limit)
    return [f for f in data["files"] if f["ext"] == ".md"]


@router.get("/{name}/brain/file-content")
async def get_brain_file_content(
    name: str,
    path: str = Query(..., description="File path to read"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Read content of a file in department brain or profile directory."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    target = Path(path).expanduser()
    if not target.is_file():
        cfg = get_config()
        target = Path(cfg.brain_root).expanduser() / name / path
    if not target.is_file():
        target = Path.home() / ".hermes" / "profiles" / dept.profile_name / path
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {exc}")
    return {
        "name": target.name,
        "path": str(target),
        "ext": target.suffix.lower(),
        "content": content,
    }



@router.get("/{name}/docs")
async def list_department_docs(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """List department artifacts from the brain folder and Hermes profile directory."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    cfg = get_config()

    artifacts: List[Dict[str, Any]] = []

    # Brain markdown
    for page in _list_brain_markdown(name, limit=200):
        artifacts.append(
            {
                "type": "brain_page",
                "name": page["title"],
                "slug": page["slug"],
                "path": page["path"],
            }
        )

    # Hermes profile files
    profile_dirs = [
        Path.home() / ".hermes" / "profiles" / dept.profile_name,
        Path.home() / ".hermes" / dept.profile_name,
    ]
    interesting = {
        "SOUL.md",
        "AGENTS.md",
        "config.yaml",
        "scrum.yaml",
        "README.md",
    }
    for pdir in profile_dirs:
        if not pdir.is_dir():
            continue
        for path in sorted(_safe_rglob(pdir, "*")):
            if not path.is_file():
                continue
            if path.name in interesting or path.suffix.lower() in {".md", ".yaml", ".yml", ".json"}:
                try:
                    rel = str(path.relative_to(pdir))
                except ValueError:
                    rel = path.name
                artifacts.append(
                    {
                        "type": "profile_file",
                        "name": path.name,
                        "path": str(path),
                        "relative": rel,
                        "profile": dept.profile_name,
                    }
                )

    # Shared skills that mention the department (lightweight)
    skills_root = Path.home() / ".hermes" / "skills"
    if skills_root.is_dir():
        for skill_md in skills_root.glob("*/SKILL.md"):
            artifacts.append(
                {
                    "type": "skill",
                    "name": skill_md.parent.name,
                    "path": str(skill_md),
                }
            )

    return {
        "department": dept.name,
        "profile_name": dept.profile_name,
        "count": len(artifacts),
        "artifacts": artifacts,
        "brain_root": str(Path(cfg.brain_root).expanduser() / name),
    }


@router.get("/{name}/status")
async def department_status(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Report gateway reachability and provider configuration status."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    cfg = get_config()

    gateway: Dict[str, Any] = {
        "port": dept.gateway_port,
        "listening": False,
        "health": None,
        "ws_url": f"ws://127.0.0.1:{dept.gateway_port}/ws" if dept.gateway_port else None,
    }
    if dept.gateway_port:
        gateway["listening"] = _port_open("127.0.0.1", int(dept.gateway_port))
        if gateway["listening"]:
            try:
                async with httpx.AsyncClient(timeout=2.5) as client:
                    resp = await client.get(f"http://127.0.0.1:{dept.gateway_port}/health")
                    gateway["health"] = {
                        "status_code": resp.status_code,
                        "body": resp.text[:300],
                    }
            except httpx.HTTPError as exc:
                gateway["health"] = {"error": str(exc)}

    provider_cfg = dept.provider_config or {}
    provider_status = {
        "configured": bool(provider_cfg.get("provider") or provider_cfg.get("api_key")),
        "provider": provider_cfg.get("provider"),
        "model": provider_cfg.get("model"),
        "has_api_key": bool(
            provider_cfg.get("api_key")
            or provider_cfg.get("openai_api_key")
            or provider_cfg.get("anthropic_api_key")
        ),
    }

    gbrain_ok = False
    gbrain_detail: Dict[str, Any] = {}
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get(f"{cfg.gbrain_base_url.rstrip('/')}/health")
            gbrain_ok = resp.status_code < 500
            gbrain_detail = {"status_code": resp.status_code}
    except httpx.HTTPError as exc:
        gbrain_detail = {"error": str(exc)}

    profile_path = Path.home() / ".hermes" / "profiles" / dept.profile_name
    profile_exists = profile_path.is_dir()

    return {
        "department": dept.to_dict() | {"provider_config": _redact_provider_config(dept.provider_config)},
        "status": dept.status,
        "gateway": gateway,
        "provider": provider_status,
        "gbrain": {"ok": gbrain_ok, **gbrain_detail, "base_url": cfg.gbrain_base_url},
        "profile": {
            "name": dept.profile_name,
            "exists": profile_exists,
            "path": str(profile_path) if profile_exists else None,
        },
    }


def _get_chat_history_file(dept_name: str, user_id: Optional[int] = None) -> Path:
    """Return path to persistent JSON chat history for a department per user."""
    cfg = get_config()
    history_dir = Path(cfg.db_path).parent / "chat_history"
    history_dir.mkdir(parents=True, exist_ok=True)
    if user_id:
        return history_dir / f"{dept_name.lower()}_user_{user_id}.json"
    return history_dir / f"{dept_name.lower()}.json"


@router.get("/{name}/chat/history")
async def get_department_chat_history(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return saved chat history for a specific department (scoped to user)."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    file_path = _get_chat_history_file(dept.name.lower(), user.id)
    if not file_path.is_file():
        return []
    try:
        import json
        with file_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, list) else []
    except Exception as exc:
        logger.warning("Error reading chat history for %s: %s", name, exc)
        return []


@router.post("/{name}/chat/messages")
async def save_department_chat_message(
    name: str,
    body: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Persist chat messages for a specific department (scoped to user)."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    file_path = _get_chat_history_file(dept.name.lower(), user.id)

    incoming_messages = body.get("messages")
    if incoming_messages is None and "content" in body:
        incoming_messages = [body]
    if not isinstance(incoming_messages, list):
        raise HTTPException(status_code=400, detail="Invalid message payload")

    existing: List[Dict[str, Any]] = []
    if file_path.is_file():
        try:
            import json
            with file_path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    existing = data
        except Exception:
            existing = []

    # Merge or append incoming messages
    existing_by_id = {m.get("id"): i for i, m in enumerate(existing) if m.get("id")}
    for msg in incoming_messages:
        msg_id = msg.get("id")
        if msg_id and msg_id in existing_by_id:
            existing[existing_by_id[msg_id]] = msg
        else:
            existing.append(msg)

    try:
        import json
        with file_path.open("w", encoding="utf-8") as fh:
            json.dump(existing, fh, indent=2)
    except Exception as exc:
        logger.error("Failed to write chat history for %s: %s", name, exc)
        raise HTTPException(status_code=500, detail=f"Failed to save chat history: {exc}")

    return {"ok": True, "saved_count": len(existing)}


@router.delete("/chat/history/all")
async def clear_all_chat_history() -> Dict[str, Any]:
    """Delete all persistent department chat history files."""
    cfg = get_config()
    history_dir = Path(cfg.db_path).parent / "chat_history"
    deleted_count = 0
    if history_dir.is_dir():
        for f in history_dir.glob("*.json"):
            try:
                f.unlink()
                deleted_count += 1
            except Exception as exc:
                logger.warning("Could not delete chat history file %s: %s", f, exc)
    return {"ok": True, "deleted_count": deleted_count}


@router.delete("/{name}/chat/history")
async def clear_department_chat_history(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Delete saved chat history for a specific department (user-scoped)."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    file_path = _get_chat_history_file(dept.name.lower(), user.id)
    if file_path.is_file():
        try:
            file_path.unlink()
        except Exception as exc:
            logger.warning("Could not delete file %s: %s", file_path, exc)
    return {"ok": True, "department": dept.name.lower()}



import shutil
import uuid
from fastapi import File, UploadFile, Body

_DEPARTMENT_CONNECTORS: Dict[str, List[Dict[str, Any]]] = {
    "finance": [
        {
            "id": "bukku",
            "name": "Bukku Accounting",
            "category": "Accounting & Tax",
            "description": "Cloud accounting software for Malaysian SMEs with automated e-invoicing.",
            "logo_icon": "BookOpen",
            "status": "disconnected",
            "docs_url": "https://support.bukku.com",
            "instructions": [
                "Log in to your Bukku account.",
                "Go to Settings → API Integration.",
                "Generate a new API key.",
                "Copy the API key and organization ID.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "bk_live_...", "type": "password"},
                {"field": "credentials.organization_id", "label": "Organization ID", "placeholder": "BK-XXXXX"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "qbo",
            "name": "QuickBooks Online",
            "category": "Accounting",
            "description": "Sync chart of accounts, bills, and customer invoices.",
            "logo_icon": "DollarSign",
            "status": "disconnected",
            "docs_url": "https://developer.intuit.com",
            "instructions": [
                "Go to the Intuit Developer portal and create an app.",
                "Copy the Client ID and Client Secret.",
                "Use the OAuth 2.0 flow to obtain a Refresh Token.",
                "Find your Company ID (Realm ID) in the QBO URL.",
            ],
            "required_fields": [
                {"field": "credentials.client_id", "label": "Client ID", "placeholder": "L0xxxxxxx..."},
                {"field": "credentials.client_secret", "label": "Client Secret", "placeholder": "••••••••", "type": "password"},
                {"field": "credentials.realm_id", "label": "Company ID (Realm ID)", "placeholder": "123146..."},
                {"field": "credentials.refresh_token", "label": "Refresh Token", "placeholder": "AB116..."},
            ],
            "recommended_fields": [
                {"field": "credentials.environment", "label": "Environment", "placeholder": "production (default) / sandbox"},
            ],
            "credentials": {},
        },
        {
            "id": "xero",
            "name": "Xero",
            "category": "Accounting & AR",
            "description": "Automated bank reconciliation feeds and invoice syncing.",
            "logo_icon": "FileText",
            "status": "disconnected",
            "docs_url": "https://developer.xero.com",
            "instructions": [
                "Create a Xero app at developer.xero.com.",
                "Copy the Client ID and Client Secret.",
                "Connect your organisation and copy the Tenant ID.",
            ],
            "required_fields": [
                {"field": "credentials.client_id", "label": "Client ID", "placeholder": "..."},
                {"field": "credentials.client_secret", "label": "Client Secret", "placeholder": "••••••••", "type": "password"},
                {"field": "credentials.tenant_id", "label": "Tenant ID", "placeholder": "..."},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "stripe",
            "name": "Stripe Payments",
            "category": "Payment Gateway",
            "description": "Real-time payment capture and payout reconciliation.",
            "logo_icon": "CreditCard",
            "status": "disconnected",
            "docs_url": "https://dashboard.stripe.com/apikeys",
            "instructions": [
                "Open the Stripe Dashboard → Developers → API Keys.",
                "Copy the Secret key (sk_live_...).",
            ],
            "required_fields": [
                {"field": "credentials.secret_key", "label": "Secret Key", "placeholder": "sk_live_...", "type": "password"},
            ],
            "recommended_fields": [
                {"field": "credentials.webhook_secret", "label": "Webhook Signing Secret", "placeholder": "whsec_...", "type": "password"},
            ],
            "credentials": {},
        },
        {
            "id": "sql_account",
            "name": "SQL Account",
            "category": "ERP & Tax",
            "description": "Malaysian GST/SST compliant desktop & cloud bridge.",
            "logo_icon": "Database",
            "status": "disconnected",
            "docs_url": "https://www.sql.com.my",
            "instructions": [
                "Open SQL Account → File → Cloud API Settings.",
                "Enable the Cloud API and generate an API key.",
                "Copy the API key and server URL.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
                {"field": "credentials.server_url", "label": "Server URL", "placeholder": "https://..."},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
    ],
    "hr": [
        {
            "id": "kakitangan",
            "name": "Kakitangan.com",
            "category": "Cloud HR & Payroll",
            "description": "Malaysian HR software for automated EPF/SOCSO/PCB compliance, e-leave, e-claims, and time attendance.",
            "logo_icon": "Users",
            "status": "disconnected",
            "docs_url": "https://kakitangan.com",
            "instructions": [
                "Log in to your Kakitangan.com admin account.",
                "Go to Settings → API Integration.",
                "Generate an API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "payrollpanda",
            "name": "PayrollPanda",
            "category": "Payroll & Time Tracking",
            "description": "LHDN-approved payroll system with integrated Jibble attendance tracking and statutory reporting.",
            "logo_icon": "CreditCard",
            "status": "disconnected",
            "docs_url": "https://payrollpanda.com",
            "instructions": [
                "Log in to PayrollPanda as an admin.",
                "Go to Settings → API Keys.",
                "Create a new API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "swingvy",
            "name": "Swingvy",
            "category": "All-in-One HRMS",
            "description": "Mobile-first HR platform managing employee directory, benefits, leave, and automated bank GIRO payments.",
            "logo_icon": "UserCheck",
            "status": "disconnected",
            "docs_url": "https://swingvy.com",
            "instructions": [
                "Log in to Swingvy admin portal.",
                "Go to Settings → Integration → API.",
                "Generate an API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "briohr",
            "name": "BrioHR",
            "category": "HRMS & Talent Management",
            "description": "End-to-end HR software covering recruitment, onboarding, performance reviews, and payroll across SEA.",
            "logo_icon": "Briefcase",
            "status": "disconnected",
            "docs_url": "https://briohr.com",
            "instructions": [
                "Log in to BrioHR as an admin.",
                "Go to Settings → API & Integrations.",
                "Generate an API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "althr",
            "name": "altHR",
            "category": "Employee Experience & HR",
            "description": "Malaysian enterprise HR app featuring digital perks, rostering, check-ins, travel management, and claims.",
            "logo_icon": "Smartphone",
            "status": "disconnected",
            "docs_url": "https://althr.com",
            "instructions": [
                "Log in to altHR admin dashboard.",
                "Go to Settings → API Keys.",
                "Generate a new key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "sql_payroll",
            "name": "SQL Payroll",
            "category": "On-Premise & Cloud Payroll",
            "description": "Popular Malaysian payroll software with batch e-filing, MYKAD reader integration, and EPF/PCB auto-calculations.",
            "logo_icon": "Database",
            "status": "disconnected",
            "docs_url": "https://www.sql.com.my",
            "instructions": [
                "Open SQL Payroll → File → Cloud API Settings.",
                "Enable Cloud API and generate an API key.",
                "Copy the API key and server URL.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
                {"field": "credentials.server_url", "label": "Server URL", "placeholder": "https://..."},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "workday_hcm",
            "name": "Workday HCM",
            "category": "Enterprise HCM",
            "description": "Global enterprise Human Capital Management platform for workforce planning, talent management, and global payroll.",
            "logo_icon": "Globe",
            "status": "disconnected",
            "docs_url": "https://community.workday.com/api",
            "instructions": [
                "Register an ISU (Integration System User) in Workday.",
                "Generate an API token for the ISU.",
                "Copy the tenant URL.",
            ],
            "required_fields": [
                {"field": "credentials.api_token", "label": "API Token", "placeholder": "...", "type": "password"},
                {"field": "credentials.tenant_url", "label": "Tenant URL", "placeholder": "https://...workday.com"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
    ],
    "crm": [
        {
            "id": "hubspot",
            "name": "HubSpot CRM",
            "category": "Sales & Deals",
            "description": "Two-way pipeline sync, contact tracking, and deal stage analytics.",
            "logo_icon": "Handshake",
            "status": "disconnected",
            "docs_url": "https://developers.hubspot.com",
            "instructions": [
                "Log in to HubSpot → Settings → Integrations → API Key.",
                "Generate a new Private App token (or API key).",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "Private App Token / API Key", "placeholder": "pat-... or ...", "type": "password"},
            ],
            "recommended_fields": [
                {"field": "credentials.portal_id", "label": "Portal ID", "placeholder": "894102"},
            ],
            "credentials": {},
        },
        {
            "id": "salesforce",
            "name": "Salesforce Sales Cloud",
            "category": "Enterprise CRM",
            "description": "Account management and enterprise deal stage tracking.",
            "logo_icon": "Database",
            "status": "disconnected",
            "docs_url": "https://developer.salesforce.com",
            "instructions": [
                "Create a Connected App in Salesforce Setup.",
                "Copy the Consumer Key and Consumer Secret.",
                "Use OAuth username/password flow to get a token.",
            ],
            "required_fields": [
                {"field": "credentials.client_id", "label": "Consumer Key", "placeholder": "..."},
                {"field": "credentials.client_secret", "label": "Consumer Secret", "placeholder": "••••••••", "type": "password"},
                {"field": "credentials.username", "label": "Username", "placeholder": "user@company.com"},
                {"field": "credentials.password_token", "label": "Password + Security Token", "placeholder": "password + token", "type": "password"},
            ],
            "recommended_fields": [
                {"field": "credentials.instance_url", "label": "Instance URL", "placeholder": "https://login.salesforce.com"},
            ],
            "credentials": {},
        },
    ],
    "procurement": [
        {
            "id": "sap_ariba",
            "name": "SAP Ariba",
            "category": "Supplier Portal",
            "description": "Purchase order requisitions and vendor contract lifecycles.",
            "logo_icon": "Package",
            "status": "disconnected",
            "docs_url": "https://developer.ariba.com",
            "instructions": [
                "Create an application in the Ariba Developer portal.",
                "Copy the API Key and API Secret.",
                "Note the Ariba Network realm.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "..."},
                {"field": "credentials.api_secret", "label": "API Secret", "placeholder": "••••••••", "type": "password"},
                {"field": "credentials.realm", "label": "Realm", "placeholder": "AN..."},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "procurehere",
            "name": "Procurehere",
            "category": "e-Procurement Platform",
            "description": "Cloud-based e-Sourcing, e-Procurement, and supplier management tailored for Malaysian enterprises.",
            "logo_icon": "ShoppingCart",
            "status": "disconnected",
            "docs_url": "https://procurehere.com",
            "instructions": [
                "Log in to Procurehere admin.",
                "Go to Settings → API.",
                "Generate an API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "coupa",
            "name": "Coupa Procurement",
            "category": "Business Spend Management",
            "description": "Enterprise-grade e-procurement, purchase order management, and invoicing workflows.",
            "logo_icon": "Layers",
            "status": "disconnected",
            "docs_url": "https://developer.coupa.com",
            "instructions": [
                "Log in to Coupa as admin.",
                "Go to Setup → API Keys.",
                "Generate a new key.",
                "Copy the instance URL.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
                {"field": "credentials.instance_url", "label": "Instance URL", "placeholder": "https://...coupa.com"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "oracle_netsuite",
            "name": "Oracle NetSuite ERP",
            "category": "ERP & Procurement",
            "description": "Integrated cloud ERP managing requisitions, purchase orders, inventory, and vendor bill processing.",
            "logo_icon": "Database",
            "status": "disconnected",
            "docs_url": "https://docs.oracle.com/en/cloud/saas/netsuite",
            "instructions": [
                "Enable SuiteTalk (Web Services) in NetSuite.",
                "Create an Integration record → obtain Consumer Key/Secret.",
                "Perform token-based auth → obtain Token ID/Secret.",
                "Note the Account ID.",
            ],
            "required_fields": [
                {"field": "credentials.account_id", "label": "Account ID", "placeholder": "TST..."},
                {"field": "credentials.consumer_key", "label": "Consumer Key", "placeholder": "..."},
                {"field": "credentials.consumer_secret", "label": "Consumer Secret", "placeholder": "••••••••", "type": "password"},
                {"field": "credentials.token_id", "label": "Token ID", "placeholder": "..."},
                {"field": "credentials.token_secret", "label": "Token Secret", "placeholder": "••••••••", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "tenderboard",
            "name": "TenderBoard",
            "category": "Sourcing & e-Tendering",
            "description": "B2B e-procurement system for vendor discovery, RFQ/RFP publishing, and tendering management.",
            "logo_icon": "FileText",
            "status": "disconnected",
            "docs_url": "https://tenderboard.com",
            "instructions": [
                "Log in to TenderBoard admin.",
                "Go to Settings → API.",
                "Generate an API key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "cimb_bizchannel",
            "name": "CIMB BizChannel",
            "category": "B2B Payment Gateway",
            "description": "Corporate electronic banking integration for bulk supplier payments, FPX B2B, and telegraphic transfers.",
            "logo_icon": "CreditCard",
            "status": "disconnected",
            "docs_url": "https://www.cimbbank.com.my",
            "instructions": [
                "Contact CIMB treasury/cash management to enable BizChannel API.",
                "Obtain the Corporation ID and User ID.",
                "Set up the API password.",
            ],
            "required_fields": [
                {"field": "credentials.corp_id", "label": "Corporation ID", "placeholder": "..."},
                {"field": "credentials.user_id", "label": "User ID", "placeholder": "..."},
                {"field": "credentials.password", "label": "API Password", "placeholder": "••••••••", "type": "password"},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
        {
            "id": "billplz_b2b",
            "name": "Billplz",
            "category": "Payment Gateway",
            "description": "Malaysian automated payment gateway offering FPX, direct debit, and credit card payouts for vendors.",
            "logo_icon": "CreditCard",
            "status": "disconnected",
            "docs_url": "https://www.billplz.com/api",
            "instructions": [
                "Log in to Billplz dashboard.",
                "Go to Settings → API Key.",
                "Copy the API Key and X Signature Key.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
            ],
            "recommended_fields": [
                {"field": "collections.x_signature_key", "label": "X Signature Key", "placeholder": "...", "type": "password"},
            ],
            "credentials": {},
        },
        {
            "id": "jaggaer",
            "name": "JAGGAER One",
            "category": "Supplier Management",
            "description": "Direct and indirect procurement solution covering contract management, sourcing, and spend analytics.",
            "logo_icon": "Truck",
            "status": "disconnected",
            "docs_url": "https://www.jaggaer.com",
            "instructions": [
                "Log in to JAGGAER admin.",
                "Go to Integration → API.",
                "Generate an API key.",
                "Copy the instance URL.",
            ],
            "required_fields": [
                {"field": "credentials.api_key", "label": "API Key", "placeholder": "...", "type": "password"},
                {"field": "credentials.instance_url", "label": "Instance URL", "placeholder": "https://..."},
            ],
            "recommended_fields": [],
            "credentials": {},
        },
    ],
    "engineering": [
        {
            "id": "github",
            "name": "GitHub Enterprise",
            "category": "Source Control & CI/CD",
            "description": "Repository sync, PR code review triggers, and CI workflow status.",
            "logo_icon": "Database",
            "status": "disconnected",
            "docs_url": "https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
            "instructions": [
                "Go to GitHub → Settings → Developer settings → Personal access tokens.",
                "Generate a new token (classic or fine-grained).",
                "Grant repo, workflow, and read:org scopes.",
                "Copy the token.",
            ],
            "required_fields": [
                {"field": "credentials.token", "label": "Personal Access Token", "placeholder": "ghp_... or github_pat_...", "type": "password"},
            ],
            "recommended_fields": [
                {"field": "credentials.org", "label": "Organization", "placeholder": "limcheehow"},
            ],
            "credentials": {},
        },
    ],
}


# ---------------------------------------------------------------------------
# Connector state persistence helpers
#
# Connector state (status + saved credentials) is persisted in
# dept.provider_config["connectors"] — a dict keyed by connector_id.
# The seed (_DEPARTMENT_CONNECTORS) provides metadata (name, description,
# fields, instructions). At read time we merge seed metadata + persisted
# state and mask secrets. This mirrors the comms_channels pattern.
# ---------------------------------------------------------------------------

_SECRET_SUBSTRS = ("secret", "token", "password", "api_key", "key")


def _mask_connector_creds(creds: dict) -> dict:
    """Mask secret-looking credential values for UI return."""
    if not isinstance(creds, dict):
        return {}
    masked = {}
    for k, v in creds.items():
        if v and any(s in k.lower() for s in _SECRET_SUBSTRS):
            masked[k] = "***"
        else:
            masked[k] = v
    return masked


def _get_merged_connectors(dept) -> List[Dict[str, Any]]:
    """Merge seed metadata with persisted connector state (status + creds).

    Returns a list of connector dicts with:
    - seed metadata (name, description, fields, instructions, etc.)
    - persisted status (connected/disconnected) + connected_at + config_summary
    - masked credentials (secrets → "***")
    """
    key = dept.name.lower()
    seed = _DEPARTMENT_CONNECTORS.get(key, [])
    persisted = (dept.provider_config or {}).get("connectors") or {}
    if not isinstance(persisted, dict):
        persisted = {}

    merged = []
    for s in seed:
        conn = dict(s)  # copy seed metadata
        conn_id = s.get("id", "")
        saved = persisted.get(conn_id)
        if isinstance(saved, dict):
            # Apply persisted state
            conn["status"] = saved.get("status", "disconnected")
            if saved.get("connected_at"):
                conn["connected_at"] = saved["connected_at"]
            if saved.get("config_summary"):
                conn["config_summary"] = saved["config_summary"]
            # Merge credentials: seed's empty {} → saved values (masked)
            conn["credentials"] = _mask_connector_creds(saved.get("credentials") or {})
        else:
            # No persisted state — use seed defaults (disconnected, empty creds)
            conn["credentials"] = {}
        merged.append(conn)
    return merged


def _save_connector_state(dept, connector_id: str, status: str,
                          credentials: dict = None, config_summary: str = None) -> dict:
    """Persist connector state (status + credentials) to provider_config.

    If credentials is None, keep existing saved credentials.
    If credentials is provided, replace the saved set.
    Returns the updated connector state dict (with masked creds).
    """
    from sqlalchemy.orm.attributes import flag_modified

    cfg = dict(dept.provider_config or {})
    connectors = cfg.get("connectors")
    if not isinstance(connectors, dict):
        connectors = {}

    conn_id = connector_id
    existing = connectors.get(conn_id, {})
    if not isinstance(existing, dict):
        existing = {}

    new_state = dict(existing)
    new_state["status"] = status
    if status == "connected":
        from datetime import datetime, timezone
        new_state["connected_at"] = datetime.now(timezone.utc).isoformat()
        if config_summary:
            new_state["config_summary"] = config_summary
    else:
        new_state.pop("connected_at", None)
        new_state.pop("config_summary", None)

    # Update credentials: merge new values, preserving "masked" (*** sentinel) values
    if credentials is not None:
        old_creds = existing.get("credentials") or {}
        if not isinstance(old_creds, dict):
            old_creds = {}
        new_creds = dict(credentials)
        for ck, cv in list(new_creds.items()):
            if cv == "***" and ck in old_creds:
                new_creds[ck] = old_creds[ck]
        new_state["credentials"] = new_creds
    # If credentials is None, keep existing (already in new_state via dict(existing))

    connectors[conn_id] = new_state
    cfg["connectors"] = connectors
    dept.provider_config = cfg
    flag_modified(dept, "provider_config")
    return new_state

# ---------------------------------------------------------------------------
# Skill catalog: scan-on-disk with mtime cache
#
# The source of truth for skills is the filesystem — each SKILL.md file's YAML
# frontmatter (name, description, version, author, tags, category).  We scan
# skills/<dept>/<skill>/SKILL.md at request time, cache the parsed index in
# memory, and invalidate via the skills/ directory mtime.  No manifest file to
# keep in sync — adding a skill = drop a SKILL.md on disk.
# ---------------------------------------------------------------------------

import re as _re
import yaml as _yaml


def _skills_repo_root() -> Path:
    """Absolute path to the skills/ directory in the shogun-os repo."""
    # departments.py lives in shogun-web/server/, so ../../skills
    return Path(__file__).resolve().parent.parent.parent / "skills"


def _installed_skills_root() -> Path:
    """~/.hermes/skills/ — where generated/saved skills are written for Hermes."""
    return Path.home() / ".hermes" / "skills"


# Category title-casing map (parent dir name → display label)
_CATEGORY_LABELS: Dict[str, str] = {
    "finance": "Finance",
    "crm": "CRM/Sales",
    "hr": "HR",
    "procurement": "Procurement",
    "coding": "Coding",
    "software-development": "Software Development",
    "operations": "Operations",
    "executive": "Executive",
    "retail": "Retail",
    "manufacturing": "Manufacturing",
    "devops": "DevOps",
    "gbrain": "Brain",
    "communication": "Communication",
    "email": "Email",
    "mcp": "MCP",
    "note-taking": "Note Taking",
    "productivity": "Productivity",
    "research": "Research",
    "media": "Media",
    "creative": "Creative",
    "search-router": "Search Router",
    "shogunify": "Shogunify",
    "plan": "Planning",
    "github": "GitHub",
    "google-workspace": "Google Workspace",
    "lark-workspace": "Lark Workspace",
    "lark-formatting": "Lark Formatting",
    "slack-formatting": "Slack Formatting",
    "smart-home": "Smart Home",
    "company-workflow": "Company Workflow",
    "department-scrum": "Department Scrum",
    "systematic-debugging": "Systematic Debugging",
    "verify-first": "Verify First",
    "writing-plans": "Writing Plans",
    "profile-management": "Profile Management",
    "profile-enrichment": "Profile Enrichment",
    "add-profile-dashboard": "Profile Dashboard",
    "brain-compliance": "Brain Compliance",
    "brain-e2e-tests": "Brain E2E Tests",
    "brain-file-delivery": "Brain File Delivery",
    "brain-first-lookup": "Brain First Lookup",
    "brain-ingest-pipeline": "Brain Ingest Pipeline",
    "brain-link-campaign": "Brain Link Campaign",
    "timeline-inject-v2": "Timeline Inject",
    "document-processing": "Document Processing",
    "coding-workflow": "Coding Workflow",
    "general": "General",
}


def _title_case_category(dept_dir: str) -> str:
    """Convert a directory name to a human-readable category label."""
    if dept_dir in _CATEGORY_LABELS:
        return _CATEGORY_LABELS[dept_dir]
    # Fallback: title-case with spaces
    return dept_dir.replace("-", " ").replace("_", " ").title()


_FRONTMATTER_RE = _re.compile(r"^---\s*\n(.*?\n)---\s*\n?", _re.DOTALL)


def _parse_skill_frontmatter(text: str) -> tuple:
    """Parse YAML frontmatter from a SKILL.md file.

    Returns (frontmatter_dict, body_text). If no frontmatter or parse fails,
    returns ({}, text).
    """
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    fm_text = m.group(1)
    body = text[m.end():]
    try:
        fm = _yaml.safe_load(fm_text) or {}
        # Frontmatter must be a dict; some files parse to str/list
        if not isinstance(fm, dict):
            return {}, body
        return fm, body
    except _yaml.YAMLError:
        return {}, body


def _humanize_name(slug: str, fm_name: str = "", heading: str = "") -> str:
    """Derive a human-readable skill name from frontmatter name, heading, or slug."""
    if fm_name:
        # Use frontmatter name but title-case for display
        return slug.replace("-", " ").replace("_", " ").title()
    if heading:
        return heading.strip()
    return slug.replace("-", " ").replace("_", " ").title()


def _extract_heading(body: str) -> str:
    """Extract the first # heading from the SKILL.md body (after frontmatter)."""
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            return stripped[2:].strip()
    return ""


def _extract_description_from_body(body: str) -> str:
    """If frontmatter has no description, extract from first paragraph after heading."""
    lines = body.splitlines()
    in_heading = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("# "):
            in_heading = True
            continue
        if in_heading and stripped and not stripped.startswith("#"):
            return stripped
    # Fallback: first non-empty, non-heading line
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return stripped
    return ""


def _scan_one_skill(skill_path: Path, repo_root: Path) -> Optional[Dict[str, Any]]:
    """Parse a single SKILL.md file into a catalog entry.

    Returns None if the file is unreadable.
    """
    try:
        text = skill_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None

    # Skip empty files (e.g. placeholder files)
    if not text.strip():
        return None

    fm, body = _parse_skill_frontmatter(text)

    # id = frontmatter name, fallback to directory name
    skill_id = str(fm.get("name") or skill_path.parent.name).lower().strip()

    # description: frontmatter > first paragraph
    description = str(fm.get("description") or "").strip()
    if not description:
        description = _extract_description_from_body(body)

    # Truncate long descriptions for catalog display
    if len(description) > 200:
        description = description[:197] + "..."

    # category: parent dir → title-cased
    # repo_root / skills / <dept_dir> / <skill_dir> / SKILL.md  (nested)
    # repo_root / skills / <skill_dir> / SKILL.md              (top-level, no dept)
    parent_dir_name = skill_path.parent.parent.name
    if parent_dir_name == "skills":
        # Top-level skill (no department subfolder) → "General"
        dept_dir = "general"
    else:
        dept_dir = parent_dir_name

    # version
    version = str(fm.get("version") or "1.0.0")
    # author
    author = str(fm.get("author") or "Shogun OS")

    # tags
    tags = fm.get("tags") or []
    if not isinstance(tags, list):
        tags = [tags]
    tags = [str(t) for t in tags]

    # related_skills
    related = []
    meta = fm.get("metadata") or {}
    if isinstance(meta, dict):
        hermes_meta = meta.get("hermes") or {}
        if isinstance(hermes_meta, dict):
            related_raw = hermes_meta.get("related_skills") or []
            if not isinstance(related_raw, list):
                related_raw = [related_raw]
            related = [str(r) for r in related_raw]

    # name for display
    heading = _extract_heading(body)
    name = _humanize_name(skill_id, str(fm.get("name") or ""), heading)

    # mtime for last_modified
    try:
        stat = skill_path.stat()
        mtime_iso = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        size_bytes = stat.st_size
    except Exception:
        mtime_iso = ""
        size_bytes = 0

    # installed: check if this skill exists in ~/.hermes/skills/ (Hermes' actual skill dir)
    installed_skills_dir = _installed_skills_root()
    installed = (installed_skills_dir / skill_id / "SKILL.md").exists() or \
                (installed_skills_dir / skill_path.parent.name / "SKILL.md").exists()

    # relative path for lazy loading
    try:
        rel_path = str(skill_path.relative_to(repo_root.parent)).replace("\\", "/")
    except Exception:
        rel_path = str(skill_path).replace("\\", "/")

    return {
        "id": skill_id,
        "name": name,
        "description": description,
        "category": _title_case_category(dept_dir),
        "department_key": dept_dir,
        "installed": installed,
        "version": version,
        "author": author,
        "tags": tags,
        "related_skills": related,
        "path": rel_path,
        "last_modified": mtime_iso,
        "size_bytes": size_bytes,
    }


# ---------------------------------------------------------------------------
# Persistent skill install state
#
# Stores which skills are installed to which departments in a JSON file:
#   ~/.shogun-os/skill-installs.json
#   { "finance": ["ar-credit-control", "ap-vendor-management"], ... }
#
# This survives restarts. The scanner reads this to set installed=True on
# catalog entries. The department skills endpoint returns only the installed
# skills for that department.
# ---------------------------------------------------------------------------

from config import SHOGUN_HOME as _SHOGUN_HOME

_SKILL_INSTALLS_PATH = _SHOGUN_HOME / "skill-installs.json"

# In-memory cache of the persisted installs: {dept_key: set(skill_ids)}
_SKILL_INSTALLS_CACHE: Optional[Dict[str, set]] = None
_SKILL_INSTALLS_MTIME: float = 0.0


def _skill_installs_path() -> Path:
    """Path to the persistent skill installs JSON file."""
    return _SKILL_INSTALLS_PATH


def _load_skill_installs() -> Dict[str, set]:
    """Load the persistent skill installs from disk.

    Returns a dict mapping dept_key → set of skill_ids.
    Uses mtime caching — reloads only if the file changed.
    """
    global _SKILL_INSTALLS_CACHE, _SKILL_INSTALLS_MTIME

    path = _skill_installs_path()
    if not path.exists():
        return {}

    try:
        mtime = path.stat().st_mtime
    except Exception:
        return {}

    if _SKILL_INSTALLS_CACHE is not None and mtime == _SKILL_INSTALLS_MTIME:
        return _SKILL_INSTALLS_CACHE

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    cache: Dict[str, set] = {}
    for dept_key, skill_ids in data.items():
        if isinstance(skill_ids, list):
            cache[dept_key.lower()] = set(str(sid) for sid in skill_ids)

    _SKILL_INSTALLS_CACHE = cache
    _SKILL_INSTALLS_MTIME = mtime
    return cache


def _save_skill_installs(installs: Dict[str, set]) -> None:
    """Persist the skill installs to disk and update the cache."""
    global _SKILL_INSTALLS_CACHE, _SKILL_INSTALLS_MTIME

    path = _skill_installs_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    # Serialize sets → lists
    serializable = {k: sorted(v) for k, v in installs.items() if v}
    path.write_text(json.dumps(serializable, indent=2, sort_keys=True), encoding="utf-8")

    # Update cache
    _SKILL_INSTALLS_CACHE = {k: set(v) for k, v in installs.items() if v}
    try:
        _SKILL_INSTALLS_MTIME = path.stat().st_mtime
    except Exception:
        _SKILL_INSTALLS_MTIME = 0.0

    # Also invalidate the skills cache so installed status updates
    global _SKILLS_CACHE
    _SKILLS_CACHE = (None, None, 0.0, 0.0, 0.0)


def _is_skill_installed(skill_id: str, dept_key: str = "") -> bool:
    """Check if a skill is installed to a specific department (or any if dept_key='')."""
    installs = _load_skill_installs()
    if dept_key:
        return skill_id in installs.get(dept_key.lower(), set())
    return any(skill_id in ids for ids in installs.values())


def _get_installed_depts_for_skill(skill_id: str) -> List[str]:
    """Get list of department keys where this skill is installed."""
    installs = _load_skill_installs()
    return [dept for dept, ids in installs.items() if skill_id in ids]


def _install_skill_to_dept(skill_id: str, dept_key: str) -> bool:
    """Persist: add a skill to a department's install list.

    Returns True if it was newly added, False if already installed there.
    """
    installs = _load_skill_installs()
    dept_key = dept_key.lower()
    if dept_key not in installs:
        installs[dept_key] = set()
    if skill_id in installs[dept_key]:
        return False
    installs[dept_key].add(skill_id)
    _save_skill_installs(installs)
    return True


def _uninstall_skill_from_dept(skill_id: str, dept_key: str) -> bool:
    """Persist: remove a skill from a department's install list.

    Returns True if it was removed, False if it wasn't installed there.
    """
    installs = _load_skill_installs()
    dept_key = dept_key.lower()
    if dept_key not in installs or skill_id not in installs[dept_key]:
        return False
    installs[dept_key].discard(skill_id)
    if not installs[dept_key]:
        del installs[dept_key]
    _save_skill_installs(installs)
    return True


# ---------------------------------------------------------------------------
# Skill scanner with mtime cache
# ---------------------------------------------------------------------------

_SKILLS_CACHE: tuple = (None, None, 0.0, 0.0, 0.0)  # (list, dict, root_mtime, installed_mtime, installs_mtime)


def _get_dir_mtime(path: Path) -> float:
    """Get the latest mtime of a directory and its immediate children."""
    try:
        mtime = path.stat().st_mtime
        if path.is_dir():
            for child in path.iterdir():
                try:
                    child_mtime = child.stat().st_mtime
                    if child_mtime > mtime:
                        mtime = child_mtime
                except Exception:
                    pass
        return mtime
    except Exception:
        return 0.0


def _scan_skills_on_disk() -> List[Dict[str, Any]]:
    """Scan the skills/ directory and return a list of catalog entries.

    Uses mtime-based cache invalidation: if the skills/ directory, the
    installed skills directory, or the skill-installs.json file has changed
    since the last scan, rebuild the cache.
    """
    global _SKILLS_CACHE

    repo_root = _skills_repo_root()
    if not repo_root.is_dir():
        return []

    root_mtime = _get_dir_mtime(repo_root)
    installed_mtime = _get_dir_mtime(_installed_skills_root()) if _installed_skills_root().is_dir() else 0.0
    installs_path = _skill_installs_path()
    installs_mtime = installs_path.stat().st_mtime if installs_path.exists() else 0.0

    cached_list, cached_dict, cached_root_mtime, cached_installed_mtime, cached_installs_mtime = _SKILLS_CACHE

    if (
        cached_list is not None
        and root_mtime == cached_root_mtime
        and installed_mtime == cached_installed_mtime
        and installs_mtime == cached_installs_mtime
    ):
        return cached_list

    # Load persistent installs
    installs = _load_skill_installs()

    # Rebuild cache
    skills: List[Dict[str, Any]] = []
    seen_ids: set = set()

    # Build set of all known department keys from _CATEGORY_LABELS
    _all_dept_keys = set(_CATEGORY_LABELS.keys())
    _universal_cats = {"shared", "productivity"}

    def _category_is_assigned(cat_str: str) -> bool:
        """True if this category maps to at least one department."""
        c = (cat_str or "").lower().strip()
        if not c or c == "general":
            return False
        if c in _universal_cats:
            return True
        if c in _all_dept_keys:
            return True
        # Check display labels too (e.g. "CRM/Sales" → crm)
        for dir_name, label in _CATEGORY_LABELS.items():
            if c == label.lower():
                return True
        return False

    # Build set of all skill IDs present in ANY profile dir
    # These are always considered "installed" regardless of category
    _profile_skill_ids: set = set()
    profiles_dir = Path.home() / ".hermes" / "profiles"
    if profiles_dir.is_dir():
        for profile_dir in profiles_dir.iterdir():
            p_skills = profile_dir / "skills"
            if p_skills.is_dir():
                for sp in _safe_rglob(p_skills, "SKILL.md"):
                    _profile_skill_ids.add(str(sp.parent.name).lower().strip())

    def _is_installed(entry: dict) -> bool:
        """Installed if category matches a dept OR skill is in any profile."""
        if entry["id"] in _profile_skill_ids:
            return True
        return _category_is_assigned(entry.get("category", ""))

    for skill_path in sorted(_safe_rglob(repo_root, "SKILL.md")):
        entry = _scan_one_skill(skill_path, repo_root)
        if entry is None:
            continue
        if entry["id"] in seen_ids:
            continue
        seen_ids.add(entry["id"])

        entry["source"] = "repo"
        entry["installed"] = _is_installed(entry)
        entry["installed_departments"] = []
        skills.append(entry)

    # Also scan ~/.hermes/skills/ for user-generated/learned skills (not in repo)
    installed_dir = _installed_skills_root()
    if installed_dir.is_dir():
        repo_ids = {s["id"] for s in skills}
        for skill_path in sorted(_safe_rglob(installed_dir, "SKILL.md")):
            entry = _scan_one_skill(skill_path, installed_dir.parent)
            if entry is None:
                continue
            if entry["id"] in repo_ids:
                continue
            repo_ids.add(entry["id"])
            entry["source"] = "learned"
            entry["installed"] = _is_installed(entry)
            entry["installed_departments"] = []
            # Add "Learned" tag if not already present
            if "Learned" not in entry.get("tags", []):
                entry.setdefault("tags", []).append("Learned")
            skills.append(entry)

    # Source 3: Hermes built-in skills (~/AppData/Local/hermes/skills/)
    hermes_skills_dir = Path.home() / "AppData" / "Local" / "hermes" / "skills"
    if hermes_skills_dir.is_dir():
        existing_ids = {s["id"] for s in skills}
        for skill_path in sorted(_safe_rglob(hermes_skills_dir, "SKILL.md")):
            entry = _scan_one_skill(skill_path, hermes_skills_dir)
            if entry is None:
                continue
            if entry["id"] in existing_ids:
                continue
            existing_ids.add(entry["id"])
            entry["source"] = "hermes"
            entry["installed"] = _is_installed(entry)
            entry["installed_departments"] = []
            skills.append(entry)

    _SKILLS_CACHE = (skills, {s["id"]: s for s in skills}, root_mtime, installed_mtime, installs_mtime)
    return skills


def _get_all_skills() -> List[Dict[str, Any]]:
    """Get all skills (cached, scan-on-disk). Each skill has installed=False
    by default, set to True only if persisted in skill-installs.json.
    """
    return _scan_skills_on_disk()


def _get_department_skills(dept_key: str, profile_name: str = "") -> List[Dict[str, Any]]:
    """Get skills for a department — category-based matching.

    A skill belongs to a department if:
      1. It's in the profile's skills dir (~/.hermes/profiles/<name>/skills/)
      2. Its category matches the department (e.g. category=Finance → finance dept)
      3. Its category is "Shared" or "Productivity" (universal skills)

    Skills with no matching category (General/uncategorized) are excluded.
    The skill-installs.json file is NOT used — category is authoritative.
    """
    dept_key = dept_key.lower()
    skills: List[Dict[str, Any]] = []
    seen_ids: set = set()

    # Build reverse map: display category label → dept_key
    # e.g. "Finance" → "finance", "CRM/Sales" → "crm"
    _cat_to_dept: Dict[str, str] = {}
    for dir_name, label in _CATEGORY_LABELS.items():
        _cat_to_dept[label.lower()] = dir_name
    # Also map dir names directly
    for dir_name in _CATEGORY_LABELS:
        _cat_to_dept[dir_name.lower()] = dir_name

    # Universal categories — included in every department
    _UNIVERSAL_CATEGORIES = {"shared", "productivity"}

    def _skill_matches_dept(entry: dict) -> bool:
        """Check if a skill's category matches this department."""
        cat = (entry.get("category") or "").lower().strip()
        if not cat or cat == "general":
            return False  # uncategorized → no department
        if cat in _UNIVERSAL_CATEGORIES:
            return True
        # Check if category maps to this dept
        mapped_dept = _cat_to_dept.get(cat, "")
        if mapped_dept == dept_key:
            return True
        # Direct match (category string == dept_key)
        if cat == dept_key:
            return True
        return False

    # Source 1: Profile-specific skills (always included — explicitly curated)
    if profile_name:
        profile_skills_dir = Path.home() / ".hermes" / "profiles" / profile_name / "skills"
        if profile_skills_dir.is_dir():
            for skill_path in sorted(_safe_rglob(profile_skills_dir, "SKILL.md")):
                entry = _scan_one_skill(skill_path, profile_skills_dir.parent)
                if entry is None or entry["id"] in seen_ids:
                    continue
                seen_ids.add(entry["id"])
                entry["source"] = "profile"
                entry["installed"] = True
                entry["department_key"] = dept_key
                skills.append(entry)

    # Source 2: All scanned skills (repo + learned) filtered by category match
    all_skills = _get_all_skills()
    for entry in all_skills:
        if entry["id"] in seen_ids:
            continue
        if not _skill_matches_dept(entry):
            continue
        seen_ids.add(entry["id"])
        entry = dict(entry)  # don't mutate cached copy
        entry["source"] = entry.get("source", "repo")
        entry["installed"] = True
        entry["department_key"] = dept_key
        if entry["source"] == "learned" and "Learned" not in entry.get("tags", []):
            entry.setdefault("tags", []).append("Learned")
        skills.append(entry)

    return skills


def _invalidate_skills_cache() -> None:
    """Force a cache rebuild on the next scan."""
    global _SKILLS_CACHE
    _SKILLS_CACHE = (None, None, 0.0, 0.0, 0.0)


@router.post("/{name}/chat/upload")
async def upload_chat_file(
    name: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Store uploaded image or document file for department chat."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    cfg = get_config()
    upload_dir = Path(cfg.db_path).parent / "chat_uploads" / dept.name.lower()
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "file").suffix.lower()
    file_id = f"up-{uuid.uuid4().hex[:10]}"
    safe_name = f"{file_id}_{Path(file.filename or 'file').name}"
    target_path = upload_dir / safe_name

    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size = target_path.stat().st_size
    mime = file.content_type or "application/octet-stream"
    is_image = mime.startswith("image/") or ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]

    rel_url = f"/api/chat/uploads/{dept.name.lower()}/{safe_name}"

    return {
        "ok": True,
        "attachment": {
            "id": file_id,
            "name": file.filename or safe_name,
            "url": rel_url,
            "mime_type": mime,
            "size_bytes": size,
            "is_image": is_image,
        }
    }


@router.get("/{name}/connectors")
async def list_department_connectors(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return software connectors for a department.

    Merges seed metadata (name, description, fields, instructions) with
    persisted state (status, credentials). Secrets are masked.
    """
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    connectors = _get_merged_connectors(dept)
    return {"connectors": connectors}


@router.post("/{name}/connectors/{connector_id}/connect")
async def connect_department_connector(
    name: str,
    connector_id: str,
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Connect a department connector.

    Accepts an optional ``credentials`` dict.  Behaviour:
    - If ``credentials`` is provided (even partial), save it, then connect.
    - If no credentials are provided AND saved credentials exist, direct-connect.
    - If no credentials are provided AND none are saved, return 400 with
      ``needs_credentials: True`` so the UI can prompt for them.
    """
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    key = dept.name.lower()
    seed = _DEPARTMENT_CONNECTORS.get(key, [])
    seed_conn = next((c for c in seed if c["id"] == connector_id), None)
    if not seed_conn:
        raise HTTPException(status_code=404, detail="Connector not found")

    submitted = body.get("credentials")
    # Check whether we already have saved credentials for this connector
    persisted = (dept.provider_config or {}).get("connectors") or {}
    if not isinstance(persisted, dict):
        persisted = {}
    saved_state = persisted.get(connector_id, {})
    saved_creds = (saved_state.get("credentials") if isinstance(saved_state, dict) else {}) or {}

    if submitted and isinstance(submitted, dict) and any(v for v in submitted.values() if v != "***"):
        # Save credentials + connect
        new_state = _save_connector_state(
            dept, connector_id, "connected",
            credentials=submitted,
            config_summary=f"Connected to {seed_conn['name']}",
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        merged = _get_merged_connectors(dept)
        conn = next((c for c in merged if c["id"] == connector_id), None)
        return {"ok": True, "connector": conn}
    elif saved_creds:
        # Direct connect — credentials already saved
        new_state = _save_connector_state(
            dept, connector_id, "connected",
            credentials=None,  # keep existing
            config_summary=f"Connected to {seed_conn['name']}",
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        merged = _get_merged_connectors(dept)
        conn = next((c for c in merged if c["id"] == connector_id), None)
        return {"ok": True, "connector": conn}
    else:
        # No credentials submitted and none saved — prompt
        raise HTTPException(
            status_code=400,
            detail={
                "error": "credentials_required",
                "needs_credentials": True,
                "message": "This connector requires credentials before connecting.",
            },
        )


@router.post("/{name}/connectors/{connector_id}/disconnect")
async def disconnect_department_connector(
    name: str,
    connector_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Disconnect a connector — credentials are preserved for next connect."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    key = dept.name.lower()
    seed = _DEPARTMENT_CONNECTORS.get(key, [])
    seed_conn = next((c for c in seed if c["id"] == connector_id), None)
    if not seed_conn:
        raise HTTPException(status_code=404, detail="Connector not found")

    _save_connector_state(dept, connector_id, "disconnected", credentials=None)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    merged = _get_merged_connectors(dept)
    conn = next((c for c in merged if c["id"] == connector_id), None)
    return {"ok": True, "connector": conn}


@router.get("/{name}/skills")
async def list_department_skills(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return skills for a department — from profile skills dir + learned skills."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    key = dept.name.lower()
    skills = _get_department_skills(key, dept.profile_name)
    return {"skills": skills}


@router.delete("/{name}/skills/{skill_id}")
async def delete_department_skill(
    name: str,
    skill_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Uninstall a skill from a department. Persists to skill-installs.json.

    Removing from the department skills page updates the persistent install
    state, so the skill shows as "not installed" in the SkillLibrary page.
    """
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    dept = _get_dept(db, tenant.id, name)
    key = dept.name.lower()
    removed = _uninstall_skill_from_dept(skill_id, key)
    if not removed:
        raise HTTPException(status_code=404, detail="Skill not installed to this department")
    _invalidate_skills_cache()
    return {"ok": True, "removed": removed}


skills_router = APIRouter(prefix="/skills", tags=["skills"])


@skills_router.get("")
async def list_all_skills(user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """List Hermes original built-in skills — mapped to Shogun departments.

    Each Hermes skill is assigned to the closest Shogun department based on
    its category. Skills are returned with their category replaced by the
    matching Shogun department label for consistent grouping.
    """
    from config import DEFAULT_DEPARTMENTS

    all_skills = _get_all_skills()

    # Map Hermes categories → Shogun department name
    _HERMES_TO_DEPT: Dict[str, str] = {
        "finance": "finance",
        "crm/sales": "crm",
        "crm": "crm",
        "hr": "hr",
        "procurement": "procurement",
        "retail": "procurement",
        "manufacturing": "procurement",
        "devops": "coding",
        "software development": "coding",
        "software-development": "coding",
        "coding": "coding",
        "github": "coding",
        "brain": "executive",
        "gbrain": "executive",
        "executive": "executive",
        "creative": "marketing",
        "media": "marketing",
        "social media": "marketing",
        "communication": "marketing",
        "productivity": "projects",
        "research": "projects",
        "plan": "projects",
        "planning": "projects",
        "projects": "projects",
        "compliance": "compliance",
        "customer support": "customer-support",
        "email": "customer-support",
        "mcp": "coding",
        "note taking": "projects",
        "note-taking": "projects",
        "search-router": "coding",
        "shogunify": "coding",
        "google workspace": "projects",
        "google-workspace": "projects",
        "lark workspace": "projects",
        "lark-workspace": "projects",
        "slack formatting": "communication",
        "slack-formatting": "communication",
        "lark formatting": "communication",
        "lark-formatting": "communication",
        "company workflow": "projects",
        "company-workflow": "projects",
        "department scrum": "projects",
        "department-scrum": "projects",
        "systematic debugging": "coding",
        "systematic-debugging": "coding",
        "verify first": "coding",
        "verify-first": "coding",
    }

    # Build dept label lookup
    _dept_labels: Dict[str, str] = {}
    for dept in DEFAULT_DEPARTMENTS:
        _dept_labels[dept["name"]] = dept["label"]

    hermes_mapped = []
    for s in all_skills:
        if s.get("source") != "hermes":
            continue
        cat = (s.get("category") or "").lower().strip()
        dept_name = _HERMES_TO_DEPT.get(cat)
        if not dept_name:
            continue  # Skip unmapped categories (Apple, Smart Home, .Archive, etc.)
        entry = dict(s)
        entry["category"] = _dept_labels.get(dept_name, dept_name.title())
        hermes_mapped.append(entry)

    return {"skills": hermes_mapped}


@skills_router.get("/{skill_id}")
async def get_skill_detail(
    skill_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get full SKILL.md body for a skill (lazy load on details view)."""
    all_skills = _get_all_skills()
    entry = next((s for s in all_skills if s["id"] == skill_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Try to read the full SKILL.md body
    repo_root = _skills_repo_root()
    installed_root = _installed_skills_root()

    # Search both repo and installed dirs
    skill_path = None
    for root in [repo_root, installed_root]:
        if not root.is_dir():
            continue
        # Try by directory name match
        for candidate in _safe_rglob(root, "SKILL.md"):
            if candidate.parent.name.lower() == skill_id or \
               candidate.parent.parent.name.lower() == skill_id:
                skill_path = candidate
                break
        if skill_path:
            break

    skill_md = ""
    if skill_path and skill_path.exists():
        try:
            skill_md = skill_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            skill_md = ""

    return {"skill": entry, "skill_md": skill_md}


@skills_router.post("/install")
async def install_skill(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Install a skill to its department. Persists to skill-installs.json.

    The skill is installed to its own department (determined by the parent
    directory on disk). If the caller specifies a different department, the
    skill is installed there too. The install survives restarts via JSON.
    """
    skill_id = body.get("skill_id")
    target_dept = str(body.get("department", "")).lower()

    all_skills = _get_all_skills()
    skill = next((s for s in all_skills if s["id"] == skill_id), None)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # The skill's own department (from disk directory)
    skill_dept_key = skill.get("department_key", "")

    # Determine which departments to install to
    depts_to_install = []
    if skill_dept_key:
        depts_to_install.append(skill_dept_key)
    if target_dept and target_dept != "all" and target_dept not in depts_to_install:
        depts_to_install.append(target_dept)

    # If "all" and no skill_dept_key, install to "general"
    if not depts_to_install:
        depts_to_install = ["general"]

    # Persist each install
    for d_key in depts_to_install:
        _install_skill_to_dept(skill_id, d_key)

    # Invalidate cache so the catalog reflects the new install status
    _invalidate_skills_cache()

    # Reload the skill from the fresh cache
    all_skills = _get_all_skills()
    skill = next((s for s in all_skills if s["id"] == skill_id), None) or skill

    return {
        "ok": True,
        "skill": skill,
        "installed_departments": depts_to_install,
    }


@skills_router.post("/recommend")
async def recommend_skills(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Understand user operational need and recommend matching skills or Shogunify generator."""
    prompt = str(body.get("prompt", "")).strip()
    if not prompt:
        return {
            "explanation": "Please enter your operational requirement above.",
            "recommendations": [],
            "shogunify_suggestion": None,
        }

    all_skills = _get_all_skills()
    q = prompt.lower()
    matches = []
    for s in all_skills:
        score = 0
        s_name = s["name"].lower()
        s_desc = s["description"].lower()
        s_cat = s["category"].lower()
        s_tags = " ".join(t.lower() for t in s.get("tags", []))
        s_dept = s.get("department_key", "").lower()

        # Score matching — name, description, category, tags, department
        words = [w for w in q.split() if len(w) > 2]
        for w in words:
            if w in s_name:
                score += 35
            if w in s_desc:
                score += 20
            if w in s_cat:
                score += 15
            if w in s_tags:
                score += 25
            if w in s_dept:
                score += 10

        if score > 0:
            match_pct = min(99, max(60, score))
            reason = f"Matches {s['category']} operations — {s['name']} workflow (tags: {', '.join(s.get('tags', [])[:3]) or 'n/a'})."
            matches.append({
                "skill_id": s["id"],
                "match_pct": match_pct,
                "reason": reason,
            })

    matches.sort(key=lambda x: -x["match_pct"])
    top_matches = matches[:3]

    shogunify_suggestion = {
        "needed": len(top_matches) == 0 or (top_matches and top_matches[0]["match_pct"] < 85),
        "mode": "integration" if any(x in q for x in ["connect", "software", "api", "erp", "vendor", "shopee", "bukku", "sap", "gateway"]) else "skill",
        "command": f"/shogunify integration vendor {q.split()[0]} domain finance profile finance-manager" if any(x in q for x in ["connect", "software", "api", "erp", "shopee", "bukku", "sap"]) else f"/shogunify skill {q.replace(' ', '-')[:25]} for finance-manager",
        "description": f"Scaffold a custom skill or provider integration for '{prompt}' using Shogunify (/shogunify).",
    }

    explanation = (
        f"Analyzed operational intent for '{prompt}'. "
        + (f"Found {len(top_matches)} matching skills." if top_matches else "No pre-built skill matches this exact requirement. Recommendation: Generate custom skill via Shogunify.")
    )

    return {
        "explanation": explanation,
        "recommendations": top_matches,
        "shogunify_suggestion": shogunify_suggestion,
    }


_LEARN_AUTHORING_STANDARDS = """\
Follow the Hermes skill-authoring standards exactly.

Frontmatter (starts at byte 0 with ---):
- name: lowercase-hyphenated, <=64 chars, no spaces.
- description: ONE sentence, <=120 characters, ends with a period. State the
  capability, not the implementation. No marketing words (powerful,
  comprehensive, seamless, advanced, robust).
- version: 0.1.0
- author: Hermes
- metadata.hermes.tags: a few Capitalized, Relevant, Tags.

Body section order (omit a section only if it genuinely has no content):
1. "# <Human Title>" then a 2-3 sentence intro.
2. "## When to Use" — bullet list of concrete trigger phrases.
3. "## Prerequisites" — exact env vars, install steps, credentials.
4. "## How to Run" — the canonical invocation, framed through Hermes tools.
5. "## Quick Reference" — a flat command/endpoint list, no narration.
6. "## Procedure" — numbered steps with copy-paste-exact commands.
7. "## Pitfalls" — known limits, rate limits, things that look broken but aren't.
8. "## Verification" — a single command/check that proves the skill worked.

Hermes-tool framing (reference Hermes tools by name in backticks): `terminal`,
`read_file`, `write_file`, `search_files`, `patch`, `web_search`, `web_extract`,
`vision_analyze`, `browser_navigate`, `delegate_task`, `execute_code`.

Quality bar:
- Prefer exact commands, endpoint URLs, function signatures, and config keys
  that appear VERBATIM in the source. NEVER invent flags, paths, or APIs.
- Keep it tight and scannable: ~100 lines for a simple skill, ~200 for a
  complex one.
- Larger scripts/parsers belong in a `scripts/` file, referenced from SKILL.md
  by relative path — not inlined. References go in `references/`.

Output ONLY the raw SKILL.md file content. Start with `---` (frontmatter). No
prose before or after the file content. No markdown code fences wrapping it."""


def _slugify_skill(name: str) -> str:
    """Lowercase + hyphenate a skill name into a filesystem-safe slug."""
    return (name or "custom-skill").lower().strip().replace(" ", "-").replace("_", "-")


@skills_router.post("/generate")
async def generate_skill(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generate a SKILL.md draft from the chat transcript via the LLM.

    Uses the Hermes `/learn` authoring standards so the output is a real
    SKILL.md (frontmatter + section body), not a JSON tool_spec.
    """
    instruction = str(body.get("instruction", "")).strip()
    department = str(body.get("department", "operations")).lower()
    if not instruction:
        raise HTTPException(status_code=400, detail="instruction is required")

    skill_name = body.get("skill_name") or ""

    creds = _get_llm_credentials()
    api_key = creds.get("api_key")

    # Fallback stub when no LLM is configured — still a valid SKILL.md shape
    stub_name = skill_name or instruction[:40]
    stub_slug = _slugify_skill(stub_name)
    stub_desc = f"Skill for {department} operations."
    if len(stub_desc) > 60:
        stub_desc = stub_desc[:59].rstrip() + "."
    stub_skill_md = (
        "---\n"
        f"name: {stub_slug}\n"
        f'description: "{stub_desc}"\n'
        "version: 0.1.0\n"
        "author: Hermes\n"
        "metadata:\n"
        "  hermes:\n"
        f"    tags: [{department.capitalize()}]\n"
        "---\n\n"
        f"# {stub_name}\n\n"
        f"Skill for the {department} department.\n\n"
        "## When to Use\n"
        "- When the operational workflow described below is needed.\n\n"
        "## Procedure\n"
        f"{instruction}\n"
    )
    if not api_key:
        return {
            "ok": True,
            "status": "no_llm",
            "skill": {
                "id": stub_slug,
                "name": stub_name,
                "description": stub_desc,
                "skill_md": stub_skill_md,
                "instruction": instruction,
                "department": department,
            },
            "generated_by_model": None,
        }

    system_prompt = (
        "You are the Shogunify skill generator. Given an operational instruction "
        "and chat transcript, produce a complete, DETAILED SKILL.md file that a Hermes "
        "agent can install and use immediately — with real working code, not placeholders.\n\n"
        f"{_LEARN_AUTHORING_STANDARDS}\n\n"
        "CRITICAL REQUIREMENTS:\n"
        "1. Your output MUST be a REAL, WORKING skill — not a skeleton or placeholder.\n"
        "2. The ## How to Run section MUST contain the actual invocation with real flags, "
        "file arguments, and paths the user passes. NOT 'run the script' — the actual command.\n"
        "3. The ## Procedure section MUST contain numbered steps with COPY-PASTE-EXACT commands "
        "or Python code that implements the logic described in the user's request. NOT 'step one, "
        "step two' — actual code that does the job.\n"
        "4. If the user asks to compare files, parse Excel, send alerts, etc. — WRITE THE ACTUAL "
        "CODE that does that. Use openpyxl/pandas for Excel, difflib for comparison, etc.\n"
        "5. If the skill needs a helper script, write the full script in a ```python block inside "
        "the Procedure section, or write it as a self-contained bash command.\n"
        "6. The ## How to Run section should show the FULL command with argument examples, e.g.: "
        "`python compare_files.py --excel report.xlsx --txt data.txt` — not just `ls -la /path/to/file`\n"
        "7. Write AT LEAST 3-5 lines in ## How to Run, and AT LEAST 5-8 numbered steps in ## Procedure.\n"
        "8. Include a ## Quick Reference section with the command(s) the user runs.\n\n"
        "ANTI-SKELETON RULES (VIOLATION = REJECT):\n"
        "- NEVER write 'Run the following script:' followed by `ls -la /path/to/file`\n"
        "- NEVER write 'Run the script shown in ## How to Run above'\n"
        "- NEVER write 'Step one with exact commands' — WRITE THE ACTUAL COMMAND\n"
        "- NEVER write 'Review the output for results' — EXPLAIN WHAT TO LOOK FOR\n"
        "- NEVER use placeholder paths like /path/to/file.xlsx — use <file.xlsx> or $1\n"
        "- NEVER write 'Skill for finance operations.' as the description — describe WHAT IT DOES\n"
        "- If the user's request involves files, data, or APIs — WRITE THE CODE THAT HANDLES THEM\n\n"
        "Here is a GOOD example showing the level of detail expected:\n\n"
        "---\n"
        "name: excel-text-comparator\n"
        'description: "Compare Excel cell text against a plain text file word-by-word and show differences."\n'
        "version: 0.1.0\n"
        "author: Hermes\n"
        "---\n\n"
        "# Excel Text File Comparator\n\n"
        "Compares the text content of an Excel file against a plain text file word-by-word, "
        "then displays whether the contents are identical or different.\n\n"
        "## When to Use\n\n"
        "- \"compare excel and text file\"\n"
        "- \"check if excel content matches txt\"\n"
        "- \"word-by-word comparison excel vs txt\"\n\n"
        "## Prerequisites\n\n"
        "```bash\n"
        "pip install openpyxl pandas\n"
        "```\n\n"
        "## How to Run\n\n"
        "```bash\n"
        "# Compare an Excel file against a text file\n"
        "python compare_excel_text.py --excel <input.xlsx> --txt <input.txt>\n"
        "\n"
        "# Compare with specific sheet name\n"
        "python compare_excel_text.py --excel <input.xlsx> --sheet Sheet1 --txt <input.txt>\n"
        "```\n\n"
        "## Procedure\n\n"
        "1. Create the comparison script:\n\n"
        "```python\n"
        "# compare_excel_text.py\n"
        "import argparse, sys\n"
        "import openpyxl\n"
        "from difflib import unified_diff\n\n"
        "def read_excel(path, sheet=None):\n"
        "    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)\n"
        "    ws = wb[sheet] if sheet else wb.active\n"
        "    lines = []\n"
        "    for row in ws.iter_rows(values_only=True):\n"
        "        lines.append(' '.join(str(c) if c is not None else '' for c in row))\n"
        "    wb.close()\n"
        "    return lines\n\n"
        "def read_text(path):\n"
        "    with open(path, 'r', encoding='utf-8', errors='replace') as f:\n"
        "        return [line.rstrip('\\n') for line in f]\n\n"
        "def main():\n"
        "    p = argparse.ArgumentParser(description='Compare Excel vs text file word-by-word')\n"
        "    p.add_argument('--excel', required=True, help='Excel file path')\n"
        "    p.add_argument('--sheet', default=None, help='Sheet name (default: active sheet)')\n"
        "    p.add_argument('--txt', required=True, help='Text file path')\n"
        "    args = p.parse_args()\n\n"
        "    excel_lines = read_excel(args.excel, args.sheet)\n"
        "    text_lines = read_text(args.txt)\n"
        "    excel_text = ' '.join(excel_lines).split()\n"
        "    text_text = ' '.join(text_lines).split()\n\n"
        "    if excel_text == text_text:\n"
        "        print('✅ IDENTICAL — Excel and text file content match word-by-word.')\n"
        "    else:\n"
        "        print('❌ DIFFERENT — content mismatch detected.')\n"
        "        diff = list(unified_diff(text_lines, excel_lines, fromfile='text', tofile='excel', lineterms=''))\n"
        "        print('\\n'.join(diff[:50]))\n"
        "        sys.exit(1)\n\n"
        "if __name__ == '__main__':\n"
        "    main()\n"
        "```\n\n"
        "2. Run the comparison:\n"
        "   `python compare_excel_text.py --excel report.xlsx --txt data.txt`\n\n"
        "3. Review the output:\n"
        "   - `✅ IDENTICAL` = contents match\n"
        "   - `❌ DIFFERENT` = mismatch with a diff showing the first 50 differences\n\n"
        "## Pitfalls\n\n"
        "- Excel cells with formulas show the formula result (data_only=True) — if you need raw formulas, remove that flag\n"
        "- Empty cells are treated as empty strings — they are NOT skipped\n"
        "- The comparison is case-sensitive and whitespace-sensitive within words\n\n"
        "## Verification\n\n"
        "```bash\n"
        "python compare_excel_text.py --excel test.xlsx --txt test.txt\n"
        "# Should print either ✅ IDENTICAL or ❌ DIFFERENT\n"
        "```\n\n"
        "You MUST include ALL of these sections: ## When to Use, ## How to Run, "
        "## Procedure, ## Pitfalls, ## Verification. Missing any section will "
        "cause validation failure. Start with --- immediately. Output ONLY the raw SKILL.md."
    )
    user_prompt = (
        f"Instruction and transcript:\n{instruction}\n\n"
        f"Department: {department}\n"
        + (f"Suggested skill name: {skill_name}\n" if skill_name else "")
        + "\nGenerate the SKILL.md content now. Output ONLY the file content."
    )
    payload = {
        "model": creds["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 6000,
        # glm-5.2 (and other reasoning models) emit a hidden reasoning_content that
        # consumes the token budget before the final answer. Disable it so the
        # SKILL.md output is not truncated mid-document.
        "enable_thinking": False,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    url = f"{creds['api_base']}/chat/completions"

    async def _call_llm(messages_payload: list) -> tuple:
        """Single LLM call. Returns (raw_text, raw_reasoning)."""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=messages_payload, headers=headers)
                if resp.status_code == 200:
                    body_json = resp.json()
                    choices = body_json.get("choices", [])
                    if choices:
                        msg = choices[0].get("message", {})
                        return (msg.get("content", "") or "", msg.get("reasoning_content", "") or "")
                else:
                    logger.warning("skill generate LLM call returned %s: %s", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.warning("skill generate LLM exception: %s", exc)
        return ("", "")

    # Initial call + up to 2 retries if validation fails (max 3 calls total).
    messages = list(payload["messages"])  # start from the original system+user pair
    raw_text = ""
    raw_reasoning = ""
    validation_errors: list = []
    skill_md = ""

    for attempt in range(3):
        raw_text, raw_reasoning = await _call_llm({"model": creds["model"], "messages": messages,
                                                    "temperature": payload["temperature"],
                                                    "max_tokens": payload["max_tokens"],
                                                    "enable_thinking": False})
        if raw_reasoning and not raw_text:
            logger.warning(
                "skill generate attempt %d: model produced %d chars reasoning but empty content (thinking not disabled?)",
                attempt + 1, len(raw_reasoning),
            )

        candidate = _extract_skill_md(raw_text) if raw_text else ""
        if not candidate:
            candidate = stub_skill_md  # fall back to stub shape, will fail validation

        is_valid, validation_errors = _validate_skill_md(candidate)
        if is_valid:
            skill_md = candidate
            break

        # Validation failed — feed the errors back to the LLM for a retry.
        logger.warning(
            "skill generate attempt %d failed validation: %s",
            attempt + 1, "; ".join(validation_errors),
        )
        if attempt < 2:
            feedback = (
                f"Your previous output failed validation with these errors:\n- "
                + "\n- ".join(validation_errors)
                + "\n\nPlease regenerate the COMPLETE SKILL.md fixing these issues. "
                "Start with --- frontmatter (name, description <=120 chars). "
                "Include a '## Procedure' section with numbered steps. "
                "Output ONLY the raw SKILL.md file content."
            )
            # Append the failed output + feedback as a continuation so the model
            # sees what it produced wrong.
            messages = messages + [
                {"role": "assistant", "content": raw_text or "(empty output)"},
                {"role": "user", "content": feedback},
            ]
        else:
            # Final attempt failed — REPAIR the best candidate into valid
            # SKILL.md format instead of saving broken output as-is.
            logger.warning(
                "skill generate: all 3 attempts failed validation, repairing output"
            )
            repaired = _repair_skill_md(
                candidate or raw_text or "",
                fallback_name=skill_name or stub_name,
                fallback_desc=stub_desc,
            )
            is_valid_repaired, repaired_errors = _validate_skill_md(repaired)
            if is_valid_repaired:
                skill_md = repaired
                logger.info("skill generate: repair succeeded, output is valid SKILL.md")
            else:
                # Repair itself failed (shouldn't happen) — use stub as last resort
                logger.error(
                    "skill generate: repair also failed: %s", "; ".join(repaired_errors)
                )
                skill_md = stub_skill_md

    parsed = _parse_skill_frontmatter_simple(skill_md)
    name = parsed.get("name") or skill_name or stub_name
    slug = _slugify_skill(name)
    description = parsed.get("description") or stub_desc

    skill = {
        "id": slug,
        "name": name,
        "description": description,
        "skill_md": skill_md,
        "instruction": instruction,
        "department": department,
        "validation_errors": validation_errors if not _validate_skill_md(skill_md)[0] else [],
    }
    return {"ok": True, "skill": skill, "generated_by_model": creds["model"]}


def _extract_skill_md(raw: str) -> str:
    """Strip markdown code fences and leading/trailing prose from an LLM SKILL.md response.

    Handles three LLM output shapes:
    1. Raw SKILL.md starting with ``---`` (no fences, no prose).
    2. Fenced block: ```` ```markdown ... ``` ```` possibly preceded/followed by prose.
    3. Prose then a bare ```` ``` ````-less block starting with ``---``.
    Always returns text starting with ``---`` and ending at the last SKILL.md
    content line (no trailing fence or prose).
    """
    if not raw:
        return ""
    text = raw.strip()

    # If the text already starts with --- (frontmatter), it's a raw SKILL.md.
    # Do NOT look for code fences — the SKILL.md body legitimately contains
    # ```bash and ```python code blocks that are part of the skill content,
    # not wrapper fences. Extracting between the first ``` pair would
    # discard the frontmatter and everything after the first code block.
    if text.startswith("---"):
        return text

    # Case 2: there is at least one ``` fence. Extract the content between the
    # first opening fence and its matching closing fence. This handles LLM
    # output wrapped in ```markdown ... ``` fences with leading/trailing prose.
    if "```" in text:
        first = text.find("```")
        after_open = first + 3
        # Skip an optional language tag (markdown, md, yaml) on the same line
        nl = text.find("\n", after_open)
        if nl != -1:
            tag = text[after_open:nl].strip().lower()
            if tag in ("markdown", "md", "yaml", ""):
                after_open = nl + 1
            else:
                after_open = first + 3  # unknown tag, keep as-is
        # Find the closing fence
        close = text.find("```", after_open)
        if close != -1:
            text = text[after_open:close].strip()
        else:
            # Opening fence with no close — take everything after the opening
            text = text[after_open:].strip()

    # Now `text` may still have leading prose before the frontmatter.
    # Find the first `---` that starts a line (frontmatter opener).
    idx = -1
    for possible in ("---", "---\n"):
        i = text.find(possible)
        if i != -1:
            # Ensure it's at a line boundary (start of string or after a newline)
            if i == 0 or text[i - 1] == "\n":
                idx = i
                break
    if idx == -1:
        idx = text.find("---")  # fallback: first occurrence anywhere
    if idx > 0:
        text = text[idx:]

    # Strip any trailing ``` fence that survived (e.g. no closing fence)
    text = text.rstrip()
    if text.endswith("```"):
        text = text[:-3].rstrip()

    return text.strip()


def _repair_skill_md(raw: str, fallback_name: str = "generated-skill", fallback_desc: str = None) -> str:
    """Repair non-conforming LLM output into a valid SKILL.md.

    If the LLM produced content WITHOUT frontmatter (e.g. just a bash script,
    or body sections without the --- header), wrap it into proper SKILL.md
    format by:
    1. Generating frontmatter from any content we can find (title, first line)
    2. Ensuring a ## Procedure section exists (wrapping bare code/steps)

    This is the LAST RESORT after retry loops fail — it guarantees the user
    always gets a saveable skill, even when the LLM ignores format instructions.
    """
    if not raw or not raw.strip():
        return ""

    text = raw.strip()

    # Already has frontmatter? Ensure ALL required sections exist
    if text.startswith("---"):
        required = ["## When to Use", "## How to Run", "## Procedure", "## Pitfalls", "## Verification"]
        missing = [s for s in required if s not in text]
        if not missing:
            return text  # already has all sections
        # Add all missing sections at the end — with meaningful content, not
        # one-line skeletons.
        additions = []
        for s in missing:
            if s == "## When to Use":
                additions.append("## When to Use\n\n- On-demand when the user requests this skill.\n- When the operational workflow described in the instruction is needed.\n")
            elif s == "## How to Run":
                additions.append("## How to Run\n\nRun the procedure steps below. The skill is invoked by following the ## Procedure section.\n")
            elif s == "## Procedure":
                additions.append("## Procedure\n\n1. Read the skill instructions above.\n2. Gather any required input files or parameters.\n3. Execute the commands or code provided.\n4. Review the output.\n5. If errors occur, check ## Pitfalls below.\n")
            elif s == "## Pitfalls":
                additions.append("## Pitfalls\n\n- Ensure all file paths and dependencies are valid before running.\n- Check for encoding issues if reading text files.\n- Verify required Python packages are installed.\n")
            elif s == "## Verification":
                additions.append("## Verification\n\n- Confirm the script executes without errors.\n- Verify the output matches the expected result.\n")
        text = text.rstrip() + "\n\n" + "\n\n".join(additions) + "\n"
        return text

    # ── No frontmatter at all. Wrap the content. ──────────────────
    # Always use fallback_name as the title — we should NOT try to extract
    # a title from raw code/command output because it produces garbage slugs
    # like "diff-tr---n--file1-tr---n--file2". The fallback_name is provided
    # by the /generate endpoint from skill_name or stub_name, which is always
    # a clean human-readable name.
    title = fallback_name.replace("-", " ").title()

    # However, if the content has a markdown heading (# Title), use that
    # since it's an explicit human-authored title, not code.
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            # Extract title from "# Actual Title"
            candidate_title = stripped[2:].strip()
            # Make sure it's not a code command disguised as a heading
            if not any(c in candidate_title for c in ("=", "<", ">", "|", "&", ";", "$", "`", "(")):
                title = candidate_title
            break

    slug = title.lower().replace(" ", "-").replace("_", "-")[:64]
    # Remove any characters that are invalid in YAML name / filesystem paths
    import re as _re
    slug = _re.sub(r'[^a-z0-9-]', '', slug).strip("-")
    if not slug:
        slug = fallback_name

    # Build description (<=120 chars)
    desc = fallback_desc or f"Skill for {title.lower()}."
    if len(desc) > 120:
        desc = desc[:119].rstrip() + "."
    if len(desc) < 10:
        desc = f"Execute {slug}."

    # Check if the content already has ## Procedure
    has_procedure = "## Procedure" in text
    if has_procedure:
        body = text
    else:
        # Wrap bare content (code, steps) into a Procedure section
        # If it looks like code, wrap in a code block inside Procedure
        looks_like_code = any(
            text.strip().startswith(p) for p in ("test ", "if ", "for ", "while ", "python", "bash", "#!/", "FILE1=", "import ")
        ) or text.count("\n") < 3

        if looks_like_code:
            body = (
                f"# {title}\n\n"
                f"## When to Use\n\n- On-demand when the user requests this skill.\n- When the operational workflow described in the instruction is needed.\n\n"
                f"## How to Run\n\nRun the following script. Adjust file paths and arguments as needed:\n\n"
                f"```bash\n{text}\n```\n\n"
                f"## Procedure\n\n"
                f"1. Ensure all prerequisites (Python packages, file paths) are available.\n"
                f"2. Execute the script shown in ## How to Run above, passing any required arguments.\n"
                f"3. Review the command output for results or errors.\n"
                f"4. If the script requires input files, verify their paths are correct.\n"
                f"5. Check ## Pitfalls below if errors occur.\n\n"
                f"## Pitfalls\n\n- Ensure all file paths and dependencies are valid before running.\n- Check for encoding issues if reading text files.\n- Verify required Python packages are installed.\n\n"
                f"## Verification\n\n- Confirm the script executes without errors and produces expected output.\n- Verify the output matches what the skill description promises.\n"
            )
        else:
            body = (
                f"# {title}\n\n{text}\n\n"
                f"## When to Use\n\n- On-demand when the user requests this skill.\n- When the operational workflow described above is needed.\n\n"
                f"## How to Run\n\nFollow the ## Procedure steps below to execute this skill.\n\n"
                f"## Procedure\n\n1. Read the instructions and code above carefully.\n2. Gather any required input files or parameters.\n3. Execute the commands or code in the order shown.\n4. Review the output.\n5. If errors occur, check ## Pitfalls below.\n\n"
                f"## Pitfalls\n\n- Ensure all prerequisites are met before running.\n- Check for encoding issues if reading text files.\n- Verify required packages and credentials are configured.\n\n"
                f"## Verification\n\n- Confirm the expected output is produced.\n- Verify no error messages appear during execution.\n"
            )

    repaired = (
        "---\n"
        f"name: {slug}\n"
        f'description: "{desc}"\n'
        "version: 0.1.0\n"
        "author: Hermes\n"
        "---\n\n"
        f"{body}"
    )
    return repaired


def _parse_skill_frontmatter_simple(skill_md: str) -> dict:
    """Tolerantly extract YAML frontmatter fields from a SKILL.md string.

    Used by the skill generation/save flow for lightweight field extraction.
    The scanner uses _parse_skill_frontmatter (PyYAML-based) instead.
    """
    result: Dict[str, Any] = {}
    if not skill_md or not skill_md.startswith("---"):
        return result
    try:
        end = skill_md.index("\n---", 3)
        fm = skill_md[3:end].strip()
        for line in fm.splitlines():
            line = line.strip()
            if ":" in line and not line.startswith("#"):
                k, _, v = line.partition(":")
                k = k.strip()
                v = v.strip().strip("\"'")
                if k in ("name", "description", "version", "author"):
                    result[k] = v
    except ValueError:
        pass
    return result


def _validate_skill_md(skill_md: str) -> tuple:
    """Strict quality gate for generated SKILL.md content.

    Validates the FORMAT, not the size. A skill is valid when ALL of:
    - Non-empty (has actual content, not just whitespace)
    - Starts with YAML frontmatter (---)
    - Frontmatter is properly closed (second ---)
    - Frontmatter contains 'name' field (non-empty)
    - Frontmatter contains 'description' field (non-empty, <=120 chars)
    - Body contains ALL required sections:
      ## When to Use, ## How to Run, ## Procedure, ## Pitfalls, ## Verification

    Size is deliberately NOT checked — a short skill with proper format is
    valid; a long skill without frontmatter is invalid. Format is the signal.
    """
    errors: list = []
    if not skill_md or not skill_md.strip():
        errors.append("skill_md is empty")
        return (False, errors)

    if not skill_md.startswith("---"):
        errors.append("skill_md does not start with YAML frontmatter (---)")
        return (False, errors)

    try:
        end = skill_md.index("\n---", 3)
    except ValueError:
        errors.append("YAML frontmatter is not closed (missing closing ---)")
        return (False, errors)

    fm = skill_md[3:end].strip()
    has_name = False
    has_description = False
    desc_line = ""
    for line in fm.splitlines():
        line = line.strip()
        if ":" not in line or line.startswith("#"):
            continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip().strip("\"'")
        if k == "name" and v:
            has_name = True
        elif k == "description" and v:
            has_description = True
            desc_line = v
    if not has_name:
        errors.append("frontmatter missing 'name' field")
    if not has_description:
        errors.append("frontmatter missing 'description' field")
    elif len(desc_line) > 120:
        errors.append(
            f"description is {len(desc_line)} chars — must be <= 120 "
            "chars. Keep it to one sentence stating the capability."
        )

    # ── Check ALL required body sections ───────────────────────────
    # A skill with only ## Procedure is NOT enough to confirm it runs
    # correctly. The user needs: When to Use, How to Run, Procedure,
    # Pitfalls, and Verification to trust the skill.
    body = skill_md[end + 4 :]
    required_sections = [
        ("## When to Use", "trigger conditions for the skill"),
        ("## How to Run", "canonical invocation / commands"),
        ("## Procedure", "numbered step-by-step execution"),
        ("## Pitfalls", "known limitations and edge cases"),
        ("## Verification", "how to confirm the skill worked"),
    ]
    for section_header, purpose in required_sections:
        if section_header not in body:
            errors.append(f"body missing required '{section_header}' section ({purpose})")

    return (len(errors) == 0, errors)


@skills_router.post("/test")
async def test_skill(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Execute a generated SKILL.md against test input via the LLM.

    The LLM is given the full SKILL.md as instructions and asked to produce the
    skill's output for the provided test input.
    """
    skill = body.get("skill") or {}
    test_input = str(body.get("test_input", "")).strip()
    if not test_input:
        raise HTTPException(status_code=400, detail="test_input is required")

    creds = _get_llm_credentials()
    api_key = creds.get("api_key")
    skill_md = skill.get("skill_md") or ""
    if not skill_md:
        return {"ok": False, "output": "", "error": "skill_md is required"}
    if not api_key:
        return {"ok": False, "output": "", "error": "LLM not configured"}

    system_prompt = (
        "You are executing a Shogun OS skill. The skill definition below is a "
        "complete SKILL.md. Follow its Procedure and How to Run sections to "
        "produce the skill's output for the given input. Respond concisely with "
        "only the execution output.\n\n"
        f"--- SKILL.md START ---\n{skill_md}\n--- SKILL.md END ---"
    )
    user_prompt = f"Input:\n{test_input}\n\nOutput:"
    payload = {
        "model": creds["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 2048,
        # glm-5.2 (and other reasoning models) emit a hidden reasoning_content that
        # consumes the token budget before the final answer. Disable it so the
        # skill execution output is not truncated.
        "enable_thinking": False,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    url = f"{creds['api_base']}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                body_json = resp.json()
                choices = body_json.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {})
                    content = msg.get("content", "") or ""
                    reasoning = msg.get("reasoning_content", "") or ""
                    if content.strip():
                        return {"ok": True, "output": content.strip()}
                    elif reasoning:
                        logger.warning(
                            "skill test: model produced %d chars reasoning but empty content (thinking not disabled?)",
                            len(reasoning),
                        )
            logger.warning("skill test LLM call returned %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("skill test LLM exception: %s", exc)

    return {"ok": False, "output": "", "error": "LLM call failed"}


@skills_router.post("/save")
async def save_skill(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Persist a generated SKILL.md to disk and register it in the catalog.

    Writes the skill to ``~/.hermes/skills/<name>/SKILL.md`` (the Hermes
    user-local skill directory) so it is durable and discoverable by the
    filesystem scanner. Also adds it to the runtime department skills map
    so the UI catalog reflects the new skill immediately, and invalidates
    the scan cache so the next /api/skills request picks it up.
    """
    skill = body.get("skill") or {}
    department = str(body.get("department", "operations")).lower()
    created_by = str(body.get("created_by", "Unknown"))
    created_at = str(body.get("created_at", ""))

    name = skill.get("name") or "Generated Skill"
    slug = _slugify_skill(name)
    skill_md = skill.get("skill_md") or ""

    # ─── STRICT VALIDATION GATE ───────────────────────────────────────
    # Reject malformed skill_md BEFORE writing to disk. This is the last
    # line of defense against the "49-byte garbage skill" bug where a
    # truncated/empty LLM output got saved as-is.
    is_valid, validation_errors = _validate_skill_md(skill_md)
    if not is_valid:
        logger.warning(
            "Rejected save of skill '%s' — validation failed: %s",
            slug, "; ".join(validation_errors),
        )
        raise HTTPException(
            status_code=422,
            detail=(
                "Skill failed quality validation and was NOT saved. "
                "Issues: " + "; ".join(validation_errors)
                + ". Please regenerate the skill or fix the SKILL.md manually."
            ),
        )
    # ─── END VALIDATION GATE ──────────────────────────────────────────

    dept_category_map = {
        "finance": "Finance",
        "crm": "CRM/Sales",
        "hr": "HR",
        "procurement": "Procurement",
        "coding": "Coding",
    }
    category = skill.get("category") or dept_category_map.get(department, "Operations")

    # 1. Write the durable SKILL.md to ~/.hermes/skills/<slug>/SKILL.md
    if skill_md:
        skills_root = Path.home() / ".hermes" / "skills"
        skill_dir = skills_root / slug
        try:
            skill_dir.mkdir(parents=True, exist_ok=True)
            (skill_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")
            logger.info("Wrote SKILL.md for '%s' to %s", slug, skill_dir)
        except Exception as exc:
            logger.error("Failed to write SKILL.md for '%s': %s", slug, exc)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist skill to disk: {exc}",
            )

    # 2. Update in-memory catalog for immediate UI visibility
    record = {
        "id": slug,
        "name": name,
        "description": skill.get("description") or "",
        "category": category,
        "installed": True,
        "version": "v1.0.0",
        "department_key": department,
        "author": created_by,
        "created_at": created_at,
    }

    # Persist the install so the new skill appears in the department's skills
    # tab immediately AND survives restarts. The scanner will also pick it up
    # from ~/.hermes/skills/ on the next cache invalidation.
    _install_skill_to_dept(slug, department)

    # Force cache invalidation so the new skill appears in /api/skills immediately
    _invalidate_skills_cache()

    logger.info("Saved generated skill '%s' (on-disk + in-memory) for department '%s'", slug, department)
    return {"ok": True, "skill": record}


def _parse_skill_json(raw: str) -> dict:
    """Tolerantly extract a JSON object from an LLM response."""
    if not raw:
        return {}
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    try:
        return json.loads(text)
    except Exception:
        return {}


@skills_router.post("/intake")
async def skill_intake(
    body: Dict[str, Any] = Body(...),
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Dynamically analyze skill training conversation transcript via LLM (glm-5.2) and construct guidance."""
    history = body.get("history") or []
    department = str(body.get("department", "operations")).lower()

    creds = _get_llm_credentials()
    api_key = creds.get("api_key")

    if not api_key:
        return {
            "is_ready": len(history) >= 4,
            "follow_up_question": "Could you clarify the step-by-step execution procedure and when this skill should run?",
            "missing_aspects": ["step-by-step execution", "trigger conditions"],
            "suggested_name": "Custom Operational Skill",
        }

    system_prompt = (
        "You are the Shogun OS Skill Architect. Your task is to analyze the conversation history between a user "
        "and the AI assistant to train a new custom skill for an enterprise department agent.\n"
        "Analyze whether the user has provided sufficient operational details for the skill, including:\n"
        "1. Skill Goal / Purpose\n"
        "2. Step-by-Step Execution Procedure\n"
        "3. Trigger Condition / Timer / Schedule / Event\n"
        "4. Expected Input and Output Data Formats\n\n"
        "Respond ONLY with a valid JSON object in this exact format (no prose, no code fences):\n"
        "{\n"
        '  "is_ready": boolean (true if user provided enough detail to build the skill, false if key info is missing),\n'
        '  "follow_up_question": "A concise, natural follow-up question guiding the user on what specific details are still missing. If is_ready is true, set this to empty string.",\n'
        '  "missing_aspects": ["list", "of", "missing", "aspects"],\n'
        '  "summary": "Brief 1-sentence summary of what has been gathered so far",\n'
        '  "suggested_name": "Action-Oriented Skill Name"\n'
        "}\n"
    )

    formatted = "\n".join([f"{msg.get('role', 'user').upper()}: {msg.get('content', '')}" for msg in history])
    user_prompt = f"Department: {department}\n\nConversation History:\n{formatted}\n\nAnalyze completeness and return JSON:"

    payload = {
        "model": creds["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
        # glm-5.2 (and other reasoning models) emit a hidden reasoning_content that
        # consumes the token budget before the final answer. Disable it so the JSON
        # answer is the only output and is not truncated mid-string.
        "enable_thinking": False,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    url = f"{creds['api_base']}/chat/completions"

    raw_text = ""
    raw_reasoning = ""
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                body_json = resp.json()
                choices = body_json.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {})
                    raw_text = msg.get("content", "") or ""
                    raw_reasoning = msg.get("reasoning_content", "") or ""
            else:
                logger.warning("skill intake LLM call returned %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("skill intake LLM exception: %s", exc)

    parsed = _parse_skill_json(raw_text) if raw_text else {}

    # If the model still produced reasoning but no usable content (thinking not
    # disabled on this endpoint, or output truncated), fall back to extracting
    # the last follow-up-like sentence from the reasoning rather than looping.
    if not parsed and raw_reasoning:
        logger.warning(
            "skill intake: JSON parse failed; model produced %d chars reasoning but empty/truncated content",
            len(raw_reasoning),
        )

    # Vary the fallback so the user never sees the identical question twice in a row.
    if not parsed or not parsed.get("follow_up_question"):
        # Choose a fallback based on what (if anything) we know is missing.
        missing = parsed.get("missing_aspects", []) if parsed else []
        fallback_pool = [
            "Could you describe step-by-step how the agent should execute this skill?",
            "What trigger should fire this skill — on-demand, a schedule, or an event?",
            "What input does the skill take and what output should it produce?",
            "What does the skill's goal / purpose in one sentence?",
        ]
        if missing:
            # Prefer a fallback that matches the first missing aspect.
            ml = " ".join(missing).lower()
            if "trigger" in ml or "schedule" in ml or "event" in ml:
                fallback = fallback_pool[1]
            elif "input" in ml or "output" in ml or "format" in ml:
                fallback = fallback_pool[2]
            elif "goal" in ml or "purpose" in ml:
                fallback = fallback_pool[3]
            else:
                fallback = fallback_pool[0]
        else:
            # Rotate based on conversation length so consecutive failures differ.
            fallback = fallback_pool[len(history) % len(fallback_pool)]
    else:
        fallback = parsed["follow_up_question"]

    return {
        "is_ready": parsed.get("is_ready", False),
        "follow_up_question": fallback,
        "missing_aspects": parsed.get("missing_aspects", []),
        "summary": parsed.get("summary", ""),
        "suggested_name": parsed.get("suggested_name", "Custom Operational Skill"),
    }


# --- Department Cron Jobs (persisted in SQLite via CronJob model) ---

def _require_admin_or_dept_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure user is an Admin, Owner, or Department Admin."""
    if user.role not in {"admin", "owner", "department_admin"}:
        raise HTTPException(status_code=403, detail="Admin or Department Admin required")
    return user


def _resolve_channel_name(db: Session, dept: str, channel_id: str) -> str:
    """Look up a comms channel's display name from the department's provider_config."""
    if not channel_id:
        return ""
    dept_row = db.execute(
        select(Department).where(Department.name == dept)
    ).scalar_one_or_none()
    if not dept_row:
        return ""
    channels = (dept_row.provider_config or {}).get("comms_channels") or []
    ch = next((c for c in channels if c.get("id") == channel_id), None)
    return ch.get("name", "") if ch else ""


@router.get("/{department_name}/crons")
async def get_department_crons(
    department_name: str,
    user: User = Depends(_require_admin_or_dept_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve cron jobs for a department (Admin only)."""
    dept = department_name.lower()
    rows = db.execute(
        select(CronJob).where(CronJob.department == dept).order_by(CronJob.created_at)
    ).scalars().all()
    return {"ok": True, "crons": [r.to_dict() for r in rows]}


@router.post("/{department_name}/crons")
async def create_department_cron(
    department_name: str,
    body: Dict[str, Any] = Body(...),
    user: User = Depends(_require_admin_or_dept_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Create a new department cron job (Admin only). Persisted to SQLite."""
    dept = department_name.lower()
    name = str(body.get("name", "")).strip() or "Scheduled Cron Job"
    schedule = str(body.get("schedule", "0 9 * * 1-5")).strip()
    prompt = str(body.get("prompt", "")).strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    cron_id = f"{dept}-{name.lower().replace(' ', '-')[:20]}-{int(time.time())}"
    deliver_channel_id = str(body.get("deliver_channel_id", "")).strip()
    deliver_channel_name = _resolve_channel_name(db, dept, deliver_channel_id)

    new_cron = CronJob(
        id=cron_id,
        department=dept,
        name=name,
        schedule=schedule,
        prompt=prompt,
        skill_id=str(body.get("skill_id", "")),
        enabled=bool(body.get("enabled", True)),
        deliver_channel_id=deliver_channel_id,
        deliver_channel_name=deliver_channel_name,
        last_run=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_cron)
    db.commit()
    db.refresh(new_cron)
    return {"ok": True, "cron": new_cron.to_dict()}


@router.patch("/{department_name}/crons/{cron_id}")
@router.put("/{department_name}/crons/{cron_id}")
async def update_department_cron(
    department_name: str,
    cron_id: str,
    body: Dict[str, Any] = Body(...),
    user: User = Depends(_require_admin_or_dept_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Update a department cron job (Admin only). Persisted to SQLite."""
    dept = department_name.lower()
    target = db.execute(
        select(CronJob).where(CronJob.id == cron_id, CronJob.department == dept)
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Cron job not found")

    if "enabled" in body:
        target.enabled = bool(body["enabled"])
    if "name" in body:
        target.name = str(body["name"]).strip() or target.name
    if "schedule" in body:
        target.schedule = str(body["schedule"]).strip() or target.schedule
    if "prompt" in body:
        target.prompt = str(body["prompt"]).strip() or target.prompt
    if "skill_id" in body:
        target.skill_id = str(body["skill_id"]).strip()
    if "deliver_channel_id" in body:
        new_ch_id = str(body["deliver_channel_id"]).strip()
        target.deliver_channel_id = new_ch_id
        target.deliver_channel_name = _resolve_channel_name(db, dept, new_ch_id)

    db.commit()
    db.refresh(target)
    return {"ok": True, "cron": target.to_dict()}


@router.delete("/{department_name}/crons/{cron_id}")
async def delete_department_cron(
    department_name: str,
    cron_id: str,
    user: User = Depends(_require_admin_or_dept_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Delete a department cron job (Admin only). Persisted to SQLite."""
    dept = department_name.lower()
    target = db.execute(
        select(CronJob).where(CronJob.id == cron_id, CronJob.department == dept)
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Cron job not found")
    db.delete(target)
    db.commit()
    return {"ok": True}
