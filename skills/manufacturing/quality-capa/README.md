![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Quality CAPA

> Manage the full Corrective and Preventive Action lifecycle — from open to effectiveness check — with 5 Whys root cause analysis and aging dashboards.

## What It Does

Manages CAPA through six phases: Open → Investigation → Action Plan → Implementation → Effectiveness Check → Closed. Uses 5 Whys methodology for structured root cause analysis. Provides aging distribution and closure rate dashboards by severity and department, with automatic escalation when phases exceed configured time limits.

## Quick Example

```bash
# Create CAPA from an NCR
capa create --source ncr --source-id NCR-2026-001234 \
  --severity major --description "Recurring dimension defect on line A"
→ CAPA-2026-0001 created | Severity: Major | Target: 30 days

# Run 5 Whys analysis
capa 5whys CAPA-2026-0001 --interactive
→ Root Cause: Worn tooling not replaced per PM schedule

# Define action plan
capa action-plan CAPA-2026-0001 \
  --action "Update torque specs + replace tooling" \
  --owner OPS_MGR --due 2026-10-01
→ Action assigned | Due: 2026-10-01

# Dashboard
capa dashboard --aging --closure-rate
→ Open: 8 | Avg Age: 22 days | Closure Rate: 85% (target: 60 days)
```

## When to Use / When NOT To

**Use when:**
- Systemic quality issues requiring root cause analysis
- Customer complaints needing formal corrective action
- Safety incidents triggering CAPA workflows
- Tracking CAPA aging and closure rates

**Don't use for:**
- One-off defect dispositioning → use quality-ncr
- Minor observations below severity threshold

## Prerequisites

- [ ] CAPA data storage path configured (`CAPA_DATA_PATH`)
- [ ] Escalation levels and contacts defined
- [ ] 5 Whys template available
- [ ] Severity classification guidelines documented

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Quality) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | quality-ncr, maintenance-pm |

## Configuration

```bash
# .env
CAPA_DATA_PATH=./data/capa/
CAPA_AUTO_ESCALATE_DAYS=21
CAPA_EFFECTIVENESS_WAIT_DAYS=90
CAPA_CLOSURE_TARGET_DAYS=60
CAPA_ESCALATION_LEVELS=quality_manager,plant_manager,quality_director
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 6-phase lifecycle, 5 Whys, aging dashboard, auto-escalation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
