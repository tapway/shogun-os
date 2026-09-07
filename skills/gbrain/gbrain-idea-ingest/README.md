![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Idea Ingest

> Structured ingestion of links, articles, tweets, and web content into gbrain — extract entities, write summary, cross-link to known people/companies/projects.

## What It Does

Ingests external ideas — articles, blog posts, tweets, research papers — into the brain with a structured pipeline that fetches content, extracts key points and entities, writes a summarized reference page, and cross-links it to every mentioned person, company, or project. Ensures external knowledge becomes discoverable through the brain graph rather than sitting as an isolated bookmark.

## Quick Example

```
User: "Save this article about AI pricing strategies"
URL: https://example.com/ai-pricing

→ Fetch content via web_extract
→ Extract: title, author, date, 3 key points, entities (Acme, Jane Smith)
→ mcp_gbrain_search each entity → found companies/acme, people/jane-smith
→ Write references/pricing/ai-pricing-strategies.md with summary + entities
→ mcp_gbrain_add_link(from="companies/acme", to=slug)
→ mcp_gbrain_add_link(from="people/jane-smith", to=slug)
```

## When to Use / When NOT To

**Use when:**
- User shares a link and says "save this" or "ingest this"
- You find an article/blog/tweet relevant to a brain topic
- Competitive intel, industry news, or research papers need capturing
- A conversation surfaces a useful external resource

**Don't use for:**
- Original thoughts from the user (use `capture` instead)
- Media files like video/audio/PDF (use `gbrain-media-ingest`)
- Bulk file imports (use `gbrain-ingest`)

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Web extraction capability (`web_extract` or browser)
- [ ] Brain repo synced

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (triggered by "save this" / "ingest this") |
| Related Skills | [gbrain-ingest](../gbrain-ingest/), [capture](../capture/), [gbrain-media-ingest](../gbrain-media-ingest/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — 8-step pipeline, entity extraction, cross-linking rules |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
