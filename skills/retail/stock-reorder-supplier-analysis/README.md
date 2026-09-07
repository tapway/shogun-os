![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Stock Reorder & Supplier Analysis

> Reorder alerts combined with supplier bulk deal analysis (8+1 tiered pricing, volume discounts).

## What It Does

Combines reorder point alerts with supplier deal optimization. When stock hits reorder thresholds, it analyzes supplier pricing tiers (e.g., 8+1 free deals, volume discounts) to recommend optimal order quantities that maximize value. Identifies bulk purchase opportunities that reduce unit cost while maintaining healthy stock levels.

## Quick Example

```
Input:  stock reorder-alerts --with-deals

Output:
  Reorder Alerts with Supplier Deals
  ─────────────────────────────────────
  SKU-100 (Cola 355ml): Stock 18, Reorder Point 20 ⚠️
    Supplier: BevCo Sdn Bhd
    Standard: RM 2.50/unit (MOQ 100)
    Deal: 8+1 free at RM 2.50 → effective RM 2.22/unit ✅
    Recommended: Order 200 (22 cases × 8+1 = 242 units)
    Savings: RM 55.00 vs standard pricing

  SKU-105 (Chips Original): Stock 8, Reorder Point 15 ⚠️
    Supplier: SnackWorld
    No active deals — order MOQ 50 at RM 3.80/unit
```

## When to Use / When NOT To

**Use when:**
- Reviewing daily reorder alerts with deal optimization
- Evaluating supplier bulk/tiered pricing opportunities
- Planning purchase orders to maximize volume discounts

**Don't use for:**
- Routine reorders without deal analysis → use store-replenishment skill
- Supplier contract negotiations → use vendor-negotiation skill
- Perishable products where overstocking risk exceeds deal savings

## Prerequisites

- [ ] Reorder points configured per SKU
- [ ] Supplier pricing tiers and deal structures loaded
- [ ] Current stock levels from master store or ERP
- [ ] Scripts available in `scripts/` directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / procurement |
| Slash Command | `/stock-reorder-supplier-analysis` |
| Related Skills | [store-replenishment](../store-replenishment/), [vendor-negotiation](../vendor-negotiation/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — reorder alerts with supplier deal optimization |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
