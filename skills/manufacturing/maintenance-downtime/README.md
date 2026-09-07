![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Maintenance Downtime

> Log unplanned downtime events, run Pareto analysis by equipment/reason/shift, and calculate MTBF, MTTR, and downtime cost.

## What It Does

Tracks unplanned downtime events with start/end times, equipment, reason codes, and shift assignment. Performs Pareto analysis to identify top loss drivers. Calculates MTBF (Mean Time Between Failures) and MTTR (Mean Time To Repair) per equipment, and estimates production loss cost using configurable hourly rates.

## Quick Example

```bash
# Log a downtime event
downtime log --equipment EQ-001 --reason mechanical_failure \
  --start "2026-09-04 08:30" --end "2026-09-04 09:45" \
  --shift morning --operator OPR-001
→ DT-20260904-001 logged | Duration: 1h 15m

# Pareto by equipment (last 30 days)
downtime pareto --from 2026-08-05 --to 2026-09-04 --group-by equipment
→ EQ-001: 18h (35%) | EQ-003: 12h (23%) | EQ-007: 8h (15%)

# MTBF/MTTR for EQ-001
downtime metrics --equipment EQ-001 --from 2026-08-05 --to 2026-09-04
→ MTBF: 120h | MTTR: 1.8h | Availability: 98.5%
```

## When to Use / When NOT To

**Use when:**
- Logging unplanned downtime events
- Identifying top downtime drivers via Pareto
- Calculating MTBF/MTTR for reliability analysis
- Estimating production loss cost from downtime

**Don't use for:**
- Planned maintenance scheduling → use maintenance-pm
- Real-time machine state monitoring → use mes-connector

## Prerequisites

- [ ] Downtime data storage path configured (`DT_DATA_PATH`)
- [ ] Reason code catalog defined (`downtime-reasons.yaml`)
- [ ] Cost per hour estimate set (`DT_COST_PER_HOUR`)
- [ ] Single active event per equipment policy enforced

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Maintenance) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | maintenance-pm, production-oee, mes-connector, quality-capa |

## Configuration

```bash
# .env
DT_DATA_PATH=./data/maintenance/downtime/
DT_COST_PER_HOUR=1000
DT_PLANT_CURRENCY=USD
DT_REASON_CODES_PATH=./config/downtime-reasons.yaml
DT_AUTO_CLOSE_DAYS=7
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — event logging, Pareto analysis, MTBF/MTTR, cost estimation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
