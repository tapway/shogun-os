#!/usr/bin/env python3
"""
QuickBooks Online Accounting Provider Plugin
─────────────────────────────────────────────
Implements the accounting CONTRACT.md for QuickBooks Online API.

Environment:
  ACCT_API_KEY     — OAuth access token (auto-refreshed via oauth-helper)
  ACCT_CLIENT_ID   — QuickBooks OAuth client ID
  ACCT_CLIENT_SECRET — QuickBooks OAuth client secret
  ACCT_REFRESH_TOKEN — OAuth refresh token
  ACCT_COMPANY_ID  — QuickBooks company/realm ID
"""

import json
import os
import urllib.request
import urllib.error
import urllib.parse

from oauth_helper import get_quickbooks_session, QB_TOKEN_URL, QB_SCOPES

COMPANY_ID = os.environ.get("ACCT_COMPANY_ID", "")
BASE_URL = f"https://quickbooks.api.intuit.com/v3/company/{COMPANY_ID}"
SANDBOX_URL = f"https://sandbox-quickbooks.api.intuit.com/v3/company/{COMPANY_ID}"


def _get_access_token() -> str | None:
    """Get a valid access token, refreshing if necessary."""
    session = get_quickbooks_session()
    if session:
        return session.get("access_token")
    # Fallback to env var
    return os.environ.get("ACCT_API_KEY") or None


def _headers():
    token = _get_access_token()
    if not token:
        return {}
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _api(method: str, path: str, data: dict = None, params: dict = None):
    """Call QuickBooks Online API."""
    use_sandbox = os.environ.get("ACCT_SANDBOX", "false").lower() == "true"
    base = SANDBOX_URL if use_sandbox else BASE_URL
    url = f"{base}{path}"
    if params:
        qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items() if v is not None)
        url = f"{url}?{qs}"

    headers = _headers()
    if not headers.get("Authorization"):
        return {"error": "No valid access token", "code": "AUTH_FAILED"}

    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode()

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return {"error": f"HTTP {e.code}: {body}", "code": "PROVIDER_ERROR"}
    except Exception as e:
        return {"error": str(e), "code": "PROVIDER_ERROR"}


# ── Tool Schemas ─────────────────────────────────────────────────────────

