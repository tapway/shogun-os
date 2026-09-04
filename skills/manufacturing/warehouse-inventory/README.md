![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Warehouse Inventory

> Track inventory levels across raw materials, WIP, and finished goods — with aging analysis, reorder alerts, and cycle count scheduling.

## What It Does

Tracks inventory across five categories (raw materials, WIP, finished goods, MRO, consumables) with valuation and aging analysis. Identifies slow-moving (>90 days) and dead stock (>365 days), generates reorder point alerts with suggested purchase quantities, and schedules cycle counts by area with completion monitoring.

## Quick Example

```bash
# View raw material levels
inv levels --category raw --sort stock_qty
→ RM-001 Steel plate 3mm: 1,200 pcs | MYR 36,000
→ RM-002 Copper wire 1.5mm: 3,500 m  | MYR 17,500

# Aging analysis
inv aging --days 90 --category finished
→ FG-010: 450 units | 120 days | Slow-moving | MYR 22,500
→ FG-003: 80 units  | 400 days | Dead stock  | MYR 8,000

# Reorder alerts
inv reorder-alert --plant PLANT-01
→ RM-001: Below reorder point (1,200 < 1,500) | Suggest: 2,000 pcs

# Schedule cycle count
inv cycle-count create --area AISLE-01 --date 2026-09-10
→ CC-2026-0042 scheduled for AISLE-01
```

## When to Use / When NOT To

**Use when:**
- Checking inventory levels by category or location
- Identifying slow-moving or dead stock
- Generating reorder alerts with suggested quantities
- Scheduling and tracking cycle counts

**Don't use for:**
- Procurement-side inventory management → use procurement inventory-item-management
- Work order material allocation → use work-order-tracking

## Prerequisites

- [ ] Inventory data storage path configured (`INV_DATA_PATH`)
- [ ] ERP adapter or manual data source defined
- [ ] Reorder point configuration in YAML
- [ ] Cycle count frequency policy established

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Warehouse) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | erp-connector, work-order-tracking, production-oee |

## Configuration

```bash
# .env
INV_DATA_PATH=./data/inventory/
INV_ERP_ADAPTER=manual
INV_SLOW_MOVING_DAYS=90
INV_DEAD_STOCK_DAYS=365
INV_CYCLE_COUNT_FREQ=monthly
INV_SAFETY_STOCK_DEFAULT=14
INV_PLANT_CURRENCY=USD
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — multi-category inventory, aging analysis, reorder alerts, cycle counts |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
