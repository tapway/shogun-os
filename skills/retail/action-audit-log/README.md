![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Action Audit Log

> Records every e-commerce action into a queryable, append-only JSONL audit trail with timestamps.

## What It Does

Provides the central observability layer for the Shogun OS e-commerce pipeline. Every connector call, sync operation, price change, content generation, approval decision, and workflow step is logged with timestamp, originating skill, affected SKU/platform, old/new values, and outcome status. Enables compliance auditing, error tracking, and operational visibility across all retail skills.

## Quick Example

```
# Log a price change
audit.log(category="price_change", skill="shopee-price-sync",
          action="price_update", sku="PROD-001", platform="shopee",
          old_value={"price": 150.00}, new_value={"price": 135.00})

# Query recent price changes
entries = audit.query(category="price_change", platform="shopee")
→ [{"timestamp": "2026-08-14T10:00:00Z", "sku": "PROD-001", ...}]

# Get 7-day summary
summary = audit.get_summary(period_days=7)
→ {"total": 42, "success": 40, "errors": 2, "error_rate": 0.048}
```

## When to Use / When NOT To

**Use when:**
- You need an audit trail of e-commerce operations
- Investigating failed syncs or price changes
- Generating compliance or operational reports
- Any retail skill needs to record its actions

**Don't use for:**
- Storing product data → use `autocount-product-sync` or master store
- Approving actions → use `approval-gate`
- Business logic → this is purely an observability/logging layer

## Prerequisites

- [ ] Python 3.8+ (stdlib only)
- [ ] Write access to `$HERMES_HOME/ecommerce/logs/`
- [ ] `HERMES_HOME` environment variable set (defaults to `~/.hermes`)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/action-audit-log` |
| Related Skills | [approval-gate](../approval-gate/), [ecommerce-workflow-orchestrator](../ecommerce-workflow-orchestrator/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — append-only JSONL log, query/export/cleanup, 12 log categories |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
