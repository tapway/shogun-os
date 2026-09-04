![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Store Staff Scheduling

> Shift planning, attendance tracking, break compliance monitoring, and labor cost vs sales ratio analysis.

## What It Does

Generates optimized staff schedules based on foot traffic forecasts and labor cost targets. Tracks clock-in/out compliance, monitors break adherence against labor regulations, and calculates labor cost as a percentage of sales. Targets 8-12% labor cost ratio with >95% break compliance.

## Quick Example

```
Input:  staff schedule --week 2026-W36 --store STORE-01 --optimize

Output:
  Week 36 Schedule — STORE-01
  Mon: Cashier×2, Sales×3, Supervisor×1 (08:00-16:00)
       Cashier×2, Sales×4, Supervisor×1 (14:00-22:00)
  Labor Cost %: 9.8% (target: 10%) ✅
  Coverage Gaps: 0 hours ✅
  Break Compliance: 97% ✅

Input:  staff labor-cost --period weekly --date 2026-09-01

Output:
  Weekly Labor Cost: RM 12,400 | Net Sales: RM 128,000
  Labor %: 9.7% ✅ | Overtime: 2.1% ✅
```

## When to Use / When NOT To

**Use when:**
- Generating weekly staff rosters optimized for traffic patterns
- Tracking daily attendance and late arrivals
- Auditing break compliance against labor regulations
- Analyzing labor cost as percentage of sales

**Don't use for:**
- Payroll processing → use finance payroll skills
- HR hiring or termination workflows
- Scheduling without publishing at least 7 days in advance

## Prerequisites

- [ ] Database connection for staff and attendance data
- [ ] Staff roles and min/max per shift defined in `staff.yaml`
- [ ] Labor law parameters configured per store jurisdiction
- [ ] Scripts: `generate-schedule.py`, `attendance-report.py`, `break-compliance.py`, `labor-cost-analysis.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / stores |
| Slash Command | `/store-staff-scheduling` |
| Related Skills | [store-sales-dashboard](../store-sales-dashboard/), [customer-segmentation](../customer-segmentation/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STAFF_LABOR_TARGET_PCT` | Target labor cost % of sales | `10` |
| `STAFF_MIN_SHIFT_HOURS` | Minimum shift duration | `4` |
| `STAFF_MAX_SHIFT_HOURS` | Maximum shift duration | `10` |
| `STAFF_BREAK_INTERVAL` | Hours before mandatory break | `5` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — schedule generation, attendance, break compliance, labor cost |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
