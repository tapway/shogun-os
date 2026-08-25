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

    monkeypatch.setattr(Path, "home", lambda: tmp_path)

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
    monkeypatch.setattr(Path, "home", lambda: tmp_path)  # empty brain dir

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