"""Department dashboard endpoints — aggregates data via gbrain MCP."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
import re as _re
import subprocess
import sys
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db, get_primary_tenant
from gbrain_client import gbrain_fetch_pages
from models import Department, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/departments/{name}/dashboard", tags=["dashboard"])

# ─── Canonicalization ───

OWNER_ALIASES = {
    "cheehow": "Chee How",
    "chee how": "Chee How",
    "ch lim": "Chee How",
    "cheehow lim": "Chee How",
    "cheehow.lim": "Chee How",
    "shamini": "Shamini",
    "shamini thilagam": "Shamini",
    "shamini.t": "Shamini",
    "syarif": "Syarif",
    "syarif hidayat": "Syarif",
    "syarif.hidayat": "Syarif",
    "shahrul": "Shahrul",
    "shahrul nizam": "Shahrul",
    "nazrul": "Nazrul",
    "nazrul shah": "Nazrul",
    "nazrul.shah": "Nazrul",
    "izzat": "Izzat",
    "izzat danial": "Izzat",
    "izzat.danial": "Izzat",
    "muhammad izzat": "Izzat",
    "farhad": "Farhad",
    "farhad faisal": "Farhad",
    "nurul": "Nurul",
    "nurul ain": "Nurul",
    "shahirah": "Shahirah",
    "shahirah hanim": "Shahirah",
    "zulkifli": "Zulkifli",
    "zul": "Zulkifli",
    "zulkifli yusof": "Zulkifli",
}

STAGE_ORDER = ["Lead", "On Hold", "Prospecting", "Qualified", "Quote", "Tender", "Unqualified", "Confirmed", "Won"]
STAGE_WEIGHTS = {
    "Lead": 0.05, "On Hold": 0.0, "Prospecting": 0.15, "Qualified": 0.30,
    "Quote": 0.50, "Tender": 0.65, "Unqualified": 0.0, "Confirmed": 0.90, "Won": 1.0,
}
WON_STAGES = {"Won"}
LOST_STAGES = {"Lost", "Unqualified"}
ACTIVE_STAGES = {"Lead", "Prospecting", "Qualified", "Quote", "Tender", "Confirmed", "On Hold"}
PRODUCT_PATTERNS = [
    (r"samurai|samur-?ai|copilot", "SamurAI"),
    (r"people.?track|peopletrack|peopltrack", "PeopleTrack"),
    (r"vehicle.?track|vehicletrack|avlc|vehicle.?inspection|camera", "VehicleTrack"),
    (r"special|bespoke|custom", "Special"),
]


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

    if totalActiveDeals == 0 and not wonDeals:
        # No real deals at all — return the full CRM mock wholesale (spec §1 Phase 1:
        # "realistic mock data engine, zero code modification required for preview").
        # Mirrors the finance/procurement fallback: every field below has a mock value
        # so all 6 sub-tabs render populated. The aggregated accumulators above are
        # discarded in this branch.
        return {
            "salesMTD": _safe_int(crm_mock.get("salesMTD")),
            "salesQTD": _safe_int(crm_mock.get("salesQTD")),
            "salesYTD": _safe_int(crm_mock.get("salesYTD")),
            "totalPipelineValue": _safe_int(crm_mock.get("totalPipelineValue")),
            "weightedPipelineValue": _safe_int(crm_mock.get("weightedPipelineValue")),
            "pipelineCoverage": _safe_float(crm_mock.get("pipelineCoverage")),
            "winRate": _safe_int(crm_mock.get("winRate")),
            "avgDealSize": _safe_int(crm_mock.get("avgDealSize")),
            "salesCycleDays": _safe_int(crm_mock.get("salesCycleDays"), 47),
            "totalActiveDeals": _safe_int(crm_mock.get("totalActiveDeals")),
            "hotDeals": _safe_int(crm_mock.get("hotDeals")),
            "warmDeals": _safe_int(crm_mock.get("warmDeals")),
            "coldDeals": _safe_int(crm_mock.get("coldDeals")),
            "wonDeals": _safe_int(crm_mock.get("wonDeals")),
            "byManager": crm_mock.get("byManager", []),
            "byPartner": crm_mock.get("byPartner", []),
            "byStage": crm_mock.get("byStage", []),
            "byMonth": crm_mock.get("byMonth", []),
            "byPriority": crm_mock.get("byPriority", []),
            "wonByMonth": crm_mock.get("wonByMonth", []),
            "byProduct": crm_mock.get("byProduct", []),
            "atRiskByManager": crm_mock.get("atRiskByManager", []),
            "atRiskByPartner": crm_mock.get("atRiskByPartner", []),
            "byManagerByPartner": crm_mock.get("byManagerByPartner", []),
            "topDeals": crm_mock.get("topDeals", []),
            "channelVolume": crm_mock.get("channelVolume", {"shopee": 0, "lazada": 0, "fbMessenger": 0, "whatsapp": 0}),
            "avgResponseMinutes": _safe_float(crm_mock.get("avgResponseMinutes")),
            "slaCompliancePct": _safe_float(crm_mock.get("slaCompliancePct")),
            "aiResolutionPct": _safe_float(crm_mock.get("aiResolutionPct")),
            "chatToOrderPct": _safe_float(crm_mock.get("chatToOrderPct")),
            "chatToOrderTrend": crm_mock.get("chatToOrderTrend", []),
            "chatInbox": crm_mock.get("chatInbox", []),
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
    tenant = get_primary_tenant(db)
    dept = db.query(Department).filter(
        Department.tenant_id == tenant.id, Department.name == name
    ).first()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")

    dashboard_meta = {
        "crm": {
            "enabled": True,
            "tabs": [
                {"id": "revenue", "label": "Sales Booking", "icon": "LayoutDashboard"},
                {"id": "pipeline", "label": "Pipeline & Forecast", "icon": "TrendingUp"},
                {"id": "omnichannel", "label": "Omnichannel Chat", "icon": "MessageCircle"},
                {"id": "partner", "label": "Partner Performance", "icon": "Handshake"},
                {"id": "managers", "label": "Manager Performance", "icon": "Users"},
                {"id": "deals", "label": "Deals Deep-Dive", "icon": "Target"},
            ],
        },
        "finance": {
            "enabled": True,
            "tabs": [
                {"id": "pulse", "label": "Executive Pulse", "icon": "LayoutDashboard"},
                {"id": "runway", "label": "Cash & Runway", "icon": "TrendingUp"},
                {"id": "ops", "label": "AR & AP Ops", "icon": "Receipt"},
                {"id": "bva", "label": "Budget vs Actuals", "icon": "BarChart3"},
                {"id": "compliance", "label": "Close & Tax", "icon": "ShieldCheck"},
            ],
        },
        "procurement": {
            "enabled": True,
            "tabs": [
                {"id": "pulse", "label": "Procurement & Reorder Pulse", "icon": "LayoutDashboard"},
                {"id": "inventory", "label": "Inventory & Dead Stock", "icon": "Package"},
                {"id": "movements", "label": "Stock Movement Audit", "icon": "ArrowLeftRight"},
                {"id": "po", "label": "POs & Vendor Scorecard", "icon": "ClipboardList"},
                {"id": "bridge", "label": "Accounting Bridge", "icon": "Scale"},
            ],
        },
    }

    return dashboard_meta.get(name, {"enabled": False, "tabs": []})


@router.get("/ceo-stats")
async def get_crm_ceo_stats(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated CEO dashboard stats for CRM."""
    pages = await gbrain_fetch_pages("crm", limit=200)
    return _run_ceo_aggregation(pages)


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

    # Demo-data store + flag — hoisted so EVERY branch (live / snapshot / empty)
    # has it bound, so the empty-state path can't hit UnboundLocalError (PR #16
    # review). Purely demo fabricated figures (unit economics, client
    # concentration, compliance, static balance-sheet KPIs) are gated behind
    # SEED_DEMO_BRAIN (default OFF) so a fresh install never renders fabricated
    # RM financials (PR #12 + #16 review). Real QBO / gbrain snapshot data flows
    # through regardless.
    mock_data: dict = {}
    mock: bool = False
    seed_demo_brain = os.environ.get("SEED_DEMO_BRAIN", "false").lower() == "true"

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
        # Fabricated demo figures (unit economics, concentration, compliance,
        # static balance-sheet KPIs) are gated behind SEED_DEMO_BRAIN (default
        # OFF) per PR #16 review — a fresh install renders an empty state, never
        # fabricated RM financials. Real budget/BvA line items still come from
        # the live P&L below; this only gates the made-up showcase numbers.
        if seed_demo_brain:
            mock_data = {}
            mock = True  # BvA/concentration/compliance from demo JSON
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        mock_data = json.load(f).get("dashboard_mock", {})
                except Exception as e:
                    logger.warning("Failed to load mock data for BvA budgets: %s", e)
        else:
            mock = False  # real data only — no fabricated demos
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
    pages = await gbrain_fetch_pages("finance", limit=300)
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
        # ── LOAD FROM EXAMPLES/PROCUREMENT-MOCK.JSON ──
        json_path = pathlib.Path(__file__).resolve().parents[2] / "examples" / "procurement-mock.json"
        mock_data = {}
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    file_content = json.load(f)
                    mock_data = file_content.get("dashboard_mock", {})
            except Exception as e:
                logger.warning("Failed to load mock data from %s: %s", json_path, e)

        total_inventory_valuation = _safe_float(mock_data.get("totalInventoryValuation", 1850000.0))
        total_active_skus = _safe_float(mock_data.get("totalActiveSkus", 1248.0))
        low_stock_alerts = _safe_float(mock_data.get("lowStockAlerts", 7.0))
        dead_slow_stock_capital = _safe_float(mock_data.get("deadSlowStockCapital", 285000.0))
        open_po_count = _safe_float(mock_data.get("openPoCount", 14.0))
        open_po_value = _safe_float(mock_data.get("openPoValue", 412000.0))
        procurement_spend_mtd = _safe_float(mock_data.get("procurementSpendMtd", 348000.0))
        procurement_spend_budget_mtd = _safe_float(mock_data.get("procurementSpendBudgetMtd", 380000.0))

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

    return {
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
    }


@router.get("/procurement-stats")
async def get_procurement_stats(
    name: str = Path(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregated Procurement dashboard stats — all 5 tabs."""
    pages = await gbrain_fetch_pages("procurement", limit=300)
    return _run_procurement_aggregation(pages)