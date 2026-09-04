![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Preventive Maintenance (PM)

> Manage PM schedules, track due/overdue tasks, auto-generate work orders, and calculate PM compliance rates.

## What It Does

Manages preventive maintenance schedules across calendar-based (daily, weekly, monthly, annual) and meter-based (operating hours, cycles) triggers. Tracks due and overdue PMs, automatically generates work orders within a configurable forward window, and calculates PM compliance rates against target thresholds.

## Quick Example

```bash
# List due PMs for a plant
pm list --plant PLANT-01 --status due
→ PM-001 | EQ-001 | Lubricate bearings | Due: 2026-09-05
→ PM-002 | EQ-002 | Replace air filters | Due: 2026-09-06

# Generate work orders for next 7 days
pm generate --date 2026-09-04 --plant PLANT-01
→ Generated 12 work orders from PM schedule

# PM compliance report (last 30 days)
pm compliance --from 2026-08-05 --to 2026-09-04
→ Compliance: 92.3% (target: 90%) | On-time: 48/52 PMs
```

## When to Use / When NOT To

**Use when:**
- Setting up or reviewing PM schedules
- Generating work orders from PM tasks
- Tracking PM compliance and overdue items
- Meter-based PM triggering from equipment readings

**Don't use for:**
- Unplanned breakdown tracking → use maintenance-downtime
- Corrective action management → use quality-capa

## Prerequisites

- [ ] PM data storage path configured (`PM_DATA_PATH`)
- [ ] PM schedule defined in YAML format
- [ ] Meter reading source connected (for meter-based PMs)
- [ ] Escalation contact configured for overdue PMs

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Maintenance) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | maintenance-downtime, work-order-tracking, production-oee, mes-connector |

## Configuration

```bash
# .env
PM_DATA_PATH=./data/maintenance/pm/
PM_AUTO_GENERATE_DAYS=7
PM_COMPLIANCE_TARGET=90
PM_OVERDUE_ESCALATION_DAYS=3
PM_METER_TYPES=hours,cycles
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — PM scheduling, WO generation, compliance tracking, overdue escalation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
