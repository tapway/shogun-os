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


def _async_res(value):
    async def _inner():
        return value
    return _inner()


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
        "frontmatter": {
            "customer": "Bank Negara",
            "owner": "Anwar",
            "stage": "Won",
            "created": "2026-06-01",
            "amount": 120000,
            "priority": "High",
            "source": "Partner Referral",
        },
        "compiled_truth": "# Deal body",
    },
    {
        "slug": "deals/market-tender",
        "title": "Market Tender",
        "frontmatter": {
            "customer": "Market Co",
            "owner": "Anwar",
            "stage": "Tender",
            "created": "2026-07-02",
            "priority": "Medium",
            "source": "Cold Call",
        },
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

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", priority="", source="", user=USER, db=DB))

    assert result["total"] == 2  # risk-register excluded
    titles = {d["title"] for d in result["deals"]}
    assert titles == {"BNI PoC", "Market Tender"}
    assert result["deals"][0]["slug"] == "deals/market-tender"  # newest first


def test_deals_priority_and_source_mapped(monkeypatch) -> None:
    """frontmatter.priority/source flow through _extract_deal_list_item."""
    async def fake_fetch(source, *, limit, slug_prefix):
        return DEAL_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", priority="", source="", user=USER, db=DB))
    by_slug = {d["slug"]: d for d in result["deals"]}
    assert by_slug["deals/bni-poc"]["priority"] == "High"
    assert by_slug["deals/bni-poc"]["source"] == "Partner Referral"
    assert by_slug["deals/market-tender"]["priority"] == "Medium"
    assert by_slug["deals/market-tender"]["source"] == "Cold Call"


def test_deals_priority_filter(monkeypatch) -> None:
    async def fake_fetch(source, *, limit, slug_prefix):
        return DEAL_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", priority="High", source="", user=USER, db=DB))
    assert [d["slug"] for d in result["deals"]] == ["deals/bni-poc"]


def test_deals_source_filter(monkeypatch) -> None:
    async def fake_fetch(source, *, limit, slug_prefix):
        return DEAL_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", priority="", source="cold", user=USER, db=DB))
    assert [d["slug"] for d in result["deals"]] == ["deals/market-tender"]


def test_mock_never_serves_when_live_source_has_data(monkeypatch) -> None:
    """Critical: mock fires only when the live source is empty, not when a
    filter empties the result set."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(dashboard, "_load_crm_mock", lambda: {
        "deals": [
            {"slug": "deals/fake-1", "title": "Fake Deal", "customer": "Nobody",
             "owner": "Anwar", "stage": "Won", "created": "2026-01-01", "source": "",
             "amount": 1, "priority": "", "compiled_truth": ""},
        ]
    })

    async def fake_fetch(source, *, limit, slug_prefix):
        return DEAL_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="does-not-exist", stage="", owner="", priority="", source="", user=USER, db=DB))
    assert result == {"deals": [], "total": 0}  # no fabricated demo records


def test_mock_serves_when_live_source_empty_and_filters_reapplied(monkeypatch) -> None:
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(dashboard, "_load_crm_mock", lambda: {
        "deals": [
            {"slug": "deals/fake-1", "title": "Fake Deal", "customer": "Nobody",
             "owner": "Anwar", "stage": "Won", "created": "2026-01-01", "source": "Email",
             "amount": 1, "priority": "High", "compiled_truth": ""},
            {"slug": "deals/fake-2", "title": "Second Fake", "customer": "Nobody",
             "owner": "Liyana", "stage": "Lead", "created": "2026-02-01", "source": "Email",
             "amount": 2, "priority": "Low", "compiled_truth": ""},
        ]
    })

    async def fake_fetch(source, *, limit, slug_prefix):
        return []

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="Won", owner="", priority="", source="", user=USER, db=DB))
    assert result["mock"] is True
    assert [d["slug"] for d in result["deals"]] == ["deals/fake-1"]  # stage filter reapplied


def test_deals_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, *, limit, slug_prefix):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", boom)

    result = _run(dashboard.list_crm_deals(name="crm", search="", stage="", owner="", priority="", source="", user=USER, db=DB))

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

PARTNER_PAGES = [
    {"slug": "partners/zeta-tech", "title": "Zeta Tech", "frontmatter": {"country": "MY", "tier": "Gold", "type": "Reseller"}},
    {"slug": "partners/readme", "title": "README", "frontmatter": {}},
    {"slug": "partners/alpha-dist", "title": "Alpha Dist", "frontmatter": {"country": "SG", "tier": "Platinum", "type": "Distributor"}},
]


def test_partners_normal_mapping_meta_excludes_and_sort(monkeypatch) -> None:
    """Partners map from pages, skip readme/_schema (narrow set), sort by title."""
    async def fake_fetch(source, *, limit, slug_prefix):
        return PARTNER_PAGES

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", fake_fetch)

    result = _run(dashboard.list_crm_partners(name="crm", search="", user=USER, db=DB))

    titles = [p["title"] for p in result["partners"]]
    assert titles == ["Alpha Dist", "Zeta Tech"], "sorted by title, meta pages excluded"
    assert result["total"] == 2
    first = result["partners"][0]
    assert first["slug"] == "partners/alpha-dist"
    assert first["country"] == "SG"


def test_partners_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, *, limit, slug_prefix):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_pages", boom)

    result = _run(dashboard.list_crm_partners(name="crm", search="", user=USER, db=DB))

    assert result == {"partners": [], "total": 0}


# ─── Tasks: deal filter must survive mock fallback (round-4 critical) ──────

MOCK_TASKS = [
    {"description": "Renew protection", "assignee": "Anwar", "completed": False,
     "deal_slug": "deals/ioi", "deal_title": "IOI Properties"},
    {"description": "Send quote", "assignee": "Liyana", "completed": False,
     "deal_slug": "deals/sunway", "deal_title": "Sunway Retail"},
]


def test_tasks_mock_fallback_honours_deal_filter(monkeypatch) -> None:
    """The final mock fallback must apply the deal filter (it previously
    leaked tasks from unrelated deals when a deal filter emptied the set)."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(dashboard, "_load_crm_mock", lambda: {"tasks": MOCK_TASKS})

    async def boom(source, slug):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", boom)

    result = _run(dashboard.list_crm_tasks(
        name="crm", completed=None, assignee="", deal="sunway", user=USER, db=DB))
    assert result["mock"] is True
    assert [t["deal_slug"] for t in result["tasks"]] == ["deals/sunway"]


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

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", deal="", user=USER, db=DB))

    assert result["total"] == 2
    assert result["tasks"][0] == {
        "description": "Send quote",
        "assignee": "Anwar",
        "completed": False,
        "deal_slug": "deals/x",
        "deal_title": "X",
    }
    # filtering
    done = _run(dashboard.list_crm_tasks(name="crm", completed=True, assignee="", deal="", user=USER, db=DB))
    assert done["total"] == 1 and done["tasks"][0]["deal_slug"] == "deals/y"


def test_tasks_gracious_empty_state_when_gbrain_raises(monkeypatch) -> None:
    async def boom(source, slug):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", boom)

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", deal="", user=USER, db=DB))

    assert result == {"tasks": [], "total": 0}


def test_tasks_empty_when_index_missing(monkeypatch) -> None:
    async def none(source, slug):
        return None

    monkeypatch.setattr(dashboard, "gbrain_fetch_page", none)

    result = _run(dashboard.list_crm_tasks(name="crm", completed=None, assignee="", deal="", user=USER, db=DB))

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




def test_partner_sphere_mock_keeps_live_rows_when_source_nonempty(monkeypatch) -> None:
    """Mock overlay fills only empty sections; live partner rows win."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(
        dashboard, "_load_crm_mock",
        lambda: {"partner_sphere": {"masterList": [{"name": "Mock Row"}],
                                     "profile": {"name": "Mock Profile"}}})
    live = [
        {"slug": "partners/acme", "title": "ACME Distribution",
         "frontmatter": {"tier": "Silver", "am": "Anwar", "status": "Active",
                         "country": "Malaysia"}},
    ]
    monkeypatch.setattr(
        dashboard, "_fetch_brain_pages_safe",
        MagicMock(return_value=_async_res(live)))
    res = _run(dashboard.get_partner_sphere(name="crm", user=_make_user(), db=MagicMock()))
    rows = res["masterList"]
    assert len(rows) == 1 and rows[0]["name"] == "ACME Distribution", rows
    assert res["overview"]["kpis"][0]["value"] == "1"
    # sections the live path cannot derive are still mock-filled
    assert res["profile"] == {"name": "Mock Profile"}


def test_partner_sphere_mock_fills_when_source_empty(monkeypatch) -> None:
    """Section-empty (source down) -> mock overlay fills every section."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    fake_sphere = {
        "masterList": [{"name": "P1"}, {"name": "P2"}, {"name": "P3"},
                        {"name": "P4"}, {"name": "P5"}],
        "overview": {"kpis": [{"label": "Active Partners", "value": "5"}]},
        "profile": {"name": "P1"},
    }
    monkeypatch.setattr(
        dashboard, "_load_crm_mock", lambda: {"partner_sphere": fake_sphere})
    monkeypatch.setattr(
        dashboard, "_fetch_brain_pages_safe",
        MagicMock(return_value=_async_res([])))
    res = _run(dashboard.get_partner_sphere(name="crm", user=_make_user(), db=MagicMock()))
    assert res.get("mock") is True
    assert len(res["masterList"]) == 5
    assert res["profile"] == {"name": "P1"}


