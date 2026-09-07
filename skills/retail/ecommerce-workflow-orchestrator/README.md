![Retail](https://img.shields.io/badge/dept-Retail-orange)

# E-commerce Workflow Orchestrator

> Sequences 12 e-commerce skills into one stateful, resumable pipeline with approval gates.

## What It Does

Coordinates the full e-commerce pipeline — from pulling product data through analysis, content generation, pricing, and listing updates — in a defined 12-step sequence. Contains no business logic itself; handles only call order, state tracking, error handling, and approval gates. Supports full, partial, and single-step execution with pause/resume capability.

## Quick Example

```bash
# Run full pipeline (pauses at gated steps)
python workflow_orchestrator.py run-full
→ Step 1: autocount-product-sync ✅
  Step 2: product-velocity-analyzer ✅
  Step 3: product-margin-analyzer ✅
  Step 4: promo-recommender ⏸️ PAUSED (approval: campaign_launch)

# Resume after approval
python workflow_orchestrator.py resume-from 5
→ Step 5: cross-sell-bundle-recommender ✅
  ...continues through Step 12

# Check status
python workflow_orchestrator.py status
→ Status: paused | Current: Step 4 | Completed: [1,2,3]
```

## When to Use / When NOT To

**Use when:**
- Running the full e-commerce update cycle
- Coordinating multiple skills in sequence
- Resuming a paused pipeline after approvals
- Automated daily/weekly pipeline execution

**Don't use for:**
- Single-skill operations → call the skill directly
- Ad-hoc analysis → use individual analyzer skills
- Emergency price fixes → use price-sync directly

## Prerequisites

- [ ] Python 3.8+ (stdlib only)
- [ ] All 12 downstream skills installed
- [ ] `HERMES_HOME` environment variable set
- [ ] Platform connectors configured for live operations

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/ecommerce-workflow-orchestrator` |
| Related Skills | [action-audit-log](../action-audit-log/), [approval-gate](../approval-gate/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 12-step pipeline, state persistence, approval gates, pause/resume |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
