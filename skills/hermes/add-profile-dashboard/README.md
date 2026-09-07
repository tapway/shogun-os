![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Add Profile Dashboard

> Step-by-step guide for adding a department-specific operational dashboard to the Shogun OS web portal.

## What It Does

Provides a repeatable pattern for creating new profile dashboards (marketing, projects, product, etc.) in the Shogun OS web portal. Follows the established CRM dashboard architecture so every department gets consistent KPI cards, charts, and sub-tab navigation backed by gbrain data.

## Quick Example

```
User: "Add a marketing dashboard"

Agent follows 6-step workflow:
1. Load CRM dashboard as reference pattern
2. Add backend aggregation endpoint in dashboard.py
3. Add TypeScript types in types.ts
4. Add API method in api.ts
5. Create React sub-tab components (OverviewTab, LeadsTab)
6. Register in DashboardViewer component map

Result: /department/marketing?tab=dashboard renders
        with Overview, Leads, Analytics sub-tabs
```

## When to Use / When NOT To

**Use when:**
- Adding a new department dashboard to the Shogun OS web portal
- Extending an existing dashboard with new sub-tabs
- Following the CRM dashboard pattern for consistency

**Don't use for:**
- One-off data queries (use gbrain-query instead)
- Non-dashboard UI changes (use shogun-web-portal)
- Backend-only API work without a frontend component

## Prerequisites

- [ ] Shogun OS web portal running (`shogun-web/`)
- [ ] gbrain initialized with department pages ingested
- [ ] Familiarity with React + Recharts + FastAPI
- [ ] CRM dashboard exists as reference implementation

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (agent-loaded) |
| Related Skills | shogun-web-portal, gbrain-query |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 6-step workflow, design conventions, verification checklist |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
