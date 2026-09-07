![Retail](https://img.shields.io/badge/dept-Retail-orange)

# Approval Gate

> Holds e-commerce actions for human approval before execution — approve, reject, or modify.

## What It Does

Provides a complete approval state machine (pending → approved/rejected/expired) for gated e-commerce actions like price changes, banner publishing, and campaign launches. Supports optional gates (auto-approved) and required gates (human review), with expiry for stale requests and delivery hooks for Slack/Telegram notification. Ensures no critical action goes live without oversight.

## Quick Example

```
# Request approval for a campaign launch (required gate → pending)
req = gate.request("campaign_launch", {
    "campaign_id": "CNY2026",
    "products": ["PROD-001", "PROD-002"],
    "discount": 0.20
})
→ {"id": "approval-2026-08-14-002", "status": "pending"}

# Approve it
gate.approve("approval-2026-08-14-002", decided_by="sang@shogun.os")
→ {"status": "approved"}

# Or reject with reason
gate.reject("approval-2026-08-14-002", decided_by="sang@shogun.os",
            reason="Margin too thin")
```

## When to Use / When NOT To

**Use when:**
- Price changes need management sign-off
- Publishing banners or listings to live platforms
- Launching marketing campaigns
- Any action that should not auto-execute

**Don't use for:**
- Logging actions → use `action-audit-log`
- Running the full pipeline → use `ecommerce-workflow-orchestrator`
- Read-only operations that don't change live data

## Prerequisites

- [ ] Python 3.8+ (stdlib only)
- [ ] `HERMES_HOME` environment variable set
- [ ] Write access to `$HERMES_HOME/ecommerce/approvals/`
- [ ] Optional: `scripts/config/approval-config.yaml` for gate configuration

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/approval-gate` |
| Related Skills | [action-audit-log](../action-audit-log/), [ecommerce-workflow-orchestrator](../ecommerce-workflow-orchestrator/) |

## Configuration

Gate behaviour is controlled by `scripts/config/approval-config.yaml`:

| Field | Description |
|-------|-------------|
| `required` | `true` = waits for human decision; `false` = auto-approved |
| `expiry_hours` | Hours before a pending request auto-expires |
| `deliver_to` | Channel routing hint (e.g. `slack:#marketing`) |

Default gates: `price_change` (optional), `banner_publishing` (required), `product_publishing` (required), `campaign_launch` (required), `promo_pricing` (required).

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — state machine, 5 gate types, CLI + Python API, delivery hooks |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
