"""Shared HTTP client for gbrain MCP. Used by brain, docs, and dashboard endpoints.

gbrain v0.42+ uses MCP JSON-RPC protocol over HTTP (not REST).
This client calls the /mcp endpoint with tools/call methods.

Read strategy (configurable via ``gbrain_read_preference``):

* ``"filesystem"`` (default) — read ``~/brain/{source}/`` markdown files first.
  Full content, unbounded, no network. Falls back to MCP when the directory
  has no files. This is the authoritative source when the backend and the
  brain dir are co-located (the intended deployment).
* ``"mcp"`` — always read via MCP. Use for remote (OAuth-scoped) brain
  deployments where the markdown mirror is not mounted locally.

Writes (``gbrain_put_page``) always go through MCP ``put_page``; gbrain's
sync mirror propagates them to the filesystem on the co-located box.
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

# list_pages hard cap on the gbrain side (v0.42) — used to page through a
# source when the caller's limit exceeds one request.
_MCP_LIST_PAGE_SIZE = 100
# Enrichment cap: list_pages rows are metadata-only; enriching every row via
# get_page would be an N+1 explosion. Cap per fetch.
_MCP_ENRICH_CAP = 50
# Safety bound on the list_pages pagination loop (never infinite).
_MCP_LIST_MAX_PAGES = 200


def _parse_frontmatter_from_markdown(text: str) -> Dict[str, Any]:
    """Parse YAML frontmatter from a markdown file. Returns {} if none.

    Uses PyYAML when available (full nested lists/dicts); falls back to a
    flat ``key: value`` line parser otherwise.
    """
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    yaml_block = parts[1].strip()
    if not yaml_block:
        return {}
    try:
        import yaml  # local import: soft dependency, declared in requirements
        loaded = yaml.safe_load(yaml_block)
        if isinstance(loaded, dict):
            return loaded
        return {}
    except ImportError:
        pass
    except yaml.YAMLError:  # noqa: F821 - pyyaml present, fall back on parse failure
        pass

    result: Dict[str, Any] = {}
    for line in yaml_block.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Za-z0-9_][\w\s-]*):\s*(.*)$", line)
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip().strip("\"'")
            if val:
                result[key] = val
    return result


def _safe_source(source: str) -> Optional[str]:
    """Validate a source identifier; return it or None.

    Rejects path traversal and non-identifier values so the caller can
    never escape the brain directory.
    """
    if not source:
        return None
    if ".." in source or "/" in source or "\\" in source:
        return None
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", source):
        return None
    return source


def _brain_source_dir(source: str) -> Optional[pathlib.Path]:
    """Resolve the local markdown directory for a source, or None."""
    safe = _safe_source(source)
    if not safe:
        return None
    cfg = get_config()
    brain_dir = pathlib.Path(cfg.brain_root) / safe
    if not brain_dir.is_dir():
        return None
    return brain_dir


def _filesystem_fallback(source: str, slug_prefix: Optional[str] = None) -> List[dict[str, Any]]:
    """Read brain markdown files directly from the filesystem.

    Scans ~/brain/{source}/ for .md files and returns them in the same
    shape as gbrain's API: {slug, frontmatter, content, body}.
    """
    brain_dir = _brain_source_dir(source)
    if not brain_dir:
        return []

    pages: List[dict[str, Any]] = []
    for md_path in brain_dir.rglob("*.md"):
        if md_path.is_symlink():
            continue  # skip symlinks — avoids traversal outside brain_dir
        if md_path.name == "README.md":
            continue
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
    """Call a gbrain MCP tool over HTTP JSON-RPC via SSE.

    Raises ``httpx.HTTPError`` / ``json.JSONDecodeError`` on transport or
    protocol failure (callers decide whether to degrade to empty state).
    Returns None when gbrain answers but the tool produced no content.
    """
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

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{base}/mcp", json=payload, headers=headers)
        if resp.status_code >= 400:
            logger.warning("gbrain MCP /mcp returned %s: %s", resp.status_code, resp.text[:300])
            return None
        # SSE payload: "event: message\ndata: {json}". The final data: line
        # is the tool result; earlier lines are progress events.
        text = resp.text
        data_lines = [line[6:] for line in text.split("\n") if line.startswith("data: ")]
        if not data_lines:
            logger.warning("gbrain MCP returned no data: lines: %s", resp.text[:200])
            return None
        data = json.loads(data_lines[-1])
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


def _rows_from_batch(batch: Any) -> List[dict]:
    if isinstance(batch, list):
        return [r for r in batch if isinstance(r, dict)]
    if isinstance(batch, dict):
        inner = batch.get("pages") or batch.get("data") or batch.get("results") or []
        if isinstance(inner, list):
            return [r for r in inner if isinstance(r, dict)]
    return []


async def _mcp_list_paginated(source: str, slug_prefix: Optional[str], limit: int) -> List[dict]:
    """Collect pages for a source from list_pages, honouring a client-side prefix.

    gbrain's list_pages returns at most 100 metadata-only rows per call, has
    no offset param, and no server-side prefix filter. With several prefixes
    (deals/companies/partners/persons) one prefix can get zero rows when the
    first page belongs to other prefixes. We walk all pages with an
    ``updated_after`` cursor (sort updated_asc, cursor = max seen updated_at)
    and dedupe by slug, stopping at the prefix quota or source exhaustion.

    Known limit: rows sharing an identical updated_at beyond a 100-row page
    boundary can be skipped (updated_after is strict '>'); when a page adds
    zero new slugs we stop to avoid a loop. For CRM datasets updated_at
    values are effectively distinct.
    """
    target = max(limit, _MCP_LIST_PAGE_SIZE)
    collected: List[dict] = []
    seen: set[str] = set()
    cursor: Optional[str] = None

    for _ in range(_MCP_LIST_MAX_PAGES):
        args: dict = {"limit": _MCP_LIST_PAGE_SIZE, "sort": "updated_asc"}
        if cursor:
            args["updated_after"] = cursor
        batch = await _mcp_call("list_pages", args, source_id=source)
        rows = _rows_from_batch(batch)
        if not rows:
            break
        new_rows = 0
        batch_cursor = cursor
        for r in rows:
            key = str(r.get("slug", ""))
            if key and key not in seen:
                seen.add(key)
                collected.append(r)
                new_rows += 1
            updated = str(r.get("updated_at") or r.get("updatedAt") or "")
            if updated and (batch_cursor is None or updated > batch_cursor):
                batch_cursor = updated
        if slug_prefix:
            matches = sum(1 for p in collected if str(p.get("slug", "")).startswith(slug_prefix))
        else:
            matches = len(collected)
        if matches >= limit:
            break
        if len(rows) < _MCP_LIST_PAGE_SIZE:
            break  # server exhausted the source
        if new_rows == 0:
            break  # equal-timestamp boundary — avoid re-reading the same page
        cursor = batch_cursor

    return collected


def _read_preference() -> str:
    """Effective read preference: 'filesystem' or 'mcp'."""
    cfg = get_config()
    pref = (cfg.gbrain_read_preference or os.environ.get("GBRAIN_READ_PREFERENCE", "")).strip().lower()
    return "mcp" if pref == "mcp" else "filesystem"


async def gbrain_fetch_pages(
    source: str,
    *,
    limit: int = 200,
    slug_prefix: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Fetch pages from gbrain for a given source, optionally filtered by slug prefix.

    Filesystem first (unless ``gbrain_read_preference=mcp``): the local
    markdown mirror is unbounded and carries full content, whereas MCP
    ``list_pages`` only returns metadata-only rows. Falls back to an MCP
    paginated scan (with enrichment) when no local files exist.
    """
    if _read_preference() == "filesystem":
        fs_pages = _filesystem_fallback(source, slug_prefix)
        if fs_pages:
            return fs_pages[:limit] if limit and limit > 0 else fs_pages

    rows = await _mcp_list_paginated(source, slug_prefix, limit)
    pages: List[dict] = rows if not slug_prefix else [
        p for p in rows if str(p.get("slug", "")).startswith(slug_prefix)
    ]

    # list_pages rows are metadata-only; enrich a bounded window via get_page.
    # Rows beyond the enrichment window are returned as-is (slug/title only)
    # instead of being dropped — truncation would silently lose data.
    out: List[dict] = []
    for idx, p in enumerate(pages):
        if idx >= _MCP_ENRICH_CAP:
            out.append(p)
            continue
        slug = str(p.get("slug", ""))
        if not slug:
            out.append(p)
            continue
        try:
            full = await gbrain_fetch_page(source, slug)
        except Exception:
            full = None
        out.append(full if full else p)
    return out


