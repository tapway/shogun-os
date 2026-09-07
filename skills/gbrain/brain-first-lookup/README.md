![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain-First Lookup

> Mandatory brain-first lookup protocol: query gbrain before any external API call — check brain for people, companies, entities before searching the web.

## What It Does

Enforces a mandatory lookup order: always search the brain's ~16,000 pages before reaching for web search, Slack, email, or other external APIs. The brain almost always has the answer, and querying it costs zero API credits. Defines a clear escalation chain from keyword search through semantic search to multi-hop synthesis, ensuring agents don't skip internal knowledge.

## Quick Example

```
User: "Tell me about Eddie Goh"

Step 1: mcp_gbrain_search("Eddie Goh") → score 0.85 ✅
Step 2: mcp_gbrain_get_page("people/eddie-goh") → full profile
Step 3: Return cited answer from brain — NO web search needed

If Step 1 returned score < 0.3:
Step 2: mcp_gbrain_query("Eddie Goh") → hybrid semantic
Step 3: mcp_gbrain_think("Who is Eddie Goh?") → synthesis
Step 4: Only NOW try external APIs if still nothing
```

## When to Use / When NOT To

**Use when:**
- Looking up any person, company, project, concept, or fact
- Starting any research or enrichment task
- Delegating to sub-agents (include protocol in their prompt)

**Don't use for:**
- Pure operational tasks (file ops, docker, cron, server management)
- Tasks where the user explicitly says "search the web"
- When the answer is already in the current conversation context

## Prerequisites

- [ ] gbrain MCP server connected (`mcp_gbrain_*` tools available)
- [ ] Brain repo synced and indexed
- [ ] At minimum: `mcp_gbrain_search` functional

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (protocol, not a command) |
| Related Skills | [gbrain-query](../query/), [gbrain-think](../think/), [signal-detector](../signal-detector/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-07-01 | Added disambiguation for "gbrain skills" (Hermes vs repo skillpack) |
| 1.0.0 | 2026-06-01 | Initial release — lookup chain, quality rules, sub-agent guidance |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
