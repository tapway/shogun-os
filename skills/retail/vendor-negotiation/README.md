![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Vendor Negotiation

> Vendor scorecards, margin analysis, contract expiry alerts, and rebate tracking for data-driven procurement.

## What It Does

Consolidates supplier performance data into weighted scorecards covering delivery reliability, quality compliance, price competitiveness, and rebate accruals. Provides margin trend analysis, contract expiry alerts with negotiation talking points, and rebate aging reports to give buyers leverage in procurement negotiations.

## Quick Example

```
Input:  vendor scorecard --vendor VEN001 --period 2026-08

Output:
  Vendor Scorecard: ACME Supplies (VEN001)
  Period: Aug 2026 | Rating: Gold (82/100)

  On-Time Delivery: 94% (weight 30%) → 28.2
  Quality Acceptance: 99.5% (weight 25%) → 24.9
  Fill Rate: 97% (weight 20%) → 19.4
  Price Competitiveness: 98% of benchmark (weight 15%) → 14.7
  Rebate Accrual: 2.5% (weight 10%) → 2.5
  ────────────────────────────────────────
  Total: 89.7 → Platinum tier

Input:  vendor expiring-contracts --days 90

Output:
  ⚠️ VEN003 (Global Foods) — expires 2026-11-15 (72 days)
     Auto-renewal notice deadline: 2026-10-01
     Talking point: OTD dropped 8% last quarter
```

## When to Use / When NOT To

**Use when:**
- Preparing for vendor contract negotiations or renewals
- Generating periodic vendor performance scorecards
- Tracking rebate accruals and uncollected amounts
- Identifying vendors with expiring contracts

**Don't use for:**
- Purchase order creation → use procurement skills
- Comparing vendors across vastly different categories/volumes
- Scorecards using data older than 6 months (masks recent trends)

## Prerequisites

- [ ] Database connection for vendor, PO, and quality data
- [ ] Scorecard weights defined in `scorecard.yaml`
- [ ] Contract records with expiry dates in system
- [ ] Scripts: `vendor-scorecard.py`, `margin-analysis.py`, `contract-expiry-monitor.py`, `rebate-tracking.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / supply-chain |
| Slash Command | `/vendor-negotiation` |
| Related Skills | [assortment-planning](../assortment-planning/), [warehouse-distribution](../warehouse-distribution/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VENDOR_OTD_TARGET` | On-time delivery target % | `95` |
| `VENDOR_QUALITY_TARGET` | Quality acceptance target % | `99` |
| `VENDOR_CONTRACT_ALERT_DAYS` | Days before expiry to alert | `90` |
| `VENDOR_REBATE_THRESHOLD` | Minimum rebate % to flag | `2` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — scorecards, margin analysis, contract alerts, rebate tracking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
