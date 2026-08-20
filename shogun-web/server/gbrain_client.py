"""Shared HTTP client for gbrain MCP. Used by brain, docs, and dashboard endpoints.

Falls back to reading brain markdown files directly from the filesystem when
the gbrain HTTP server is unreachable.
"""
from __future__ import annotations

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
            "source_id": source,
        })
    return pages


async def gbrain_fetch_pages(
    source: str,
    *,
    limit: int = 200,
    slug_prefix: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Fetch pages from gbrain for a given source, optionally filtered by slug prefix.

    Falls back to reading markdown files from ~/brain/{source}/ when gbrain
    HTTP server is unreachable.
    """
    cfg = get_config()
    base = cfg.gbrain_base_url.rstrip("/")
    params = {"source_id": source, "limit": str(min(limit, 500))}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base}/api/pages", params=params)
            if resp.status_code >= 400:
                logger.warning("gbrain /api/pages returned %s: %s", resp.status_code, resp.text[:300])
                pages: List[dict] = []
            else:
                payload = resp.json()
                if isinstance(payload, list):
                    pages = payload
                elif isinstance(payload, dict):
                    pages = payload.get("pages") or payload.get("data") or payload.get("results") or []
                else:
                    pages = []
    except (httpx.HTTPError, Exception) as exc:
        logger.info("gbrain HTTP unavailable for %s, using filesystem fallback: %s", source, exc)
        pages = []

    # Filesystem fallback when gbrain returns nothing or is unreachable
    if not pages:
        pages = _filesystem_fallback(source, slug_prefix)

    if slug_prefix:
        pages = [p for p in pages if str(p.get("slug", "")).startswith(slug_prefix)]

    return pages


async def gbrain_fetch_page(source: str, slug: str) -> Optional[dict[str, Any]]:
    """Fetch a single page from gbrain."""
    cfg = get_config()
    base = cfg.gbrain_base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base}/api/pages/{slug}", params={"source_id": source})
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404:
                return None
            logger.warning("gbrain /api/pages/%s returned %s", slug, resp.status_code)
            return None
    except httpx.HTTPError as exc:
        logger.warning("gbrain fetch page error %s/%s: %s", source, slug, exc)
        return None


async def gbrain_search(
    source: str,
    query: str,
    limit: int = 20,
) -> List[dict[str, Any]]:
    """Search gbrain pages for a source."""
    cfg = get_config()
    base = cfg.gbrain_base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{base}/api/search",
                json={"query": query, "source_id": source, "limit": limit},
            )
            if resp.status_code >= 400:
                return []
            payload = resp.json()
            if isinstance(payload, list):
                return payload
            return payload.get("results") or payload.get("pages") or []
    except httpx.HTTPError as exc:
        logger.warning("gbrain search error for %s: %s", source, exc)
        return []