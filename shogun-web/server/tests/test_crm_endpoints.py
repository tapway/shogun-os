"""Endpoint-level tests for the CRM list/search endpoints.

Mocks the gbrain client layer so we verify the endpoint contracts —
(1) normal mapping from brain pages, (2) graceful empty-state shapes when
gbrain raises (MCP down / timeout), (3) category inference, (4) tasks
index-page normalization.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


def _run(coro):
    return asyncio.run(coro)


def _make_user():
    u = MagicMock()
    u.id = 1
    u.tenant_id = 1
    return u


USER = _make_user()
DB = MagicMock()


# ─── Deal pages fixtures ─────────────────────────────────────────────────

DEAL_PAGES = [
    {
        "slug": "deals/bni-poc",
        "title": "BNI PoC",
        "frontmatter": {"customer": "Bank Negara", "owner": "Anwar", "stage": "Won", "created": "2026-06-01", "amount": 120000},
        "compiled_truth": "# Deal body",
    },
    {
        "slug": "deals/market-tender",
        "title": "Market Tender",
        "frontmatter": {"customer": "Market Co", "owner": "Anwar", "stage": "Tender", "created": "2026-07-02"},
        "compiled_truth": "# Tender body",
    },
    {
        "slug": "deals/risk-register",  # meta slug — must be excluded
        "title": "Risk Register",
        "frontmatter": {"customer": "internal", "owner": "nobody"},
        "compiled_truth": "# meta",
    },
]


# ─── Deals ───────────────────────────────────────────────────────────────

def test_deals_normal_mapping(monkeypatch) -> None:
    async def fake_fetch(source, *, limit, slug_prefix):
        return DEAL_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", user=USER, db=DB))

    assert result["total"] == 2  # risk-register excluded
    titles = {d["title"] for d in result["deals"]}
    assert titles == {"BNI PoC", "Market Tender"}
    assert result["deals"][0]["slug"] == "deals/market-tender"  # newest first


def test_deals_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, *, limit, slug_prefix):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", boom)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", user=USER, db=DB))

    assert result == {"deals": [], "total": 0}


# ─── Companies ───────────────────────────────────────────────────────────

COMPANY_PAGES = [
    {"slug": "companies/alpha-activity-log", "title": "Alpha Activity Log Co", "frontmatter": {"industry": "Tech"}},
    {"slug": "companies/readme", "title": "README", "frontmatter": {}},
    {"slug": "companies/beta-solutions", "title": "Beta Solutions", "frontmatter": {"industry": "Fintech"}},
]


def test_companies_narrow_meta_excludes(monkeypatch) -> None:
    """Only readme/_schema are meta for companies — '...activity-log' stays."""
    async def fake_fetch(source, *, limit, slug_prefix):
        return COMPANY_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_companies(name="crm", search="", industry="", user=USER, db=DB))

    slugs = {c["slug"] for c in result["companies"]}
    assert slugs == {"companies/alpha-activity-log", "companies/beta-solutions"}
    assert result["total"] == 2


def test_companies_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, *, limit, slug_prefix):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", boom)

    result = _run(dashboard.list_crm_companies(name="crm", search="", industry="", user=USER, db=DB))

    assert result == {"companies": [], "total": 0}


# ─── Partners ────────────────────────────────────────────────────────────

def test_partners_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, *, limit, slug_prefix):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", boom)

    result = _run(dashboard.list_crm_partners(name="crm", search="", user=USER, db=DB))

    assert result == {"partners": [], "total": 0}


# ─── Tasks ───────────────────────────────────────────────────────────────

TASKS_INDEX_PAGE = {
    "slug": "tasks-index",
    "frontmatter": {
        "tasks": [
            {"deal_slug": "deals/x", "deal_title": "X", "assignee": "Anwar", "description": "Send quote", "completed": False},
            {"deal_slug": "deals/y", "deal_title": "Y", "assignee": "CheeHow", "description": "Follow up", "completed": True},
        ]
    },
    "compiled_truth": "# tasks index",
}


def test_tasks_normalize_index_page(monkeypatch) -> None:
    async def fake_fetch_page(source, slug):
        assert slug == "tasks-index"
        return TASKS_INDEX_PAGE

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", fake_fetch_page)

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", user=USER, db=DB))

    assert result["total"] == 2
    assert result["tasks"][0] == {
        "description": "Send quote",
        "assignee": "Anwar",
        "completed": False,
        "deal_slug": "deals/x",
        "deal_title": "X",
    }
    # filtering
    done = _run(dashboard.list_crm_tasks(name="crm", completed=True, assignee="", user=USER, db=DB))
    assert done["total"] == 1 and done["tasks"][0]["deal_slug"] == "deals/y"


def test_tasks_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, slug):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", boom)

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", user=USER, db=DB))

    assert result == {"tasks": [], "total": 0}


def test_tasks_empty_when_index_missing(monkeypatch) -> None:
    async def none(source, slug):
        return None

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", none)

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", user=USER, db=DB))

    assert result == {"tasks": [], "total": 0}


# ─── Search ──────────────────────────────────────────────────────────────

def test_search_infers_categories(monkeypatch) -> None:
    raw = [
        {"slug": "deals/metrod", "title": "Metrod PoC", "category": ""},
        {"slug": "companies/syspex", "title": "Syspex", "category": ""},
        {"slug": "partners/lenovo", "title": "Lenovo", "category": ""},
        {"slug": "persons/nazrin", "title": "Nazrin", "category": ""},
        {"slug": "misc/other", "title": "Other", "category": ""},
    ]

    async def fake_search(source, query, limit=20):
        return [dict(r) for r in raw]

    monkeypatch.setattr(dashboard, "gbrain_search", fake_search)

    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="test"), name="crm", user=USER, db=DB,
    ))

    cats = [r["category"] for r in result["results"]]
    assert cats == ["deals", "companies", "partners", "persons", "unknown"]


def test_search_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, query, limit=20):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_search", boom)

    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="test"), name="crm", user=USER, db=DB,
    ))

    assert result == {"results": []}


def test_search_empty_query_returns_empty(monkeypatch) -> None:
    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="   "), name="crm", user=USER, db=DB,
    ))
    assert result == {"results": []}
