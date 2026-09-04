![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Operations

> GBrain operations: sync, embed, doctor, dream cycle, MCP server setup, lock management, schema packs, brainstorm, publish, capture, and common troubleshooting.

## What It Does

Comprehensive operational reference for managing a gbrain knowledge base across its full lifecycle. Covers CLI commands (sync, embed, doctor, dream, mcp, brainstorm, capture, publish), Python wrapper patterns for scripts, cron integration for automated sync and dream cycles, Quartz site publishing, and detailed troubleshooting for PGLite lock contention, Supabase auto-pause, database corruption, and embedding quota issues. Generic version with no company-specific content.

## Quick Example

```bash
# Daily operations
gbrain sync                    # incremental sync after file changes
gbrain embed --stale           # update embeddings for changed pages
gbrain doctor                  # health check

# Nightly maintenance (via cron)
gbrain dream                   # synthesize, consolidate, prune

# Troubleshooting stale PGLite lock
rm -f ~/.gbrain/pglite/postmaster.pid
gbrain doctor --fix

# MCP server for Hermes
gbrain mcp                     # start MCP server
```

## When to Use / When NOT To

**Use when:**
- Setting up or maintaining gbrain infrastructure
- Troubleshooting sync, embed, or database issues
- Configuring cron jobs for automated brain maintenance
- Setting up MCP connectivity for Hermes
- Publishing brain as a static site

**Don't use for:**
- Querying brain content (use `gbrain-query`)
- Writing brain pages (use `brain-compliance`)
- Company-specific brain operations (use `gbrain-brain-ops`)

## Prerequisites

- [ ] gbrain CLI installed (`bun install -g github:garrytan/gbrain`)
- [ ] Environment variables set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] For MCP: Hermes config with gbrain server entry

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (operational reference) |
| Related Skills | [gbrain-brain-ops](../gbrain-brain-ops/), [maintain](../maintain/), [operations](../operations/) |

## Configuration

```yaml
# ~/.hermes/profiles/default/config.yaml
mcp_servers:
  gbrain:
    command: gbrain
    args: [mcp]
```

```bash
# ~/.hermes/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-...
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-15 | Major rewrite — generic version, added troubleshooting, cron patterns, Python wrapper |
| 1.0.0 | 2026-06-01 | Initial release — CLI reference, basic operations |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
