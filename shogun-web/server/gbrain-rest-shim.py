#!/usr/bin/env python3
"""gbrain-rest-shim.py — minimal gbrain-compatible HTTP server for shogun-web.

Serves the MCP JSON-RPC surface shogun-web's gbrain_client.py expects
(POST /mcp, tools/call over an SSE envelope) plus a legacy REST /api/pages
helper, all by querying the gbrain Postgres `pages` table directly. Binds
127.0.0.1:7432 — localhost only.

Tools implemented:
  * list_pages  ({source_id, limit, sort, updated_after}) -> page rows (FULL
                 content so the client's enrichment cap can't blank fields)
  * get_page    ({source_id, slug}) -> single page
  * search      ({source_id, query, limit}) -> {results: [...]} via tsvector
  * put_page    ({slug, ...}) -> read-only stub (dashboards don't write)

The dashboard's gbrain_client uses gbrain_read_preference=mcp, so traffic
routes here through /mcp. Envelope: SSE "data: {json}".
"""
import base64
import json
import re
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import psycopg2
import psycopg2.extras

# Canonical credential (same fallback chain as crm-dashboard/lib/db.ts)
PG_PASS = os.environ.get("GBRAIN_PG_PASSWORD") or base64.b64decode(
    "aGVybWVzX3Mzc3Npb25zXzIwMjY="
).decode()

DSN = {
    "host": os.environ.get("GBRAIN_PG_HOST", "127.0.0.1"),
    "port": int(os.environ.get("GBRAIN_PG_PORT", "5432")),
    "user": os.environ.get("GBRAIN_PG_USER", "hermes"),
    "password": PG_PASS,
    "dbname": os.environ.get("GBRAIN_PG_DB", "gbrain"),
}

# Department source -> real slug prefixes (single `default` brain has no
# per-dept sources). Anything unlisted defaults to "<name>/%" and "<name>-%".
PREFIX_MAP = {
    "crm": ("deals/%", "companies/%", "partners/%", "partner/%"),
    "finance": ("data/%", "wiki/finance%", "finance/%"),
    "procurement": ("projects/%", "products/%", "procurement/%"),
}

PAGE_COLS = (
    "id, source_id, slug, type, page_kind, title, compiled_truth, timeline, "
    "frontmatter, created_at, updated_at, effective_date, source_path"
)


def _query(sql: str, params=()):
    conn = psycopg2.connect(**DSN)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def _iso(v):
    """ISO-8601 UTC string, lexicographic-friendly (matches the client's
    updated_at cursor string compare)."""
    if v is None:
        return None
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)


