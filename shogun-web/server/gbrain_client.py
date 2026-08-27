"""Shared HTTP client for gbrain MCP. Used by brain, docs, and dashboard endpoints.

gbrain v0.42+ uses MCP JSON-RPC protocol over HTTP (not REST).
This client calls the /mcp endpoint with tools/call methods.

Read strategy (configurable via ``gbrain_read_preference``):

* ``"filesystem"`` (default) — read ``~/brain/{source}/`` markdown files first.
  Full content, unbounded, no network. All filesystem I/O runs through
  ``asyncio.to_thread`` so a large brain dir never blocks the event loop.
  Falls back to MCP when the directory has no files. Optional staleness
  guard (on by default, ``gbrain_fs_max_age_minutes`` = 60): if the newest
  markdown is older than the threshold the mirror is considered stale and
  MCP is tried first (0 disables the guard).
* ``"mcp"`` — always read via MCP. Use for remote (OAuth-scoped) brain
  deployments where the markdown mirror is not mounted locally. Note:
  ``list_pages`` rows past the enrichment cap (``gbrain_mcp_enrich_cap``,
  default 50) are metadata-only, so MCP-only mode is not recommended for
  large sources (>50 rows) that need frontmatter fields.

Writes (``gbrain_put_page``) always go through MCP ``put_page``; gbrain's
sync mirror propagates them to the filesystem on the co-located box. If that
sync fails the filesystem-first reads can serve stale data — the staleness
guard above is the mitigation (on by default).

Error contract: ``_mcp_call`` RAISES on transport/protocol failure
(``httpx.HTTPError``, ``json.JSONDecodeError``, ``KeyError``, ``TypeError``)
and returns None only when gbrain answers but the tool produced no content.
Every external call site must wrap these functions in try/except and degrade
to its documented empty state (see ``_fetch_brain_pages_safe`` in
dashboard.py and the guarded callers in gateway.py).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx
from config import get_config

logger = logging.getLogger(__name__)

# list_pages hard cap on the gbrain side (v0.42) — used to page through a
# source when the caller's limit exceeds one request.
_MCP_LIST_PAGE_SIZE = 100
# Safety bound on the list_pages pagination loop (never infinite).
_MCP_LIST_MAX_PAGES = 200


def _enrich_cap() -> int:
    """Enrichment cap for metadata-only list_pages rows.

    list_pages rows carry no frontmatter; enriching every row via get_page
    would be an N+1 explosion. Cap per fetch — configurable via
    ``gbrain_mcp_enrich_cap`` (raise for large MCP-only sources).
    """
    cap = getattr(get_config(), "gbrain_mcp_enrich_cap", 50)
    try:
        return max(1, int(cap))
    except (TypeError, ValueError):
        return 50


def _parse_frontmatter_from_markdown(text: str) -> Dict[str, Any]:
    """Parse YAML frontmatter from a markdown file. Returns {} if none.

    Uses PyYAML when available (full nested lists/dicts); falls back to a
    flat ``key: value`` line parser otherwise (logs a warning if the block
    looks nested, since the flat parser cannot represent lists/dicts).
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

    if any(line.startswith(("  ", "- ", "\t")) for line in yaml_block.split("\n") if line.strip()):
        logger.warning(
            "frontmatter fallback parser hit nested/list YAML — install pyyaml "
            "for correct parsing (flat key: value only): %.80s", yaml_block
        )

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


def _safe_slug(slug: str) -> Optional[str]:
    """Validate a page slug against path traversal; return it or None.

    Slugs may contain ``/`` (nested pages) but never ``..`` or absolute
    path markers, so a slug can never resolve outside the source dir.
    """
    if not slug or slug.startswith(("/", "\\")):
        return None
    if ".." in slug:
        return None
    return slug


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


def _fs_max_age_minutes() -> int:
    """Staleness window in minutes (on by default = 60), or 0 to disable."""
    return getattr(get_config(), "gbrain_fs_max_age_minutes", 60) or 0


_FS_NEWEST_CACHE: Dict[str, Tuple[float, float]] = {}
_FS_NEWEST_CACHE_TTL = 15.0  # seconds — far below the minutes-scale staleness window


