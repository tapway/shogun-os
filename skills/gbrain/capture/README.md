![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Capture

> Quick capture of thoughts, ideas, and observations to gbrain — preserve exact phrasing, file under ideas/ or concepts/.

## What It Does

Captures original thinking, ideas, and observations into the brain while preserving the user's exact phrasing — never paraphrasing, because the language IS the insight. Files captures under `ideas/` or `concepts/`, tags them, and cross-links to every mentioned entity so they're discoverable through the graph. Prevents valuable intellectual capital from being lost in chat history.

## Quick Example

```
User: "I think we should pivot our pricing to usage-based for SMBs"

→ mcp_gbrain_search("pricing pivot usage-based")  # dedup check
→ mcp_gbrain_put_page("ideas/usage-based-pricing-pivot", content)
   Content preserves EXACT words: "I think we should pivot..."
→ mcp_gbrain_add_tag(slug, "idea")
→ mcp_gbrain_add_link(from="companies/our-company", to=slug)
```

## When to Use / When NOT To

**Use when:**
- User shares a novel idea, thesis, or framework
- User makes an insightful observation about a person/company/project
- User expresses a decision, commitment, or belief
- End of a conversation that produced useful content

**Don't use for:**
- Operational messages (ok, thanks, greetings)
- Single-word replies or routine status updates
- Information already captured elsewhere in the brain

## Prerequisites

- [ ] gbrain MCP tools available (`mcp_gbrain_put_page`, `mcp_gbrain_add_link`)
- [ ] Brain repo synced
- [ ] Understanding of `ideas/` vs `concepts/` taxonomy

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (ambient capture) |
| Related Skills | [signal-detector](../signal-detector/), [gbrain-idea-ingest](../gbrain-idea-ingest/), [think](../think/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — exact-phrase capture, cross-linking, dedup check |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