def test_search_empty_query_returns_empty(monkeypatch) -> None:
    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="   "), name="crm", user=USER, db=DB,
    ))
    assert result == {"results": []}

# ─── Review round-6: mock gating + partner sphere accounting ──────────

def test_search_empty_match_never_serves_mock(monkeypatch) -> None:
    """Populated-brain zero-match search must NOT fabricate demo rows."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(
        dashboard, "_load_crm_mock",
        lambda: {"search_results": [{"title": "Demo Deal", "slug": "deals/demo"}]})

    async def empty(source, query, limit=20):
        return []

    monkeypatch.setattr(dashboard, "gbrain_search", empty)

    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="zebra"), name="crm", user=USER, db=DB,
    ))
    assert result == {"results": []}


def test_search_mock_served_only_when_source_unavailable(monkeypatch) -> None:
    """gbrain outage + demo flag → mock rows; empty results are NOT a trigger."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setattr(
        dashboard, "_load_crm_mock",
        lambda: {"search_results": [{"title": "Demo Deal", "slug": "deals/demo"}]})

    async def boom(source, query, limit=20):
        raise RuntimeError("MCP down")

    monkeypatch.setattr(dashboard, "gbrain_search", boom)

    result = _run(dashboard.crm_search(
        dashboard.SearchBody(query="demo"), name="crm", user=USER, db=DB,
    ))
    assert result.get("mock") is True
    assert result["results"] == [{"title": "Demo Deal", "slug": "deals/demo"}]