def _newest_mtime(brain_dir: pathlib.Path) -> float:
    """Newest ``.md`` mtime in a source dir (short-TTL cached walk).

    Single-page reads call this on every ``gbrain_fetch_page``; without the
    cache that is an O(N) walk + stat per read, and enrichment can issue up
    to ``enrich_cap`` reads per listing. The TTL sits far below the
    staleness window (minutes), so it cannot mask a stale mirror.
    """
    key = str(brain_dir)
    now = time.monotonic()
    hit = _FS_NEWEST_CACHE.get(key)
    if hit is not None and (now - hit[1]) < _FS_NEWEST_CACHE_TTL:
        return hit[0]
    newest = 0.0
    root_resolved = brain_dir.resolve()
    for md in brain_dir.rglob("*.md"):
        if md.is_symlink():
            continue
        try:
            md.resolve().relative_to(root_resolved)
        except ValueError:
            continue  # symlinked-dir escape — never trust its mtime
        try:
            newest = max(newest, md.stat().st_mtime)
        except OSError:
            pass
    _FS_NEWEST_CACHE[key] = (newest, now)
    return newest


def _scan_source_dir(
    brain_dir: pathlib.Path,
    slug_prefix: Optional[str],
    limit: Optional[int] = None,
    max_age_min: int = 0,
) -> Tuple[List[Dict[str, Any]], bool]:
    """Synchronous markdown scan of one source dir (runs in a worker thread).

    Uses ``os.walk(followlinks=False)`` — symlinked directories are skipped
    entirely (rglob *does* follow them), so a symlink inside the brain root
    cannot escape ``brain_dir``. Returns ``(pages, stale)``: ``stale`` is True
    when max_age_min > 0 and the newest file exceeds the threshold. The
    staleness timestamp comes from this same walk — no second blocking pass.
    """
    pages: List[Dict[str, Any]] = []
    source = brain_dir.name
    max_age_sec = max_age_min * 60.0
    newest = 0.0

    for root, dirs, files in os.walk(str(brain_dir), followlinks=False):
        dirs[:] = sorted(d for d in dirs if not os.path.islink(os.path.join(root, d)))
        for name in sorted(files):
            md_path = pathlib.Path(root) / name
            if md_path.is_symlink():
                continue  # skip symlinked files — avoids traversal outside brain_dir
            if md_path.name == "README.md":
                continue
            rel = md_path.relative_to(brain_dir)
            slug = str(rel).replace("\\", "/")
            if not slug.endswith(".md"):
                # Only markdown feeds listings AND freshness: a stray
                # .json/.txt mtime must not mask a stale markdown mirror.
                continue
            slug = slug[:-3]
            if slug_prefix and not slug.startswith(slug_prefix):
                continue
            try:
                newest = max(newest, md_path.stat().st_mtime)
            except OSError:
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
            if limit and len(pages) >= limit:
                break  # bound memory on huge sources
        if limit and len(pages) >= limit:
            break

    stale = False
    if max_age_sec > 0 and newest > 0:
        stale = (time.time() - newest) > max_age_sec
    return pages, stale




def _read_page_file_sync(
    brain_dir: pathlib.Path, slug: str
) -> Tuple[Optional[Dict[str, Any]], bool]:
    """Synchronous single-page read (worker thread).

    Returns (page, stale). Stale mirrors the listing-path guard: compute the
    newest mtime of files in the dir and compare to the staleness window, so
    the single-page fetch cannot silently serve a broken-sync mirror.
    """
    slug_rel = slug.replace("\\", "/").strip("/")
    # Cached newest-mtime walk (short TTL): a per-read rglob here was
    # O(N) stat work for every enrichment get_page call.
    newest = _newest_mtime(brain_dir)
    stale = False
    max_age_min = _fs_max_age_minutes()
    if max_age_min > 0 and newest > 0:
        stale = (time.time() - newest) > (max_age_min * 60.0)
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
                "source_id": brain_dir.name,
            }, stale
    return None, stale

async def _filesystem_fallback(
    source: str,
    slug_prefix: Optional[str],
    limit: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], bool]:
    """Read brain markdown files directly from the filesystem (worker thread).

    Returns ``(pages, stale)``. Scan and staleness run in ONE to_thread pass,
    so enabling the staleness guard never adds a second blocking walk on
    the event loop.
    """
    brain_dir = _brain_source_dir(source)
    if not brain_dir:
        return [], False
    return await asyncio.to_thread(
        _scan_source_dir, brain_dir, slug_prefix, limit, _fs_max_age_minutes()
    )


