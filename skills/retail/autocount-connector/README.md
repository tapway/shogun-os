![Retail](https://img.shields.io/badge/dept-Retail-orange)

# AutoCount Connector

> Connects Shogun OS to AutoCount AOTG API for stock balances, invoices, debtor aging, and purchase orders.

## What It Does

Provides read/write access to Malaysia's most popular SMB accounting software (AutoCount) via the AOTG API. Enables real-time stock balance queries, sales invoice retrieval, debtor aging reports, purchase order management, and stock adjustments — forming the data backbone for all retail sync and analysis skills.

## Quick Example

```python
from autocount_connector import AutoCountAdapter

adapter = AutoCountAdapter()       # reads env vars
result = adapter.connect()         # verify connection
→ {"success": true}

stock = adapter.read_stock_balance(sku="PROD-001")
→ {"data": [{"sku": "PROD-001", "qty": 240, "uom": "PCS"}]}

invoices = adapter.read_sales_invoices(since="2026-01-01")
→ {"data": [{"invoice_no": "IV-001", "amount": 1500.00}, ...]}
```

## When to Use / When NOT To

**Use when:**
- Reading stock levels from AutoCount
- Pulling sales invoices or debtor aging
- Creating purchase orders or stock adjustments
- Any skill needs live AutoCount data

**Don't use for:**
- Syncing products to master store → use `autocount-product-sync`
- Non-AutoCount accounting systems → use the appropriate connector
- Direct customer-facing operations → use CRM skills

## Prerequisites

- [ ] Python 3.8+ with `requests` library
- [ ] AutoCount AOTG API credentials (API URL, API Key, Company DB)
- [ ] Environment variables: `AUTOCOUNT_API_URL`, `AUTOCOUNT_API_KEY`, `AUTOCOUNT_COMPANY_DB`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Retail |
| Owning Profile | retail-manager |
| Slash Command | `/autocount-connector` |
| Related Skills | [autocount-product-sync](../autocount-product-sync/), [daily-sales-dashboard](../daily-sales-dashboard/) |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTOCOUNT_API_URL` | Base URL of the AutoCount AOTG API | Yes |
| `AUTOCOUNT_API_KEY` | API key for authentication | Yes |
| `AUTOCOUNT_COMPANY_DB` | Target company database name | Yes |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — stock, invoices, debtor aging, POs, stock adjustments |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
