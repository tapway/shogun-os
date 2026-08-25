"""Shared HTTP client for gbrain MCP. Used by brain, docs, and dashboard endpoints.

gbrain v0.42+ uses MCP JSON-RPC protocol over HTTP (not REST).
This client calls the /mcp endpoint with tools/call methods.

Falls back to reading brain markdown files directly from the filesystem when
the gbrain HTTP server is unreachable.
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import re
from typing import Any, Dict, List, Optional

import httpx
import yaml
from config import get_config

logger = logging.getLogger(__name__)


def _parse_frontmatter_from_markdown(text: str) -> Dict[str, Any]:
    """Parse YAML frontmatter from a markdown file. Returns {} if none."""
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    yaml_block = parts[1].strip()
    result: Dict[str, Any] = {}
    for line in yaml_block.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^(\w[\w\s-]*):\s*(.*)$", line)
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip().strip("\"'")
            if val:
                result[key] = val
    return result


def _filesystem_fallback(source: str, slug_prefix: Optional[str] = None) -> List[dict[str, Any]]:
    """Read brain markdown files directly from the filesystem.

    Scans ~/brain/{source}/ for .md files and returns them in the same
    shape as gbrain's API: {slug, frontmatter, content, body}.
    """
    # Sanitize source: reject path traversal and non-identifier values.
    if not source or ".." in source or "/" in source or "\\" in source or not source.replace("-", "").replace("_", "").isalnum():
        return []
    brain_dir = pathlib.Path.home() / "brain" / source
    if not brain_dir.is_dir():
        return []

    pages: List[dict[str, Any]] = []
    for md_path in brain_dir.rglob("*.md"):
        if md_path.is_symlink():
            continue  # skip symlinks — avoids traversal outside brain_dir
        if md_path.name == "README.md":
            continue
        # Compute slug relative to the brain/{source}/ directory
        slug = str(md_path.relative_to(brain_dir)).replace("\\", "/").replace(".md", "")
        if slug_prefix and not slug.startswith(slug_prefix):
            continue
        try:
            text = md_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        fm = _parse_frontmatter_from_markdown(text)
        pages.append({
            "slug": slug,
            "frontmatter": fm,
            "content": text,
            "body": text,
            "compiled_truth": text,
            "source_id": source,
        })
    return pages


async def _mcp_call(tool: str, arguments: dict, source_id: str = "") -> Any:
    """Call a gbrain MCP tool over HTTP JSON-RPC. Returns the parsed result content."""
    cfg = get_config()
    base = cfg.gbrain_base_url.rstrip("/")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if cfg.gbrain_api_key:
        headers["Authorization"] = f"Bearer {cfg.gbrain_api_key}"

    if source_id:
        arguments.setdefault("source_id", source_id)

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool, "arguments": arguments},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base}/mcp", json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning("gbrain MCP /mcp returned %s: %s", resp.status_code, resp.text[:300])
                return None
            # Response is SSE format: "event: message\ndata: {json}"
            # A single JSON-RPC call returns one event; use the LAST data: line
            # (the final response), robust to preceding ping/comment events.
            text = resp.text
            data_lines = [line[6:] for line in text.split("\n") if line.startswith("data: ")]
            if not data_lines:
                logger.warning("gbrain MCP returned no data: lines: %s", resp.text[:200])
                return None
            text = data_lines[-1]
            data = json.loads(text)
            result = data.get("result", {})
            content = result.get("content", [])
            if content and isinstance(content, list) and len(content) > 0:
                text_val = content[0].get("text", "")
                if text_val:
                    try:
                        return json.loads(text_val)
                    except (json.JSONDecodeError, TypeError):
                        return text_val
            return None
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.info("gbrain MCP unavailable for %s: %s", source_id or tool, exc)
        return None


async def gbrain_fetch_pages(
    source: str,
    *,
    limit: int = 200,
    slug_prefix: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Fetch pages from gbrain for a given source, optionally filtered by slug prefix.

    Prefers the filesystem (~/brain/{source}/*.md) first — it is unbounded and
    carries full frontmatter + body, whereas the MCP ``list_pages`` op returns
    at most 100 metadata-only rows (slug/type/title/updated_at). Falls back to
    MCP when no markdown files exist locally.
    """
    # Filesystem first: authoritative, unbounded, full content.
    fs_pages = _filesystem_fallback(source, slug_prefix)
    if fs_pages:
        return fs_pages[:limit] if limit and limit > 0 else fs_pages

    # Fallback: MCP list_pages (capped server-side at 100, metadata-only).
    result = await _mcp_call("list_pages", {
        "limit": min(limit, 100) if limit else 100,
        "sort": "created_desc",
    }, source_id=source)

    pages: List[dict] = []
    if isinstance(result, list):
        pages = result
    elif isinstance(result, dict):
        pages = result.get("pages") or result.get("data") or result.get("results") or []

    if pages and slug_prefix:
        pages = [p for p in pages if str(p.get("slug", "")).startswith(slug_prefix)]

    # list_pages returns metadata only — enrich full content via get_page.
    # Cap to 50 to avoid an N+1 request explosion.
    enriched = []
    for p in pages[:min(len(pages), 50)]:
        slug = p.get("slug", "")
        if not slug:
            enriched.append(p)
            continue
        full = await gbrain_fetch_page(source, slug)
        enriched.append(full if full else p)
    pages = enriched

    return pages


async def gbrain_put_page(
    source: str,
    slug: str,
    *,
    frontmatter: Optional[dict] = None,
    body: str = "",
    allow_empty: bool = False,
) -> Optional[dict[str, Any]]:
    """Write/update a single page in gbrain via MCP ``put_page``.

    gbrain stores a page as full markdown ``content`` with a YAML frontmatter
    block. We serialise the frontmatter dict to YAML and concatenate the body.

    Note on source scoping: ``put_page`` has NO per-call ``source_id`` — the
    write target source is server-side (bound to the OAuth client at
    registration). We still accept ``source`` for caller symmetry and use it
    only when the server accepts an explicit ``source_id`` override.
    """
    fm = frontmatter or {}
    yaml_block = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()
    if yaml_block in ("{}", ""):
        content = body
    else:
        content = f"---\n{yaml_block}\n---\n\n{body}"

    arguments: dict = {"slug": slug, "content": content, "allow_empty": allow_empty}
    # put_page has no source_id param in v0.42; source is server-scoped.
    return await _mcp_call("put_page", arguments)


async def gbrain_fetch_page(source: str, slug: str) -> Optional[dict[str, Any]]:
    """Fetch a single page from gbrain via MCP get_page tool."""
    result = await _mcp_call("get_page", {"slug": slug}, source_id=source)

    if isinstance(result, dict):
        # Ensure compiled_truth is populated
        if not result.get("compiled_truth"):
            result["compiled_truth"] = result.get("content") or result.get("body") or ""
        return result
    if isinstance(result, str):
        # Fallback: got raw text
        return {
            "slug": slug,
            "compiled_truth": result,
            "content": result,
            "frontmatter": _parse_frontmatter_from_markdown(result),
            "source_id": source,
        }
    return None


async def gbrain_search(
    source: str,
    query: str,
    limit: int = 20,
) -> List[dict[str, Any]]:
    """Search gbrain pages for a source via MCP search tool."""
    result = await _mcp_call("search", {
        "query": query,
        "limit": limit,
    }, source_id=source)

    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return result.get("results") or result.get("pages") or []
    return []
