![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# ERP Connector

> Generic ERP connector framework with adapters for Odoo (XML-RPC) and ERPNext (Frappe REST) — reads work orders, BOMs, and inventory levels.

## What It Does

Provides a unified interface to read manufacturing data from your ERP system regardless of backend. Supports Odoo via XML-RPC and ERPNext via Frappe REST API. Reads work orders, bills of materials, and inventory levels with configurable sync intervals and local caching. All credentials are managed via environment variables.

## Quick Example

```bash
# Test connection
erp test-connection
→ ✅ Connected to Odoo at odoo.example.com:8069

# List in-progress work orders
erp work-orders --status "In Progress" --limit 5
→ WO-001234 | PROD-001 | Qty: 100 | Due: 2026-09-10

# Get BOM for a product
erp bom --product PROD-001
→ BOM-001: RM-001 (2.0 pcs), RM-002 (0.5 kg)

# Sync to local storage
erp sync --entities work_orders,inventory,boms --output-dir ./data/erp/
→ Synced 48 work orders, 156 SKUs, 32 BOMs
```

## When to Use / When NOT To

**Use when:**
- Connecting Shogun OS to an Odoo or ERPNext instance
- Reading work orders, BOMs, or inventory from ERP
- Syncing ERP data to local storage for offline analysis

**Don't use for:**
- Writing back to ERP (read-only connector)
- MES/SCADA real-time data → use mes-connector
- Systems other than Odoo or ERPNext

## Prerequisites

- [ ] ERP system accessible from the agent host
- [ ] API credentials configured via environment variables
- [ ] Network connectivity to ERP server (check firewall/proxy)
- [ ] ERP schema version documented for adapter compatibility

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | work-order-tracking, mes-connector, production-oee |

## Configuration

```bash
# .env — Odoo
ERP_ADAPTER=odoo
ERP_HOST=odoo.example.com
ERP_PORT=8069
ERP_DATABASE=production_db
ERP_USERNAME=api_user
ERP_API_KEY=odoo_api_key_here

# .env — ERPNext
ERP_ADAPTER=erpnext
ERP_HOST=erpnext.example.com
ERP_USERNAME=api_user
ERP_API_KEY=erpnext_api_key
ERP_API_SECRET=erpnext_api_secret
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — Odoo XML-RPC + ERPNext REST adapters, sync engine |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
