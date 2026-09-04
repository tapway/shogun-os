![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain Link Campaign

> Reduce orphan pages, increase link coverage, and improve brain score by creating gbrain graph links and wikilinks in markdown content.

## What It Does

Systematically reduces orphan pages and increases link coverage toward target metrics (orphans < 20%, coverage > 30%, score 70+). Uses three complementary approaches: index hub pages for bulk orphan reduction, gbrain graph links for database-level edges, and wikilinks in file content for brain score improvement. Proven results: brain score +15 points, orphans -56%, coverage 99.9% in a single campaign.

## Quick Example

```bash
# Phase 0: Create index hub pages (fastest bulk fix)
mcp_gbrain_find_orphans()  # get orphan list
# Group by prefix, create index pages with [[slug]] wikilinks
cd ~/brain && git add *-index/ && git commit -m "Add index hubs" --no-verify
gbrain sync && gbrain extract all

# Phase 1: Auto-link existing wikilinks to graph
python3 ~/.hermes/scripts/brain-auto-link.py --phase all

# Check progress
mcp_gbrain_get_health()
```

## When to Use / When NOT To

**Use when:**
- Brain score is below target (70+)
- Orphan count is high (>20% of pages)
- After bulk imports that created many unlinked pages
- As part of monthly brain maintenance

**Don't use for:**
- Adding meaningless links just to boost numbers
- Pages that are intentionally standalone references
- Replacing entity-specific cross-linking during normal writes

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Brain repo synced (`gbrain sync`)
- [ ] `brain-auto-link.py` script deployed
- [ ] Git access to brain repo for commits

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (campaign/maintenance trigger) |
| Related Skills | [brain-compliance](../brain-compliance/), [maintain](../maintain/), [gbrain-brain-ops](../gbrain-brain-ops/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08 | Initial release — 3-phase link campaign, index hub pattern, proven results |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