async def gbrain_fetch_page(source: str, slug: str) -> Optional[dict[str, Any]]:
    """Fetch a single page — filesystem mirror first (if allowed), else MCP get_page."""
    if _read_preference() == "filesystem":
        brain_dir = _brain_source_dir(source)
        if brain_dir:
            slug_rel = slug.replace("\\", "/").strip("/")
            if slug_rel and ".." not in slug_rel:
                for rel in (f"{slug_rel}.md", f"{slug_rel}/index.md"):
                    md_path = brain_dir / rel
                    if md_path.is_file() and not md_path.is_symlink():
                        try:
                            text = md_path.read_text(encoding="utf-8", errors="replace")
                        except OSError:
                            continue
                        return {
                            "slug": slug,
                            "frontmatter": _parse_frontmatter_from_markdown(text),
                            "content": text,
                            "body": text,
                            "compiled_truth": text,
                            "source_id": source,
                        }

    result = await _mcp_call("get_page", {"slug": slug}, source_id=source)

    if isinstance(result, dict):
        if not result.get("compiled_truth"):
            result["compiled_truth"] = result.get("content") or result.get("body") or ""
        return result
    if isinstance(result, str):
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
        "limit": min(limit, _MCP_LIST_PAGE_SIZE),
    }, source_id=source)

    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return result.get("results") or result.get("pages") or []
    return []


async def gbrain_put_page(
    source: str,
    slug: str,
    *,
    frontmatter: Optional[dict] = None,
    body: str = "",
    allow_empty: bool = False,
) -> Optional[dict[str, Any]]:
    """Write/update a single page in gbrain via MCP ``put_page``.

    Serialises the frontmatter dict to YAML and concatenates the body into
    one markdown ``content`` payload.

    Source scoping note: ``put_page`` has no per-call ``source_id`` — the
    write target source is bound server-side to the registered client.
    ``source`` is validated for path safety and kept for symmetry only.
    """
    if not _safe_source(source):
        logger.warning("gbrain_put_page: rejected unsafe source %r", source)
        return None

    fm = frontmatter or {}
    try:
        import yaml  # soft dependency; declared in requirements.txt
        yaml_block = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()
    except ImportError:
        yaml_block = "\n".join(f"{k}: {v}" for k, v in fm.items() if v not in (None, ""))

    if yaml_block in ("{}", ""):
        content = body
    else:
        content = f"---\n{yaml_block}\n---\n\n{body}"

    arguments: dict = {"slug": slug, "content": content, "allow_empty": allow_empty}
    return await _mcp_call("put_page", arguments)