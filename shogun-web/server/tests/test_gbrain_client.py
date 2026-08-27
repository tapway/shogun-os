"""Tests: gbrain client — put_page serialization + filesystem-first fetch.

Covers the two behaviours added on the CRM-brain-direct change:
  1. ``gbrain_put_page`` serialises frontmatter (dict -> YAML) into a single
     markdown ``content`` payload for the MCP ``put_page`` op.
  2. ``gbrain_fetch_pages`` prefers the filesystem (~/brain/{source}/*.md)
     when markdown files exist, without touching the MCP endpoint.
"""

import asyncio
import json
import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import gbrain_client  # noqa: E402


class _StubConfig:
    def __init__(self, brain_root, preference="filesystem", enrich_cap=50, fs_max_age=0):
        self.brain_root = str(brain_root)
        self.gbrain_read_preference = preference
        self.gbrain_base_url = "http://unused"
        self.gbrain_api_key = ""
        self.gbrain_mcp_enrich_cap = enrich_cap
        self.gbrain_fs_max_age_minutes = fs_max_age


def _run(coro):
    return asyncio.run(coro)


def test_put_page_serializes_frontmatter_and_body(monkeypatch) -> None:
    """put_page must send ONE markdown content string (YAML frontmatter + body)."""
    captured: dict = {}

    async def fake_mcp_call(tool, arguments, source_id=""):
        captured["tool"] = tool
        captured["arguments"] = arguments
        return {"ok": True}

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)

    _run(gbrain_client.gbrain_put_page(
        "crm",
        "deals/demo",
        frontmatter={"owner": "Anwar", "stage": "Won", "amount": 120000},
        body="# Deal body\n\nSome notes.",
    ))

    assert captured["tool"] == "put_page"
    args = captured["arguments"]
    assert args["slug"] == "deals/demo"
    assert args["allow_empty"] is False
    content = args["content"]
    # YAML frontmatter block present with expected keys
    assert content.startswith("---")
    assert "owner: Anwar" in content
    assert "stage: Won" in content
    assert "amount: 120000" in content
    assert content.rstrip().endswith("# Deal body\n\nSome notes.")


def test_put_page_empty_frontmatter_sends_body_only(monkeypatch) -> None:
    """No frontmatter -> content is just the body (no empty YAML block)."""
    captured: dict = {}

    async def fake_mcp_call(tool, arguments, source_id=""):
        captured["arguments"] = arguments
        return {}

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)

    _run(gbrain_client.gbrain_put_page("crm", "companies/x", frontmatter={}, body="# Company"))

    assert captured["arguments"]["content"] == "# Company"


def test_fetch_pages_prefers_filesystem(monkeypatch, tmp_path) -> None:
    """Filesystem pages win over MCP; MCP must NOT be called when files exist."""
    brain = tmp_path / "brain" / "crm" / "deals"
    brain.mkdir(parents=True)
    (brain / "won-deal.md").write_text(
        "---\nowner: Anwar\n---\n\n# Won deal\n",
        encoding="utf-8",
    )
    (brain / "open-deal.md").write_text(
        "---\nowner: CheeHow\n---\n\n# Open deal\n",
        encoding="utf-8",
    )

    monkeypatch.setattr(gbrain_client, "get_config", lambda: _StubConfig(tmp_path / "brain"))

    mcp_called = []

    async def fake_mcp_call(*a, **k):
        mcp_called.append(True)
        return None

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)

    pages = _run(gbrain_client.gbrain_fetch_pages("crm", slug_prefix="deals/"))

    assert not mcp_called, "filesystem path should short-circuit MCP"
    assert len(pages) == 2
    slugs = {p["slug"] for p in pages}
    assert slugs == {"deals/won-deal", "deals/open-deal"}
    assert all(p["compiled_truth"] for p in pages)


