![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Query

> Three-layer gbrain query pipeline: search → recall → think. Use for ALL brain queries instead of raw MCP calls.

## What It Does

Defines the canonical escalation ladder for getting answers from gbrain: start with fast keyword search, escalate to hybrid semantic search if results are thin, then to entity recall for timeline facts, and finally to multi-hop synthesis for complex questions. Prevents wasteful use of expensive `think` operations for simple lookups while ensuring complex questions get proper synthesis with citations and gap analysis.

## Quick Example

```
Question: "What's the status of the Acme deal?"

Layer 1: mcp_gbrain_search("Acme deal", limit=5) → score 0.8 ✅
         → Found deals/acme-q3, use it

If Layer 1 was thin (score < 0.3):
Layer 2: mcp_gbrain_query("Acme deal status") → hybrid semantic
Layer 3: mcp_gbrain_recall(entity="deals/acme-q3") → timeline facts
Layer 4: mcp_gbrain_think("What's the latest on Acme?") → synthesis

Always cite: [[deals/acme-q3]] (last updated 2026-08-20)
```

## When to Use / When NOT To

**Use when:**
- Answering any question that might have brain-stored knowledge
- Looking up entity status, history, or relationships
- Before reaching for external APIs (brain-first protocol)

**Don't use for:**
- Pure operational tasks (cron, docker, file ops)
- When the answer is already in the current conversation
- Starting with `think` for simple fact lookups

## Prerequisites

- [ ] gbrain MCP tools available (`mcp_gbrain_search` minimum)
- [ ] Brain indexed and embeddings generated
- [ ] For Layer 3+: `mcp_gbrain_think` functional

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (query protocol) |
| Related Skills | [brain-first-lookup](../brain-first-lookup/), [gbrain-think](../think/), [signal-detector](../signal-detector/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — 3-layer escalation ladder, freshness rules, entity lookup table |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
