![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Brain Ingest Pipeline

> Unified brain ingest pipeline for email, calendar, and meetings — all three follow the same COLLECT → ROUTE → BRIDGE → ENRICH → VALIDATE flow.

## What It Does

Provides a single five-phase pipeline that processes emails, calendar events, and meetings into structured brain knowledge. Each phase handles a specific concern: raw collection, signal routing to deals/projects/HR, entity bridging with graph links, profile enrichment, and compliance validation. Ensures no ingest source skips critical steps like cross-linking or validation.

## Quick Example

```
Email arrives → COLLECT (gmail-triage.py saves markdown)
    → ROUTE (classify: sales signal → match deal page)
    → BRIDGE (extract entities, create graph links, add timeline)
    → ENRICH (load profile-enrichment, fill gaps in person pages)
    → VALIDATE (run compliance validator on every modified page)

📊 EMAIL PIPELINE — 2026-09-04 06:00
📥 Collected: 45 items from 9 accounts
🔗 Routed: Sales: 3 deals updated, Projects: 2 updated
🧠 Brain Health: 12 links created, 8 pages validated
⚠️ Risks: Acme Corp deal stalled 9 days
```

## When to Use / When NOT To

**Use when:**
- Processing email batches via gmail-triage cron
- Importing calendar events or meeting notes
- Running any bulk ingest that touches multiple brain pages
- Debugging why ingested content isn't linked properly

**Don't use for:**
- Single-page manual brain writes (use brain-compliance directly)
- Media/file ingestion (use gbrain-media-ingest or gbrain-ingest)
- Real-time chat message processing

## Prerequisites

- [ ] gbrain MCP tools available
- [ ] Gmail batch config at `~/.hermes/config/gmail-batches.json`
- [ ] Collection scripts deployed (`gmail-triage.py`, `collect-calendar.py`, etc.)
- [ ] `profile-enrichment` skill available
- [ ] `brain-compliance` validator accessible

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (cron-triggered pipeline) |
| Related Skills | [brain-compliance](../brain-compliance/), [gbrain-enrich](../gbrain-enrich/), [meeting-brain-classifier](../meeting-brain-classifier/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-01 | Initial release — unified 5-phase pipeline for email/calendar/meetings |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
