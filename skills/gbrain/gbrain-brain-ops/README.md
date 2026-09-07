![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Brain Ops

> Core brain operations — the read-enrich-write loop, sync, backup, health checks, and source attribution. Foundation layer for all gbrain work.

## What It Does

Provides the foundational operations every brain interaction depends on: the read-enrich-write loop, git-to-brain sync (incremental and full), health dashboards, source management, and PGLite failure recovery. Covers large import patterns (background execution for 2+ hour imports), git-synced directory setup, and engine migration guidance. This is the infrastructure skill that all other brain skills build on.

## Quick Example

```bash
# Core loop: Read → Enrich → Write
mcp_gbrain_search("Alice Wong")          # READ
mcp_gbrain_get_page("people/alice-wong") # READ full
mcp_gbrain_add_timeline_entry(...)       # ENRICH
mcp_gbrain_put_page(slug, content)       # WRITE

# Sync after local edits
mcp_gbrain_sync_brain()                  # incremental

# Health check
mcp_gbrain_get_health()                  # dashboard
mcp_gbrain_run_doctor()                  # deep diagnostics
```

## When to Use / When NOT To

**Use when:**
- Syncing brain repo after local file changes
- Running health checks or diagnosing brain issues
- Setting up large imports (background execution required)
- Recovering from PGLite WASM crashes
- Setting up git-synced content directories

**Don't use for:**
- Querying brain content (use `gbrain-query`)
- Writing new pages (use `brain-compliance` + this skill's write patterns)
- Simple page reads (use `mcp_gbrain_get_page` directly)

## Prerequisites

- [ ] gbrain CLI installed and on PATH
- [ ] Brain repo at `~/brain/`
- [ ] MCP server connected for `mcp_gbrain_*` tools
- [ ] For large imports: background terminal support

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (foundation layer) |
| Related Skills | [operations](../operations/), [maintain](../maintain/), [brain-compliance](../brain-compliance/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-01 | Initial release — read-enrich-write loop, sync, health, PGLite recovery, git-synced dirs |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
