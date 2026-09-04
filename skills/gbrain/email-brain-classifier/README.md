![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Email Brain Classifier

> Classifies ingested email pages into categories (project, deal, support, HR, other), detects risk/negative sentiment, and routes to the appropriate department profile.

## What It Does

Runs as a post-collection processor after emails are imported into gbrain. Automatically categorizes each unprocessed email by scanning for signal keywords, flags high-risk messages (legal threats, safety incidents, executive complaints) for immediate alerting, and routes classified emails to the correct brain directory and department profile.

## Quick Example

```
Email: "PO#2026-0451 — Widget System Installation at KL Site"
  │
  ├── Category: project (signal: PO#, installation)
  ├── Risk: none
  └── Route → projects/active_projects/widget-system-kl/
              Profile: project-manager

Email: "URGENT: Server down at Penang factory, production halted"
  │
  ├── Category: support (signal: down, urgent fix)
  ├── Risk: HIGH (production impact)
  └── Alert → #management IMMEDIATELY
      Route → projects/support_tickets/tickets/penang-server-down/
```

## When to Use / When NOT To

**Use when:**
- Processing newly collected emails in gbrain
- Running batch classification on unprocessed email pages
- Setting up automated email routing for a department

**Don't use for:**
- Initial email collection → use `brain-ingest-pipeline` or Gmail collector scripts
- Meeting note classification → use `meeting-brain-classifier`
- Manual email reading/replying → use Gmail integration directly

## Prerequisites

- [ ] gbrain initialized with email pages collected
- [ ] Department profiles configured (project-manager, crm-manager, hr-manager)
- [ ] Alert channel set up for high-risk notifications

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain (shared) |
| Owning Profile | default / pipeline |
| Slash Command | N/A (post-collection processor) |
| Related Skills | [brain-ingest-pipeline](../brain-ingest-pipeline/), [meeting-brain-classifier](../meeting-brain-classifier/), [signal-detector](../signal-detector/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-24 | Initial release — 5-category taxonomy, risk detection, profile routing |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
