![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Production OEE

> Calculate Overall Equipment Effectiveness (Availability × Performance × Quality) with daily reports, trend analysis, and top loss identification.

## What It Does

Computes OEE from availability, performance, and quality data with configurable targets (default 85% World-Class). Generates daily reports with trend lines, identifies top 5 loss categories (breakdown, setup, idling, speed loss, defects) via Pareto analysis, and tracks performance by plant, line, and shift.

## Quick Example

```bash
# Generate daily OEE report
oee report --date 2026-09-04 --plant PLANT-01
→ OEE: 78.2% (Target: 85%)
  Availability: 92.1% | Performance: 89.5% | Quality: 94.8%

# View 30-day trend
oee trend --days 30 --plant PLANT-01
→ Trend: 76.4% → 78.2% (+1.8pp) | Best: 82.1% (Sep 1)

# Top losses today
oee top-losses --date 2026-09-04 --limit 5
→ 1. Breakdown: 2.4h (EQ-001)
→ 2. Setup/Changeover: 1.8h (EQ-003)
→ 3. Speed Loss: 1.2h (EQ-007)
```

## When to Use / When NOT To

**Use when:**
- Daily production efficiency reporting
- Identifying top equipment losses for improvement
- Tracking OEE trends over time
- Comparing performance across lines or shifts

**Don't use for:**
- Detailed downtime event logging → use maintenance-downtime
- Quality defect tracking → use quality-ncr
- Partial shift data (flag as incomplete)

## Prerequisites

- [ ] OEE data source configured (CSV, API, or database)
- [ ] Shift calendar defined (`shifts.yaml`)
- [ ] Ideal cycle times validated and current
- [ ] Downtime events properly categorised

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Production) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | maintenance-downtime, maintenance-pm, quality-ncr, mes-connector |

## Configuration

```bash
# .env
OEE_TARGET=85
OEE_DATA_SOURCE=csv
OEE_DATA_PATH=./data/oee/
OEE_REPORT_PATH=./reports/oee/
OEE_SHIFT_CALENDAR=./config/shifts.yaml
OEE_PLANT_IDS=plant-01
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — OEE calculation, daily reports, trend analysis, top loss Pareto |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
