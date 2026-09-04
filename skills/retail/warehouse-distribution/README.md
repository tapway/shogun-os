![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Warehouse Distribution

> Inbound receiving, putaway, pick-pack-ship, cross-docking, wave planning, and carrier dispatch.

## What It Does

Manages end-to-end distribution center operations from inbound goods receipt through outbound shipment. Covers receiving verification, storage putaway, wave-based picking, packing, cross-docking for direct transfers, and carrier dispatch scheduling. Optimizes material flow with SLA targets for each operation stage.

## Quick Example

```
Input:  warehouse receive --po PO-2026-0451 --verify

Output:
  PO-2026-0451 Receiving — WH-01 Dock 3
  Expected: 500 units across 12 SKUs
  Received: 495 units (5 short on SKU007)
  Damaged: 3 units SKU002 (photo logged)
  Discrepancy report generated → vendor notified

Input:  warehouse pick-wave --type store-replenishment --wave-size 300

Output:
  Wave W-20260904-02 generated
  Picks: 287 lines | Zones: A, B, C
  Carrier cutoff: DHL 14:00 | Est completion: 12:45
  Cross-dock candidates: 4 POs → STORE-03, STORE-05
```

## When to Use / When NOT To

**Use when:**
- Processing inbound goods receipts against purchase orders
- Generating optimized pick waves for store replenishment or ecommerce
- Managing cross-dock transfers from inbound to outbound
- Scheduling carrier pickups and generating shipping manifests

**Don't use for:**
- Store-level inventory management → use store-replenishment skill
- Inventory counting or cycle counts → use warehouse-inventory skill
- Wave planning without checking carrier cutoff times first

## Prerequisites

- [ ] Database connection for warehouse operations data
- [ ] Warehouse layout defined in `layout.yaml` (zones, dock doors, carriers)
- [ ] Carrier API keys for label generation and tracking
- [ ] Scripts: `inbound-receiving.py`, `pick-wave-planner.py`, `cross-dock-manager.py`, `dispatch-scheduler.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / supply-chain |
| Slash Command | `/warehouse-distribution` |
| Related Skills | [store-replenishment](../store-replenishment/), [ecommerce-order-management](../ecommerce-order-management/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WAREHOUSE_WAVE_CUTOFF_TIME` | Daily wave cutoff (HH:MM) | `14:00` |
| `WAREHOUSE_MAX_WAVE_SIZE` | Maximum picks per wave | `500` |
| `WAREHOUSE_CROSSDOCK_ENABLED` | Enable cross-docking | `true` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — receiving, putaway, pick waves, cross-dock, dispatch |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
