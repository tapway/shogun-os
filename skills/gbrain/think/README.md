![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Think

> Use gbrain's multi-hop synthesis layer to produce cited answers with conflict and gap analysis — produces better answers than raw search.

## What It Does

Runs gbrain's most powerful query operation: multi-hop synthesis that searches the brain, reads top results, composes a synthesized answer with inline citations, detects conflicts when sources disagree, and identifies knowledge gaps. Produces significantly better answers than raw search for complex questions that span multiple brain pages. Supports temporal windows, entity anchoring, and multi-pass rounds for deep research.

## Quick Example

```
mcp_gbrain_think(question="What do we know about Kossan's expansion plans?")

Returns:
• answer: "Kossan announced a new factory in Johor (2026-03-15)..."
          [[companies/kossan]] [[meetings/2026/03/kossan-strategy]]
• evidence: [companies/kossan, meetings/2026/03/kossan-strategy, ...]
• conflicts: "March note says Q3 opening; June email suggests Q4 delay"
• gaps: "No information on staffing plan or budget allocation"

→ Chain: search web for gaps → write findings back to brain
```

## When to Use / When NOT To

**Use when:**
- Complex questions needing synthesis across multiple pages
- "What do we know about X?" background briefings
- Narrative questions ("Who is...", "What happened...")
- Status updates requiring multi-source reconciliation
- Gap analysis to identify what the brain doesn't know

**Don't use for:**
- Simple fact lookups (use `mcp_gbrain_search`)
- Questions answerable from a single page
- Operational tasks that don't need knowledge synthesis

## Prerequisites

- [ ] gbrain MCP server connected with `mcp_gbrain_think` available
- [ ] Brain indexed with embeddings (think uses hybrid search internally)
- [ ] For CLI fallback: `gbrain think` command working

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (synthesis layer) |
| Related Skills | [query](../query/), [brain-first-lookup](../brain-first-lookup/), [gbrain-enrich](../gbrain-enrich/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — multi-hop synthesis, conflict/gap analysis, chaining pattern |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
