![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Maintain

> Brain health maintenance — run health checks, find and fix orphans, detect stale pages, fix broken links, check embedding coverage.

## What It Does

Keeps the brain structurally healthy by detecting and fixing common degradation patterns: orphan pages with no inbound links, stale content over 180 days old, embedding coverage gaps, contradictions between pages, and sync drift. Provides daily quick-check and monthly deep-maintenance checklists. Includes detailed troubleshooting for embedding credential failures, which are the most common maintenance issue.

## Quick Example

```bash
# Daily quick health check
health = mcp_gbrain_get_health()
# Alert if: orphan_count > 50, stale_count > 100, embed_coverage < 90%

# Monthly maintenance
mcp_gbrain_find_orphans()              # fix orphans
mcp_gbrain_list_pages(sort=updated_asc, limit=50)  # review oldest
mcp_gbrain_find_contradictions(severity="high")     # resolve conflicts
mcp_gbrain_sync_brain()                # ensure sync is current
```

## When to Use / When NOT To

**Use when:**
- Running daily or monthly brain health checks
- Fixing orphan pages or stale content
- Diagnosing embedding failures or credential issues
- After bulk operations that may have created structural issues

**Don't use for:**
- Running embed jobs when coverage is already >95%
- Deleting orphan pages that should exist but just need links
- Over-maintaining — don't fix what isn't broken

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Brain repo synced
- [ ] Embedding provider configured (OPENROUTER_API_KEY or OPENAI_API_KEY)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (maintenance trigger) |
| Related Skills | [brain-link-campaign](../brain-link-campaign/), [gbrain-brain-ops](../gbrain-brain-ops/), [operations](../operations/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-15 | Initial release — health dashboard, orphan/stale/contradiction fixes, embedding troubleshooting |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
