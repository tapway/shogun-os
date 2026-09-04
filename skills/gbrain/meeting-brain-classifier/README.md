![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Meeting Brain Classifier

> Classify brain meeting pages into team categories (sales, marketing, project, HR, management), extract action items and decisions, route to project/deal pages with timeline entries, and detect risk signals.

## What It Does

Post-processes meeting notes imported into gbrain by classifying each unprocessed meeting into one of six team categories based on keywords, attendees, and content. Routes sales meetings to deal pages, project meetings to project pages, and extracts action items from Gemini-structured "Next steps" sections. Detects high-risk signals (technical blockers, deadline pressure, customer dissatisfaction) and alerts the management Slack channel. Creates a three-way rollup: meeting page tagged, entity page updated with timeline, attendee pages cross-linked.

## Quick Example

```
Meeting: "Q3 Demo with Acme Corp" (attendees: Kunna, Liyana, John@Acme)

Step 1: Read page → detect "demo", "proposal" → classify as SALES
Step 2: mcp_gbrain_search("Acme deal") → found deals/acme-q3
Step 3: Add timeline entry to deals/acme-q3: "Demo completed, positive reception"
Step 4: Extract action items: "Kunna: send pricing by Friday"
Step 5: Tag meeting: classified + sales
Step 6: Cross-link: meeting ↔ deal ↔ Kunna ↔ Liyana ↔ John
```

## When to Use / When NOT To

**Use when:**
- After meeting collection script imports notes into gbrain
- Processing unclassified meeting pages (missing `classified` tag)
- Extracting action items from Gemini-formatted meeting notes
- Detecting risk signals in project or sales meetings

**Don't use for:**
- Creating meeting pages (collection script handles that)
- Non-meeting brain pages
- Meetings already tagged `classified`

## Prerequisites

- [ ] Meeting collection script deployed and running
- [ ] gbrain MCP tools available
- [ ] Team attendee mapping configured (see SKILL.md table)
- [ ] Slack alert channel configured for risk signals

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (cron-triggered post-collection) |
| Related Skills | [brain-ingest-pipeline](../brain-ingest-pipeline/), [brain-compliance](../brain-compliance/), [timeline-inject-v2](../timeline-inject-v2/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-01 | Initial release — 6-team taxonomy, action item extraction, risk detection, attendee resolution |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