def test_fetch_pages_falls_back_to_mcp_when_no_files(monkeypatch, tmp_path) -> None:
    """No markdown on disk -> fall back to MCP list_pages result."""
    monkeypatch.setattr(gbrain_client, "get_config", lambda: _StubConfig(tmp_path / "brain"))

    async def fake_mcp_call(tool, arguments, source_id=""):
        assert tool == "list_pages"
        return [{"slug": "deals/x", "title": "X"}]

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    # Avoid the N+1 get_page enrichment hitting the fake: patch fetch_page too.
    async def fake_fetch_page(source, slug):
        return {"slug": slug, "compiled_truth": "# x"}

    monkeypatch.setattr(gbrain_client, "gbrain_fetch_page", fake_fetch_page)

    pages = _run(gbrain_client.gbrain_fetch_pages("crm", slug_prefix="deals/"))

    assert len(pages) == 1
    assert pages[0]["slug"] == "deals/x"


def test_mcp_pagination_logs_boundary_warning_after_full_page(monkeypatch, caplog) -> None:
    """A full page followed by zero rows signals possible equal-timestamp truncation."""
    import logging
    caplog.set_level(logging.WARNING)

    rows_same_ts = [
        {"slug": f"deals/bulk-{i:03d}", "updated_at": "2026-08-01T10:00:00Z"}
        for i in range(100)
    ]
    calls = {"n": 0}

    async def fake(tool, *args, **kwargs):
        if tool != "list_pages":
            return []
        calls["n"] += 1
        if calls["n"] == 1:
            return rows_same_ts
        return []

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake)

    got = _run(gbrain_client.gbrain_fetch_pages("crm", limit=10000, slug_prefix="deals/"))
    assert len(got) == 100, len(got)
    assert calls["n"] == 2
    assert any("equal-timestamp boundary" in r.message for r in caplog.records)


def test_mcp_pagination_does_not_starve_a_prefix(monkeypatch, tmp_path) -> None:
    """A prefix beyond the first 100-row page must still be found (paginated).

    Regression test for the MoA critical: list_pages caps at 100 rows and a
    slug_prefix inhabiting page 2+ used to silently return []. We page
    via updated_after until the prefix quota is met.
    """
    monkeypatch.setattr(
        gbrain_client, "get_config",
        lambda: _StubConfig(tmp_path / "brain", preference="mcp"),
    )
    # Three pages of rows: companies (day 01), partners (day 02), deals (day 03)
    def make_page(base, n, day):
        return [
            {"slug": f"{base}/{i:03d}", "updated_at": f"2026-08-{day}T00:00:00Z"}
            for i in range(n)
        ]

    page_company = make_page("companies", 100, "01")
    page_partner = make_page("partners", 100, "02")
    page_deal = make_page("deals", 100, "03")

    def page_for(cursor):
        if not cursor:
            return page_company, True
        return (page_partner, True) if cursor <= "2026-08-01T00:00:00Z" else (
            (page_deal, True) if cursor <= "2026-08-02T00:00:00Z" else (None, False)
        )

    calls = []

    # The server reports fewer rows when it has no more pages.
    async def fake_mcp_call_with_exhaustion(tool, arguments, source_id=""):
        if tool != "list_pages":
            return []
        calls.append(dict(arguments))
        return page_for(arguments.get("updated_after") or "")[0] or []

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call_with_exhaustion)
    async def fake_fetch_page(source, slug):
        return {"slug": slug, "compiled_truth": "# " + slug}

    monkeypatch.setattr(gbrain_client, "gbrain_fetch_page", fake_fetch_page)

    pages = _run(gbrain_client.gbrain_fetch_pages("crm", limit=10000, slug_prefix="deals/"))

    # The prefix filter must reach the deals page — not silently empty.
    slugs = [p["slug"] for p in pages]
    assert slugs, "deals/ prefix must not be starved by earlier pages"
    assert all(s.startswith("deals/") for s in slugs)
    # All 100 deals returned (no truncation); first 50 enriched, rest kept
    # as metadata rows — never dropped.
    assert len(pages) == 100
    assert len(calls) >= 3