async def _mcp_call(tool: str, arguments: dict, source_id: str = "") -> Any:
    """Call a gbrain MCP tool over HTTP JSON-RPC via SSE.

    CONTRACT (shared utility — read before adding call sites):
    * RAISES ``httpx.HTTPError`` / ``json.JSONDecodeError`` / ``KeyError`` /
      ``TypeError`` on transport or protocol failure. Callers decide whether
      to degrade to an empty state — wrap every call site accordingly.
    * Returns None when gbrain answers but the tool produced no content.
    * Malformed protocol responses (non-object payloads) return None;
      transport and JSON-decode failures raise as documented above.
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
        if not isinstance(data, dict):
            logger.warning("gbrain MCP returned a non-object payload: %s", type(data).__name__)
            return None
        result = data.get("result", {})
        if not isinstance(result, dict):
            logger.warning("gbrain MCP result is not an object: %s", type(result).__name__)
            return None
        content = result.get("content", [])
        if content and isinstance(content, list) and len(content) > 0:
            first = content[0]
            text_val = first.get("text", "") if isinstance(first, dict) else ""
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

    Equal-timestamp boundary guard: rows sharing an identical updated_at at a
    page boundary are skipped by strict ``>``. When a page adds zero new
    slugs we re-fetch the boundary once — dedupe by slug makes the re-scan
    safe — before stopping, so bulk imports at one timestamp are recovered.
    """
    collected: List[dict] = []
    seen: set[str] = set()
    cursor: Optional[str] = None
    rescanned_boundary = False
    prev_batch_full = False
    matches = 0

    for _ in range(_MCP_LIST_MAX_PAGES):
        args: dict = {"limit": _MCP_LIST_PAGE_SIZE, "sort": "updated_asc"}
        if cursor:
            args["updated_after"] = cursor
        batch = await _mcp_call("list_pages", args, source_id=source)
        rows = _rows_from_batch(batch)
        if not rows:
            if prev_batch_full and matches < limit:
                logger.warning(
                    "gbrain list_pages(%s): zero rows after a full page — "
                    "possible equal-timestamp boundary truncation (strict > "
                    "cursor cannot page across identical updated_at values)",
                    source,
                )
            break
        prev_batch_full = len(rows) >= _MCP_LIST_PAGE_SIZE
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
            if rescanned_boundary or cursor is None or batch_cursor is None or batch_cursor == cursor:
                break  # genuinely stalled — avoid re-reading the same page
            # Zero progress but a fresh cursor: equal-timestamp boundary.
            # Re-fetch it once; slug-dedupe absorbs any repeated rows.
            rescanned_boundary = True
            cursor = batch_cursor
            continue
        rescanned_boundary = False
        cursor = batch_cursor

    return collected


def _read_preference() -> str:
    """Effective read preference: 'filesystem' or 'mcp'.

    WebConfig.gbrain_read_preference already captures the
    GBRAIN_READ_PREFERENCE env var at class-definition time (boot), so no
    call-time env re-read is needed — a runtime env change requires a
    process restart, which matches how the rest of Config behaves.
    """
    pref = (get_config().gbrain_read_preference or "filesystem").strip().lower()
    return "mcp" if pref == "mcp" else "filesystem"


