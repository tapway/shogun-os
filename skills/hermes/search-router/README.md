![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Search Router

> Intelligent query classifier that routes research to Exa (facts), last30days (opinions), or both.

## What It Does

Analyzes search query intent and routes to the optimal backend: Exa for objective/factual lookups, last30days for community sentiment and opinions, or both in parallel for mixed queries. Prevents wasted searches by matching query type to the right tool.

## Quick Example

```
Query: "Cursor vs Copilot which is better"
→ Classification: OPINION
→ Route: last30days only (Reddit, HN discussions)

Query: "Hermes Agent v0.16.0 features"
→ Classification: FACTS
→ Route: Exa only (release notes, docs)

Query: "World Cup 2026"
→ Classification: MIXED
→ Route: Both in parallel (scores + fan reaction)
```

## When to Use / When NOT To

**Use when:**
- Before any research or search task
- Query involves comparisons, reviews, or community sentiment
- Query asks for documentation, specs, or official data
- Broad "tell me about X" requests

**Don't use for:**
- Trivial factual lookups ("when was X released?") — just use web_search
- Internal knowledge queries → use gbrain-query
- Non-research tasks

## Prerequisites

- [ ] web_search tool available (Exa backend)
- [ ] last30days skill installed at `/tmp/last30days-skill/`
- [ ] Python 3.12 for last30days script

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (auto-loaded before research) |
| Related Skills | gbrain-query, grounded-citations |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — FACTS/OPINION/MIXED classification, parallel execution, anti-patterns |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
