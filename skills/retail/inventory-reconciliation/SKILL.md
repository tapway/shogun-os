---
name: inventory-reconciliation
description: "Monthly inventory reconciliation — cycle count, variance analysis, and adjustment approval workflow."
departments: [retail]
version: 1.0.0
author: Shogun OS
tags: [inventory, cycle-count, variance, stocktake]
metadata:
  hermes:
    related_skills: [warehouse-inventory, dead-slow-stock-detector]
---

# Inventory Reconciliation

Use when performing monthly cycle counts, investigating stock variances, or processing inventory adjustments.

## Cycle Count Schedule

| Category | Frequency | Method | Tolerance |
|----------|-----------|--------|-----------|
| A-Items (high value) | Monthly | Full count | ±2% |
| B-Items (medium) | Quarterly | Sample 30% | ±5% |
| C-Items (low value) | Bi-annual | ABC analysis | ±10% |

## Workflow

1. **Generate Count Sheet** — System selects items based on schedule
2. **Physical Count** — Warehouse team scans barcodes, enters qty
3. **Variance Calc** — System compares physical vs system qty
4. **Investigation** — Variances > tolerance trigger root cause analysis
5. **Adjustment Approval** — Manager approves write-offs or restocks
6. **Post Adjustment** — GL entries created, inventory updated

## Variance Root Causes

- **Shrinkage** — Theft, damage, spoilage → write-off
- **Data Entry Error** — Wrong SKU scanned during receiving → correct receipt
- **Unit of Measure Mix-up** — Each vs box confusion → standardize UOM
- **Timing Difference** — Goods in transit not yet received → wait for GRN

## Approval Matrix

| Variance Value (RM) | Approver | Documentation Required |
|--------------------|---------|----------------------|
| ≤ 500 | Store Manager | Photo + incident report |
| 501 – 5,000 | Area Manager | CCTV review + witness statement |
| > 5,000 | Operations Director | Police report (if theft suspected) |

## Pitfalls

| Issue | Solution |
|-------|----------|
| Count during peak hours | Schedule counts before store opens |
| Same person counts & adjusts | Separate duties: counter ≠ approver |
| No photo evidence | Mandatory photo upload for all variances |

## Verification

- [ ] All scheduled items counted this period
- [ ] Variances investigated within 48 hours
- [ ] Adjustments approved with supporting docs
- [ ] GL entries posted to correct accounts
