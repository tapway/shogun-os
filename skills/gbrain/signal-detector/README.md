![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Signal Detector

> Always-on ambient signal capture for gbrain — detects original thinking, entity mentions, and ideas from conversations and captures them to the brain.

## What It Does

Fires on every substantive incoming message to capture two equally valuable signal types: original thinking (user's ideas, observations, theses) and entity mentions (people, companies, projects). Original thinking is preserved verbatim because the language IS the insight. Entity mentions trigger page creation or enrichment with mandatory back-linking so no mention becomes an orphan. This is the ambient intelligence layer that makes the brain grow organically from everyday conversations.

## Quick Example

```
User: "I noticed Kossan's procurement team changed — Sarah left, 
       new contact is David Tan. Also, we should rethink our 
       tiered pricing for distributors."

Signal 1 (Entity): Kossan, Sarah, David Tan
  → mcp_gbrain_search each → update companies/kossan, create people/david-tan
  → Back-link from all entity pages

Signal 2 (Idea): "rethink tiered pricing for distributors"
  → Capture EXACT phrasing under ideas/distributor-tiered-pricing
  → Cross-link to companies/kossan (context)

Log: Signals: 1 idea captured, 3 entities enriched, 2 timeline entries
```

## When to Use / When NOT To

**Use when:**
- User shares substantive messages, ideas, or observations
- Conversations contain entity references worth capturing
- Ending a conversation that generated useful content
- Any message that should be preserved in the company brain

**Don't use for:**
- Operational messages (ok, thanks, greetings, single-word replies)
- Blocking the main response to wait for signal detection
- Creating pages for non-notable one-off mentions

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Brain repo synced and indexed
- [ ] Understanding of ideas/ vs concepts/ taxonomy

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (ambient, always-on) |
| Related Skills | [capture](../capture/), [brain-first-lookup](../brain-first-lookup/), [gbrain-enrich](../gbrain-enrich/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — dual signal capture, back-linking mandate, anti-patterns |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
