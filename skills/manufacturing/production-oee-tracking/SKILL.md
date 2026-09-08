---
name: production-oee-tracking
description: "Track Overall Equipment Effectiveness (OEE) — availability, performance, quality metrics for manufacturing lines."
departments: [manufacturing]
version: 1.0.0
author: Shogun OS
tags: [oee, production, efficiency, downtime]
metadata:
  hermes:
    related_skills: [maintenance-downtime, production-oee]
---

# Production OEE Tracking

Use when monitoring equipment effectiveness, analyzing downtime causes, or calculating OEE scores for production lines.

## OEE Formula

```
OEE = Availability × Performance × Quality
```

| Component | Formula | Target |
|-----------|---------|--------|
| **Availability** | (Planned Time − Downtime) / Planned Time | ≥ 90% |
| **Performance** | (Actual Output / Ideal Output) × 100 | ≥ 95% |
| **Quality** | Good Units / Total Units Produced | ≥ 99% |
| **OEE Score** | A × P × Q | ≥ 85% (World Class) |

## Data Collection Points

1. **Shift Start** — Operator logs planned start time, target output
2. **Downtime Events** — Auto-capture from PLC or manual entry with reason code
3. **Output Count** — Sensor-based counter or hourly manual tally
4. **Quality Checks** — Inline inspection pass/fail, defect categorization
5. **Shift End** — Final output count, total downtime summary

## Downtime Reason Codes

| Code | Category | Example |
|------|----------|---------|
| D01 | Equipment Failure | Motor breakdown, sensor fault |
| D02 | Changeover | Product switch, tooling change |
| D03 | Material Shortage | Raw material out of stock |
| D04 | Quality Hold | Waiting for QC approval |
| D05 | Operator Absence | No trained operator available |
| D06 | Planned Maintenance | Scheduled PM window |

## Reporting Cadence

| Report | Frequency | Audience | Action Threshold |
|--------|-----------|----------|-----------------|
| Shift Summary | Daily | Line Supervisor | OEE < 75% → investigate |
| Weekly Trend | Weekly | Plant Manager | Declining trend 3 weeks → root cause |
| Monthly Analysis | Monthly | Operations Director | OEE < 80% → improvement plan |

## Pitfalls

| Issue | Solution |
|-------|----------|
| Manual data entry errors | Automate via PLC integration where possible |
| Downtime not categorized | Mandatory reason code selection before restart |
| Quality data lagging | Inline inspection, not end-of-line only |
| OEE inflated by overtime | Use planned time denominator, exclude OT |

## Verification

- [ ] All downtime events have reason codes
- [ ] Quality checks performed at defined intervals
- [ ] OEE calculated using correct planned time base
- [ ] Weekly trend report generated and reviewed
