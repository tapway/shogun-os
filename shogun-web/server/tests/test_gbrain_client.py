"""Tests: gbrain client — put_page serialization + filesystem-first fetch.

Covers the two behaviours added on the CRM-brain-direct change:
  1. ``gbrain_put_page`` serialises frontmatter (dict -> YAML) into a single
     markdown ``content`` payload for the MCP ``put_page`` op.
  2. ``gbrain_fetch_pages`` prefers the filesystem (~/brain/{source}/*.md)
     when markdown files exist, without touching the MCP endpoint.
"""

import asyncio
import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import gbrain_client  # noqa: E402


class _StubConfig:
    def __init__(self, brain_root, preference="filesystem"):
        self.brain_root = str(brain_root)
        self.gbrain_read_preference = preference
        self.gbrain_base_url = "http://unused"
        self.gbrain_api_key = ""


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

    async def fake_mcp_call(tool, arguments, source_id=""):
        if tool != "list_pages":
            return []
        calls.append(dict(arguments))
        page, more = page_for(arguments.get("updated_after") or "")
        return page if page else []

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
