![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Product Deep-Dive Verifier

> Deep-dive verification for a single SKU: UOM, IV/OS split, pricing, and data completeness audit.

## What It Does

Performs comprehensive verification of a single product record against source systems. Checks unit-of-measure consistency, inner/outer pack splits (IV/OS), pricing accuracy, and data field completeness. Flags discrepancies between master store and connected platforms before they cause listing or fulfillment errors.

## Quick Example

```
Input:  deep-dive SKU-100

Output:
  SKU-100 Deep-Dive Verification
  ✅ Name: Wireless Mouse (consistent across 3 platforms)
  ✅ Price: RM 49.90 (matches AutoCount)
  ⚠️ UOM: Master=PCS, Shopee=UNIT (mapping OK but inconsistent label)
  ❌ IV/OS: Inner pack missing in master store
  ❌ Weight: 0g in master (required for shipping calc)

  Score: 3/5 fields verified | 2 critical gaps
```

## When to Use / When NOT To

**Use when:**
- Onboarding new products before listing sync
- Troubleshooting listing errors on connected platforms
- Auditing data quality for high-value or high-volume SKUs

**Don't use for:**
- Bulk audits of entire catalog → use product-margin-analyzer or product-velocity-analyzer
- Products not yet in master store

## Prerequisites

- [ ] Product exists in Shogun master store
- [ ] At least one connector configured for cross-validation
- [ ] AutoCount or ERP access for pricing/UOM verification

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager / ecommerce |
| Slash Command | `/product-deep-dive-verifier` |
| Related Skills | [autocount-product-sync](../autocount-product-sync/), [shopee-listing-sync](../shopee-listing-sync/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — single-SKU deep verification |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
