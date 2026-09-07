![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Enrich

> Tiered enrichment for person, company, and project pages — add facts, timeline entries, cross-links, and data validation.

## What It Does

Provides a three-tier enrichment pipeline for making thin brain pages comprehensive. Tier 1 (5 min) adds tags, links, and timeline entries. Tier 2 (15 min) adds structured sections like Bio, Role, Product, Market. Tier 3 (30+ min) does deep research, resolves contradictions, and adds fact tables. Ensures enriched pages are back-linked so they're discoverable through the graph.

## Quick Example

```
Thin person page found → assess what's missing

Tier 1: mcp_gbrain_add_tag("people/alice", ["engineering"])
        mcp_gbrain_add_link(from="people/alice", to="companies/acme")
        mcp_gbrain_add_timeline_entry(slug, date, event)

Tier 2: Add ## Bio, ## Role, ## Contact, ## Background sections

Tier 3: mcp_gbrain_think("What gaps exist for Alice?")
        Research externally → add findings → flag contradictions
```

## When to Use / When NOT To

**Use when:**
- A brain page exists but is thin or outdated
- New information arrived about a known entity
- During ingest pipeline Phase 4 (ENRICH)
- Monthly maintenance review of oldest pages

**Don't use for:**
- Creating brand-new pages (use ingest skills first)
- Overwriting existing good content — enrich, don't replace
- Adding facts without dates (timeline entries need dates)

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Target page already exists in brain
- [ ] For Tier 3: external research capability (web search, APIs)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (enrichment workflow) |
| Related Skills | [brain-ingest-pipeline](../brain-ingest-pipeline/), [gbrain-think](../think/), [brain-compliance](../brain-compliance/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — 3-tier enrichment, entity templates, back-linking rules |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
