![Procurement](https://img.shields.io/badge/dept-Procurement-teal)

# Location & Bin Management

> Manage warehouse locations, storage bins, and shelf assignments — create bins, move items, and report capacity utilisation.

## What It Does

Manages warehouse location and bin pages under `procurement/locations/<LOC-ID>.md` in gbrain. Each location records its ID, zone, capacity, and current occupancy. Links items to locations via `location_id` frontmatter, supporting both bin-to-item and item-to-bin lookups for efficient warehouse organisation.

## Quick Example

```
"Move SKU-042 to shelf B2"
  │
  ├── Retrieve item SKU-042 → currently at LOC-MAIN-A1
  ├── Update item location_id → LOC-MAIN-B2
  ├── Remove SKU-042 from LOC-MAIN-A1.current_items
  ├── Add SKU-042 to LOC-MAIN-B2.current_items
  └── ✅ SKU-042 moved: LOC-MAIN-A1 → LOC-MAIN-B2
```

## When to Use / When NOT To

**Use when:**
- Setting up a new warehouse zone, bin, or shelf
- Relocating an item to a different bin
- Reporting capacity utilisation for a storage zone

**Don't use for:**
- Recording stock movements (receives/issues) → use stock-movement-audit

## Prerequisites

- [ ] Owning profile: `procurement-manager`
- [ ] MCP tools: `mcp_gbrain_save_page`, `mcp_gbrain_query`
- [ ] gbrain `procurement` source

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Procurement |
| Owning Profile | procurement-manager |
| Slash Command | N/A |
| Related Skills | inventory-item-management, stock-movement-audit |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — location/bin CRUD, item assignment, capacity reporting |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
