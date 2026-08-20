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
    brain_dir = pathlib.Path.home() / "brain" / source
    if not brain_dir.is_dir():
        return []

    pages: List[dict[str, Any]] = []
    for md_path in brain_dir.rglob("*.md"):
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
            text = resp.text
            # Extract the JSON from SSE data: line
            for line in text.split("\n"):
                if line.startswith("data: "):
                    text = line[6:]
                    break
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
    except (httpx.HTTPError, Exception) as exc:
        logger.info("gbrain MCP unavailable for %s: %s", source_id or tool, exc)
        return None


async def gbrain_fetch_pages(
    source: str,
    *,
    limit: int = 200,
    slug_prefix: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Fetch pages from gbrain for a given source, optionally filtered by slug prefix.

    Uses MCP list_pages tool. Falls back to reading markdown files from
    ~/brain/{source}/ when gbrain HTTP server is unreachable.
    """
    # Try MCP first
    result = await _mcp_call("list_pages", {
        "limit": min(limit, 500),
        "sort": "created_desc",
    }, source_id=source)

    pages: List[dict] = []
    if isinstance(result, list):
        pages = result
    elif isinstance(result, dict):
        pages = result.get("pages") or result.get("data") or result.get("results") or []

    # Enrich: for each page, fetch full content via get_page
    if pages and slug_prefix:
        pages = [p for p in pages if str(p.get("slug", "")).startswith(slug_prefix)]

    # If we got pages but they lack compiled_truth, fetch full content
    if pages and not any(p.get("compiled_truth") for p in pages):
        enriched = []
        for p in pages[:limit]:
            slug = p.get("slug", "")
            if not slug:
                enriched.append(p)
                continue
            full = await gbrain_fetch_page(source, slug)
            if full:
                enriched.append(full)
            else:
                enriched.append(p)
        pages = enriched

    # Filesystem fallback when gbrain returns nothing or is unreachable
    if not pages:
        pages = _filesystem_fallback(source, slug_prefix)

    if slug_prefix:
        pages = [p for p in pages if str(p.get("slug", "")).startswith(slug_prefix)]

    return pages


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