def test_partner_sphere_kpi_counts_only_active_and_wires_fields(monkeypatch) -> None:
    """Active Partners KPI excludes Inactive rows; business fields wire from fm."""
    monkeypatch.delenv("SHOGUN_WEB_CRM_MOCK", raising=False)
    live = [
        {"slug": "partners/acme", "title": "ACME Distribution",
         "frontmatter": {"tier": "Gold", "am": "Anwar", "status": "Active",
                         "country": "Malaysia", "tags": ["hw", "video"],
                         "open_deals": 3, "pipeline": "RM 1.2M", "score": 87,
                         "last_activity": "2026-08-20"}},
        {"slug": "partners/oldco", "title": "OldCo",
         "frontmatter": {"status": "Inactive"}},
    ]
    monkeypatch.setattr(dashboard, "_fetch_brain_pages_safe",
                        MagicMock(return_value=_async_res(live)))
    res = _run(dashboard.get_partner_sphere(name="crm", user=_make_user(), db=MagicMock()))
    assert res["overview"]["kpis"][0]["value"] == "1"
    rows = {r["name"]: r for r in res["masterList"]}
    assert len(rows) == 2
    acme = rows["ACME Distribution"]
    assert acme["tags"] == ["hw", "video"]
    assert acme["openDeals"] == 3
    assert acme["pipeline"] == "RM 1.2M"
    assert acme["score"] == 87
    assert acme["lastActivity"] == "2026-08-20"
    assert res["mock"] is False


def test_bev_mock_explicit_flag_overrides_crm(monkeypatch) -> None:
    """SHOGUN_WEB_BEV_MOCK set explicitly must win over the CRM demo flag."""
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    monkeypatch.setenv("SHOGUN_WEB_BEV_MOCK", "0")
    assert dashboard._bev_mock_enabled() is False


def test_bev_mock_falls_back_to_crm_flag(monkeypatch) -> None:
    """BEV flag unset -> CRM demo flag drives BEV mock (legacy demo setups)."""
    monkeypatch.delenv("SHOGUN_WEB_BEV_MOCK", raising=False)
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "1")
    assert dashboard._bev_mock_enabled() is True
    monkeypatch.setenv("SHOGUN_WEB_CRM_MOCK", "0")
    assert dashboard._bev_mock_enabled() is False