def _serialize(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if k in ("created_at", "updated_at", "effective_date"):
            out[k] = _iso(v)
        else:
            out[k] = v
    fm = out.get("frontmatter")
    if fm is not None and not isinstance(fm, dict):
        try:
            if isinstance(fm, str):
                out["frontmatter"] = json.loads(fm)
            else:
                out["frontmatter"] = dict(fm)
        except Exception:
            pass
    out.setdefault("content", out.get("compiled_truth") or "")
    return out


def _source_patterns(source: str):
    return PREFIX_MAP.get(source, (f"{source}/%", f"{source}-%"))


def _list_pages(source: str, limit: int, sort: str, after=None) -> list:
    if source in ("", "default"):
        where, params = "deleted_at IS NULL", []
    else:
        pats = _source_patterns(source)
        clauses = " OR ".join("slug LIKE %s" for _ in pats)
        where = f"deleted_at IS NULL AND ({clauses})"
        params = list(pats)
    if after:
        where += " AND updated_at > %s"
        params.append(after)
    order = "ASC" if str(sort).endswith("_asc") else "DESC"
    rows = _query(
        f"SELECT {PAGE_COLS} FROM pages WHERE {where} "
        f"ORDER BY updated_at {order} LIMIT %s",
        (*params, limit),
    )
    return [_serialize(r) for r in rows]


def _get_page(source: str, slug: str):
    if not slug:
        return None
    if source in ("", "default"):
        where, params = "deleted_at IS NULL AND slug = %s", [slug]
    else:
        pats = _source_patterns(source)
        clauses = " OR ".join("slug LIKE %s" for _ in pats)
        where = f"deleted_at IS NULL AND slug = %s AND ({clauses})"
        params = [slug, *pats]
    rows = _query(f"SELECT {PAGE_COLS} FROM pages WHERE {where} LIMIT 1", tuple(params))
    return _serialize(rows[0]) if rows else None


def _search(source: str, query: str, limit: int) -> dict:
    if not query:
        return {"results": []}
    limit = min(int(limit or 20), 100)
    sql = (
        f"SELECT {PAGE_COLS} FROM pages "
        "WHERE deleted_at IS NULL AND "
        "search_vector @@ websearch_to_tsquery('english', %s) "
    )
    params = [query]
    if source not in ("", "default"):
        pats = _source_patterns(source)
        clauses = " OR ".join("slug LIKE %s" for _ in pats)
        sql += f" AND ({clauses}) "
        params += list(pats)
    sql += (
        "ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', %s)) "
        "DESC LIMIT %s"
    )
    params += [query, limit]
    rows = _query(sql, tuple(params))
    return {"results": [_serialize(r) for r in rows]}



def _tasks(source: str, assignee: str = "") -> list:
    """Parse ``## Tasks`` checklist sections from deal pages' compiled_truth.

    Port of crm-dashboard /api/tasks: ``- [ ] task — @assignee`` lines inside
    the ``## Tasks`` section of every deal page (backup slugs excluded).
    Optional assignee filter (case-insensitive).
    """
    prefixes = PREFIX_MAP.get(source) or (f"{source}/%", f"{source}-%") if source else None
    if prefixes:
        where = " OR ".join("slug LIKE %s" for _ in prefixes)
        sql = (
            f"SELECT slug, title, compiled_truth FROM pages "
            f"WHERE deleted_at IS NULL AND ({where}) AND compiled_truth LIKE '%%## Tasks%%'"
        )
        rows = _query(sql, list(prefixes))
    else:
        rows = _query(
            "SELECT slug, title, compiled_truth FROM pages "
            "WHERE deleted_at IS NULL AND slug LIKE 'deals/%' "
            "AND compiled_truth LIKE '%## Tasks%'",
        )

    tasks = []
    pattern = re.compile(r"-\s*\[([ x])\]\s*(.*?)\s*\u2014\s*@(\w+)", re.DOTALL)
    for row in rows:
        slug = row.get("slug") or ""
        if "backups_" in slug or "_backup_" in slug:
            continue
        content = row.get("compiled_truth") or ""
        m = re.search(r"## Tasks\s*([\s\S]*?)(?=##|$)", content)
        if not m:
            continue
        for line in m.group(1).split("\n"):
            mm = pattern.match(line.strip())
            if not mm:
                continue
            who = mm.group(3)
            if assignee and who.lower() != assignee.lower():
                continue
            tasks.append({
                "description": mm.group(2).strip(),
                "assignee": who,
                "completed": mm.group(1) == "x",
                "deal_slug": slug,
                "deal_title": row.get("title") or "",
            })
    return tasks

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send_json(self, code, payload):
        body = json.dumps(payload, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_sse(self, payload):
        text = json.dumps(payload, default=str)
        body = f"data: {text}\n\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return {}

    def _handle_mcp(self, payload):
        req_id = payload.get("id") or 1
        if payload.get("method") == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {}}
        if payload.get("method") != "tools/call":
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "method not found"}}
        params = payload.get("params") or {}
        tool = params.get("name")
        args = params.get("arguments") or {}
        source = args.get("source_id") or args.get("source") or ""

        if tool == "list_pages":
            out = _list_pages(
                source,
                int(args.get("limit") or 100),
                args.get("sort") or "updated_asc",
                args.get("updated_after"),
            )
        elif tool == "get_page":
            out = _get_page(source, str(args.get("slug", ""))) or {}
        elif tool == "search":
            out = _search(source, str(args.get("query", "")), int(args.get("limit") or 20))
        elif tool == "put_page":
            out = {"slug": args.get("slug", ""), "written": False, "note": "shim is read-only"}
        else:
            out = {"error": f"unknown tool {tool}"}

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(out, default=str)}]},
        }

    def do_GET(self):
        u = urlparse(self.path)
        qs = parse_qs(u.query)
        if u.path == "/health":
            return self._send_json(200, {"ok": True})
        if u.path == "/api/tasks":
            src = (qs.get("source_id") or qs.get("source") or ["crm"])[0]
            who = (qs.get("assignee") or [""])[0]
            return self._send_json(200, {"tasks": _tasks(src, who), "source": src})
        if u.path == "/api/pages":
            src = (qs.get("source_id") or qs.get("source") or ["default"])[0]
            limit = min(int((qs.get("limit") or ["50"])[0]), 500)
            return self._send_json(200, {"pages": _list_pages(src, limit, "updated_desc", None), "source": src})
        return self._send_json(404, {"detail": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        payload = self._read_body()
        if u.path == "/mcp":
            return self._send_sse(self._handle_mcp(payload))
        if u.path == "/api/search":
            return self._send_json(
                200,
                _search(
                    payload.get("source_id") or "",
                    str(payload.get("query") or ""),
                    int(payload.get("limit") or 20),
                ),
            )
        return self._send_json(404, {"detail": "not found"})

    def log_message(self, fmt, *args):  # keep logs quiet
        pass


if __name__ == "__main__":
    port = int(os.environ.get("GBRAIN_REST_PORT", "7432"))
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)  # pyright: ignore[reportIncompatibleMethodOverride]
    print(f"gbrain shim (MCP+pages) listening on 127.0.0.1:{port}", flush=True)
    srv.serve_forever()