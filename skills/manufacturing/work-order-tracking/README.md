![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Work Order Tracking

> Track manufacturing work orders from release to completion — WIP visibility, backlog reporting, and on-time delivery rate tracking.

## What It Does

Tracks work orders through five statuses (Released → In Progress → Hold → Completed → Closed) with support for both ERP-connected and manual entry workflows. Provides real-time WIP visibility, backlog aging analysis with escalation recommendations, and on-time delivery rate calculation against configurable targets.

## Quick Example

```bash
# List in-progress work orders
wo list --status in_progress --plant PLANT-01 --limit 5
→ WO-2026-001234 | PROD-A | Qty: 100 | Due: Sep 10 | Line 1
→ WO-2026-001235 | PROD-B | Qty: 250 | Due: Sep 12 | Line 2

# Create a work order
wo create --product PROD-A --quantity 100 --due 2026-09-15
→ WO-2026-001240 created | Status: Released

# WIP report
wo wip-report --plant PLANT-01
→ WIP: 8 orders | Total qty: 1,450 | Avg age: 4.2 days

# On-time delivery rate
wo otd --from 2026-08-01 --to 2026-08-31
→ OTD: 93.2% (target: 95%) | Late: 5 orders | Avg delay: 2.1 days
```

## When to Use / When NOT To

**Use when:**
- Tracking work order status and progress
- Generating WIP and backlog reports
- Calculating on-time delivery performance
- Creating work orders manually or from ERP sync

**Don't use for:**
- PM-generated maintenance work orders → use maintenance-pm

## Prerequisites

- [ ] ERP adapter configured or manual data path set (`WO_DATA_PATH`)
- [ ] Default plant identifier defined
- [ ] OTD target percentage configured
- [ ] Hold reason codes documented

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Production) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | erp-connector, production-oee, quality-ncr |

## Configuration

```bash
# .env
WO_ERP_ADAPTER=manual
WO_DATA_PATH=./data/work-orders/
WO_DEFAULT_PLANT=plant-01
WO_OTD_TARGET=95
WO_BACKLOG_WARNING_DAYS=3
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — WO lifecycle tracking, WIP/backlog reports, OTD calculation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