def test_stale_mirror_defers_to_mcp(monkeypatch, tmp_path) -> None:
    """Staleness guard: a mirror older than fs_max_age defers to MCP."""
    import os
    import time

    brain = tmp_path / "brain" / "crm" / "deals"
    brain.mkdir(parents=True)
    (brain / "old-deal.md").write_text("---\nowner: X\n---\n\n# Old\n", encoding="utf-8")
    # Age the file beyond the 1-minute guard.
    old = time.time() - 3600
    os.utime(brain / "old-deal.md", (old, old))

    monkeypatch.setattr(
        gbrain_client, "get_config",
        lambda: _StubConfig(tmp_path / "brain", preference="filesystem", fs_max_age=1),
    )

    mcp_called = []

    async def fake_mcp_call(tool, arguments, source_id=""):
        mcp_called.append(tool)
        if tool == "list_pages":
            return []
        return None

    async def fake_fetch_page(source, slug):
        return None

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    monkeypatch.setattr(gbrain_client, "gbrain_fetch_page", fake_fetch_page)

    pages = _run(gbrain_client.gbrain_fetch_pages("crm", slug_prefix="deals/"))
    assert "list_pages" in mcp_called, "stale mirror must fall through to MCP"
    assert pages == []


def test_search_uses_filesystem_fallback(monkeypatch, tmp_path) -> None:
    """Search degrades to a filesystem substring scan when MCP is down."""
    brain = tmp_path / "brain" / "crm" / "deals"
    brain.mkdir(parents=True)
    (brain / "warehouse-fit.md").write_text(
        "---\ntitle: Warehouse deal\n---\n\n# Warehouse fit\nLarge logistics site.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(gbrain_client, "get_config", lambda: _StubConfig(tmp_path / "brain"))

    mcp_called = []

    async def fake_mcp_call(*a, **k):
        mcp_called.append(True)
        return None

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)

    hits = _run(gbrain_client.gbrain_search("crm", "warehouse"))
    assert not mcp_called, "fs search should short-circuit MCP"
    assert len(hits) == 1
    assert hits[0]["slug"] == "deals/warehouse-fit"


def test_put_page_rejects_traversal_slug(monkeypatch) -> None:
    """Slug path traversal must be rejected before reaching MCP."""
    called = []

    async def fake_mcp_call(*a, **k):
        called.append(True)
        return {}

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    result = _run(gbrain_client.gbrain_put_page("crm", "deals/../../etc/passwd", body="x"))
    assert result is None
    assert not called, "unsafe slug must never reach MCP"


def test_enrich_cap_is_configurable(monkeypatch, tmp_path) -> None:
    """gbrain_mcp_enrich_cap controls how many rows get get_page enrichment."""
    monkeypatch.setattr(
        gbrain_client, "get_config",
        lambda: _StubConfig(tmp_path / "brain", preference="mcp", enrich_cap=2),
    )

    async def fake_mcp_call(tool, arguments, source_id=""):
        if tool != "list_pages":
            return None
        # One short page (3 rows) => single call, no exhaustion.
        return [{"slug": f"deals/{i}", "updated_at": f"2026-08-26T00:00:0{i}Z"} for i in range(3)]

    enriched = []

    async def fake_fetch_page(source, slug):
        enriched.append(slug)
        return {"slug": slug, "compiled_truth": "# " + slug}

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    monkeypatch.setattr(gbrain_client, "gbrain_fetch_page", fake_fetch_page)

    pages = _run(gbrain_client.gbrain_fetch_pages("crm", limit=100, slug_prefix="deals/"))
    assert len(pages) == 3
    assert len(enriched) == 2, "only the first <cap> rows are enriched"

def test_fetch_page_rejects_traversal_slug(monkeypatch, tmp_path) -> None:
    """gbrain_fetch_page must reject .. slugs before any filesystem/MCP work."""
    monkeypatch.setattr(gbrain_client, "get_config",
                        lambda: _StubConfig(tmp_path / "brain"))
    called = []

    async def fake_mcp_call(*a, **k):
        called.append(True)
        return {}

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    result = _run(gbrain_client.gbrain_fetch_page("crm", "deals/../../etc/passwd"))
    assert result is None
    assert not called, "unsafe slug must never reach MCP"


