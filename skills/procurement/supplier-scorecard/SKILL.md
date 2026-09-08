---
name: supplier-scorecard
description: "Evaluate supplier performance using delivery, quality, and price scorecards for vendor negotiation."
departments: [procurement, retail]
version: 1.0.0
author: Shogun OS
tags: [supplier, scorecard, vendor-rating, performance]
metadata:
  hermes:
    related_skills: [vendor-negotiation, purchase-order-workflow]
---

# Supplier Scorecard

Use when evaluating supplier performance for quarterly reviews, contract renewals, or new vendor selection.

## Scoring Dimensions

| Dimension | Weight | Metrics | Target |
|-----------|--------|---------|--------|
| **Delivery** | 35% | On-time %, lead time variance | ≥ 95% OTD |
| **Quality** | 30% | Defect rate, return rate, NCR count | ≤ 1% defect |
| **Price** | 20% | Price competitiveness, cost reduction | Within 5% of market |
| **Service** | 15% | Response time, issue resolution, flexibility | < 24h response |

## Rating Scale

| Score | Grade | Action |
|-------|-------|--------|
| 90–100 | A (Preferred) | Increase volume, strategic partnership |
| 80–89 | B (Approved) | Maintain current volume |
| 70–79 | C (Conditional) | Improvement plan required within 30 days |
| < 70 | D (Probation) | Reduce volume, source alternatives |

## Data Sources

- **Delivery**: PO expected date vs GRN receipt date
- **Quality**: QC inspection results, return notes, NCR records
- **Price**: Last 6 months PO pricing vs market benchmark
- **Service**: Support ticket response times, escalation frequency

## Workflow

1. **Auto-Calculate** — System pulls data from PO, GRN, QC modules monthly
2. **Review Meeting** — Procurement + Quality review scores quarterly
3. **Supplier Feedback** — Share scorecard with supplier, discuss improvement areas
4. **Action Plan** — Document corrective actions for C/D rated suppliers
5. **Re-evaluate** — Follow-up assessment after 30/60/90 days

## Pitfalls

| Issue | Solution |
|-------|----------|
| Small sample size skews score | Minimum 10 transactions before scoring |
| One bad delivery tanks score | Use rolling 6-month average, exclude force majeure |
| Price comparison unfair | Normalize by volume tier and payment terms |

## Verification

- [ ] All dimensions scored with supporting data
- [ ] Supplier notified of rating within 5 business days
- [ ] Improvement plan documented for C/D suppliers
- [ ] Re-evaluation date scheduled
