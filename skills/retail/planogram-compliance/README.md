![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Planogram Compliance

> Store layout audits, shelf compliance scoring, photo validation, and fixture standards enforcement.

## What It Does

Audits retail stores to ensure shelf layouts match approved planograms. Uses photo-based AI validation to calculate compliance scores, tracks fixture condition, and generates corrective action reports. Targets >90% shelf compliance and >95% fixture compliance across all stores.

## Quick Example

```
Input:  planogram audit --store STORE-01 --section Beverages

Output:
  Store: STORE-01 | Section: Beverages | Date: 2026-09-04
  Shelf Compliance: 87% (target: 90%) ⚠️
  Facings Compliance: 82% (target: 85%) ⚠️
  Fixture Compliance: 96% ✅

  Failed SKUs:
    SKU002 (Cola Zero) — position A01-02, expected 3 facings, found 2
    SKU005 (Sprite) — position A01-05, missing entirely

  Corrective Actions: 2 items flagged for store manager
```

## When to Use / When NOT To

**Use when:**
- Auditing store shelf layouts against planogram templates
- Validating store photos via AI analysis
- Tracking fixture condition and brand compliance
- Generating corrective action reports for store managers

**Don't use for:**
- Creating planogram templates → use assortment-planning skill
- Managing promotional displays → use promo-planning skill
- Low-resolution or poorly lit photos (AI accuracy degrades)

## Prerequisites

- [ ] Planogram template defined in `planogram.yaml`
- [ ] Audit photos meeting minimum resolution standards
- [ ] AI validation model configured
- [ ] Scripts: `store-audit.py`, `photo-validation.py`, `compliance-dashboard.py`, `fixture-standards.py`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / visual-merchandising |
| Slash Command | `/planogram-compliance` |
| Related Skills | [store-replenishment](../store-replenishment/), [assortment-planning](../assortment-planning/) |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PLANOGRAM_COMPLIANCE_TARGET` | Target compliance score % | `90` |
| `PLANOGRAM_AUDIT_FREQUENCY` | Audit cadence per store | `weekly` |
| `PLANOGRAM_PHOTO_STORAGE` | Uploaded audit photo path | `./photos/audits/` |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — audit, photo validation, compliance scoring, fixture tracking |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