def test_safe_slug_and_source_units() -> None:
    """Traversal/absolute path markers are rejected for both slug and source."""
    assert gbrain_client._safe_slug("deals/../../etc") is None
    assert gbrain_client._safe_slug("/etc/passwd") is None
    assert gbrain_client._safe_slug("deals/nested/slug") == "deals/nested/slug"
    assert gbrain_client._safe_source("../crm") is None
    assert gbrain_client._safe_source("crm") == "crm"


def test_mcp_pagination_recovers_equal_timestamp_boundary(monkeypatch) -> None:
    """Bulk imports sharing one updated_at are not starved by a strict cursor."""
    ts = "2026-08-26T00:00:00Z"
    b1 = [{"slug": f"deals/a{i:03d}", "updated_at": ts} for i in range(100)]
    b2 = [{"slug": f"deals/b{i:03d}", "updated_at": ts} for i in range(100)]
    seq = [b1, b2]

    async def fake_mcp_call(tool, arguments, source_id=""):
        return seq.pop(0) if seq else []

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)

    rows = _run(gbrain_client._mcp_list_paginated("crm", "deals/", limit=1000))
    slugs = [r["slug"] for r in rows]
    assert len(slugs) == 200, f"expected both same-timestamp chunks, got {len(slugs)}"
    assert "deals/a099" in slugs
    assert "deals/b099" in slugs


def test_fs_search_stale_flag_and_search_defers(monkeypatch, tmp_path) -> None:
    """Search must not serve a stale mirror the listings would refuse."""
    import os
    import time

    brain = tmp_path / "brain" / "crm" / "deals"
    brain.mkdir(parents=True)
    f = brain / "old.md"
    f.write_text("---\ntitle: Old Deal\n---\n\n# Old\n", encoding="utf-8")
    old = time.time() - 3600
    os.utime(f, (old, old))
    monkeypatch.setattr(gbrain_client, "get_config",
                        lambda: _StubConfig(tmp_path / "brain", fs_max_age=1))

    hits, stale = gbrain_client._fs_search("crm", "old", 5)
    assert hits and stale is True, "stale flag must mirror the listing guard"

    called = []

    async def fake_mcp_call(*a, **k):
        called.append(a[0])
        return None

    monkeypatch.setattr(gbrain_client, "_mcp_call", fake_mcp_call)
    res = _run(gbrain_client.gbrain_search("crm", "old"))
    assert "search" in called, "stale fs must defer to MCP"
    assert res == []


def test_mcp_call_non_object_payload_returns_none(monkeypatch) -> None:
    """gbrain answering with a JSON array payload must degrade to None, not raise."""

    class _Resp:
        status_code = 200
        text = "event: message\ndata: []\n\n"

    class _Client:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, **kw):
            return _Resp()

    monkeypatch.setattr(gbrain_client.httpx, "AsyncClient", _Client)
    monkeypatch.setattr(gbrain_client, "get_config", lambda: _StubConfig("x"))
    assert asyncio.run(gbrain_client._mcp_call("get_page", {"slug": "a"})) is None


def test_mcp_call_non_object_result_returns_none(monkeypatch) -> None:
    """A JSON-RPC result that is not an object must degrade to None, not raise AttributeError."""

    class _Resp:
        status_code = 200
        text = 'event: message\ndata: {"result": ["not", "a", "dict"]}\n\n'

    class _Client:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, **kw):
            return _Resp()

    monkeypatch.setattr(gbrain_client.httpx, "AsyncClient", _Client)
    monkeypatch.setattr(gbrain_client, "get_config", lambda: _StubConfig("x"))
    assert asyncio.run(gbrain_client._mcp_call("get_page", {"slug": "a"})) is None
