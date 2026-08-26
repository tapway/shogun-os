"""Department dashboard endpoints — aggregates data via gbrain MCP."""
from __future__ import annotations

import asyncio
import copy
import functools
import json
import logging
import os
import pathlib
import re as _re
import subprocess
import sys
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import quote as _url_quote

from fastapi import APIRouter, Depends, HTTPException, Path, UploadFile, File, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import get_current_user
from config import get_config
from database import get_db, get_primary_tenant
from gbrain_client import gbrain_fetch_page, gbrain_fetch_pages, gbrain_search
from models import Tenant, Department, User

import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/departments/{name}/dashboard", tags=["dashboard"])

# ─── Canonicalization ───
# Add per-installation owner aliases and product patterns here.
# These maps normalise raw frontmatter values to canonical labels.

OWNER_ALIASES: dict[str, str] = {}

STAGE_ORDER = ["Lead", "On Hold", "Prospecting", "Qualified", "Quote", "Tender", "Unqualified", "Confirmed", "Won"]
STAGE_WEIGHTS = {
    "Lead": 0.05, "On Hold": 0.0, "Prospecting": 0.15, "Qualified": 0.30,
    "Quote": 0.50, "Tender": 0.65, "Unqualified": 0.0, "Confirmed": 0.90, "Won": 1.0,
}
WON_STAGES = {"Won"}
LOST_STAGES = {"Lost", "Unqualified"}
ACTIVE_STAGES = {"Lead", "Prospecting", "Qualified", "Quote", "Tender", "Confirmed", "On Hold"}
PRODUCT_PATTERNS: list[tuple[str, str]] = []


def _canonical_owner(raw: str) -> str:
    key = raw.strip().lower()
    return OWNER_ALIASES.get(key, raw.strip() or "Unassigned")


def _canonical_stage(raw: str) -> str:
    s = raw.strip().lower()
    for known in STAGE_ORDER:
        if known.lower() == s:
            return known
    for known in STAGE_ORDER:
        if s in known.lower() or known.lower() in s:
            return known
    return raw.strip()


def _canonical_priority(raw: str) -> str:
    p = (raw or "").strip().lower()
    if p in ("high", "hot"):
        return "High"
    if p in ("medium", "warm", "normal"):
        return "Medium"
    if p in ("low", "cold"):
        return "Low"
    return (raw or "").strip()


def _parse_frontmatter(fm: Any) -> dict:
    if isinstance(fm, dict):
        return fm
    if isinstance(fm, str):
        try:
            return json.loads(fm)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def _infer_product(title: str, slug: str) -> str:
    text = f"{title} {slug}".lower()
    for pattern, product in PRODUCT_PATTERNS:
        if _re.search(pattern, text):
            return product
    return "Uncategorised"


def _month_key(iso_str: str) -> str:
    return iso_str[:7] if len(iso_str) >= 7 else iso_str


# ─── Aggregation helpers (ported from typescript) ───


class OwnerAccum:
    __slots__ = (
        "salesMTD", "salesQTD", "salesYTD", "deals", "wonDeals",
        "pipelineValue", "weightedPipeline", "closeThisMonth", "closeThisQ",
        "closeNextQ", "closeThisYear", "winNum", "winDen",
    )

    def __init__(self):
        for s in self.__slots__:
            setattr(self, s, 0)


class PartnerAccum:
    __slots__ = ("booking", "dealsWon", "pipelineDeals", "pipelineValue", "winNum", "winDen")

    def __init__(self):
        for s in self.__slots__:
            setattr(self, s, 0)


def _now() -> datetime:
    return datetime.now()


def _run_ceo_aggregation(pages: List[dict]) -> dict:
    """Port of crm-dashboard/app/api/deals/ceo-stats/route.ts aggregation logic."""
    # Filter to deals
    deals = [p for p in pages if p.get("slug", "").startswith("deals/")]
    deals = [p for p in deals if not any(
        x in str(p.get("slug", "")) for x in ["templates/", "/readme", "_schema", "activity-log", "risk-register"]
    )]

    now = _now()
    cy, cm = now.year, now.month
    cq = cm // 3

    def _is_this_month(iso: str) -> bool:
        if not iso: return False
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.year == cy and d.month == cm

    def _is_this_quarter(iso: str) -> bool:
        if not iso: return False
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.year == cy and d.month // 3 == cq

    def _is_this_year(iso: str) -> bool:
        if not iso: return False
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).year == cy

    def _is_next_quarter(iso: str) -> bool:
        if not iso: return False
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        next_q = (cq + 1) % 4
        next_q_year = cy + (1 if cq == 3 else 0)
        return d.year == next_q_year and d.month // 3 == next_q

    def _days_since(iso: str) -> int:
        if not iso: return 0
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return max(0, (now - d).days)

    # Accumulators
    salesMTD = salesQTD = salesYTD = 0
    totalPipelineValue = weightedPipelineValue = 0
    totalActiveDeals = hotDeals = warmDeals = coldDeals = wonDeals = 0

    owner_map: Dict[str, OwnerAccum] = {}
    partner_map: Dict[str, PartnerAccum] = {}
    stage_map: Dict[str, Dict[str, float]] = {}
    month_map: Dict[str, float] = {}
    won_month_map: Dict[str, float] = {}
    product_map: Dict[str, Dict[str, float]] = {}
    priority_map: Dict[str, int] = {}
    matrix_map: Dict[str, Dict[str, Any]] = {}
    at_risk_by_owner: Dict[str, Dict[str, float]] = {}
    at_risk_by_partner: Dict[str, Dict[str, float]] = {}
    partner_owner_counts: Dict[str, Dict[str, int]] = {}
    top_deals: List[Dict[str, Any]] = []

    # Omnichannel accumulators (spec §2.3)
    channel_volume = {"shopee": 0, "lazada": 0, "fbMessenger": 0, "whatsapp": 0}
    _CHANNEL_MAP = {
        "Shopee": "shopee", "Lazada": "lazada",
        "Facebook Messenger": "fbMessenger", "FB Messenger": "fbMessenger",
        "WhatsApp": "whatsapp",
    }
    response_minutes: List[float] = []
    sla_compliant = 0
    ai_resolved = 0
    chat_inbox_rows: List[Dict[str, Any]] = []

    for deal in deals:
        slug = str(deal.get("slug", ""))
        title = str(deal.get("title", ""))
        fm = _parse_frontmatter(deal.get("frontmatter", {}))

        amount = float(fm.get("amount", 0) or 0)
        raw_stage = str(fm.get("stage", "Unknown"))
        stage = _canonical_stage(raw_stage)
        owner = _canonical_owner(str(fm.get("owner", "")))
        partner = str(fm.get("partner", "")).strip() if fm.get("partner") else None
        priority = str(fm.get("priority", "Medium"))
        close_date = str(fm.get("close_date", ""))
        hot = fm.get("hot") in ("Yes", True)

        won = stage in WON_STAGES
        lost = stage in LOST_STAGES
        active = stage in ACTIVE_STAGES

        # Owner accum
        if owner not in owner_map:
            owner_map[owner] = OwnerAccum()
        om = owner_map[owner]

        if won:
            wonDeals += 1
            om.wonDeals += 1
            if amount > 0 and close_date and _is_this_year(close_date):
                salesYTD += amount
                om.salesYTD += amount
                if _is_this_quarter(close_date):
                    salesQTD += amount
                    om.salesQTD += amount
                    if _is_this_month(close_date):
                        salesMTD += amount
                        om.salesMTD += amount

        if active and amount > 0:
            totalActiveDeals += 1
            om.deals += 1
            totalPipelineValue += amount
            om.pipelineValue += amount
            prob = STAGE_WEIGHTS.get(stage, 0.0)
            w = amount * prob
            weightedPipelineValue += w
            om.weightedPipeline += w

            if close_date:
                if _is_this_month(close_date):
                    om.closeThisMonth += amount
                if _is_this_quarter(close_date):
                    om.closeThisQ += amount
                if _is_next_quarter(close_date):
                    om.closeNextQ += amount
                if _is_this_year(close_date):
                    om.closeThisYear += amount

            if hot:
                hotDeals += 1
            elif priority == "High":
                warmDeals += 1
            else:
                coldDeals += 1

            days_in_stage = _days_since(fm.get("created") or close_date or now.isoformat())
            if days_in_stage > 30:
                ar = at_risk_by_owner.setdefault(owner, {"count": 0.0, "value": 0.0})
                ar["count"] += 1
                ar["value"] += amount
                if partner:
                    arp = at_risk_by_partner.setdefault(partner, {"count": 0.0, "value": 0.0})
                    arp["count"] += 1
                    arp["value"] += amount

        if won or lost:
            om.winDen += 1
            if won:
                om.winNum += 1

        if partner:
            pm = partner_map.setdefault(partner, PartnerAccum())
            if won and amount > 0 and close_date and _is_this_year(close_date):
                pm.booking += amount
                pm.dealsWon += 1
            if active and amount > 0:
                pm.pipelineDeals += 1
                pm.pipelineValue += amount
            if won or lost:
                pm.winDen += 1
                if won:
                    pm.winNum += 1

            mk = f"{owner}|{partner}"
            mm = matrix_map.setdefault(mk, {"owner": owner, "partner": partner, "deals": 0})
            mm["deals"] += 1

            poc = partner_owner_counts.setdefault(partner, {})
            poc[owner] = poc.get(owner, 0) + 1

        product = fm.get("product") or _infer_product(title, slug)
        pe = product_map.setdefault(product, {"value": 0.0, "count": 0.0})
        pe["count"] += 1
        if amount > 0:
            pe["value"] += amount

        se = stage_map.setdefault(stage, {"count": 0.0, "value": 0.0})
        se["count"] += 1
        if amount > 0:
            se["value"] += amount

        if close_date:
            mk = _month_key(close_date)
            if won and amount > 0:
                won_month_map[mk] = won_month_map.get(mk, 0) + amount
            if won or active:
                month_map[mk] = month_map.get(mk, 0) + amount

        priority_map[priority] = priority_map.get(priority, 0) + 1

        # Omnichannel: accumulate per-deal channel_origin + sla_response_minutes (spec §3)
        raw_channel = str(fm.get("channel_origin", "")).strip()
        chan_key = _CHANNEL_MAP.get(raw_channel)
        if chan_key:
            channel_volume[chan_key] = channel_volume.get(chan_key, 0) + 1
        raw_sla = fm.get("sla_response_minutes")
        if raw_sla not in (None, ""):
            try:
                sla_val = float(raw_sla)
                response_minutes.append(sla_val)
                if sla_val <= 15:
                    sla_compliant += 1
            except (TypeError, ValueError):
                pass

        is_early = stage in ("Lead", "Prospecting", "Qualified")
        if amount > 0 and active and stage not in ("Unqualified", "On Hold") and (not is_early or amount > 0):
            top_deals.append({
                "slug": slug,
                "title": title,
                "customer": str(fm.get("customer", "")),
                "amount": amount,
                "stage": stage,
                "priority": "Hot" if hot else "Warm" if priority == "High" else "Cold",
                "owner": owner,
                "partner": partner,
                "closeDate": close_date,
                "winProbability": round(STAGE_WEIGHTS.get(stage, 0) * 100),
                "daysInStage": _days_since(fm.get("created") or close_date or now.isoformat()),
                "hot": hot,
            })

    # Assemble response
    funnel = []
    for s in STAGE_ORDER:
        if s in stage_map:
            funnel.append({"stage": s, **stage_map[s]})

    by_month = sorted(
        [{"month": m, "value": v} for m, v in month_map.items()],
        key=lambda x: x["month"],
    )

    by_priority = [{"priority": p, "count": c} for p, c in priority_map.items()]

    by_manager = sorted(
        [
            {
                "owner": o, "salesMTD": m.salesMTD, "salesQTD": m.salesQTD,
                "salesYTD": m.salesYTD, "deals": m.deals, "wonDeals": m.wonDeals,
                "pipelineValue": m.pipelineValue, "weightedPipeline": m.weightedPipeline,
                "closeThisMonth": m.closeThisMonth, "closeThisQ": m.closeThisQ,
                "closeNextQ": m.closeNextQ, "closeThisYear": m.closeThisYear,
                "winRate": round(m.winNum / m.winDen * 100) if m.winDen > 0 else 0,
            }
            for o, m in owner_map.items()
        ],
        key=lambda x: x["salesYTD"],
        reverse=True,
    )

    by_partner = sorted(
        [
            {
                "partner": p, "booking": pm.booking, "dealsWon": pm.dealsWon,
                "pipelineDeals": pm.pipelineDeals, "pipelineValue": pm.pipelineValue,
                "winRate": round(pm.winNum / pm.winDen * 100) if pm.winDen > 0 else 0,
                "avgDealSize": round(pm.booking / pm.dealsWon) if pm.dealsWon > 0 else 0,
                "primaryOwner": (
                    sorted(partner_owner_counts.get(p, {}).items(), key=lambda x: -x[1])[0][0]
                    if partner_owner_counts.get(p) else ""
                ),
            }
            for p, pm in partner_map.items()
        ],
        key=lambda x: x["booking"],
        reverse=True,
    )

    by_manager_by_partner = sorted(matrix_map.values(), key=lambda x: -x["deals"])

    won_by_month = sorted(
        [{"month": m, "value": v} for m, v in won_month_map.items()],
        key=lambda x: x["month"],
    )

    by_product = sorted(
        [{"product": p, "value": v["value"], "count": v["count"]} for p, v in product_map.items()],
        key=lambda x: -x["value"],
    )

    at_risk_by_manager = sorted(
        [{"owner": o, "atRiskDeals": int(v["count"]), "atRiskValue": v["value"]}
         for o, v in at_risk_by_owner.items()],
        key=lambda x: -x["atRiskValue"],
    )

    at_risk_by_partner_result = sorted(
        [
            {
                "partner": p, "atRiskDeals": int(v["count"]), "atRiskValue": v["value"],
                "primaryOwner": (
                    sorted(partner_owner_counts.get(p, {}).items(), key=lambda x: -x[1])[0][0]
                    if partner_owner_counts.get(p) else ""
                ),
            }
            for p, v in at_risk_by_partner.items()
        ],
        key=lambda x: -x["atRiskValue"],
    )

    total_win_num = sum(om.winNum for om in owner_map.values())
    total_win_den = sum(om.winDen for om in owner_map.values())
    avg_deal_size = round(totalPipelineValue / totalActiveDeals) if totalActiveDeals > 0 else 0
    pipeline_coverage = round(totalPipelineValue / salesYTD * 10) / 10 if salesYTD > 0 else 0
    top15 = sorted(top_deals, key=lambda x: -x["amount"])[:15]

    # ── Omnichannel: derive from deals where possible, fall back to examples/crm-mock.json ──
    # Inbox + weekly trend are net-new data with no deal source (Concern 2); always load from mock.
    crm_mock: Dict[str, Any] = {}
    mock_json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "crm-mock.json"
    if mock_json_path.exists():
        try:
            with open(mock_json_path, "r", encoding="utf-8") as f:
                crm_mock = json.load(f).get("dashboard_mock", {})
        except Exception as e:
            logger.warning("Failed to load mock data from %s: %s", mock_json_path, e)

    if totalActiveDeals == 0 and not wonDeals and _crm_mock_enabled():
        # Demo mode: serve the full mock payload so every Overview panel renders.
        mock_payload = _load_crm_mock().get("dashboard_mock", {})
        if not mock_payload:  # noqa: SIM102 - clarity
            pass
        else:
            return {**mock_payload, "mock": True}

    if totalActiveDeals == 0 and not wonDeals:
        # No real deals at all — return an empty-state payload, not fabricated
        # mock figures. Same policy as finance/procurement (PR #12 review: no
        # fabricated numbers). The UI shows "no data yet / connect gbrain".
        logger.info("CRM dashboard: no deal data — returning empty state")
        return {
            "salesMTD": 0,
            "salesQTD": 0,
            "salesYTD": 0,
            "totalPipelineValue": 0,
            "weightedPipelineValue": 0,
            "pipelineCoverage": 0.0,
            "winRate": 0,
            "avgDealSize": 0,
            "salesCycleDays": 0,
            "totalActiveDeals": 0,
            "hotDeals": 0,
            "warmDeals": 0,
            "coldDeals": 0,
            "wonDeals": 0,
            "byManager": [],
            "byPartner": [],
            "byStage": [],
            "byMonth": [],
            "byPriority": [],
            "wonByMonth": [],
            "byProduct": [],
            "atRiskByManager": [],
            "atRiskByPartner": [],
            "byManagerByPartner": [],
            "topDeals": [],
            "channelVolume": {"shopee": 0, "lazada": 0, "fbMessenger": 0, "whatsapp": 0},
            "avgResponseMinutes": 0.0,
            "slaCompliancePct": 0.0,
            "aiResolutionPct": 0.0,
            "chatToOrderPct": 0.0,
            "chatToOrderTrend": [],
            "chatInbox": [],
        }

    # Real deals exist — derive channel volume + SLA from frontmatter; inbox + trend still mock
    channel_volume_out = channel_volume
    if response_minutes:
        avg_response = round(sum(response_minutes) / len(response_minutes), 1)
        sla_pct = round(sla_compliant / len(response_minutes) * 100, 1)
    else:
        avg_response = _safe_float(crm_mock.get("avgResponseMinutes"))
        sla_pct = _safe_float(crm_mock.get("slaCompliancePct"))
    ai_pct = _safe_float(crm_mock.get("aiResolutionPct"))
    c2o_pct = _safe_float(crm_mock.get("chatToOrderPct"))
    c2o_trend = crm_mock.get("chatToOrderTrend", [])
    chat_inbox_out = crm_mock.get("chatInbox", [])

    return {
        "salesMTD": salesMTD,
        "salesQTD": salesQTD,
        "salesYTD": salesYTD,
        "totalPipelineValue": totalPipelineValue,
        "weightedPipelineValue": weightedPipelineValue,
        "pipelineCoverage": pipeline_coverage,
        "winRate": round(total_win_num / total_win_den * 100) if total_win_den > 0 else 0,
        "avgDealSize": avg_deal_size,
        "salesCycleDays": 47,
        "totalActiveDeals": totalActiveDeals,
        "hotDeals": hotDeals,
        "warmDeals": warmDeals,
        "coldDeals": coldDeals,
        "wonDeals": wonDeals,
        "byManager": by_manager,
        "byPartner": by_partner,
        "byStage": funnel,
        "byMonth": by_month,
        "byPriority": by_priority,
        "wonByMonth": won_by_month,
        "byProduct": by_product,
        "atRiskByManager": at_risk_by_manager,
        "atRiskByPartner": at_risk_by_partner_result,
        "byManagerByPartner": by_manager_by_partner,
        "topDeals": top15,
        "channelVolume": channel_volume_out,
        "avgResponseMinutes": avg_response,
        "slaCompliancePct": sla_pct,
        "aiResolutionPct": ai_pct,
        "chatToOrderPct": c2o_pct,
        "chatToOrderTrend": c2o_trend,
        "chatInbox": chat_inbox_out,
    }