async def gbrain_fetch_pages(
    source: str,
    *,
    limit: int = 200,
    slug_prefix: Optional[str] = None,
) -> List[dict[str, Any]]:
    """Fetch pages from gbrain for a given source, optionally filtered by slug prefix.

    Filesystem first (unless ``gbrain_read_preference=mcp`` or the mirror is
    stale): the local markdown mirror is unbounded and carries full content,
    whereas MCP ``list_pages`` only returns metadata-only rows. Falls back to
    an MCP paginated scan (with enrichment) when no local files exist.
    """
    if _read_preference() == "filesystem":
        fs_pages, fs_stale = await _filesystem_fallback(source, slug_prefix, limit)
        if fs_pages and not fs_stale:
            return fs_pages
        if fs_pages and fs_stale:
            logger.warning("gbrain fetch_pages: file mirror for %r is stale — deferring to MCP", source)

    rows = await _mcp_list_paginated(source, slug_prefix, limit)
    pages: List[dict] = rows if not slug_prefix else [
        p for p in rows if str(p.get("slug", "")).startswith(slug_prefix)
    ]

    # list_pages rows are metadata-only; enrich a bounded window via get_page.
    # Rows beyond the enrichment window are returned as-is (slug/title only,
    # blank frontmatter-derived fields downstream) — log the truncation so
    # MCP-only deployments get a signal instead of silently blank columns.
    cap = _enrich_cap()
    if len(pages) > cap:
        logger.warning(
            "gbrain_fetch_pages(%s): %d rows past enrichment cap %d are metadata-only "
            "(frontmatter fields blank) — raise gbrain_mcp_enrich_cap or use "
            "filesystem mode for large sources",
            source, len(pages) - cap, cap,
        )
    out: List[dict] = []
    for idx, p in enumerate(pages):
        if idx >= cap:
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
    # Validate the slug unconditionally: MCP servers map slugs to filesystem
    # paths too (see gbrain_put_page rationale), so get_page must never send
    # a traversal slug regardless of read preference.
    if not _safe_slug(slug):
        logger.warning("gbrain_fetch_page: rejected unsafe slug %r", slug)
        return None
    if _read_preference() == "filesystem":
        brain_dir = _brain_source_dir(source)
        if brain_dir:
            page, stale = await asyncio.to_thread(
                _read_page_file_sync, brain_dir, slug
            )
            if page and not stale:
                return page
            if page and stale:
                logger.warning(
                    "gbrain_fetch_page: file mirror for %r is stale — deferring to MCP", source
                )
            elif not page:
                logger.debug(
                    "gbrain_fetch_page: %r not in file mirror — trying MCP", slug
                )

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


def _fs_search(source: str, query: str, limit: int) -> Tuple[List[dict[str, Any]], bool]:
    """Synchronous substring search over the filesystem mirror (worker thread).

    Returns ``(hits, stale)`` — ``stale`` uses the same freshness guard
    as the listing path, so search never serves a mirror the listings
    refuse.
    """
    brain_dir = _brain_source_dir(source)
    if not brain_dir:
        return [], False
    q = query.lower()
    hits: List[dict[str, Any]] = []
    # Scan the WHOLE mirror (limit=None): `limit` caps hits returned, not
    # pages scanned — a match at file N>limit must still be found.
    pages, stale = _scan_source_dir(brain_dir, None, None, _fs_max_age_minutes())
    for page in pages:
        title = str(page.get("frontmatter", {}).get("title", "") or page["slug"])
        if q in title.lower() or q in page["compiled_truth"].lower():
            hits.append({
                "slug": page["slug"],
                "title": title,
                "snippet": page["compiled_truth"][:200],
                "source_id": source,
            })
            if len(hits) >= limit:
                break
    return hits, stale


async def gbrain_search(
    source: str,
    query: str,
    limit: int = 20,
) -> List[dict[str, Any]]:
    """Search gbrain pages for a source.

    Filesystem-first (honouring ``gbrain_read_preference``): a substring
    search over the local mirror means Search keeps working when MCP is down
    — the same degradation contract as the listing endpoints. Falls back to
    MCP semantic search when the filesystem yields nothing (semantic matching
    is MCP-only by design; the fs pass is a coarse safety net).

    Note: MCP search is capped at ``_MCP_LIST_PAGE_SIZE`` results; a
    warning is logged when the requested limit exceeds the cap.
    """
    if limit > _MCP_LIST_PAGE_SIZE:
        logger.warning(
            "gbrain_search: requested limit %d exceeds MCP cap %d — capping",
            limit, _MCP_LIST_PAGE_SIZE,
        )
    effective = min(limit, _MCP_LIST_PAGE_SIZE)

    if _read_preference() == "filesystem":
        brain_dir = _brain_source_dir(source)
        if brain_dir:
            fs_hits, fs_stale = await asyncio.to_thread(_fs_search, source, query, effective)
            if fs_hits and not fs_stale:
                return fs_hits
            if fs_hits and fs_stale:
                logger.warning(
                    "gbrain_search: file mirror for %r is stale — deferring to MCP", source
                )

    result = await _mcp_call("search", {
        "query": query,
        "limit": effective,
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
    Slugs are validated against traversal (``..``) before being sent, in
    case the server maps them to filesystem paths.
    """
    if not _safe_source(source):
        logger.warning("gbrain_put_page: rejected unsafe source %r", source)
        return None
    if not _safe_slug(slug):
        logger.warning("gbrain_put_page: rejected unsafe slug %r", slug)
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
