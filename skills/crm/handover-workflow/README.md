![CRM](https://img.shields.io/badge/dept-CRM-blue)

# Handover Workflow

> Structured sales-to-project handover lifecycle with gate-based approvals, activity sync, and risk detection.

## What It Does

When a deal is won in CRM, this skill creates a structured handover page with customer info, scope, PO details, and deliverables. The project manager receives a notification, reviews the handover, and progresses through configurable approval gates (G0→G1→G2→G3) before the project is fully initiated. Ongoing email activity is synced to deal/project timelines with automatic risk flagging.

## Quick Example

```
Deal Won: "Acme Corp — Widget System Implementation" (RM 45,000)
    │
    ▼
CREATE HANDOVER → ~/brain/handovers/pending/acme-widget.md
    │  Customer, scope, PO-12345, contact, deliverables
    │
    ▼
NOTIFY PM → Slack DM: "New handover: Acme Corp — Widget System"
    │
    ▼
GATE PROGRESSION
    G0 Deal Scoped     ✅ PO signed, PM assigned
    G1 Charter Signed  ✅ Budget approved, dates set
    G2 Kick-off Done   ⏳ Awaiting external kick-off
    G3 Funding Cleared 🔒 Waiting for deposit
    │
    ▼
COMPLETED → ~/brain/handovers/completed/acme-widget.md
            ~/brain/projects/active_projects/acme-widget.md
```

## When to Use / When NOT To

**Use when:**
- A deal is marked as won and needs project initiation
- Project manager needs structured context from sales
- You need auditable gate-based approval tracking
- Email activity should sync to deal/project timelines

**Don't use for:**
- Active project management → use project management tools
- Deal pipeline management → use CRM deal stages
- Invoice/billing after handover → use finance skills

## Prerequisites

- [ ] Kizuna CRM profile active
- [ ] gbrain initialized with `handovers/` directory structure
- [ ] Notification channel configured (`HANDOVER_NOTIFY_CHANNEL`)
- [ ] Brain compliance validator available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | CRM |
| Owning Profile | kizuna |
| Slash Command | `/handover`, `/deal-won`, `/process-handover` |
| Related Skills | [brain-compliance](../../gbrain/brain-compliance/), [department-scrum](../../general/department-scrum/), [brain-link-campaign](../../gbrain/brain-link-campaign/) |

## Configuration

```bash
# Environment variables
BRAIN_DIR=~/brain                              # Brain root directory
HANDOVER_SALES_ROLE=CRM Manager                # Who creates handovers
HANDOVER_PROJECT_ROLE=Project Manager          # Who processes handovers
HANDOVER_NOTIFY_CHANNEL=#projects              # Slack/Telegram notification target
HANDOVER_GATES=G0:Deal Scoped,G1:Charter Signed,G2:Kick-off Complete,G3:Funding Cleared
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-24 | Initial release — handover creation, gate system, activity sync, risk detection |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