def get_tool_schemas():
    return [
        {"name": "acct_list_sales_invoices", "description": "List sales invoices (QuickBooks: invoices)",
         "inputSchema": {"type": "object", "properties": {
             "search": {"type": "string"}, "contact_id": {"type": "string"},
             "date_from": {"type": "string"}, "date_to": {"type": "string"},
             "status": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}},
        {"name": "acct_create_sales_invoice", "description": "Create a sales invoice",
         "inputSchema": {"type": "object", "properties": {
             "contact_id": {"type": "string"}, "date": {"type": "string"},
             "currency_code": {"type": "string"}, "number2": {"type": "string"},
             "payment_mode": {"type": "string"}, "status": {"type": "string"},
             "description": {"type": "string"}, "form_items": {"type": "array"}},
         "required": ["contact_id", "date"]}},
        {"name": "acct_list_purchase_bills", "description": "List purchase bills (QuickBooks: bills)",
         "inputSchema": {"type": "object", "properties": {
             "search": {"type": "string"}, "contact_id": {"type": "string"},
             "date_from": {"type": "string"}, "date_to": {"type": "string"},
             "status": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}},
        {"name": "acct_create_purchase_bill", "description": "Create a purchase bill",
         "inputSchema": {"type": "object", "properties": {
             "contact_id": {"type": "string"}, "date": {"type": "string"},
             "currency_code": {"type": "string"}, "number2": {"type": "string"},
             "payment_mode": {"type": "string"}, "status": {"type": "string"},
             "description": {"type": "string"}, "form_items": {"type": "array"}},
         "required": ["contact_id", "date"]}},
        {"name": "acct_list_contacts", "description": "List customers/vendors",
         "inputSchema": {"type": "object", "properties": {
             "type": {"type": "string"}, "search": {"type": "string"},
             "limit": {"type": "integer"}, "offset": {"type": "integer"}}}},
        {"name": "acct_create_contact", "description": "Create a customer or vendor",
         "inputSchema": {"type": "object", "properties": {
             "name": {"type": "string"}, "email": {"type": "string"},
             "phone": {"type": "string"}, "type": {"type": "string"},
             "billing_party": {"type": "string"}},
         "required": ["name", "type"]}},
        {"name": "acct_list_products", "description": "List products/services (QBO: items)",
         "inputSchema": {"type": "object", "properties": {
             "search": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}},
        {"name": "acct_get_profit_loss", "description": "Get P&L for a date range",
         "inputSchema": {"type": "object", "properties": {
             "date_from": {"type": "string"}, "date_to": {"type": "string"}},
         "required": ["date_from", "date_to"]}},
        {"name": "acct_get_balance_sheet", "description": "Get balance sheet",
         "inputSchema": {"type": "object", "properties": {"as_of_date": {"type": "string"}}}},
        {"name": "acct_get_aging_report", "description": "Get AR/AP aging report",
         "inputSchema": {"type": "object", "properties": {
             "type": {"type": "string"}, "as_of_date": {"type": "string"}},
         "required": ["type"]}},
        {"name": "acct_update_invoice_status", "description": "Update invoice status",
         "inputSchema": {"type": "object", "properties": {
             "id": {"type": "string"}, "type": {"type": "string"}, "status": {"type": "string"}},
         "required": ["id", "type", "status"]}},
    ]


# ── Tool Handlers ────────────────────────────────────────────────────────

def handle_tool(name: str, args: dict) -> dict:
    handlers = {
        "acct_list_sales_invoices": _list_invoices,
        "acct_create_sales_invoice": _create_invoice,
        "acct_list_purchase_bills": _list_bills,
        "acct_create_purchase_bill": _create_bill,
        "acct_list_contacts": _list_contacts,
        "acct_create_contact": _create_contact,
        "acct_list_products": _list_products,
        "acct_get_profit_loss": _get_profit_loss,
        "acct_get_balance_sheet": _get_balance_sheet,
        "acct_get_aging_report": _get_aging_report,
        "acct_update_invoice_status": _update_status,
    }
    handler = handlers.get(name)
    if not handler:
        return {"error": f"Not implemented: {name}", "code": "NOT_IMPLEMENTED"}
    return handler(args)


def _query_qbo(endpoint: str, query: str = None, limit: int = 50) -> dict:
    """Query QBO using the query endpoint or direct read."""
    if query:
        return _api("GET", f"/query", params={"query": query, "minorversion": "65"})
    return _api("GET", f"/{endpoint}", params={"minorversion": "65"})


def _list_invoices(args: dict) -> dict:
    # QBO uses a query language. Note: QBO SQL does not support '>'
    # comparison on the Balance field, so we filter outstanding invoices
    # client-side after fetching.
    conditions = []
    if args.get("date_from"):
        conditions.append(f"TxnDate >= '{args['date_from']}'")
    if args.get("date_to"):
        conditions.append(f"TxnDate <= '{args['date_to']}'")

    where = " AND ".join(conditions) if conditions else ""
    query = f"SELECT * FROM Invoice WHERE {where} MAXRESULTS {args.get('limit', 50)}" if where else \
            f"SELECT * FROM Invoice MAXRESULTS {args.get('limit', 50)}"

    data = _api("GET", "/query", params={"query": query, "minorversion": "65"})
    if "error" in data:
        return data

    invoices = []
    for inv in data.get("QueryResponse", {}).get("Invoice", []):
        balance = float(inv.get("Balance", 0))
        # Client-side filter: status='ready' means outstanding (balance > 0)
        if args.get("status") == "ready" and balance <= 0:
            continue
        invoices.append({
            "id": inv.get("Id"),
            "number": inv.get("DocNumber", ""),
            "number2": inv.get("DocNumber", ""),
            "date": inv.get("TxnDate", ""),
            "due_date": inv.get("DueDate", ""),
            "contact_id": inv.get("CustomerRef", {}).get("value", ""),
            "contact_name": inv.get("CustomerRef", {}).get("name", ""),
            "currency_code": inv.get("CurrencyRef", {}).get("value", "USD"),
            "total": float(inv.get("TotalAmt", 0)),
            "balance_due": balance,
            "status": "ready" if balance > 0 else "paid",
        })

    return {"invoices": invoices, "total": len(invoices)}


def _create_invoice(args: dict) -> dict:
    payload = {
        "Line": [],
        "CustomerRef": {"value": args["contact_id"]},
        "TxnDate": args["date"],
    }
    if args.get("currency_code"):
        payload["CurrencyRef"] = {"value": args["currency_code"]}
    if args.get("number2"):
        payload["DocNumber"] = args["number2"]

    for item in args.get("form_items", []):
        # Use SalesItemLineDetail with product_id (a Service item, not Inventory).
        # Service items don't have inventory start date restrictions.
        # Falls back to account_id if product_id not provided.
        item_ref = str(item.get("product_id", item.get("account_id", "1")))
        line = {
            "DetailType": "SalesItemLineDetail",
            "Amount": float(item.get("quantity", 1)) * float(item.get("unit_price", 0)),
            "SalesItemLineDetail": {
                "ItemRef": {"value": item_ref},
                "Qty": float(item.get("quantity", 1)),
                "UnitPrice": float(item.get("unit_price", 0)),
            },
            "Description": item.get("description", ""),
        }
        payload["Line"].append(line)

    data = _api("POST", "/invoice", data=payload)
    if "error" in data:
        return data

    inv = data.get("Invoice", {})
    return {
        "id": inv.get("Id"),
        "number": inv.get("DocNumber", ""),
        "status": "ready",
        "total": float(inv.get("TotalAmt", 0)),
    }


def _list_bills(args: dict) -> dict:
    # QBO SQL does not support '>' on the Balance field — filter client-side.
    conditions = []
    if args.get("date_from"):
        conditions.append(f"TxnDate >= '{args['date_from']}'")
    if args.get("date_to"):
        conditions.append(f"TxnDate <= '{args['date_to']}'")

    where = " AND ".join(conditions) if conditions else ""
    query = f"SELECT * FROM Bill WHERE {where} MAXRESULTS {args.get('limit', 50)}" if where else \
            f"SELECT * FROM Bill MAXRESULTS {args.get('limit', 50)}"

    data = _api("GET", "/query", params={"query": query, "minorversion": "65"})
    if "error" in data:
        return data

    bills = []
    for bill in data.get("QueryResponse", {}).get("Bill", []):
        balance = float(bill.get("Balance", 0))
        # Client-side filter: status='ready' means outstanding (balance > 0)
        if args.get("status") == "ready" and balance <= 0:
            continue
        bills.append({
            "id": bill.get("Id"),
            "number": bill.get("DocNumber", ""),
            "number2": bill.get("DocNumber", ""),
            "date": bill.get("TxnDate", ""),
            "due_date": bill.get("DueDate", ""),
            "contact_id": bill.get("VendorRef", {}).get("value", ""),
            "contact_name": bill.get("VendorRef", {}).get("name", ""),
            "currency_code": bill.get("CurrencyRef", {}).get("value", "USD"),
            "total": float(bill.get("TotalAmt", 0)),
            "balance_due": balance,
            "status": "ready" if balance > 0 else "paid",
        })

    return {"bills": bills, "total": len(bills)}


def _create_bill(args: dict) -> dict:
    payload = {
        "Line": [],
        "VendorRef": {"value": args["contact_id"]},
        "TxnDate": args["date"],
    }
    if args.get("currency_code"):
        payload["CurrencyRef"] = {"value": args["currency_code"]}
    if args.get("number2"):
        payload["DocNumber"] = args["number2"]

    for item in args.get("form_items", []):
        line = {
            "DetailType": "AccountBasedExpenseLineDetail",
            "Amount": float(item.get("quantity", 1)) * float(item.get("unit_price", 0)),
            "AccountBasedExpenseLineDetail": {
                "AccountRef": {"value": str(item.get("account_id", "1"))},
                "BillableStatus": "NotBillable",
            },
            "Description": item.get("description", ""),
        }
        payload["Line"].append(line)

    data = _api("POST", "/bill", data=payload)
    if "error" in data:
        return data

    bill = data.get("Bill", {})
    return {
        "id": bill.get("Id"),
        "number": bill.get("DocNumber", ""),
        "status": "ready",
        "total": float(bill.get("TotalAmt", 0)),
    }


def _list_contacts(args: dict) -> dict:
    entity_type = "Customer" if args.get("type") == "customer" else \
                  "Vendor" if args.get("type") == "supplier" else "Customer"
    query = f"SELECT * FROM {entity_type} MAXRESULTS {args.get('limit', 50)}"
    if args.get("search"):
        query = f"SELECT * FROM {entity_type} WHERE DisplayName LIKE '%{args['search']}%' MAXRESULTS {args.get('limit', 50)}"

    data = _api("GET", "/query", params={"query": query, "minorversion": "65"})
    if "error" in data:
        return data

    key = "Customer" if entity_type == "Customer" else "Vendor"
    contacts = []
    for c in data.get("QueryResponse", {}).get(key, []):
        contacts.append({
            "id": c.get("Id"),
            "name": c.get("DisplayName", ""),
            "email": c.get("PrimaryEmailAddr", {}).get("Address", "") if c.get("PrimaryEmailAddr") else "",
            "phone": c.get("PrimaryPhone", {}).get("FreeFormNumber", "") if c.get("PrimaryPhone") else "",
            "type": "customer" if entity_type == "Customer" else "supplier",
            "billing_party": "",
        })

    return {"contacts": contacts, "total": len(contacts)}


def _create_contact(args: dict) -> dict:
    if args["type"] in ("customer", "both"):
        payload = {
            "DisplayName": args["name"],
            "GivenName": args["name"].split()[0] if args["name"].split() else args["name"],
            "FamilyName": " ".join(args["name"].split()[1:]) if len(args["name"].split()) > 1 else "",
        }
        if args.get("email"):
            payload["PrimaryEmailAddr"] = {"Address": args["email"]}
        if args.get("phone"):
            payload["PrimaryPhone"] = {"FreeFormNumber": args["phone"]}
        cust_data = _api("POST", "/customer", data=payload)
        if "error" in cust_data:
            return cust_data
        customer_id = cust_data.get("Customer", {}).get("Id")

    if args["type"] in ("supplier", "both"):
        payload = {"DisplayName": args["name"]}
        if args.get("email"):
            payload["PrimaryEmailAddr"] = {"Address": args["email"]}
        if args.get("phone"):
            payload["PrimaryPhone"] = {"FreeFormNumber": args["phone"]}
        vend_data = _api("POST", "/vendor", data=payload)
        if "error" in vend_data:
            return vend_data
        supplier_id = vend_data.get("Vendor", {}).get("Id")

    if args["type"] == "both":
        return {"id": customer_id, "name": args["name"], "type": "both"}
    elif args["type"] == "customer":
        return {"id": customer_id, "name": args["name"], "type": "customer"}
    elif args["type"] == "supplier":
        return {"id": supplier_id, "name": args["name"], "type": "supplier"}

    return {"error": "Unknown contact type", "code": "MISSING_FIELD"}


def _list_products(args: dict) -> dict:
    query = f"SELECT * FROM Item MAXRESULTS {args.get('limit', 50)}"
    if args.get("search"):
        query = f"SELECT * FROM Item WHERE Name LIKE '%{args['search']}%' MAXRESULTS {args.get('limit', 50)}"

    data = _api("GET", "/query", params={"query": query, "minorversion": "65"})
    if "error" in data:
        return data

    products = []
    for p in data.get("QueryResponse", {}).get("Item", []):
        products.append({
            "id": p.get("Id"),
            "name": p.get("Name", ""),
            "unit_label": p.get("QtyOnHand", "") if p.get("Type") == "Inventory" else "Unit",
            "unit_price": float(p.get("UnitPrice", 0)),
            "account_id": p.get("IncomeAccountRef", {}).get("value", "") if p.get("IncomeAccountRef") else "",
            "account_name": "",
        })

    return {"products": products, "total": len(products)}


def _to_float(val) -> float:
    """Safely convert a QBO report cell value to float."""
    if val is None:
        return 0.0
    try:
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return 0.0


def _summary_amount(section: dict) -> float:
    """Extract the numeric amount from a QBO Summary.ColData array.

    QBO Summary ColData layout: [{value: "Total Income"}, {value: "12345.00"}]
    Index 0 is the label, index 1 is the amount. Falls back to 0.
    """
    col_data = section.get("Summary", {}).get("ColData", [])
    if len(col_data) >= 2:
        return _to_float(col_data[1].get("value", "0"))
    return 0.0


def _section_name(section: dict) -> str:
    """Extract the header label from a QBO report section."""
    col_data = section.get("Header", {}).get("ColData", [])
    if col_data:
        return col_data[0].get("value", "")
    return ""


def _section_rows(section: dict) -> list:
    """Get the data rows from a QBO report section."""
    inner = section.get("Rows")
    return inner.get("Row", []) if inner else []


def _parse_report_rows(section_rows: list) -> list:
    """Parse account-level rows from a QBO report section.

    Each row's ColData: [{value: "Account Name"}, {value: "123.45"}].
    Also recurses into nested "Rows.Row" (sub-sections like Total sections).
    """
    accounts = []
    for row in section_rows:
        cols = row.get("ColData", [])
        if len(cols) >= 2 and cols[0].get("value") and not str(cols[0].get("value", "")).startswith("Total "):
            accounts.append({
                "account_id": "",
                "account_name": cols[0].get("value", ""),
                "amount": _to_float(cols[1].get("value", "0")),
            })
        # Recurse into nested sections (grouped rows)
        nested = row.get("Rows")
        if nested:
            accounts.extend(_parse_report_rows(nested.get("Row", [])))
    return accounts


def _get_profit_loss(args: dict) -> dict:
    data = _api("GET", "/reports/ProfitAndLoss",
                params={"start_date": args["date_from"], "end_date": args["date_to"], "minorversion": "65"})
    if "error" in data:
        return data

    # Parse QBO report structure
    rows = data.get("Rows", {}).get("Row", [])
    revenue_accounts = []
    expense_accounts = []
    total_revenue = 0
    total_expenses = 0

    for section in rows:
        name = _section_name(section)
        section_rows = _section_rows(section)

        if "Income" in name:
            total_revenue = _summary_amount(section)
            revenue_accounts.extend(_parse_report_rows(section_rows))
        elif "Expense" in name:
            total_expenses = _summary_amount(section)
            expense_accounts.extend(_parse_report_rows(section_rows))

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": total_revenue - total_expenses,
        "revenue_accounts": revenue_accounts,
        "expense_accounts": expense_accounts,
    }


def _collect_data_rows(section: dict, accounts: list):
    """Recursively collect all Data rows from a section subtree."""
    for row in _section_rows(section):
        if row.get("type") == "Data":
            cols = row.get("ColData", [])
            if len(cols) >= 2 and cols[0].get("value"):
                accounts.append({
                    "account_id": "",
                    "account_name": cols[0].get("value", ""),
                    "amount": _to_float(cols[1].get("value", "0")),
                })
        else:
            _collect_data_rows(row, accounts)


def _walk_balance_sheet(section: dict, asset_accts: list, liability_accts: list,
                        equity_accts: list, totals: dict):
    """Walk the QBO balance sheet tree, assigning accounts to the right bucket.

    QBO structure:
      ASSETS (top) → Current Assets → Bank Accounts → Data rows
      LIABILITIES AND EQUITY (combined) → Liabilities → ... → Data rows
                                       → Equity → Data rows
    """
    name = _section_name(section).upper()

    if "ASSET" in name and "LIABILITY" not in name:
        totals["asset"] = _summary_amount(section)
        _collect_data_rows(section, asset_accts)
        return

    if "LIABILIT" in name and "EQUITY" in name:
        # Combined section — recurse into sub-sections
        for sub in _section_rows(section):
            sub_name = _section_name(sub).upper()
            if "LIABILIT" in sub_name:
                totals["liability"] = _summary_amount(sub)
                _collect_data_rows(sub, liability_accts)
            elif "EQUITY" in sub_name:
                totals["equity"] = _summary_amount(sub)
                _collect_data_rows(sub, equity_accts)
        return

    if "LIABILIT" in name:
        totals["liability"] = _summary_amount(section)
        _collect_data_rows(section, liability_accts)
    elif "EQUITY" in name:
        totals["equity"] = _summary_amount(section)
        _collect_data_rows(section, equity_accts)


def _get_balance_sheet(args: dict) -> dict:
    params = {"minorversion": "65"}
    if args.get("as_of_date"):
        params["end_date"] = args["as_of_date"]

    data = _api("GET", "/reports/BalanceSheet", params=params)
    if "error" in data:
        return data

    # Parse QBO balance sheet — sections are nested two levels deep
    rows = data.get("Rows", {}).get("Row", [])
    asset_accounts = []
    liability_accounts = []
    equity_accounts = []
    totals = {}

    for section in rows:
        _walk_balance_sheet(section, asset_accounts, liability_accounts, equity_accounts, totals)

    return {
        "total_assets": totals.get("asset", 0),
        "total_liabilities": totals.get("liability", 0),
        "total_equity": totals.get("equity", 0),
        "asset_accounts": asset_accounts,
        "liability_accounts": liability_accounts,
        "equity_accounts": equity_accounts,
    }


def _get_aging_report(args: dict) -> dict:
    report_type = "AgedReceivables" if args["type"] == "receivable" else "AgedPayables"
    data = _api("GET", f"/reports/{report_type}", params={"minorversion": "65"})
    if "error" in data:
        return data

    return {
        "type": args["type"],
        "as_of_date": args.get("as_of_date", ""),
        "total": float(data.get("Header", {}).get("Total", 0)),
        "buckets": [],
        "items": [],
    }


def _update_status(args: dict) -> dict:
    # QBO uses void operation
    entity_type = "invoice" if args["type"] == "invoice" else "bill"
    if args["status"] == "void":
        data = _api("POST", f"/{entity_type}/{args['id']}/void", params={"minorversion": "65"})
    else:
        return {"error": "QBO only supports void via this endpoint", "code": "NOT_IMPLEMENTED"}

    if "error" in data:
        return data
    return {"id": args["id"], "number": "", "status": "void"}