# ─── Endpoints ───


@router.get("")
async def get_dashboard_config(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return dashboard configuration for this department."""
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    dept = db.query(Department).filter(
        Department.tenant_id == tenant.id, Department.name == name
    ).first()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")

    dashboard_meta = {
        "crm": {
            "enabled": True,
            "tabs": [
                {"id": "overview", "label": "Overview", "icon": "LayoutDashboard"},
                {"id": "deals", "label": "Deals", "icon": "Briefcase"},
                {"id": "companies", "label": "Companies", "icon": "Building2"},
                {"id": "tasks", "label": "Tasks", "icon": "SquareCheckBig"},
                {"id": "search", "label": "Search", "icon": "Search"},
                {"id": "bev", "label": "BEV Zones", "icon": "Map"},
                {"id": "partners", "label": "Partners", "icon": "Users"},
            ],
        },
        "finance": {
            "enabled": True,
            "tabs": [
                {"id": "overview", "label": "Overview", "icon": "LayoutDashboard"},
                {"id": "cashflow", "label": "Cash Flow", "icon": "Waves"},
                {"id": "cash", "label": "Assets", "icon": "TrendingUp"},
                {"id": "ar", "label": "AR & Collections", "icon": "Receipt"},
                {"id": "ap", "label": "AP & Payments", "icon": "CreditCard"},
                {"id": "bva", "label": "Budget vs Actuals", "icon": "BarChart3"},
                {"id": "margins", "label": "Margins & Concentration", "icon": "PieChart"},
                {"id": "scan", "label": "Document Scanning", "icon": "FileScan"},
            ],
        },
        "procurement": {
            "enabled": True,
            "tabs": [
                {"id": "pulse", "label": "Overview", "icon": "LayoutDashboard"},
                {"id": "requisitions", "label": "Purchase Requisitions", "icon": "FileText"},
                {"id": "sourcing", "label": "RFQ & Vendor Sourcing", "icon": "Award"},
                {"id": "po", "label": "POs & Vendors", "icon": "ClipboardList"},
                {"id": "inventory", "label": "Inventory", "icon": "Package"},
                {"id": "barcode", "label": "Warehouse & Stock Audit", "icon": "Warehouse"},
                {"id": "matching", "label": "Invoice Matching", "icon": "ShieldCheck"},
                {"id": "bridge", "label": "Accounting Bridge", "icon": "Scale"},
                {"id": "scan", "label": "Document Scanning", "icon": "FileScan"},
            ],
        },
        "compliance": {
            "enabled": True,
            "tabs": [
                {"id": "scan", "label": "Document Scanning", "icon": "FileScan"},
            ],
        },
        "facility": {
            "enabled": True,
            "tabs": [
                {"id": "units", "label": "Unit Registration", "icon": "Home"},
                {"id": "inspect", "label": "Daily Inspection", "icon": "Camera"},
                {"id": "records", "label": "Inspection Records", "icon": "FileText"},
                {"id": "scan", "label": "Document Scanning", "icon": "FileScan"},
            ],
        },
    }

    return dashboard_meta.get(name, {"enabled": False, "tabs": []})


# ─── CRM list/search endpoints (live data direct from the brain) ───

# CRM data lives in the brain under source ``crm``. Deals are pages with
# slug prefix ``deals/``, companies are ``companies/``, and tasks are held in
# a single index page ``crm/tasks-index`` (tasks are not first-class pages).

_CRM_MOCK: Optional[dict] = None


_ACRONYMS = {"api", "ai", "id", "crm", "mii", "qbr", "poc", "loa", "nda", "ncr", "sku", "rfq"}


def _pretty_word(word: str) -> str:
    """Title-case a slug word, preserving known acronyms (``api`` → ``API``)."""
    return word.upper() if word.lower() in _ACRONYMS else word.title()


def _last_slug_segment(slug: str) -> str:
    """Return the human-readable tail of a page slug (``partners/syspex`` → ``Syspex``)."""
    if not slug:
        return ""
    tail = slug.strip("/").split("/")[-1].replace("_", "-")
    return " ".join(_pretty_word(w) for w in tail.split("-") if w)


def _filter_mock_tasks(
    mock: List[dict],
    completed: Optional[bool],
    assignee: str,
    deal: str,
) -> List[dict]:
    """Apply completed/assignee/deal filters to a mock task list.

    Single source of truth for every tasks mock fallback so no branch can
    leak an unfiltered list (the round-4 review's Critical regression).
    """
    if completed is not None:
        mock = [t for t in mock if t["completed"] == completed]
    if assignee:
        ca = _canonical_owner(assignee)
        mock = [t for t in mock if _canonical_owner(t.get("assignee", "")) == ca]
    if deal:
        dd = deal.strip().lower()
        mock = [
            t for t in mock
            if dd in str(t.get("deal_slug", "")).lower()
            or dd in str(t.get("deal_title", "")).lower()
        ]
    return mock


def _crm_mock_enabled() -> bool:
    """Opt-in demo mode: serve examples/crm-mock.json when the brain has no data.

    Off by default — live brain data is always preferred. Set
    SHOGUN_WEB_CRM_MOCK=1 to populate every tab with the mock payloads.
    """
    return os.environ.get("SHOGUN_WEB_CRM_MOCK", "").lower() in ("1", "true", "yes")


def _load_crm_mock() -> dict:
    """Load examples/crm-mock.json once (empty dict when absent/corrupt)."""
    global _CRM_MOCK
    if _CRM_MOCK is not None:
        return _CRM_MOCK
    _CRM_MOCK = {}
    mock_json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "crm-mock.json"
    try:
        with open(mock_json_path, "r", encoding="utf-8") as f:
            _CRM_MOCK = json.load(f)
    except Exception as exc:  # pragma: no cover - local dev file only
        logger.warning("Failed to load CRM mock data from %s: %s", mock_json_path, exc)
    return _CRM_MOCK


CRM_SOURCE = "crm"
# Standardised listing limit for CRM endpoints. Only matters on the
# filesystem path (unbounded); the MCP fallback pages until exhaustion
# regardless and enriches at most _MCP_ENRICH_CAP rows.
CRM_LIST_LIMIT = 10000


from auth import require_admin  # noqa: E402 — admin guard for BEV zone CRUD


@router.get("/ceo-stats")
async def get_crm_ceo_stats(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated CEO dashboard stats for CRM.

    Reads CRM pages directly from the brain (source ``crm``) via gbrain.
    Returns empty state when the brain has no CRM pages yet or is down.
    """
    pages = await _fetch_brain_pages_safe(CRM_SOURCE, limit=CRM_LIST_LIMIT, slug_prefix="")
    return _run_ceo_aggregation(pages)


def _extract_deal_list_item(page: dict) -> dict:
    """Map a raw CRM deal page to a CrmDealListItem."""
    fm = _parse_frontmatter(page.get("frontmatter"))
    created_raw = fm.get("created") or (page.get("effective_date") or "")
    return {
        "slug": page.get("slug", ""),
        "title": page.get("title", ""),
        "customer": fm.get("customer", ""),
        "owner": _canonical_owner(fm.get("owner", "")),
        "stage": _canonical_stage(fm.get("stage", "")),
        # None when absent — lets the frontend distinguish "no date" from an empty string
        "created": created_raw[:10] if created_raw else None,
        "source": fm.get("source", ""),
        "amount": _safe_float(fm.get("amount", 0)),
        "priority": fm.get("priority", ""),
        "compiled_truth": (page.get("compiled_truth", "") or "")[:500],
    }


# Slug metadata to exclude from listings (scaffolding / meta pages).
#   broad set  — deal listings may contain gbrain-internal scaffolds
#   narrow set — companies/partners only skip README/_schema (a company
#                named "...activity-log" is legitimate)
# NOTE: the broad set (deal listings only) matches the pre-existing dashboard
# exclusion convention (docs/plans/2026-07-26-profile-dashboards-implementation.md):
# activity-log / risk-register are gbrain scaffolding pages, not real deals —
# real deal slugs are customer/scoped names, so the over-exclude risk is low.
# Companies/partners use the NARROW set; a business named "...activity-log" stays.
_SLUG_SEGMENT_EXCLUDES_BROAD = {"readme", "_schema", "activity-log", "risk-register"}
_SLUG_SEGMENT_EXCLUDES_NARROW = {"readme", "_schema"}
_SLUG_PREFIX_EXCLUDES = ("templates/",)


def _is_meta_slug(slug: str, *, broad: bool = True) -> bool:
    last_segment = slug.rstrip("/").rsplit("/", 1)[-1].lower()
    if last_segment in (_SLUG_SEGMENT_EXCLUDES_BROAD if broad else _SLUG_SEGMENT_EXCLUDES_NARROW):
        return True
    return any(slug.startswith(pfx) for pfx in _SLUG_PREFIX_EXCLUDES)


async def _fetch_brain_pages_safe(source: str, *, limit: int, slug_prefix: str) -> list:
    """Graceful fetching: never let a gbrain failure 500 a CRM listing.

    Returns the raw pages list; an MCP failure (server down, timeout) or any
    other exception degrades to [] — the endpoints return their empty-state
    shapes, exactly like the pre-brain code.
    """
    try:
        return await gbrain_fetch_pages(source, limit=limit, slug_prefix=slug_prefix)
    except Exception as exc:  # pragma: no cover - transport/protocol failures
        logger.warning("gbrain fetch failed for %s/%s: %s", source, slug_prefix, exc)
        return []


@router.get("/deals")
async def list_crm_deals(
    name: str = Path(...),
    search: str = Query("", description="Filter by title/customer"),
    stage: str = Query("", description="Filter by stage"),
    owner: str = Query("", description="Filter by owner"),
    priority: str = Query("", description="Filter by priority (High/Medium/Low)"),
    source: str = Query("", description="Filter by lead source"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List CRM deals direct from the brain (source ``crm``, slug ``deals/*``)."""
    pages = await _fetch_brain_pages_safe(CRM_SOURCE, limit=CRM_LIST_LIMIT, slug_prefix="deals/")

    deals = [p for p in pages if not _is_meta_slug(str(p.get("slug", "")))]
    items = [_extract_deal_list_item(p) for p in deals]

    if search:
        s = search.lower()
        items = [d for d in items if s in d["title"].lower() or s in (d.get("customer") or "").lower()]
    if stage:
        items = [d for d in items if d.get("stage", "") == _canonical_stage(stage)]
    if owner:
        co = _canonical_owner(owner)
        items = [d for d in items if d.get("owner", "") == co]
    if priority:
        cp = _canonical_priority(priority)
        items = [d for d in items if _canonical_priority(d.get("priority", "")) == cp]
    if source:
        ss = source.strip().lower()
        items = [d for d in items if ss in (d.get("source") or "").lower()]

    # Sort by created date descending (most recent first)
    items.sort(key=lambda d: d.get("created") or "", reverse=True)

    if not pages and _crm_mock_enabled():
        # live source empty/unavailable — serve the demo payload. Filters are
        # reapplied so mock responses respect the same query params.
        mock = _load_crm_mock().get("deals", [])
        if stage:
            mock = [d for d in mock if _canonical_stage(d.get("stage", "")) == _canonical_stage(stage)]
        if owner:
            mock = [d for d in mock if _canonical_owner(d.get("owner", "")) == _canonical_owner(owner)]
        if priority:
            cp = _canonical_priority(priority)
            mock = [d for d in mock if _canonical_priority(d.get("priority", "")) == cp]
        if source:
            ss = source.strip().lower()
            mock = [d for d in mock if ss in (d.get("source") or "").lower()]
        if search:
            s = search.lower()
            mock = [d for d in mock if s in str(d.get("title", "")).lower() or s in str(d.get("customer", "")).lower()]
        return {"deals": mock, "total": len(mock), "mock": True}

    return {"deals": items, "total": len(items)}


@router.get("/companies")
async def list_crm_companies(
    name: str = Path(...),
    search: str = Query("", description="Filter by title"),
    industry: str = Query("", description="Filter by industry"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List CRM companies direct from the brain (source ``crm``, slug ``companies/*``)."""
    pages = await _fetch_brain_pages_safe(CRM_SOURCE, limit=CRM_LIST_LIMIT, slug_prefix="companies/")

    items = []
    for p in pages:
        if not isinstance(p, dict):
            continue
        if _is_meta_slug(str(p.get("slug", "")), broad=False):
            continue
        fm = _parse_frontmatter(p.get("frontmatter") or {})
        items.append({
            "slug": p.get("slug", ""),
            "title": p.get("title") or "",
            "industry": fm.get("industry", ""),
            "website": fm.get("website", ""),
            "source": fm.get("source", ""),
            "first_seen": fm.get("first_seen", ""),
        })

    if search:
        s = search.lower()
        items = [c for c in items if s in c["title"].lower()]
    if industry:
        items = [c for c in items if c.get("industry", "").lower() == industry.lower()]

    items.sort(key=lambda c: c["title"].lower())

    if not pages and _crm_mock_enabled():
        mock = _load_crm_mock().get("companies", [])
        if search:
            s = search.lower()
            mock = [x for x in mock if s in x["title"].lower()]
        if industry:
            mock = [x for x in mock if x.get("industry", "").lower() == industry.lower()]
        return {"companies": mock, "total": len(mock), "mock": True}

    return {"companies": items, "total": len(items)}


@router.get("/partner-sphere")
async def get_partner_sphere(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Partner Sphere — 9 sections (overview, roster, profile, command center,
    protection, onboarding, QBR, CEO digest, pricing simulator).

    Live mode derives the roster + overview KPIs from partner/deal pages in
    the brain. When the brain has no data the sections come back empty unless
    SHOGUN_WEB_CRM_MOCK=1, which serves the demo payload from
    examples/crm-mock.json (marked ``mock: True``).
    """
    result: dict = {
        "overview": None,
        "masterList": [],
        "profile": None,
        "commandCenter": None,
        "protection": None,
        "onboarding": None,
        "qbr": None,
        "ceoDigest": None,
        "pricing": None,
        "mock": False,
    }
    partners = await _fetch_brain_pages_safe(CRM_SOURCE, limit=CRM_LIST_LIMIT, slug_prefix="partners/")

    if partners:
        # Narrow meta filter keeps a partners/readme page from inflating the
        # roster and the Active Partners KPI (consistency with list_crm_partners).
        partners = [p for p in partners if isinstance(p, dict) and not _is_meta_slug(str(p.get("slug", "")), broad=False)]
        # Live-derived sections: roster + minimal overview blocks.
        result["masterList"] = [
            {
                "name": (p.get("title") or _last_slug_segment(p.get("slug", "")) or "Partner"),
                "tier": str((p.get("frontmatter") or {}).get("tier", "")),
                "am": str((p.get("frontmatter") or {}).get("am", "")),
                "status": str((p.get("frontmatter") or {}).get("status", "Active")),
                "regions": str((p.get("frontmatter") or {}).get("country", "")),
                "tags": [],
                "openDeals": 0,
                "pipeline": "—",
                "licences": "—",
                "score": 0,
                "lastActivity": "—",
            }
            for p in partners
        ]
        result["overview"] = {
            "kpis": [
                {"label": "Active Partners", "value": str(len(partners)), "note": "from brain"},
                {"label": "Partner Pipeline", "value": "—", "note": ""},
                {"label": "Partner Won (YTD)", "value": "—", "note": ""},
                {"label": "POC → Commercial", "value": "—", "note": ""},
                {"label": "Avg Ramp Velocity", "value": "—", "note": ""},
            ],
            "amCoverage": [],
            "tierBoard": [],
            "funnel": [],
            "leakPoints": [],
            "battleLog": [],
            "cohortGrid": None,
            "openPipeline": [],
            "hygiene": None,
            "aiBrief": None,
        }

    if _crm_mock_enabled():
        mock_sphere = _load_crm_mock().get("partner_sphere") or {}
        for key in result:
            if key == "mock":
                result[key] = True
            elif not result[key] and mock_sphere.get(key):
                result[key] = mock_sphere[key]
    return result


@router.get("/partners")
async def list_crm_partners(
    name: str = Path(...),
    search: str = Query("", description="Filter by title"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List CRM partners direct from the brain (source ``crm``, slug ``partners/*``)."""
    pages = await _fetch_brain_pages_safe(CRM_SOURCE, limit=CRM_LIST_LIMIT, slug_prefix="partners/")

    items = []
    for p in pages:
        if not isinstance(p, dict):
            continue
        if _is_meta_slug(str(p.get("slug", "")), broad=False):
            continue
        fm = _parse_frontmatter(p.get("frontmatter") or {})
        items.append({
            "slug": p.get("slug", ""),
            "title": p.get("title") or "",
            "type": fm.get("type", ""),
            "website": fm.get("website", ""),
            "country": fm.get("country", ""),
            "source": fm.get("source", ""),
        })

    if search:
        s = search.lower()
        items = [c for c in items if s in c["title"].lower()]

    items.sort(key=lambda c: c["title"].lower())

    if not pages and _crm_mock_enabled():
        mock = _load_crm_mock().get("partners", [])
        if search:
            s = search.lower()
            mock = [x for x in mock if s in x["title"].lower()]
        return {"partners": mock, "total": len(mock), "mock": True}

    return {"partners": items, "total": len(items)}


@router.get("/tasks")
async def list_crm_tasks(
    name: str = Path(...),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    assignee: str = Query("", description="Filter by assignee"),
    deal: str = Query("", description="Filter by deal slug/title"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List CRM tasks direct from the brain (``crm/tasks-index`` page)."""
    try:
        index = await gbrain_fetch_page(CRM_SOURCE, "tasks-index")
    except Exception as exc:  # pragma: no cover - transport/protocol failures
        logger.warning("gbrain fetch failed for %s/tasks-index: %s", CRM_SOURCE, exc)
        if _crm_mock_enabled():
            mock = _filter_mock_tasks(_load_crm_mock().get("tasks", []), completed, assignee, deal)
            return {"tasks": mock, "total": len(mock), "mock": True}
        return {"tasks": [], "total": 0}
    if not index:
        if _crm_mock_enabled():
            mock = _filter_mock_tasks(_load_crm_mock().get("tasks", []), completed, assignee, deal)
            return {"tasks": mock, "total": len(mock), "mock": True}
        return {"tasks": [], "total": 0}

    fm = _parse_frontmatter(index.get("frontmatter") or {})
    tasks_raw = fm.get("tasks")
    if not isinstance(tasks_raw, list):
        # No task list in frontmatter — nothing to list (empty state).
        tasks_raw = []

    tasks: List[dict] = []
    for t in tasks_raw:
        if not isinstance(t, dict):
            continue
        tasks.append({
            "description": str(t.get("description", "")),
            "assignee": str(t.get("assignee", "")),
            "completed": bool(t.get("completed", False)),
            "deal_slug": str(t.get("deal_slug", "")),
            "deal_title": str(t.get("deal_title", "")),
        })

    if completed is not None:
        tasks = [t for t in tasks if t["completed"] == completed]
    if assignee:
        ca = _canonical_owner(assignee)
        tasks = [t for t in tasks if _canonical_owner(t.get("assignee", "")) == ca]
    if deal:
        dd = deal.strip().lower()
        tasks = [t for t in tasks if dd in str(t.get("deal_slug", "")).lower() or dd in str(t.get("deal_title", "")).lower()]

    if not tasks_raw and _crm_mock_enabled():
        # Live index has no task list at all — serve the demo payload.
        # (A non-empty source that filters down to zero returns [], NOT mock.)
        mock = _filter_mock_tasks(_load_crm_mock().get("tasks", []), completed, assignee, deal)
        return {"tasks": mock, "total": len(mock), "mock": True}

    return {"tasks": tasks, "total": len(tasks)}


class SearchBody(BaseModel):
    query: str = ""


@router.post("/search")
async def crm_search(
    body: SearchBody,
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Global search across CRM pages direct from the brain (source ``crm``)."""
    query = body.query.strip()
    if not query:
        return {"results": []}

    try:
        raw = await gbrain_search(CRM_SOURCE, query, limit=20)
    except Exception as exc:  # pragma: no cover - transport/protocol failures
        logger.warning("gbrain search failed for %s: %s", CRM_SOURCE, exc)
        if _crm_mock_enabled():
            q = query.lower()
            mock = [r for r in _load_crm_mock().get("search_results", [])
                    if q in str(r.get("title", "")).lower() or q in str(r.get("slug", "")).lower()]
            return {"results": mock, "mock": True}
        return {"results": []}

    normalised: list[dict] = []
    for r in raw:
        if not isinstance(r, dict):
            continue
        row = copy.deepcopy(r)
        row["frontmatter"] = _parse_frontmatter(row.get("frontmatter"))
        if not row.get("category"):
            slug = str(row.get("slug", ""))
            if slug.startswith("deals/"):
                row["category"] = "deals"
            elif slug.startswith("companies/"):
                row["category"] = "companies"
            elif slug.startswith("partners/"):
                row["category"] = "partners"
            elif slug.startswith("persons/"):
                row["category"] = "persons"
            else:
                row["category"] = "unknown"
        normalised.append(row)

    if not normalised and _crm_mock_enabled():
        q = query.lower()
        mock = [r for r in _load_crm_mock().get("search_results", [])
                if q in str(r.get("title", "")).lower() or q in str(r.get("slug", "")).lower()]
        return {"results": mock, "mock": True}

    return {"results": normalised}


# ─── BEV Zones proxy (→ separate microservice) ───

BEV_API_TOKEN = os.environ.get("BEV_API_TOKEN", "")


def _bev_base_url() -> str:
    return os.environ.get("BEV_API_URL", "http://localhost:8001/api/v1").rstrip("/")


def _bev_headers() -> dict[str, str]:
    """Build headers for BEV microservice calls, with optional auth token."""
    h: dict[str, str] = {"Accept": "application/json"}
    if BEV_API_TOKEN:
        h["Authorization"] = f"Bearer {BEV_API_TOKEN}"
    return h


@router.get("/bev/zones")
async def list_bev_zones(
    name: str = Path(...),
    user: User = Depends(get_current_user),
) -> dict:
    """List BEV zones via the BEV microservice."""
    base = _bev_base_url()
    live_zones: list = []
    live_ok = False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{base}/zones", headers=_bev_headers())
            if resp.status_code < 400:
                data = resp.json()
                if isinstance(data, list):
                    live_zones = data
                    live_ok = True
                elif isinstance(data, dict) and "zones" in data:
                    live_zones = data["zones"]
                    live_ok = True
    except httpx.HTTPError as exc:
        logger.warning("BEV zones list error: %s", exc)

    if live_ok:
        return {"zones": live_zones}
    if _crm_mock_enabled():
        mock_zones = _load_crm_mock().get("bev_zones")
        if mock_zones:
            return {"zones": mock_zones, "mock": True}
    return {"zones": []}



class BevZoneBounds(BaseModel):
    """Validated bounding box for a BEV zone (Cartesian coordinates, metres)."""

    xMin: float = Field(default=0.0, description="Left edge (metres)")
    yMin: float = Field(default=0.0, description="Bottom edge (metres)")
    xMax: float = Field(description="Right edge — must be > xMin")
    yMax: float = Field(description="Top edge — must be > yMin")

    from pydantic import model_validator  # local import avoids top-level v1/v2 ambiguity

    @model_validator(mode="after")
    def _validate_bounds(self) -> "BevZoneBounds":
        if self.xMax <= self.xMin:
            raise ValueError("xMax must be greater than xMin")
        if self.yMax <= self.yMin:
            raise ValueError("yMax must be greater than yMin")
        return self


class BevZoneBody(BaseModel):
    name: str = Field(..., min_length=1, description="Zone name")
    calibrationType: str = "cartesian"
    cameraIds: list[str] = []
    bounds: Optional[BevZoneBounds] = None
    origin: Optional[dict] = None
    rois: list[dict] = []
    tripwires: list[dict] = []


@router.post("/bev/zones")
async def create_bev_zone(
    body: BevZoneBody,
    name: str = Path(...),
    user: User = Depends(require_admin),
) -> dict:
    """Create a BEV zone via the BEV microservice."""
    base = _bev_base_url()
    payload = body.model_dump() if hasattr(body, "model_dump") else body.dict()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base}/zones", json=payload, headers=_bev_headers())
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
            return resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"BEV service unavailable: {exc}")


@router.put("/bev/zones/{zone_id}")
async def update_bev_zone(
    body: BevZoneBody,
    name: str = Path(...),
    zone_id: str = Path(...),
    user: User = Depends(require_admin),
) -> dict:
    """Update a BEV zone via the BEV microservice."""
    base = _bev_base_url()
    payload = body.model_dump() if hasattr(body, "model_dump") else body.dict()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.put(f"{base}/zones/{_url_quote(zone_id, safe='')}", json=payload, headers=_bev_headers())
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
            return resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"BEV service unavailable: {exc}")


@router.delete("/bev/zones/{zone_id}")
async def delete_bev_zone(
    name: str = Path(...),
    zone_id: str = Path(...),
    user: User = Depends(require_admin),
) -> dict:
    """Delete a BEV zone via the BEV microservice."""
    base = _bev_base_url()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(f"{base}/zones/{_url_quote(zone_id, safe='')}", headers=_bev_headers())
            if resp.status_code >= 400 and resp.status_code != 204:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
            return {"ok": True}
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"BEV service unavailable: {exc}")


# ─── Finance aggregation helpers ───

def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val or 0)
    except (TypeError, ValueError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    try:
        return int(float(val or 0))
    except (TypeError, ValueError):
        return default


# ─── QBO live fetch helpers ──────────────────────────────────────────────
# These functions shell out to the accounting MCP bridge (acct-bridge.py)
# to fetch live QuickBooks Online data. Results are cached for 5 minutes
# to avoid hammering the QBO API on every dashboard refresh.
#
# Bridge protocol: JSON-RPC over stdio. One request per line on stdin,
# one response per line on stdout. Request shape:
#   {"jsonrpc": "2.0", "id": <int>, "method": "tools/call",
#    "params": {"name": "<tool>", "arguments": {...}}}
# Response shape:
#   {"jsonrpc": "2.0", "id": <int>, "content": [{"type": "text", "text": "<json>"}]}
#   (or {"isError": true, "content": [...]} on error)

_ACCT_BRIDGE = pathlib.Path.home() / ".hermes" / "scripts" / "accounting" / "acct-bridge.py"
_ACCT_ENV_FILE = pathlib.Path.home() / ".hermes" / "profiles" / "finance-manager" / ".env"
_QBO_CACHE: Dict[str, dict] = {}  # key -> {"data": ..., "ts": epoch}
_QBO_CACHE_TTL = 300  # 5 minutes

# Asset trend cache — historical data, doesn't change often (1 hour TTL)
_ASSET_TREND_CACHE: dict = {"data": [], "ts": 0}
_ASSET_TREND_TTL = 3600  # 1 hour


def _load_acct_env() -> dict:
    """Load ACCT_* vars from the finance-manager profile .env file."""
    env: Dict[str, str] = {}
    if not _ACCT_ENV_FILE.exists():
        logger.warning("QBO env file not found: %s", _ACCT_ENV_FILE)
        return env
    try:
        for line in _ACCT_ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key.startswith("ACCT_"):
                env[key] = val
    except Exception as e:
        logger.warning("Failed to load QBO env from %s: %s", _ACCT_ENV_FILE, e)
    return env


def _call_acct_bridge(tool: str, arguments: dict) -> dict:
    """Invoke the accounting bridge (JSON-RPC stdio) and return parsed result.

    Returns the dict payload from content[0].text on success, or
    {"error": ...} on any failure (bridge missing, non-zero exit, bad JSON,
    isError response). Never raises — callers can treat a failed fetch as
    "no live data" and fall back to snapshots/mock.
    """
    if not _ACCT_BRIDGE.exists():
        return {"error": f"bridge not found: {_ACCT_BRIDGE}"}

    env = {**dict(os.environ), **_load_acct_env()}
    # Ensure python executable is the venv python if available
    py = sys.executable

    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool, "arguments": arguments},
    }
    try:
        proc = subprocess.run(
            [py, str(_ACCT_BRIDGE)],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            env=env,
            timeout=45,
        )
    except subprocess.TimeoutExpired:
        return {"error": f"bridge timeout calling {tool}"}
    except Exception as e:
        return {"error": f"bridge invocation failed: {e}"}

    if proc.returncode != 0:
        # Bridge may emit stderr diagnostics; surface a short prefix
        stderr_tail = (proc.stderr or "")[-300:]
        return {"error": f"bridge exit {proc.returncode}: {stderr_tail}"}

    out = (proc.stdout or "").strip()
    if not out:
        return {"error": f"bridge produced no stdout for {tool}"}
    try:
        resp = json.loads(out.splitlines()[-1])
    except json.JSONDecodeError:
        return {"error": f"bridge returned non-JSON for {tool}"}

    if resp.get("isError"):
        try:
            err = json.loads(resp["content"][0]["text"])
            return {"error": err.get("error", "unknown bridge error")}
        except Exception:
            return {"error": "unknown bridge error"}

    content = resp.get("content") or []
    if not content:
        return {"error": f"bridge returned no content for {tool}"}
    try:
        return json.loads(content[0].get("text", "{}"))
    except json.JSONDecodeError:
        return {"error": f"bridge content not JSON for {tool}"}


def _fetch_qbo_balance_sheet(as_of_date: str | None = None) -> dict:
    """Fetch live QBO balance sheet. Cached for 5 min under key 'bs:<date>'."""
    today = as_of_date or datetime.now().strftime("%Y-%m-%d")
    cache_key = f"bs:{today}"
    cached = _QBO_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _QBO_CACHE_TTL:
        return cached["data"]

    args = {"as_of_date": today}
    result = _call_acct_bridge("acct_get_balance_sheet", args)
    if "error" in result:
        logger.info("QBO BS fetch failed: %s", result["error"])
    else:
        _QBO_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result


def _fetch_qbo_profit_loss(date_from: str, date_to: str) -> dict:
    """Fetch live QBO P&L for a date range. Cached for 5 min."""
    cache_key = f"pl:{date_from}:{date_to}"
    cached = _QBO_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _QBO_CACHE_TTL:
        return cached["data"]

    args = {"date_from": date_from, "date_to": date_to}
    result = _call_acct_bridge("acct_get_profit_loss", args)
    if "error" in result:
        logger.info("QBO PL fetch failed: %s", result["error"])
    else:
        _QBO_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result


def _fetch_qbo_ar_invoices() -> dict:
    """Fetch outstanding (status='ready') AR invoices from QBO. Cached 5 min."""
    cache_key = "ar:ready"
    cached = _QBO_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _QBO_CACHE_TTL:
        return cached["data"]

    args = {"status": "ready", "limit": 100}
    result = _call_acct_bridge("acct_list_sales_invoices", args)
    if "error" in result:
        logger.info("QBO AR fetch failed: %s", result["error"])
    else:
        _QBO_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result


def _fetch_qbo_ap_bills() -> dict:
    """Fetch outstanding (status='ready') AP bills from QBO. Cached 5 min."""
    cache_key = "ap:ready"
    cached = _QBO_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _QBO_CACHE_TTL:
        return cached["data"]

    args = {"status": "ready", "limit": 100}
    result = _call_acct_bridge("acct_list_purchase_bills", args)
    if "error" in result:
        logger.info("QBO AP fetch failed: %s", result["error"])
    else:
        _QBO_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result


# ─── Asset classification + sub-section mapping ─────────────────────────

# Keywords that mark an asset account as CURRENT (≤12 months). Order
# matters: earlier keywords are checked first. Keep lowercase.
_CURRENT_ASSET_KW = (
    "cash", "bank", "checking", "savings", "petty cash", "undeposited", "money market",
    "short-term deposit", "short term deposit", "term deposit", "receivable", "debtors",
    "accrued income", "staff advance", "staff advances", "advance to staff", "prepaid",
    "prepayment", "deposit paid", "deposits paid", "security deposit", "rental deposit",
    "utility deposit", "inventory", "inventories", "stock", "raw material",
    "raw materials", "work in progress", "work-in-progress", "wip", "finished goods",
    "stock in trade", "stock-in-trade", "accrued", "suspense", "gst", "tax receivable",
    "input tax", "refundable", "rebate", "marketable securities", "mutual fund",
    "unit trust", "gold bullion", "crypto",
)

# Keywords that mark an asset account as NON-CURRENT (>12 months).
_NON_CURRENT_ASSET_KW = (
    "property", "plant", "equipment", "ppe", "fixed asset", "motor vehicle",
    "vehicles", "vehicle", "furniture", "fixture", "office equipment",
    "computer hardware", "machinery", "renovation", "fit-out", "fitout",
    "fit out", "building", "land", "leasehold", "software license",
    "software licences", "capitalized software", "capitalised software",
    "intangible", "goodwill", "trademark", "patent", "copyright",
    "development cost", "brand", "deferred tax", "deferred charge",
    "long-term deposit", "long term deposit", "long-term investment",
    "long term investment", "investment", "deposit at call",
    "right-of-use", "right of use", "rou asset", "biological asset",
    "exploration", "oil", "gas",
)

# Map sub-category token → lucide icon name (must match AssetTab.tsx ICON_MAP).
_ASSET_ICON_MAP = {
    "cash": "Landmark",
    "bank": "Landmark",
    "checking": "Landmark",
    "savings": "Landmark",
    "petty cash": "Wallet",
    "receivable": "FileText",
    "debtors": "FileText",
    "accrued income": "FileText",
    "prepaid": "CalendarClock",
    "prepayment": "CalendarClock",
    "deposit": "CalendarClock",
    "inventory": "Package",
    "stock": "Package",
    "wip": "Package",
    "ppe": "Building2",
    "property": "Building2",
    "equipment": "Building2",
    "vehicle": "Building2",
    "depreciation": "TrendingDown",
    "accumulated depreciation": "TrendingDown",
    "intangible": "Brain",
    "goodwill": "Brain",
    "software": "Brain",
    "deferred tax": "ShieldCheck",
    "investment": "Layers",
    "other": "Wallet",
}

# Sub-category → display name mappings, in priority order. Each entry is
# (keyword_list, sub_category_name). The first matching entry wins.
_CURRENT_SUBCAT_MAP = [
    (["cash", "bank", "checking", "savings", "petty cash", "undeposited", "money market",
      "short-term", "short term", "term deposit"], "Cash and Cash Equivalents"),
    (["receivable", "debtors", "accrued income", "staff advance", "staff advances",
      "advance to staff", "security deposit", "other receivable"], "Trade and Other Receivables"),
    (["inventory", "inventories", "stock", "raw material", "raw materials",
      "work in progress", "work-in-progress", "wip", "finished goods",
      "stock in trade", "stock-in-trade"], "Inventories"),
    (["prepaid", "prepayment", "deposit paid", "deposits paid", "rental deposit",
      "utility deposit"], "Prepayments and Deposits"),
]

_NON_CURRENT_SUBCAT_MAP = [
    (["property", "plant", "equipment", "ppe", "fixed asset", "motor vehicle",
      "vehicles", "vehicle", "furniture", "fixture", "office equipment",
      "computer hardware", "machinery", "renovation", "fit-out", "fitout",
      "fit out", "building", "land", "leasehold", "right-of-use",
      "right of use", "rou asset"], "Property, Plant and Equipment"),
    (["accumulated depreciation", "depreciation"], "Accumulated Depreciation"),
    (["intangible", "goodwill", "trademark", "patent", "copyright",
      "development cost", "brand", "software license", "software licences",
      "capitalized software", "capitalised software"], "Intangible Assets"),
    (["deferred tax"], "Deferred Tax Assets"),
    (["investment", "long-term deposit", "long term deposit",
      "long-term investment", "long term investment", "deposit at call"], "Long-Term Investments"),
]

# Standard sub-section display names for each classification, used by
# _map_to_subsection when an account doesn't cleanly match a sub-category.
_CURRENT_SUBSECTIONS = {
    "Cash and Cash Equivalents": [],
    "Trade and Other Receivables": [],
    "Inventories": [],
    "Prepayments and Deposits": [],
}
_NON_CURRENT_SUBSECTIONS = {
    "Property, Plant and Equipment": [],
    "Accumulated Depreciation": [],
    "Intangible Assets": [],
    "Deferred Tax Assets": [],
    "Long-Term Investments": [],
}

# Map sub-section display name → lucide icon name. This is more reliable
# than guessing the icon from the first account in the bucket.
_SUBSECTION_ICON_MAP = {
    "Cash and Cash Equivalents": "Landmark",
    "Trade and Other Receivables": "FileText",
    "Inventories": "Package",
    "Prepayments and Deposits": "CalendarClock",
    "Property, Plant and Equipment": "Building2",
    "Accumulated Depreciation": "TrendingDown",
    "Intangible Assets": "Brain",
    "Deferred Tax Assets": "ShieldCheck",
    "Long-Term Investments": "Layers",
    "Other": "Wallet",
}


def _normalize_account_name(name: str) -> str:
    """Normalize an account name for keyword matching: lowercase, collapse
    whitespace, strip common punctuation."""
    if not name:
        return ""
    n = name.lower().strip()
    # Collapse runs of whitespace
    n = _re.sub(r"\s+", " ", n)
    # Strip common parenthetical suffixes e.g. "Bank A (USD)" -> "bank a"
    n = _re.sub(r"\s*\([^)]*\)\s*", " ", n).strip()
    return n


def _classify_asset(name: str) -> str:
    """Classify an asset account as 'current' or 'non_current'.

    Strategy:
      1. Normalize the name.
      2. Check non-current keywords first (more specific, e.g. 'land').
      3. Then check current keywords.
      4. Default to 'current' (most QBO asset accounts are current).
    """
    n = _normalize_account_name(name)
    if not n:
        return "current"

    # Non-current check first — specific keywords like 'accumulated
    # depreciation', 'motor vehicle', 'building' should win over generic
    # ones like 'deposit'.
    for kw in _NON_CURRENT_ASSET_KW:
        if kw in n:
            return "non_current"

    for kw in _CURRENT_ASSET_KW:
        if kw in n:
            return "current"

    # Default: current (conservative — most small-business asset accounts
    # without an obvious non-current keyword are current).
    return "current"


def _asset_icon(name: str) -> str:
    """Return a lucide icon name for an asset account. Falls back to 'Wallet'."""
    n = _normalize_account_name(name)
    if n:
        # Check accumulated depreciation first (longest keyword)
        if "depreciation" in n:
            return "TrendingDown"
        for kw, icon in _ASSET_ICON_MAP.items():
            if kw in n:
                return icon
    return "Wallet"


def _asset_subcategory(name: str, classification: str) -> str:
    """Return the sub-category display name for an asset account.

    Falls back to 'Other' if no keyword matches. The classification
    ('current' or 'non_current') selects which keyword map to use.
    """
    n = _normalize_account_name(name)
    if not n:
        return "Other"

    subcat_map = _CURRENT_SUBCAT_MAP if classification == "current" else _NON_CURRENT_SUBCAT_MAP
    for keywords, sub_name in subcat_map:
        for kw in keywords:
            if kw in n:
                return sub_name
    return "Other"


def _map_to_subsection(qbo_account_name: str, sub_sections: dict) -> str:
    """Map a QBO account name to a sub-section display name.

    Uses _asset_subcategory to find the standard sub-section, then ensures
    the account is appended to the right bucket in `sub_sections` (a dict
    of {subsection_name: [...accounts]}). Returns the sub-section name.
    """
    if not qbo_account_name:
        return "Other"

    # Decide classification from the name
    classification = _classify_asset(qbo_account_name)
    sub_name = _asset_subcategory(qbo_account_name, classification)
    if sub_name not in sub_sections:
        sub_sections[sub_name] = []
    return sub_name


def _match_qbo_actuals_to_budget(budget_items: List[dict], pl: dict) -> List[dict]:
    """Match QBO P&L actuals to BvA budget line items.

    For each budget item, find the matching QBO revenue/expense account by
    normalized-name substring match, then fill in `actual_ytd`,
    `variance`, and `variance_pct`. Budget fields are preserved.

    Each match is tagged with `match_confidence`:
      - "high": exact normalized name match
      - "medium": substring match (one name contains the other)
      - "low": keyword overlap only (may produce false positives)
      - "none": no match found, actual_ytd = 0
    """
    revenue_accts = pl.get("revenue_accounts", []) or []
    expense_accts = pl.get("expense_accounts", []) or []
    pl_accounts = revenue_accts + expense_accts

    out: List[dict] = []
    for item in budget_items:
        item_out = dict(item)
        acct_name = _normalize_account_name(item.get("account_name", ""))
        budget_ytd = _safe_float(item.get("budget_ytd", 0))
        actual_ytd = 0.0
        matched = None
        match_confidence = "none"

        # Try exact match first (highest confidence)
        for acct in pl_accounts:
            pl_name = _normalize_account_name(acct.get("account_name", ""))
            if pl_name and acct_name == pl_name:
                actual_ytd = _safe_float(acct.get("amount", 0))
                matched = acct
                match_confidence = "high"
                break

        # Try substring match (medium confidence)
        if matched is None:
            for acct in pl_accounts:
                pl_name = _normalize_account_name(acct.get("account_name", ""))
                if pl_name and (acct_name in pl_name or pl_name in acct_name):
                    actual_ytd = _safe_float(acct.get("amount", 0))
                    matched = acct
                    match_confidence = "medium"
                    break

        # If no substring match, try keyword overlap (low confidence — may
        # produce false positives like "Salaries" matching "Salaries Payable")
        if matched is None and acct_name:
            acct_words = {w for w in acct_name.split() if len(w) > 3}
            if acct_words:
                for acct in pl_accounts:
                    pl_name = _normalize_account_name(acct.get("account_name", ""))
                    pl_words = {w for w in pl_name.split() if len(w) > 3}
                    if acct_words & pl_words:
                        actual_ytd = _safe_float(acct.get("amount", 0))
                        matched = acct
                        match_confidence = "low"
                        break

        variance = actual_ytd - budget_ytd
        variance_pct = (variance / budget_ytd * 100.0) if budget_ytd else 0.0

        item_out["actual_ytd"] = actual_ytd
        item_out["variance"] = variance
        item_out["variance_pct"] = round(variance_pct, 1)
        item_out["match_confidence"] = match_confidence
        out.append(item_out)

    return out


async def _build_asset_trend_async() -> List[dict]:
    """Non-blocking asset trend with 1-hour cache.

    Runs _build_asset_trend in a thread pool so it doesn't freeze the
    FastAPI event loop. Cached for 1 hour (historical data).
    """
    if _ASSET_TREND_CACHE["data"] and (time.time() - _ASSET_TREND_CACHE["ts"]) < _ASSET_TREND_TTL:
        return _ASSET_TREND_CACHE["data"]
    trend = await asyncio.to_thread(_build_asset_trend)
    _ASSET_TREND_CACHE["data"] = trend
    _ASSET_TREND_CACHE["ts"] = time.time()
    return trend


def _build_asset_trend() -> List[dict]:
    """Build a 12-month asset trend (current vs non_current) from QBO BS.

    Fetches a balance sheet as-of the end of each of the last 12 months and
    classifies each account. Returns a list of
      {"month": "MMM", "current": float, "non_current": float}
    oldest-first. On any fetch failure, returns [] (caller falls back to
    mock/snapshot trend).
    """
    now = datetime.now()
    trend: List[dict] = []
    # Walk the last 12 months, oldest first
    for i in range(11, -1, -1):
        # First day of the month, i months ago
        month_dt = datetime(now.year, now.month, 1) - timedelta(days=1 + 31 * i)
        # Clamp to first of month
        month_start = datetime(month_dt.year, month_dt.month, 1)
        as_of = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        as_of_str = as_of.strftime("%Y-%m-%d")

        bs = _fetch_qbo_balance_sheet(as_of_str)
        if "error" in bs:
            return []  # bail — caller will use snapshot/mock trend

        current_total = 0.0
        non_current_total = 0.0
        for acct in bs.get("asset_accounts", []) or []:
            amt = _safe_float(acct.get("amount", 0))
            # Accumulated depreciation is non-current and negative — still
            # classify by name.
            cls = _classify_asset(acct.get("account_name", ""))
            if cls == "non_current":
                non_current_total += amt
            else:
                current_total += amt

        trend.append({
            "month": month_start.strftime("%b"),
            "current": round(current_total, 2),
            "non_current": round(non_current_total, 2),
        })

    return trend


def _build_live_assets(bs: dict) -> dict:
    """Group QBO balance-sheet accounts into current/non_current categories
    with sub-sections, matching the AssetCategory[] shape the frontend expects.

    Returns:
      {
        "currentAssets": [ {name, amount, icon, sub_items: [{name, amount}]} ],
        "nonCurrentAssets": [...],
        "totalCurrentAssets": float,
        "totalNonCurrentAssets": float,
        "totalAssets": float,
        "bankAccounts": [ {name, currency, balance, balance_myr} ],
      }
    """
    asset_accts = bs.get("asset_accounts", []) or []

    # Bucket accounts into standard sub-sections
    current_subs: Dict[str, List[dict]] = {k: [] for k in _CURRENT_SUBSECTIONS}
    non_current_subs: Dict[str, List[dict]] = {k: [] for k in _NON_CURRENT_SUBSECTIONS}

    bank_accounts: List[dict] = []
    current_total = 0.0
    non_current_total = 0.0

    for acct in asset_accts:
        raw_name = acct.get("account_name", "") or ""
        amount = _safe_float(acct.get("amount", 0))
        n = _normalize_account_name(raw_name)

        # Detect bank/cash accounts for the bankAccounts list
        if any(kw in n for kw in ("bank", "cash", "petty cash", "undeposited", "checking", "savings", "money market")):
            bank_accounts.append({
                "name": raw_name,
                "currency": "MYR",  # QBO sandbox default — refine if multi-currency
                "balance": amount,
                "balance_myr": amount,
            })

        classification = _classify_asset(raw_name)
        if classification == "non_current":
            non_current_total += amount
            sub_name = _asset_subcategory(raw_name, "non_current")
            if sub_name not in non_current_subs:
                non_current_subs[sub_name] = []
            non_current_subs[sub_name].append({"name": raw_name, "amount": amount})
        else:
            current_total += amount
            sub_name = _asset_subcategory(raw_name, "current")
            if sub_name not in current_subs:
                current_subs[sub_name] = []
            current_subs[sub_name].append({"name": raw_name, "amount": amount})

    # Build category lists — only include sub-sections that have at least
    # one account. Each category's `amount` is the sum of its sub_items.
    current_assets: List[dict] = []
    for sub_name, items in current_subs.items():
        if not items:
            continue
        total = sum(_safe_float(i.get("amount", 0)) for i in items)
        # Icon: prefer sub-section map, fall back to per-account heuristic
        icon = _SUBSECTION_ICON_MAP.get(sub_name) or (
            _asset_icon(items[0].get("name", "")) if items else "Wallet"
        )
        current_assets.append({
            "name": sub_name,
            "amount": round(total, 2),
            "icon": icon,
            "sub_items": items,
        })

    non_current_assets: List[dict] = []
    for sub_name, items in non_current_subs.items():
        if not items:
            continue
        total = sum(_safe_float(i.get("amount", 0)) for i in items)
        icon = _SUBSECTION_ICON_MAP.get(sub_name) or (
            _asset_icon(items[0].get("name", "")) if items else "Wallet"
        )
        non_current_assets.append({
            "name": sub_name,
            "amount": round(total, 2),
            "icon": icon,
            "sub_items": items,
        })

    return {
        "currentAssets": current_assets,
        "nonCurrentAssets": non_current_assets,
        "totalCurrentAssets": round(current_total, 2),
        "totalNonCurrentAssets": round(non_current_total, 2),
        "totalAssets": round(current_total + non_current_total, 2),
        "bankAccounts": bank_accounts,
    }


def _bucket_for_aging(days_overdue: int) -> str:
    """Map days-overdue to an aging bucket key: 0_30, 31_60, 61_90, 90_plus."""
    if days_overdue <= 30:
        return "0_30"
    elif days_overdue <= 60:
        return "31_60"
    elif days_overdue <= 90:
        return "61_90"
    return "90_plus"


def _build_aging_by_target(invoices_or_bills: List[dict], amount_field: str = "balance_due") -> List[dict]:
    """Build aging-by-days-past-due buckets from live QBO invoices/bills.

    Returns a list of {label, amount} for: 1-30 DPD, 31-60 DPD, 61-90 DPD, 90+ DPD.
    Only items with a positive balance AND a due_date in the past are counted.
    Used by the Cash Flow tab's AR/AP aging horizontal bar charts.
    """
    now = datetime.now()
    buckets = {
        "1-30 DPD": 0.0,
        "31-60 DPD": 0.0,
        "61-90 DPD": 0.0,
        "90+ DPD": 0.0,
    }
    for item in invoices_or_bills or []:
        due_str = item.get("due_date", "")
        balance = _safe_float(item.get(amount_field, item.get("total", 0)))
        if balance <= 0 or not due_str:
            continue
        try:
            due_dt = datetime.strptime(due_str[:10], "%Y-%m-%d")
        except (ValueError, TypeError):
            continue
        age_days = (now - due_dt).days
        if age_days <= 0:
            continue  # not yet past due
        if age_days <= 30:
            buckets["1-30 DPD"] += balance
        elif age_days <= 60:
            buckets["31-60 DPD"] += balance
        elif age_days <= 90:
            buckets["61-90 DPD"] += balance
        else:
            buckets["90+ DPD"] += balance
    return [{"label": label, "amount": round(amt, 2)} for label, amt in buckets.items()]


def _build_monthly_pl_trend(months: int = 6) -> List[dict]:
    """Build a monthly P&L trend (revenue, expenses, net_profit) for the last N months.

    Fetches P&L separately for each of the last N complete months (each 5-min cached).
    Returns oldest-first list of {month, revenue, expenses, net_profit}.
    On any fetch failure, returns [] (caller falls back to mock/snapshot trend).
    """
    now = datetime.now()
    trend: List[dict] = []
    # Walk the last N months, oldest first
    for i in range(months - 1, -1, -1):
        # First day of the month, i months ago
        if i == 0:
            month_dt = now.replace(day=1)
        else:
            # First day of (current month - i): go back i months
            year = now.year - ((now.month - i - 1) // 12)
            month = ((now.month - i - 1) % 12) + 1
            month_dt = datetime(year, month, 1)
        # Last day of that month
        if month_dt.month == 12:
            next_month_first = datetime(month_dt.year + 1, 1, 1)
        else:
            next_month_first = datetime(month_dt.year, month_dt.month + 1, 1)
        last_day = next_month_first - timedelta(days=1)
        date_from = month_dt.strftime("%Y-%m-%d")
        date_to = last_day.strftime("%Y-%m-%d")

        pl = _fetch_qbo_profit_loss(date_from, date_to)
        if "error" in pl:
            return []  # bail — caller will use mock/snapshot trend

        revenue = _safe_float(pl.get("total_revenue"))
        expenses = _safe_float(pl.get("total_expenses"))
        net_profit = _safe_float(pl.get("net_profit"))
        trend.append({
            "month": month_dt.strftime("%b %y"),
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "net_profit": round(net_profit, 2),
        })

    return trend


def _build_burn_trend(months: int = 6) -> List[dict]:
    """Build a monthly burn-rate trend for the last N months.

    Burn = total expenses for the month (from P&L). Returns oldest-first list
    of {month, burn}. On any fetch failure, returns [] (caller falls back to
    mock/snapshot). Reuses the 5-min P&L cache so it's cheap when combined
    with _build_monthly_pl_trend.
    """
    now = datetime.now()
    trend: List[dict] = []
    for i in range(months - 1, -1, -1):
        if i == 0:
            month_dt = now.replace(day=1)
        else:
            year = now.year - ((now.month - i - 1) // 12)
            month = ((now.month - i - 1) % 12) + 1
            month_dt = datetime(year, month, 1)
        if month_dt.month == 12:
            next_month_first = datetime(month_dt.year + 1, 1, 1)
        else:
            next_month_first = datetime(month_dt.year, month_dt.month + 1, 1)
        last_day = next_month_first - timedelta(days=1)
        date_from = month_dt.strftime("%Y-%m-%d")
        date_to = last_day.strftime("%Y-%m-%d")

        pl = _fetch_qbo_profit_loss(date_from, date_to)
        if "error" in pl:
            return []

        expenses = _safe_float(pl.get("total_expenses"))
        trend.append({
            "month": month_dt.strftime("%b %y"),
            "burn": round(expenses, 2),
        })

    return trend


def _build_cash_flow_forecast(months: int = 6) -> List[dict]:
    """Build a 6-month cash flow forecast with a central line + fan range.

    Each point has: {month, total, low, high} where:
      - total: central forecast (current liquid cash + projected net flow)
      - low: conservative (total * 0.85) — downside scenario
      - high: optimistic (total * 1.10) — upside scenario
    The fan is the area between low and high.

    Projected net flow per month is derived from the average of the last 6
    months' (revenue - expenses) from QBO P&L. If P&L fetch fails, falls back
    to a flat 3% growth from the current liquid cash.

    Returns oldest-first list starting from the current month.
    """
    now = datetime.now()
    # Current liquid cash — fetch live BS to get the starting point
    bs = _fetch_qbo_balance_sheet(now.strftime("%Y-%m-%d"))
    if "error" in bs:
        return []  # caller falls back to mock

    # Sum bank/cash accounts from the BS for the starting balance
    starting_cash = 0.0
    for acct in bs.get("asset_accounts", []) or []:
        n = _normalize_account_name(acct.get("account_name", ""))
        if any(kw in n for kw in ("bank", "cash", "petty cash", "undeposited")):
            starting_cash += _safe_float(acct.get("amount", 0))
    if starting_cash == 0:
        starting_cash = _safe_float(bs.get("total_assets", 0))

    # Projected monthly net flow = average of last 6 months (revenue - expenses)
    pl_trend = _build_monthly_pl_trend(6)
    if pl_trend:
        avg_net = sum(
            (p.get("revenue", 0) - p.get("expenses", 0)) for p in pl_trend
        ) / len(pl_trend)
    else:
        # Fallback: assume 3% monthly growth of starting cash
        avg_net = starting_cash * 0.03

    forecast: List[dict] = []
    cumulative = starting_cash
    for i in range(months):
        if i == 0:
            month_dt = now.replace(day=1)
        else:
            year = now.year + ((now.month + i - 1) // 12)
            month = ((now.month + i - 1) % 12) + 1
            month_dt = datetime(year, month, 1)
        cumulative += avg_net
        forecast.append({
            "month": month_dt.strftime("%b %y"),
            "total": round(cumulative, 2),
            "low": round(cumulative * 0.85, 2),
            "high": round(cumulative * 1.10, 2),
        })

    return forecast


def _build_cash_flow_breakdown(pl_ytd: dict, pl_mtd: dict) -> dict:
    """Build cash flow breakdown by P&L account for the Cash Flow tab.

    Groups QBO P&L revenue/expense accounts into per-category actuals (YTD +
    MTD) with percentage of total. All data comes from live QBO P&L — no
    Excel budget.

    Returns:
      {
        "income": [{category, actual_ytd, actual_mtd, pct_of_total}],
        "expenses": [{category, actual_ytd, actual_mtd, pct_of_total}],
        "income_total_ytd": float, "income_total_mtd": float,
        "expense_total_ytd": float, "expense_total_mtd": float,
      }
    """
    income_total_ytd = _safe_float(pl_ytd.get("total_revenue"))
    expense_total_ytd = _safe_float(pl_ytd.get("total_expenses"))
    income_total_mtd = _safe_float(pl_mtd.get("total_revenue"))
    expense_total_mtd = _safe_float(pl_mtd.get("total_expenses"))

    # Build MTD lookup by normalized account name (for matching YTD→MTD)
    mtd_rev_lookup: Dict[str, float] = {}
    for acct in pl_mtd.get("revenue_accounts", []) or []:
        n = _normalize_account_name(acct.get("account_name", ""))
        mtd_rev_lookup[n] = mtd_rev_lookup.get(n, 0) + _safe_float(acct.get("amount", 0))

    mtd_exp_lookup: Dict[str, float] = {}
    for acct in pl_mtd.get("expense_accounts", []) or []:
        n = _normalize_account_name(acct.get("account_name", ""))
        mtd_exp_lookup[n] = mtd_exp_lookup.get(n, 0) + _safe_float(acct.get("amount", 0))

    income: List[dict] = []
    for acct in pl_ytd.get("revenue_accounts", []) or []:
        name = acct.get("account_name", "")
        amt_ytd = _safe_float(acct.get("amount", 0))
        n = _normalize_account_name(name)
        amt_mtd = mtd_rev_lookup.get(n, 0)
        pct = (amt_ytd / income_total_ytd * 100.0) if income_total_ytd else 0.0
        income.append({
            "category": name,
            "actual_ytd": round(amt_ytd, 2),
            "actual_mtd": round(amt_mtd, 2),
            "pct_of_total": round(pct, 1),
        })

    expenses: List[dict] = []
    for acct in pl_ytd.get("expense_accounts", []) or []:
        name = acct.get("account_name", "")
        amt_ytd = _safe_float(acct.get("amount", 0))
        n = _normalize_account_name(name)
        amt_mtd = mtd_exp_lookup.get(n, 0)
        pct = (amt_ytd / expense_total_ytd * 100.0) if expense_total_ytd else 0.0
        expenses.append({
            "category": name,
            "actual_ytd": round(amt_ytd, 2),
            "actual_mtd": round(amt_mtd, 2),
            "pct_of_total": round(pct, 1),
        })

    return {
        "income": income,
        "expenses": expenses,
        "income_total_ytd": round(income_total_ytd, 2),
        "income_total_mtd": round(income_total_mtd, 2),
        "expense_total_ytd": round(expense_total_ytd, 2),
        "expense_total_mtd": round(expense_total_mtd, 2),
    }


async def _run_finance_aggregation(pages: List[dict]) -> dict:
    """Aggregate gbrain finance pages into structured dashboard stats.

    Data source: gbrain snapshots only. When no snapshots are available,
    returns an empty-state payload (zeros + empty lists) so the UI shows
    "no data yet" — does NOT load mock/example data.
    """
    now = _now()
    cy, cm = now.year, now.month

    # ── Pull snapshot pages (finance agent writes these) ──
    snapshot_map: Dict[str, dict] = {}
    for p in pages:
        slug = str(p.get("slug", ""))
        fm = _parse_frontmatter(p.get("frontmatter", {}))
        if not fm:
            try:
                body = p.get("content") or p.get("body") or ""
                fm = json.loads(body) if body else {}
            except (json.JSONDecodeError, TypeError):
                fm = {}
        if fm:
            snapshot_map[slug] = fm

    # Check if we have real snapshot data
    cash_snap = snapshot_map.get("snapshots/cash", snapshot_map.get("finance/snapshots/cash", {}))
    pl_snap = snapshot_map.get("snapshots/pl", snapshot_map.get("finance/snapshots/pl", {}))
    has_real_data = bool(cash_snap or pl_snap)

    # ── Fetch live QBO data (5-min cache) ──
    today_str = now.strftime("%Y-%m-%d")
    ytd_start = f"{cy}-01-01"
    mtd_start = f"{cy}-{cm:02d}-01"
    live_bs = _fetch_qbo_balance_sheet(today_str)
    live_pl_ytd = _fetch_qbo_profit_loss(ytd_start, today_str)
    live_pl_mtd = _fetch_qbo_profit_loss(mtd_start, today_str)
    has_live_qbo = ("error" not in live_bs
                    and "error" not in live_pl_ytd
                    and "error" not in live_pl_mtd)

    # Default asset + overview fields (overridden by live/snapshot/mock branches)
    current_assets: List[dict] = []
    non_current_assets: List[dict] = []
    total_current_assets = 0.0
    total_non_current_assets = 0.0
    total_assets_val = 0.0
    asset_trend: List[dict] = []
    total_liabilities = 0.0
    total_equity = 0.0
    debt_to_equity = 0.0
    equity_ratio = 0.0
    ar_to_ap_coverage = 0.0
    net_working_capital = 0.0
    gross_working_capital = 0.0
    gross_profit_margin = 0.0
    total_current_liabilities = 0.0
    ap_aging_by_target: List[dict] = []
    monthly_pl_trend: List[dict] = []
    bva_line_items: List[dict] = []
    ar_aging_by_target: List[dict] = []
    cash_flow_forecast: List[dict] = []
    burn_trend: List[dict] = []
    cash_flow_breakdown: dict = {}
    dunning_queue: List[dict] = []
    ar_invoices_list: List[dict] = []

    if has_live_qbo:
        # ── LIVE QBO DATA — primary path ──
        mock = False  # live data, not mock
        # Assets + bank accounts from live BS via _build_live_assets
        live_assets = _build_live_assets(live_bs)
        current_assets = live_assets["currentAssets"]
        non_current_assets = live_assets["nonCurrentAssets"]
        total_current_assets = live_assets["totalCurrentAssets"]
        total_non_current_assets = live_assets["totalNonCurrentAssets"]
        total_assets_val = live_assets["totalAssets"]
        bank_accounts: List[dict] = live_assets["bankAccounts"]
        asset_trend = await _build_asset_trend_async()  # may be [] on fetch failure

        # Cash: sum of bank/cash accounts from live BS
        total_liquid_cash = sum(
            _safe_float(b.get("balance_myr", b.get("balance", 0))) for b in bank_accounts
        )
        if total_liquid_cash == 0:
            total_liquid_cash = _safe_float(live_bs.get("total_assets", 0))

        # Revenue/expenses from live PL
        revenue_mtd = _safe_float(live_pl_mtd.get("total_revenue"))
        revenue_ytd = _safe_float(live_pl_ytd.get("total_revenue"))
        total_expenses_ytd = _safe_float(live_pl_ytd.get("total_expenses"))
        net_profit_ytd = _safe_float(live_pl_ytd.get("net_profit"))

        # Margins (rough proxies from PL)
        gross_margin = ((revenue_ytd - total_expenses_ytd) / revenue_ytd * 100.0) if revenue_ytd else 0.0
        ebitda_margin = (net_profit_ytd / revenue_ytd * 100.0) if revenue_ytd else 0.0
        gross_profit_margin = gross_margin

        # Burn rate + runway
        months_elapsed = cm
        net_monthly_burn = (total_expenses_ytd / months_elapsed) if months_elapsed > 0 else 0.0
        cash_runway_months = (total_liquid_cash / net_monthly_burn) if net_monthly_burn > 0 else 0.0

        if cash_runway_months == 0:
            runway_status = "unknown"
        elif cash_runway_months < 3:
            runway_status = "critical"
        elif cash_runway_months < 6:
            runway_status = "caution"
        else:
            runway_status = "healthy"

        unpaid_statutory = 0.0

        # Balance sheet overview KPIs from live BS
        total_liabilities = _safe_float(live_bs.get("total_liabilities"))
        total_equity = _safe_float(live_bs.get("total_equity"))
        total_assets_bs = _safe_float(live_bs.get("total_assets"))
        debt_to_equity = (total_liabilities / total_equity) if total_equity else 0.0
        equity_ratio = (total_equity / total_assets_bs) if total_assets_bs else 0.0
        gross_working_capital = total_current_assets
        total_current_liabilities = 0.0  # QBO bridge doesn't split current/non-current liabilities
        net_working_capital = total_current_assets - total_current_liabilities

        # AR/AP from live QBO invoices/bills
        ar_data = _fetch_qbo_ar_invoices()
        ap_data = _fetch_qbo_ap_bills()
        ar_invoices = ar_data.get("invoices", []) if "error" not in ar_data else []
        ap_bills_list = ap_data.get("bills", []) if "error" not in ap_data else []
        total_ar = sum(_safe_float(inv.get("balance_due", inv.get("total", 0))) for inv in ar_invoices)
        total_ap = sum(_safe_float(bill.get("balance_due", bill.get("total", 0))) for bill in ap_bills_list)
        ar_to_ap_coverage = (total_ar / total_ap) if total_ap else 0.0

        # AR aging from invoice due dates
        ar_overdue_30 = 0.0
        ar_aging = {"bucket_0_30": 0.0, "bucket_31_60": 0.0, "bucket_61_90": 0.0, "bucket_90_plus": 0.0}
        dunning_queue: List[dict] = []
        ar_invoices_list: List[dict] = []  # all outstanding invoices tagged with bucket, for popout
        for inv in ar_invoices:
            due_str = inv.get("due_date", "")
            balance = _safe_float(inv.get("balance_due", 0))
            if balance <= 0 or not due_str:
                continue
            try:
                due_dt = datetime.strptime(due_str[:10], "%Y-%m-%d")
                age_days = (now - due_dt).days
            except (ValueError, TypeError):
                age_days = 0
            if age_days <= 30:
                bucket = "0-30"
                ar_aging["bucket_0_30"] += balance
            elif age_days <= 60:
                bucket = "31-60"
                ar_aging["bucket_31_60"] += balance
            elif age_days <= 90:
                bucket = "61-90"
                ar_aging["bucket_61_90"] += balance
            else:
                bucket = "90+"
                ar_aging["bucket_90_plus"] += balance
                ar_overdue_30 += balance
                dunning_queue.append({
                    "invoice_no": inv.get("number", ""),
                    "customer": inv.get("contact_name", ""),
                    "due_date": due_str,
                    "amount": balance,
                    "aging_days": age_days,
                    "bucket": "90+",
                    "dunning_status": "Overdue",
                })
            # Build the popout entry for every outstanding invoice
            ar_invoices_list.append({
                "invoice_no": inv.get("number", ""),
                "customer": inv.get("contact_name", ""),
                "due_date": due_str,
                "amount": balance,
                "aging_days": max(0, age_days),
                "bucket": bucket,
                "dunning_status": "Overdue" if age_days > 0 else "Current",
            })

        dso = 0.0
        dpo = 0.0
        ap_overdue = 0.0

        # Format AP bills for frontend
        ap_bills = []
        for bill in ap_bills_list:
            ap_bills.append({
                "bill_no": bill.get("number", ""),
                "vendor": bill.get("contact_name", ""),
                "due_date": bill.get("due_date", ""),
                "amount": _safe_float(bill.get("balance_due", bill.get("total", 0))),
                "match_status": "Matched",
                "approval_status": "Pending",
            })

        # Cash Flow tab — live QBO-derived series
        # AR/AP aging-by-target (1-30/31-60/61-90/90+ DPD) from invoices/bills
        ar_aging_by_target = _build_aging_by_target(ar_invoices)
        ap_aging_by_target = _build_aging_by_target(ap_bills_list)
        # 6-month P&L trend (revenue/expenses/net_profit) — each month cached
        monthly_pl_trend = _build_monthly_pl_trend(6)
        # Monthly burn trend (expenses per month) — reuses P&L cache
        burn_trend = _build_burn_trend(6)
        # 6-month cash flow forecast with fan range (total/low/high)
        cash_flow_forecast = _build_cash_flow_forecast(6)
        # Cash flow breakdown by P&L account (income + expenses, YTD + MTD)
        cash_flow_breakdown = _build_cash_flow_breakdown(live_pl_ytd, live_pl_mtd)

        # fx_positions, forecast_13w, fixed/variable opex: not available from QBO
        fx_positions: List[dict] = []
        forecast_13w = {"conservative": [], "expected": [], "optimistic": []}
        fixed_opex = 0.0
        variable_opex = 0.0

        # Risk alerts from live data
        risk_alerts: List[dict] = []
        if net_working_capital < 0:
            risk_alerts.append({
                "type": "working_capital",
                "level": "critical",
                "message": f"Negative working capital: RM {net_working_capital:,.0f}",
            })
        if ar_aging["bucket_90_plus"] > 0:
            risk_alerts.append({
                "type": "ar_overdue",
                "level": "critical" if ar_aging["bucket_90_plus"] > 50000 else "warning",
                "message": f"RM {ar_aging['bucket_90_plus']:,.0f} in receivables overdue >90 days",
            })

        # Trends: use mock if available, else empty
        revenue_opex_trend: List[dict] = []
        cash_flow_trend: List[dict] = []

        # BvA: load budget items from mock JSON, match QBO actuals
        # NOTE: budget items are real (from Budget Excel), but unit economics,
        # client concentration, and compliance are fabricated demo data.
        json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "finance-budget.json"
        mock_data = {}
        mock = True  # BvA/concentration/compliance loaded from demo JSON
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    mock_data = json.load(f).get("dashboard_mock", {})
            except Exception as e:
                logger.warning("Failed to load mock data for BvA budgets: %s", e)
        budget_items = mock_data.get("bvaLineItems", [])
        bva_line_items = _match_qbo_actuals_to_budget(budget_items, live_pl_ytd)
        bva_departments: List[dict] = bva_line_items  # alias for backward compat

        # Unit economics, concentration, compliance: from mock/snapshot
        unit_economics: dict = mock_data.get("unitEconomics", {
            "gross_margin_pct": gross_margin, "contribution_margin_pct": 0,
            "cac": 0, "ltv": 0, "ltv_cac_ratio": 0})
        raw_client_concentration: List[dict] = mock_data.get("clientConcentration", [])
        # Compute revenue_pct from revenue_ytd relative to total YTD revenue
        total_client_revenue = sum(_safe_float(c.get("revenue_ytd", 0)) for c in raw_client_concentration)
        if total_client_revenue > 0 and revenue_ytd > 0:
            client_concentration: List[dict] = [
                {**c, "revenue_pct": round((_safe_float(c.get("revenue_ytd", 0)) / revenue_ytd * 100), 1)}
                for c in raw_client_concentration
            ]
        else:
            client_concentration = raw_client_concentration
        close_checklist: List[dict] = mock_data.get("closeChecklist", [])
        statutory_schedule: List[dict] = mock_data.get("statutorySchedule", [])
        sst_readiness: dict = mock_data.get("sstReadiness", {
            "draft_status": "Not Started", "taxable_sales": 0, "sst_liability": 0})
        cp58_register: List[dict] = mock_data.get("cp58Register", [])
        wht_queue: List[dict] = mock_data.get("whtQueue", [])
        expense_claim_audit: List[dict] = mock_data.get("expenseClaimAudit", [])

    elif has_real_data:
        mock = False  # gbrain snapshot data, not mock
        total_liquid_cash = _safe_float(cash_snap.get("total_liquid_cash"))
        net_monthly_burn = _safe_float(cash_snap.get("net_monthly_burn"))
        cash_runway_months = _safe_float(cash_snap.get("cash_runway_months", 0))
        revenue_mtd = _safe_float(pl_snap.get("revenue_mtd"))
        revenue_ytd = _safe_float(pl_snap.get("revenue_ytd"))
        gross_margin = _safe_float(pl_snap.get("gross_margin_pct"))
        ebitda_margin = _safe_float(pl_snap.get("ebitda_margin_pct"))
        unpaid_statutory = _safe_float(pl_snap.get("unpaid_statutory"))

        revenue_opex_trend: List[dict] = pl_snap.get("revenue_opex_trend", [])
        cash_flow_trend: List[dict] = cash_snap.get("cash_flow_trend", [])

        risk_alerts: List[dict] = []
        concentration_snap = snapshot_map.get("snapshots/concentration", snapshot_map.get("finance/snapshots/concentration", {}))
        for client in concentration_snap.get("clients", []):
            pct = _safe_float(client.get("revenue_pct"))
            if pct > 20:
                risk_alerts.append({
                    "type": "concentration",
                    "level": "warning",
                    "message": f"{client.get('name', 'Unknown')} represents {pct:.1f}% of YTD revenue",
                })

        bva_snap = snapshot_map.get("snapshots/bva", snapshot_map.get("finance/snapshots/bva", {}))
        for dept_line in bva_snap.get("departments", []):
            var_pct = _safe_float(dept_line.get("variance_pct"))
            if var_pct > 10:
                risk_alerts.append({
                    "type": "overrun",
                    "level": "warning",
                    "message": f"{dept_line.get('department', 'Unknown')} is {var_pct:.1f}% over OPEX budget",
                })

        ar_snap = snapshot_map.get("snapshots/ar", snapshot_map.get("finance/snapshots/ar", {}))
        overdue_90 = _safe_float(ar_snap.get("bucket_90_plus"))
        if overdue_90 > 0:
            risk_alerts.append({
                "type": "ar_overdue",
                "level": "critical" if overdue_90 > 50000 else "warning",
                "message": f"RM {overdue_90:,.0f} in receivables overdue >90 days",
            })

        if cash_runway_months == 0:
            runway_status = "unknown"
        elif cash_runway_months < 3:
            runway_status = "critical"
        elif cash_runway_months < 6:
            runway_status = "caution"
        else:
            runway_status = "healthy"

        bank_accounts: List[dict] = cash_snap.get("bank_accounts", [])
        fx_positions: List[dict] = cash_snap.get("fx_positions", [])
        forecast_13w: dict = cash_snap.get("forecast_13w", {"conservative": [], "expected": [], "optimistic": []})
        fixed_opex = _safe_float(cash_snap.get("fixed_opex"))
        variable_opex = _safe_float(cash_snap.get("variable_opex"))

        total_ar = _safe_float(ar_snap.get("total_ar"))
        ar_overdue_30 = _safe_float(ar_snap.get("bucket_31_60")) + _safe_float(ar_snap.get("bucket_61_90")) + _safe_float(ar_snap.get("bucket_90_plus"))
        dso = _safe_float(ar_snap.get("dso"))
        ar_aging = {
            "bucket_0_30": _safe_float(ar_snap.get("bucket_0_30")),
            "bucket_31_60": _safe_float(ar_snap.get("bucket_31_60")),
            "bucket_61_90": _safe_float(ar_snap.get("bucket_61_90")),
            "bucket_90_plus": _safe_float(ar_snap.get("bucket_90_plus")),
        }
        dunning_queue: List[dict] = ar_snap.get("dunning_queue", [])
        ar_invoices_list: List[dict] = ar_snap.get("ar_invoices", ar_snap.get("dunning_queue", []))

        ap_snap = snapshot_map.get("snapshots/ap", snapshot_map.get("finance/snapshots/ap", {}))
        total_ap = _safe_float(ap_snap.get("total_ap"))
        ap_overdue = _safe_float(ap_snap.get("ap_overdue"))
        dpo = _safe_float(ap_snap.get("dpo"))
        ap_bills: List[dict] = ap_snap.get("bills", [])

        bva_departments: List[dict] = bva_snap.get("departments", [])
        unit_economics: dict = bva_snap.get("unit_economics", {"gross_margin_pct": gross_margin, "contribution_margin_pct": 0, "cac": 0, "ltv": 0, "ltv_cac_ratio": 0})
        client_concentration: List[dict] = concentration_snap.get("clients", [])

        compliance_snap = snapshot_map.get("snapshots/compliance", snapshot_map.get("finance/snapshots/compliance", {}))
        close_checklist: List[dict] = compliance_snap.get("close_checklist", [])
        statutory_schedule: List[dict] = compliance_snap.get("statutory_schedule", [])
        sst_readiness: dict = compliance_snap.get("sst_readiness", {"draft_status": "Not Started", "taxable_sales": 0, "sst_liability": 0})
        cp58_register: List[dict] = compliance_snap.get("cp58_register", [])
        wht_queue: List[dict] = compliance_snap.get("wht_queue", [])
        expense_claim_audit: List[dict] = compliance_snap.get("expense_claim_audit", [])

        # Asset fields + overview KPIs from snapshots (best-effort)
        bs_snap = snapshot_map.get("snapshots/balance-sheet", snapshot_map.get("finance/snapshots/balance-sheet", {}))
        current_assets = bs_snap.get("current_assets", [])
        non_current_assets = bs_snap.get("non_current_assets", [])
        total_current_assets = _safe_float(bs_snap.get("total_current_assets"))
        total_non_current_assets = _safe_float(bs_snap.get("total_non_current_assets"))
        total_assets_val = _safe_float(bs_snap.get("total_assets"))
        asset_trend = bs_snap.get("asset_trend", [])
        bva_line_items = bva_snap.get("line_items", [])
        total_liabilities = _safe_float(bs_snap.get("total_liabilities"))
        total_equity = _safe_float(bs_snap.get("total_equity"))
        debt_to_equity = (total_liabilities / total_equity) if total_equity else 0.0
        equity_ratio = (total_equity / total_assets_val) if total_assets_val else 0.0
        ar_to_ap_coverage = (total_ar / total_ap) if total_ap else 0.0
        net_working_capital = total_current_assets
        gross_working_capital = total_current_assets
        gross_profit_margin = gross_margin
        total_current_liabilities = _safe_float(bs_snap.get("total_current_liabilities"))
        ap_aging_by_target = ap_snap.get("aging_by_target", [])
        monthly_pl_trend = pl_snap.get("monthly_pl_trend", [])
        ar_aging_by_target = ar_snap.get("aging_by_target", [])
        cash_flow_forecast = cash_snap.get("cash_flow_forecast", [])
        burn_trend = cash_snap.get("burn_trend", [])
        cash_flow_breakdown = cash_snap.get("cash_flow_breakdown", {})
    else:
        # No snapshot data available — return empty-state, not fabricated mock data.
        # The UI shows "no data yet / connect gbrain" rather than fake RM figures.
        logger.info("Finance dashboard: no gbrain snapshots — returning empty state")
        mock = False  # empty state, not mock
        mock_data: Dict[str, Any] = {}
        total_liquid_cash = 0.0
        net_monthly_burn = 0.0
        cash_runway_months = 0.0
        runway_status = "unknown"
        revenue_mtd = 0.0
        revenue_ytd = 0.0
        gross_margin = 0.0
        ebitda_margin = 0.0
        unpaid_statutory = 0.0

        risk_alerts: List[dict] = []
        revenue_opex_trend: List[dict] = []
        cash_flow_trend: List[dict] = []

        bank_accounts: List[dict] = []
        fx_positions: List[dict] = []
        fixed_opex = 0.0
        variable_opex = 0.0
        forecast_13w = {"expected": [], "conservative": [], "optimistic": []}

        total_ar = 0.0
        ar_overdue_30 = 0.0
        dso = 0.0
        total_ap = 0.0
        ap_overdue = 0.0
        dpo = 0.0

        ar_aging = {"bucket_0_30": 0.0, "bucket_31_60": 0.0, "bucket_61_90": 0.0, "bucket_90_plus": 0.0}
        dunning_queue: List[dict] = []
        ap_bills: List[dict] = []

        bva_departments: List[dict] = []
        unit_economics = {"gross_margin_pct": 0.0, "contribution_margin_pct": 0.0, "cac": 0.0, "ltv": 0.0, "ltv_cac_ratio": 0.0}
        client_concentration: List[dict] = []
        ar_invoices_list: List[dict] = []

        close_checklist: List[dict] = []
        statutory_schedule: List[dict] = []
        sst_readiness = {"draft_status": "Not Started", "taxable_sales": 0.0, "sst_liability": 0.0}
        cp58_register: List[dict] = []
        wht_queue: List[dict] = []
        expense_claim_audit: List[dict] = []

        # Asset fields + overview KPIs from mock
        current_assets = mock_data.get("currentAssets", [])
        non_current_assets = mock_data.get("nonCurrentAssets", [])
        total_current_assets = _safe_float(mock_data.get("totalCurrentAssets", 0))
        total_non_current_assets = _safe_float(mock_data.get("totalNonCurrentAssets", 0))
        total_assets_val = _safe_float(mock_data.get("totalAssets", 0))
        asset_trend = mock_data.get("assetTrend", [])
        bva_line_items = mock_data.get("bvaLineItems", [])
        total_liabilities = _safe_float(mock_data.get("totalLiabilities", 0))
        total_equity = _safe_float(mock_data.get("totalEquity", 0))
        debt_to_equity = (total_liabilities / total_equity) if total_equity else 0.0
        equity_ratio = (total_equity / total_assets_val) if total_assets_val else 0.0
        ar_to_ap_coverage = (total_ar / total_ap) if total_ap else 0.0
        net_working_capital = total_current_assets  # mock doesn't split current liab
        gross_working_capital = total_current_assets
        gross_profit_margin = gross_margin
        total_current_liabilities = 0.0
        ap_aging_by_target = mock_data.get("apAgingByTarget", [])
        monthly_pl_trend = mock_data.get("monthlyPlTrend", [])
        ar_aging_by_target = mock_data.get("arAgingByTarget", [])
        cash_flow_forecast = mock_data.get("cashFlowForecast", [])
        burn_trend = mock_data.get("burnTrend", [])
        cash_flow_breakdown = mock_data.get("cashFlowBreakdown", {})

    return {
        # Mock flag — true when data loaded from examples/*.json (demo mode)
        "mock": mock,
        # Tab 1 — Executive Pulse
        "totalLiquidCash": total_liquid_cash,
        "netMonthlyBurn": net_monthly_burn,
        "cashRunwayMonths": cash_runway_months,
        "runwayStatus": runway_status,
        "revenueMTD": revenue_mtd,
        "revenueYTD": revenue_ytd,
        "grossMargin": gross_margin,
        "ebitdaMargin": ebitda_margin,
        "unpaidStatutory": unpaid_statutory,
        "riskAlerts": risk_alerts,
        "revenueOpexTrend": revenue_opex_trend,
        "cashFlowTrend": cash_flow_trend,
        # Overview tab — QBO-live KPIs
        "totalLiabilities": total_liabilities,
        "totalEquity": total_equity,
        "debtToEquity": debt_to_equity,
        "equityRatio": equity_ratio,
        "arToApCoverage": ar_to_ap_coverage,
        "netWorkingCapital": net_working_capital,
        "grossWorkingCapital": gross_working_capital,
        "grossProfitMargin": gross_profit_margin,
        "totalCurrentLiabilities": total_current_liabilities,
        "apAgingByTarget": ap_aging_by_target,
        "monthlyPlTrend": monthly_pl_trend,
        # Cash Flow tab
        "arAgingByTarget": ar_aging_by_target,
        "cashFlowForecast": cash_flow_forecast,
        "burnTrend": burn_trend,
        "cashFlowBreakdown": cash_flow_breakdown,
        # Tab 2 — Cash & Runway
        "bankAccounts": bank_accounts,
        "fxPositions": fx_positions,
        "forecast13w": forecast_13w,
        "fixedOpex": fixed_opex,
        "variableOpex": variable_opex,
        # Asset tab
        "currentAssets": current_assets,
        "nonCurrentAssets": non_current_assets,
        "assetTrend": asset_trend,
        "totalCurrentAssets": total_current_assets,
        "totalNonCurrentAssets": total_non_current_assets,
        "totalAssets": total_assets_val,
        # Tab 3 — AR & AP
        "totalAR": total_ar,
        "arOverdue30": ar_overdue_30,
        "dso": dso,
        "totalAP": total_ap,
        "apOverdue": ap_overdue,
        "dpo": dpo,
        "arAging": ar_aging,
        "dunningQueue": dunning_queue,
        "arInvoices": ar_invoices_list,
        "apBills": ap_bills,
        # Tab 4 — BvA & Unit Economics
        "bvaDepartments": bva_departments,
        "bvaLineItems": bva_line_items,
        "unitEconomics": unit_economics,
        "clientConcentration": client_concentration,
        # Tab 5 — Close & Tax
        "closeChecklist": close_checklist,
        "statutorySchedule": statutory_schedule,
        "sstReadiness": sst_readiness,
        "cp58Register": cp58_register,
        "whtQueue": wht_queue,
        "expenseClaimAudit": expense_claim_audit,
    }


@router.get("/finance-stats")
async def get_finance_stats(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated Finance dashboard stats — all 5 tabs."""
    pages = await _fetch_brain_pages_safe("finance", limit=300, slug_prefix="")
    return await _run_finance_aggregation(pages)


# ─── Procurement aggregation helpers ───


def _run_procurement_aggregation(pages: List[dict]) -> dict:
    """Aggregate gbrain procurement pages into structured dashboard stats.
    Supplies rich demo mock data when gbrain snapshots are empty so users can view all 5 tabs immediately.
    """
    # ── Pull snapshot pages (procurement agent writes these) ──
    snapshot_map: Dict[str, dict] = {}
    for p in pages:
        slug = str(p.get("slug", ""))
        fm = _parse_frontmatter(p.get("frontmatter", {}))
        if not fm:
            try:
                body = p.get("content") or p.get("body") or ""
                fm = json.loads(body) if body else {}
            except (json.JSONDecodeError, TypeError):
                fm = {}
        if fm:
            snapshot_map[slug] = fm

    inventory_snap = snapshot_map.get("snapshots/inventory", snapshot_map.get("procurement/snapshots/inventory", {}))
    po_snap = snapshot_map.get("snapshots/purchase-orders", snapshot_map.get("procurement/snapshots/purchase-orders", {}))
    vendor_snap = snapshot_map.get("snapshots/vendors", snapshot_map.get("procurement/snapshots/vendors", {}))
    movement_snap = snapshot_map.get("snapshots/stock-movements", snapshot_map.get("procurement/snapshots/stock-movements", {}))
    bridge_snap = snapshot_map.get("snapshots/accounting-bridge", snapshot_map.get("procurement/snapshots/accounting-bridge", {}))

    has_real_data = bool(inventory_snap or po_snap)

    if has_real_data:
        # Pull from the live gbrain snapshots written by dashboard-snapshot-writer
        total_inventory_valuation = _safe_float(inventory_snap.get("total_inventory_valuation"))
        total_active_skus = _safe_float(inventory_snap.get("total_active_skus"))
        low_stock_alerts = _safe_float(inventory_snap.get("low_stock_alerts"))
        dead_slow_stock_capital = _safe_float(inventory_snap.get("dead_slow_stock_capital"))
        valuation_by_category: List[dict] = inventory_snap.get("valuation_by_category", [])
        sku_catalog: List[dict] = inventory_snap.get("sku_catalog", [])
        dead_slow_stock: List[dict] = inventory_snap.get("dead_slow_stock", [])
        warehouse_bin_capacity: List[dict] = inventory_snap.get("warehouse_bin_capacity", [])
        spend_vs_budget_trend: List[dict] = inventory_snap.get("spend_vs_budget_trend", [])
        procurement_spend_mtd = _safe_float(inventory_snap.get("procurement_spend_mtd"))
        procurement_spend_budget_mtd = _safe_float(inventory_snap.get("procurement_spend_budget_mtd"))

        open_po_count = _safe_float(po_snap.get("open_po_count"))
        open_po_value = _safe_float(po_snap.get("open_po_value"))
        po_pipeline: List[dict] = po_snap.get("po_pipeline", [])
        active_purchase_orders: List[dict] = po_snap.get("active_purchase_orders", [])
        executive_approval_queue: List[dict] = po_snap.get("executive_approval_queue", [])

        vendor_scorecard: List[dict] = vendor_snap.get("vendor_scorecard", [])
        vendor_spend_concentration: List[dict] = vendor_snap.get("vendor_spend_concentration", [])

        stock_movements: List[dict] = movement_snap.get("stock_movements", [])
        movement_type_distribution: List[dict] = movement_snap.get("movement_type_distribution", [])
        shrinkage_flag_items: List[dict] = movement_snap.get("shrinkage_flag_items", [])

        bridge_status: dict = bridge_snap.get("bridge_status", {"enabled": False, "provider": "None", "connected": False})
        po_bill_conversion_queue: List[dict] = bridge_snap.get("po_bill_conversion_queue", [])
        gl_valuation_reconciliation: List[dict] = bridge_snap.get("gl_valuation_reconciliation", [])

        risk_alerts: List[dict] = inventory_snap.get("risk_alerts", [])
    else:
        # No gbrain snapshots — fall back to examples/procurement-mock.json so
        # the dashboard shows realistic demo data instead of empty zeros. Same
        # pattern as the finance dashboard (PR #12 review allows mock as
        # graceful-degradation fallback, just no fabricated figures as live).
        # `mock: true` flags the UI that this is demo data, not live.
        mock_json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "procurement-mock.json"
        mock_data: Dict[str, Any] = {}
        if mock_json_path.exists():
            try:
                with open(mock_json_path, "r", encoding="utf-8") as f:
                    mock_data = json.load(f).get("dashboard_mock", {})
                logger.info("Procurement dashboard: no gbrain snapshots — loaded mock from %s", mock_json_path)
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("Failed to load procurement mock from %s: %s", mock_json_path, exc)

        total_inventory_valuation = _safe_float(mock_data.get("totalInventoryValuation"))
        total_active_skus = _safe_float(mock_data.get("totalActiveSkus"))
        low_stock_alerts = _safe_float(mock_data.get("lowStockAlerts"))
        dead_slow_stock_capital = _safe_float(mock_data.get("deadSlowStockCapital"))
        open_po_count = _safe_float(mock_data.get("openPoCount"))
        open_po_value = _safe_float(mock_data.get("openPoValue"))
        procurement_spend_mtd = _safe_float(mock_data.get("procurementSpendMtd"))
        procurement_spend_budget_mtd = _safe_float(mock_data.get("procurementSpendBudgetMtd"))

        risk_alerts = mock_data.get("riskAlerts", [])
        valuation_by_category = mock_data.get("valuationByCategory", [])
        spend_vs_budget_trend = mock_data.get("spendVsBudgetTrend", [])

        sku_catalog = mock_data.get("skuCatalog", [])
        dead_slow_stock = mock_data.get("deadSlowStock", [])
        warehouse_bin_capacity = mock_data.get("warehouseBinCapacity", [])

        stock_movements = mock_data.get("stockMovements", [])
        movement_type_distribution = mock_data.get("movementTypeDistribution", [])
        shrinkage_flag_items = mock_data.get("shrinkageFlagItems", [])

        po_pipeline = mock_data.get("poPipeline", [])
        active_purchase_orders = mock_data.get("activePurchaseOrders", [])
        executive_approval_queue = mock_data.get("executiveApprovalQueue", [])
        vendor_scorecard = mock_data.get("vendorScorecard", [])
        vendor_spend_concentration = mock_data.get("vendorSpendConcentration", [])

        bridge_status = mock_data.get("accountingBridge", {"enabled": False, "provider": "None", "connected": False})
        po_bill_conversion_queue = mock_data.get("poBillConversionQueue", [])
        gl_valuation_reconciliation = mock_data.get("glValuationReconciliation", [])

        # Phase A–E mock data (PR / RFQ / Barcode / 3-way match)
        purchase_requisitions = mock_data.get("purchaseRequisitions", [])
        rfq_comparisons = mock_data.get("rfqComparisons", [])
        barcode_batches = mock_data.get("barcodeBatches", [])
        three_way_matches = mock_data.get("threeWayMatches", [])

    # Pull PR/RFQ/barcode/match from snapshots when live data exists (snapshot
    # writer will populate these once the full procurement cycle endpoints are built).
    if has_real_data:
        purchase_requisitions = inventory_snap.get("purchase_requisitions", [])
        rfq_comparisons = inventory_snap.get("rfq_comparisons", [])
        barcode_batches = inventory_snap.get("barcode_batches", [])
        three_way_matches = inventory_snap.get("three_way_matches", [])

    return {
        # Mock flag — true when data loaded from examples/procurement-mock.json
        "mock": not has_real_data,
        # Tab 1 — Executive Procurement & Reorder Pulse
        "totalInventoryValuation": total_inventory_valuation,
        "totalActiveSkus": total_active_skus,
        "lowStockAlerts": low_stock_alerts,
        "deadSlowStockCapital": dead_slow_stock_capital,
        "openPoCount": open_po_count,
        "openPoValue": open_po_value,
        "procurementSpendMtd": procurement_spend_mtd,
        "procurementSpendBudgetMtd": procurement_spend_budget_mtd,
        "riskAlerts": risk_alerts,
        "valuationByCategory": valuation_by_category,
        "spendVsBudgetTrend": spend_vs_budget_trend,
        # Tab 2 — Inventory Catalog & Dead/Slow Stock
        "skuCatalog": sku_catalog,
        "deadSlowStock": dead_slow_stock,
        "warehouseBinCapacity": warehouse_bin_capacity,
        # Tab 3 — Stock Movement Audit Log
        "stockMovements": stock_movements,
        "movementTypeDistribution": movement_type_distribution,
        "shrinkageFlagItems": shrinkage_flag_items,
        # Tab 4 — Purchase Orders & Vendor Scorecard
        "poPipeline": po_pipeline,
        "activePurchaseOrders": active_purchase_orders,
        "executiveApprovalQueue": executive_approval_queue,
        "vendorScorecard": vendor_scorecard,
        "vendorSpendConcentration": vendor_spend_concentration,
        # Tab 5 — Accounting Bridge & Valuation Reconciliation
        "accountingBridge": bridge_status,
        "poBillConversionQueue": po_bill_conversion_queue,
        "glValuationReconciliation": gl_valuation_reconciliation,
        # Tab 6 — Purchase Requisitions (PR)
        "purchaseRequisitions": purchase_requisitions,
        # Tab 7 — RFQ & Vendor Sourcing
        "rfqComparisons": rfq_comparisons,
        # Tab 8 — Barcode Tagging & Scan Counter
        "barcodeBatches": barcode_batches,
        # Tab 9 — 3-Way Match Verification
        "threeWayMatches": three_way_matches,
    }


@router.get("/procurement-stats")
async def get_procurement_stats(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated Procurement dashboard stats — all 5 tabs."""
    pages = await _fetch_brain_pages_safe("procurement", limit=300, slug_prefix="")
    return _run_procurement_aggregation(pages)


# ---------------------------------------------------------------------------
# Plantation Estate Operations dashboard endpoints
# ---------------------------------------------------------------------------


async def _call_estate_agent(name: str, prompt: str, photo_paths: Optional[List[str]] = None) -> str:
    """Call the Hermes agent for the facility department via the gateway.

    If photo_paths are provided, they are passed as image attachments so the
    gateway base64-encodes them and switches to the Qwen vision model.
    """
    try:
        from gateway import _generate_department_response_async
    except ImportError:
        # Fallback: try a direct LLM call via the gateway's embedded agent
        return '{"error": "Gateway agent function not available — start the Hermes gateway"}'

    attachments = None
    if photo_paths:
        attachments = []
        for p in photo_paths:
            ext = pathlib.Path(p).suffix.lower()
            mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                        ".webp": "image/webp", ".gif": "image/gif"}
            attachments.append({
                "path": p,
                "is_image": True,
                "mime_type": mime_map.get(ext, "image/png"),
            })

    response = await _generate_department_response_async(
        name, prompt, soul_content="", attachments=attachments,
    )
    return response


def _extract_json_from_text(text: str, is_array: bool = False) -> Any:
    """Try to extract JSON from the agent's text response."""
    pattern = r'\[[\s\S]*\]' if is_array else r'\{[\s\S]*\}'
    match = _re.search(pattern, text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return [] if is_array else {"raw_response": text}


@router.post("/scan-document")
async def scan_document(
    name: str = Path(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document, OCR it, then use DeepSeek for summary + interpretation.
    Saves the scan result to the scanned_documents table.

    Flow: upload → OCR (pymupdf for PDF, vision model for images) → DeepSeek → save.
    """
    from models import ScannedDocument
    from gateway import _call_deepseek
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)

    cfg = get_config()
    upload_dir = pathlib.Path(cfg.db_path).parent / "dashboard_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Prefix with UUID to prevent filename collisions across tenants
    import uuid as _uuid
    safe_name = pathlib.Path(file.filename or "document").name
    unique_name = f"{_uuid.uuid4().hex[:8]}_{safe_name}"
    file_path = upload_dir / unique_name
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    file_url = f"/api/doc-uploads/{unique_name}"

    # --- Step 1: OCR — extract raw text from the document ---
    ocr_text = ""
    ext = pathlib.Path(safe_name).suffix.lower()

    if ext == ".pdf":
        # Try pymupdf first (text-based PDFs)
        try:
            import fitz  # pymupdf
            doc = fitz.open(str(file_path))
            for page in doc:
                ocr_text += page.get_text()
            doc.close()
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("pymupdf OCR failed: %s", exc)

    if not ocr_text and ext in (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"):
        # Fall back to vision model (scanned PDFs, images)
        # For scanned PDFs: render pages as images first (PyMuPDF), don't send raw PDF to VLM
        vision_images = []
        if ext == ".pdf":
            try:
                import fitz
                doc = fitz.open(str(file_path))
                for page_num, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=200)
                    img_path = file_path.parent / f"{file_path.stem}_p{page_num}.png"
                    pix.save(str(img_path))
                    vision_images.append(str(img_path))
                doc.close()
            except Exception as exc:
                logger.warning("PDF page rendering failed: %s", exc)
        else:
            vision_images = [str(file_path)]

        try:
            from gateway import _call_llm_for_department
            for img_path in vision_images:
                vision_resp = await _call_llm_for_department(
                    name,
                    "OCR this document. Extract ALL text visible in the document. Return the raw text only, no commentary.",
                    "",
                    "Document OCR task",
                    attachments=[{"path": img_path, "is_image": True}],
                )
                if vision_resp:
                    ocr_text += vision_resp + "\n"
            # Clean up temporary page images
            for img_path in vision_images:
                if os.path.abspath(img_path) != os.path.abspath(str(file_path)):
                    try:
                        os.remove(img_path)
                    except OSError:
                        pass
        except Exception as exc:
            logger.warning("Vision OCR fallback failed: %s", exc)

    if not ocr_text:
        ocr_text = "(OCR could not extract text from this document.)"

    # --- Step 2: Department-specific DeepSeek analysis ---
    ocr_text_truncated = ocr_text[:8000]  # prevent token overflow

    if name in ("finance", "procurement"):
        # Finance: extract fields as bullet points, NO summary
        deepseek_prompt = (
            f"You are a finance document scanner. Below is the OCR text from an invoice, quotation, or receipt.\n\n"
            f"=== DOCUMENT TEXT ===\n{ocr_text_truncated}\n=== END DOCUMENT TEXT ===\n\n"
            f"Extract ALL key fields from this document. Return ONLY a JSON object:\n"
            f'{{"document_type": "invoice|quotation|receipt|other", '
            f'"fields": {{'
            f'"vendor": "vendor/supplier name", '
            f'"document_number": "invoice/quotation/receipt number", '
            f'"date": "document date", '
            f'"due_date": "due date if present", '
            f'"subtotal": "subtotal amount with currency", '
            f'"tax": "tax amount with currency", '
            f'"total": "total amount with currency", '
            f'"line_items": ["each line item with description and amount"]'
            f'}}, '
            f'"validation": {{"valid": true/false, "message": "verify subtotal + tax = total"}}}}\n\n'
            f"List ALL fields as key-value pairs. Do NOT write a summary. Do NOT add explanation outside JSON."
        )
    elif name in ("facility", "compliance"):
        # Estate Ops / Compliance: summary + interpretation (legal docs, contracts)
        deepseek_prompt = (
            f"You are a legal document analyst. Below is the OCR text from a legal document, contract, or agreement.\n\n"
            f"=== DOCUMENT TEXT ===\n{ocr_text_truncated}\n=== END DOCUMENT TEXT ===\n\n"
            f"Analyse this legal document. Return ONLY a JSON object:\n"
            f'{{"document_type": "employment_contract|service_agreement|lease|nda|other", '
            f'"summary": "3-4 sentences summarising what this document is about, who the parties are, and the key terms", '
            f'"interpretation": {{'
            f'"parties": ["list all parties"], '
            f'"duration": "contract duration if applicable", '
            f'"value": "contract value or salary if applicable", '
            f'"key_obligations": ["list key obligations of each party"], '
            f'"termination_clause": "termination conditions", '
            f'"penalty_clause": "penalty clauses if any"'
            f'}}, '
            f'"risks": ["list any risks: unlimited liability, auto-renewal, short notice, etc."], '
            f'"recommendations": ["list actionable recommendations"]}}\n\n'
            f"Write a clear summary (3-4 sentences) AND a detailed interpretation. Both are required."
        )
    else:
        # Generic fallback
        deepseek_prompt = (
            f"You are a document analysis assistant. Below is the OCR text from a document.\n\n"
            f"=== DOCUMENT TEXT ===\n{ocr_text_truncated}\n=== END DOCUMENT TEXT ===\n\n"
            f"Return ONLY a JSON object with: document_type, fields, summary, risks, validation.\n"
            f"No markdown fences, no explanation outside JSON."
        )

    deepseek_response = await _call_deepseek(deepseek_prompt)
    result = _extract_json_from_text(deepseek_response, is_array=False) if deepseek_response else {"raw_response": deepseek_response or "No response from DeepSeek"}

    # If DeepSeek failed, fall back to the OCR text as summary
    if not deepseek_response:
        result = {
            "document_type": "unknown",
            "fields": {},
            "summary": ocr_text[:200] + "..." if len(ocr_text) > 200 else ocr_text,
            "risks": [],
            "validation": {"valid": True, "message": "DeepSeek unavailable — showing raw OCR text"},
            "ocr_text": ocr_text,
        }

    # Persist to DB
    doc = ScannedDocument(
        tenant_id=tenant.id,
        department=name,
        scanned_by=user.name or user.email,
        filename=file.filename or "document",
        file_path=str(file_path),
        file_url=file_url,
        document_type=str(result.get("document_type", "")) if isinstance(result, dict) else "",
        ocr_summary=str(result.get("summary", "")) if isinstance(result, dict) else "",
        interpretation=result if isinstance(result, dict) else {"raw_response": result},
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc.to_dict()


@router.get("/scanned-documents")
async def list_scanned_documents(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all scanned documents for this department."""
    from models import ScannedDocument
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    docs = db.execute(
        select(ScannedDocument).where(
            ScannedDocument.tenant_id == tenant.id,
            ScannedDocument.department == name,
        ).order_by(ScannedDocument.scan_date.desc())
    ).scalars().all()
    return {"documents": [d.to_dict() for d in docs]}


@router.post("/inspect-site")
async def inspect_site(
    name: str = Path(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a photo/video, send to Hermes agent for site assessment + storage."""
    cfg = get_config()
    upload_dir = pathlib.Path(cfg.db_path).parent / "dashboard_uploads"
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    prompt = (
        f"Inspect this site image at {file_path}: "
        f"assess furniture count, cleanliness, site condition, and safety (use site-condition-assessment skill). "
        f"Store the report to gbrain (use site-inspection-storage skill). "
        f"Return JSON with: furniture, cleanliness, site_condition, safety_hazards, "
        f"overall_rating, priority_actions, storage_path."
    )
    response_text = await _call_estate_agent(name, prompt)
    result = _extract_json_from_text(response_text, is_array=False)
    return result


@router.get("/search-documents")
async def search_documents(
    name: str = Path(...),
    q: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search stored documents via Hermes agent."""
    prompt = (
        f"Search for documents matching '{q}' (use document-retrieval skill). "
        f"Return JSON array with: title, summary, and key fields for each match. "
        f"If no results, return empty array."
    )
    response_text = await _call_estate_agent(name, prompt)
    results = _extract_json_from_text(response_text, is_array=True)
    return {"results": results}


# ---------------------------------------------------------------------------
# Site Inspection Units — CRUD + inspection upload
# ---------------------------------------------------------------------------

class CreateUnitPayload(BaseModel):
    site_name: str
    block_name: str
    unit_number: str
    capacity: int = 1
    unit_type: str = "single"  # single, family, dormitory


class PhotoMeta(BaseModel):
    """Metadata for a single photo in a save-inspection request."""
    path: str          # absolute path on server (from assess step)
    filename: str
    url: str = ""      # web-accessible URL (/api/site-photos/<basename>)
    room: str = ""
    assessment: str = ""


class SaveInspectionPayload(BaseModel):
    """Payload for the second step — persist an assessed inspection."""
    photos: List[PhotoMeta]
    furniture_count: str = ""
    cleanliness: str = ""
    site_condition: str = ""
    safety_hazards: str = ""
    overall_rating: str = ""
    priority_actions: str = ""
    merged_assessment: Dict[str, Any] = {}


@router.post("/site-units")
async def create_site_unit(
    body: CreateUnitPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Register a new staff quarter unit."""
    from models import SiteInspectionUnit
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    existing = db.execute(
        select(SiteInspectionUnit).where(
            SiteInspectionUnit.tenant_id == tenant.id,
            SiteInspectionUnit.site_name == body.site_name,
            SiteInspectionUnit.block_name == body.block_name,
            SiteInspectionUnit.unit_number == body.unit_number,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Unit already exists")
    unit = SiteInspectionUnit(
        tenant_id=tenant.id,
        site_name=body.site_name,
        block_name=body.block_name,
        unit_number=body.unit_number,
        capacity=body.capacity,
        unit_type=body.unit_type,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit.to_dict()


@router.get("/site-units")
async def list_site_units(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List all registered units for this tenant."""
    from models import SiteInspectionUnit
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    units = db.execute(
        select(SiteInspectionUnit).where(SiteInspectionUnit.tenant_id == tenant.id).order_by(
            SiteInspectionUnit.site_name, SiteInspectionUnit.block_name, SiteInspectionUnit.unit_number
        )
    ).scalars().all()
    return {"units": [u.to_dict() for u in units]}


@router.delete("/site-units/{unit_id}")
async def delete_site_unit(
    unit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a unit and all its inspection records."""
    from models import SiteInspectionUnit
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    unit = db.execute(
        select(SiteInspectionUnit).where(
            SiteInspectionUnit.id == unit_id,
            SiteInspectionUnit.tenant_id == tenant.id,
        )
    ).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    db.delete(unit)
    db.commit()
    return {"ok": True}


@router.post("/site-units/{unit_id}/assess")
async def assess_unit(
    unit_id: int,
    files: List[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Step 1 — upload photos, run vision assessment, return results WITHOUT saving to DB.

    Photos are saved to disk so the LLM can read them and so the caller can
    display them via /api/site-photos/<basename>.  The caller must POST the
    returned photos + assessment to /site-units/{id}/inspections to persist.
    """
    from models import SiteInspectionUnit
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    unit = db.execute(
        select(SiteInspectionUnit).where(
            SiteInspectionUnit.id == unit_id,
            SiteInspectionUnit.tenant_id == tenant.id,
        )
    ).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    cfg = get_config()
    upload_dir = pathlib.Path(cfg.db_path).parent / "site_inspections"
    upload_dir.mkdir(parents=True, exist_ok=True)

    photos: List[Dict[str, Any]] = []
    for i, f in enumerate(files):
        safe_name = pathlib.Path(f.filename or f"photo_{i}").name
        # Sanitize unit fields to produce URL-safe filenames (no spaces/slashes)
        def _slug(s: str) -> str:
            return "".join(c if c.isalnum() or c in "-_" else "_" for c in s)
        stored_name = f"{_slug(unit.site_name)}_{_slug(unit.block_name)}_{_slug(unit.unit_number)}_{i}_{safe_name}"
        file_path = upload_dir / stored_name
        with open(file_path, "wb") as out:
            content = await f.read()
            out.write(content)
        photos.append({
            "path": str(file_path),
            "filename": f.filename or f"photo_{i}",
            "url": f"/api/site-photos/{stored_name}",
            "room": "",
            "assessment": "",
        })

    # --- Run 3 atomic skills PER PHOTO ---
    # Each photo gets its own furniture-count, cleanliness-check, site-condition-check
    # call (with that single photo as the image attachment).
    # Photos are processed sequentially to avoid Dashscope 429 burst-rate limiting.
    async def _assess_one_photo(photo: Dict[str, Any], idx: int) -> Dict[str, Any]:
        single_path = [photo["path"]]

        async def _run_skill(skill_name: str, instruction: str) -> Dict[str, Any]:
            prompt = (
                f"Use the {skill_name} skill. {instruction}\n"
                f"Photo to assess:\n- {photo['path']}\n\n"
                f"Return ONLY a JSON object with your assessment."
            )
            text = await _call_estate_agent("facility", prompt, photo_paths=single_path)
            return _extract_json_from_text(text, is_array=False)

        furniture, cleanliness, condition = await asyncio.gather(
            _run_skill("furniture-count", "Count and catalog every visible piece of furniture in this photo. Return JSON: {furniture: [{item, quantity, condition}], total_items, summary}."),
            _run_skill("cleanliness-check", "Assess the cleanliness of each surface visible in this photo. Return JSON: {cleanliness: {floor, walls, bedding, surfaces, overall}, summary}."),
            _run_skill("site-condition-check", "Assess the structural condition (walls, ceiling, windows, lighting, ventilation) and safety hazards in this photo. Return JSON: {site_condition: {walls, ceiling, windows, lighting, ventilation}, safety_hazards: [...], overall_rating, priority_actions: [...]}."),
        )
        return {
            "filename": photo["filename"],
            "url": photo["url"],
            "path": photo["path"],
            "furniture_result": furniture,
            "cleanliness_result": cleanliness,
            "condition_result": condition,
        }

    # Process photos sequentially (each photo's 3 skills run in parallel internally)
    per_photo = []
    for i, photo in enumerate(photos):
        result = await _assess_one_photo(photo, i)
        per_photo.append(result)

    # Merge per-photo assessments into the photos list for backward compat
    for i, pr in enumerate(per_photo):
        if i < len(photos):
            photos[i]["assessment"] = ""

    return {
        "unit_id": unit.id,
        "unit_label": f"{unit.site_name} — {unit.block_name} — {unit.unit_number}",
        "photos": photos,
        # Per-photo results — each photo has its own 3 skill results
        "per_photo": per_photo,
        # Flattened overall summary (aggregated across all photos)
        "furniture_count": sum(len(pr.get("furniture_result", {}).get("furniture", [])) for pr in per_photo) if per_photo else 0,
        # Cleanliness overall — take first photo (cleanliness is uniform per room, not per photo)
        "cleanliness": per_photo[0].get("cleanliness_result", {}).get("cleanliness", {}).get("overall", "") if per_photo else "",
        # Aggregate safety hazards + priority actions across all photos
        "site_condition": "; ".join(
            s for pr in per_photo
            for s in (pr.get("condition_result", {}).get("site_condition", {}).values() if isinstance(pr.get("condition_result", {}).get("site_condition"), dict) else [])
            if s
        ) if per_photo else "",
        "safety_hazards": "; ".join(
            h for pr in per_photo
            for h in (pr.get("condition_result", {}).get("safety_hazards") or [])
        ) if per_photo else "",
        "overall_rating": "; ".join(
            pr.get("condition_result", {}).get("overall_rating", "")
            for pr in per_photo
            if pr.get("condition_result", {}).get("overall_rating")
        ) if per_photo else "",
        "priority_actions": "; ".join(
            a for pr in per_photo
            for a in (pr.get("condition_result", {}).get("priority_actions") or [])
        ) if per_photo else "",
        "merged_assessment": {
            "per_photo": per_photo,
        },
    }


@router.post("/site-units/{unit_id}/inspections")
async def save_inspection(
    unit_id: int,
    body: SaveInspectionPayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Step 2 — persist an assessed inspection (photos + results) to the database.

    Called after the user reviews the assessment from /assess and clicks Close/Save.
    """
    from models import SiteInspectionUnit, SiteInspection
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    unit = db.execute(
        select(SiteInspectionUnit).where(
            SiteInspectionUnit.id == unit_id,
            SiteInspectionUnit.tenant_id == tenant.id,
        )
    ).scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    inspection = SiteInspection(
        tenant_id=tenant.id,
        unit_id=unit.id,
        inspected_by=user.name or user.email,
        photos=[p.model_dump() for p in body.photos],
        merged_assessment=body.merged_assessment or None,
        furniture_count=body.furniture_count,
        cleanliness=body.cleanliness,
        site_condition=body.site_condition,
        safety_hazards=body.safety_hazards,
        overall_rating=body.overall_rating,
        priority_actions=body.priority_actions,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection.to_dict()


@router.get("/site-units/{unit_id}/inspections")
async def list_unit_inspections(
    unit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get inspection history for a unit."""
    from models import SiteInspection
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    inspections = db.execute(
        select(SiteInspection).where(
            SiteInspection.unit_id == unit_id,
            SiteInspection.tenant_id == tenant.id,
        ).order_by(SiteInspection.inspection_date.desc())
    ).scalars().all()
    return {"inspections": [i.to_dict() for i in inspections]}


@router.get("/inspections")
async def list_all_inspections(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unit_ids: Optional[str] = Query(None, description="Comma-separated unit IDs"),
    date_from: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
) -> dict:
    """Get all inspection records for this tenant, optionally filtered by units and date range."""
    from models import SiteInspection
    from datetime import datetime as _dt, timezone as _tz
    tenant = db.get(Tenant, user.tenant_id) if user and user.tenant_id else get_primary_tenant(db)
    query = select(SiteInspection).where(SiteInspection.tenant_id == tenant.id)

    # Filter by unit IDs (comma-separated)
    if unit_ids:
        try:
            ids = [int(x.strip()) for x in unit_ids.split(",") if x.strip()]
            if ids:
                query = query.where(SiteInspection.unit_id.in_(ids))
        except ValueError:
            pass

    # Filter by date range
    if date_from:
        try:
            df = _dt.fromisoformat(date_from).replace(tzinfo=_tz.utc)
            query = query.where(SiteInspection.inspection_date >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = _dt.fromisoformat(date_to).replace(tzinfo=_tz.utc) + timedelta(days=1)  # inclusive end
            query = query.where(SiteInspection.inspection_date < dt)
        except ValueError:
            pass

    query = query.order_by(SiteInspection.inspection_date.desc())
    inspections = db.execute(query).scalars().all()
    return {"inspections": [i.to_dict() for i in inspections]}