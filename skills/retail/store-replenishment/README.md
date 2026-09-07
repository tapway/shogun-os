![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Store Replenishment

> Auto-reorder from warehouse to stores with min/max levels, cluster allocation, and lead time tracking.

## What It Does

Automates inventory flow from distribution centers to retail stores. Calculates optimal reorder quantities based on consumption rates, lead times, and safety stock targets, then allocates available inventory across store clusters. Targets >95% in-stock rate with <2% stockouts.

## Quick Example

```
Input:  replenish reorder --store STORE-01 --dry-run

Output:
  Store: STORE-01 | Date: 2026-09-04 | Mode: DRY RUN
  Reorder Proposals:
    SKU001 (Cola 355ml): Current 8, Min 10, Max 50 → Order 40 (multiple of 5)
    SKU003 (Chips Original): Current 3, Min 5, Max 25 → Order 20
    SKU007 (Water 500ml): Current 45, Min 10, Max 50 → No order needed

  Total SKUs to reorder: 2 | Estimated cost: RM 1,240
```

## When to Use / When NOT To

**Use when:**
- Generating daily reorder proposals for stores
- Allocating warehouse inventory across store clusters
- Reviewing min/max levels and safety stock settings
- Tracking vendor lead times and delivery variance

**Don't use for:**
- Warehouse internal operations → use warehouse-distribution skill
- New stores without historical data (use cluster averages first 8 weeks)
- Promotion periods without adjusted min/max levels

## Prerequisites

- [ ] Database connection for inventory and sales data
- [ ] Store cluster configuration in `clusters.yaml`
- [ ] SKU min/max levels defined in `minmax.yaml`
- [ ] Scripts: `reorder-proposal.py`, `allocation-engine.py`, `lead-time-monitor.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / supply-chain |
| Slash Command | `/store-replenishment` |
| Related Skills | [warehouse-distribution](../warehouse-distribution/), [store-sales-dashboard](../store-sales-dashboard/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REPLENISH_SAFETY_STOCK_DAYS` | Safety stock coverage | `7` |
| `REPLENISH_REORDER_FREQUENCY` | Reorder cadence | `daily` |
| `REPLENISH_MIN_ORDER_QTY` | Minimum order quantity per SKU | `5` |
| `REPLENISH_MAX_STOCK_DAYS` | Maximum stock coverage | `30` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — reorder proposals, allocation engine, lead time monitoring |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
