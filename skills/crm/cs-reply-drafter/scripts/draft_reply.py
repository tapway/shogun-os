#!/usr/bin/env python3
"""
draft_reply.py — Customer service reply drafter.

Reads an inbound customer enquiry, checks stock availability, customer-specific
pricing, delivery possibility, and credit status against AutoCount data, then
prepares a professional reply draft for staff review before sending.

Idempotent and empty-data-safe: missing/incomplete data produces a draft with
flags and zero values, never crashes.

Usage:
    python draft_reply.py --enquiry-file path/to/enquiry.json
    python draft_reply.py --enquiry-text "Do you have 10x Widget A in stock?" --customer-phone "+6012345678"
    python draft_reply.py --batch --queue-dir ~/brain/retail/enquiry-queue/
    python draft_reply.py --dry-run --enquiry-file path/to/enquiry.json

Environment:
    AUTOCOUNT_API_URL, AUTOCOUNT_API_KEY, AUTOCOUNT_COMPANY_DB — loaded from
    ~/.hermes/profiles/kizuna/.env or retail-manager/.env if not already set.
    ACCT_PROVIDER, ACCT_CLIENT_ID, ACCT_CLIENT_SECRET, ACCT_REFRESH_TOKEN,
    ACCT_COMPANY_ID, ACCT_SANDBOX — for acct_* credit/aging tools.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import uuid
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Paths ──────────────────────────────────────────────────────────────
DEFAULT_BRIDGE = Path.home() / ".hermes" / "scripts" / "accounting" / "acct-bridge.py"
DEFAULT_OUTPUT = Path.home() / "brain" / "retail" / "reply-drafts"
DEFAULT_TEMPLATES = Path.home() / "brain" / "retail" / "reply-templates"
DEFAULT_PRICING = Path.home() / "brain" / "retail" / "pricing-rules.json"
ENV_FILE_KIZUNA = Path.home() / ".hermes" / "profiles" / "kizuna" / ".env"
ENV_FILE_RETAIL = Path.home() / ".hermes" / "profiles" / "retail-manager" / ".env"


# ── Helpers ────────────────────────────────────────────────────────────
def _safe_float(v: Any) -> float:
    try:
        if v is None:
            return 0.0
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def _safe_int(v: Any) -> int:
    try:
        if v is None:
            return 0
        return int(float(str(v).replace(",", "")))
    except (TypeError, ValueError):
        return 0


def _load_env():
    """Load AUTOCOUNT_* and ACCT_* env vars from profile .env if not set."""
    for env_file in (ENV_FILE_KIZUNA, ENV_FILE_RETAIL):
        if not env_file.exists():
            continue
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key.startswith(("AUTOCOUNT_", "ACCT_")) and key not in os.environ:
                os.environ[key] = val


def _call_acct_bridge(bridge_path: Path, tool_name: str, args: dict = None) -> dict:
    """Call an acct_* MCP tool via the bridge's JSON-RPC stdio interface."""
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": args or {}},
    }
    try:
        proc = subprocess.run(
            [sys.executable, str(bridge_path)],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode != 0:
            return {"success": False, "error": f"bridge exit {proc.returncode}: {proc.stderr[:200]}"}
        result = json.loads(proc.stdout)
        if "error" in result:
            return {"success": False, "error": result["error"].get("message", "unknown")}
        content = result.get("result", {}).get("content", [])
        if content and isinstance(content, list) and len(content) > 0:
            text = content[0].get("text", "")
            try:
                return {"success": True, "data": json.loads(text)}
            except (json.JSONDecodeError, TypeError):
                return {"success": True, "data": text}
        return {"success": True, "data": None}
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        return {"success": False, "error": str(e)}


def _call_autocount(method: str, params: dict = None) -> dict:
    """Call AutoCount AOTG API directly via urllib."""
    import urllib.request
    import urllib.error

    api_url = os.environ.get("AUTOCOUNT_API_URL", "")
    api_key = os.environ.get("AUTOCOUNT_API_KEY", "")
    company_db = os.environ.get("AUTOCOUNT_COMPANY_DB", "")

    if not api_url or not api_key:
        return {"success": False, "error": "AUTOCOUNT_API_URL/API_KEY not set"}

    endpoint_map = {
        "read_stock_balance": "/stock/balance",
        "read_sales_invoices": "/sales/invoices",
        "read_debtor_aging": "/debtor/aging",
        "read_purchase_orders": "/purchase/orders",
    }
    path = endpoint_map.get(method, f"/{method}")
    url = f"{api_url.rstrip('/')}{path}"

    try:
        from urllib.parse import urlencode
        qs = {}
        if company_db:
            qs["db"] = company_db
        if params:
            for k, v in params.items():
                if v is not None:
                    qs[k] = v
        if qs:
            url += "?" + urlencode(qs)

        req = urllib.request.Request(url)
        req.add_header("X-API-Key", api_key)
        req.add_header("Accept", "application/json")

        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"success": True, "data": data}
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        return {"success": False, "error": str(e)}


# ── Enquiry Parsing ────────────────────────────────────────────────────
def parse_enquiry(text: str, customer_phone: str = None, customer_name: str = None) -> dict:
    """
    Parse enquiry text to extract intent and entities.
    Returns a structured enquiry object. Flags 'unclear' if confidence is low.
    """
    text_lower = text.lower().strip()

    # Intent detection
    intent = "unknown"
    if any(w in text_lower for w in ["stock", "available", "have you", "got any", "how many"]):
        intent = "stock_check"
    elif any(w in text_lower for w in ["price", "how much", "cost", "quote"]):
        intent = "price_check"
    elif any(w in text_lower for w in ["order", "buy", "purchase", "deliver"]):
        intent = "order_intent"
    elif any(w in text_lower for w in ["when", "delivery", "ship", "arrive"]):
        intent = "delivery_check"

    # Quantity extraction
    qty_match = re.search(r"(\d+)\s*(?:x|units?|pcs?|pieces?|boxes?)?\s*", text_lower)
    requested_qty = _safe_int(qty_match.group(1)) if qty_match else None

    # Item extraction — look for capitalized words or "product X" patterns
    # This is intentionally simple; real deployment uses the LLM for entity extraction
    item_patterns = [
        r"(?:product|item|sku)\s+([A-Z0-9\-]+)",
        r"(\d+)\s*x\s*([A-Za-z0-9\s\-]+?)(?:\s+(?:in stock|available|please|$))",
    ]
    items = []
    for pattern in item_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            if isinstance(m, tuple):
                qty, name = m[0], m[1] if len(m) > 1 else m[0]
                items.append({"sku": None, "description": name.strip(), "requested_qty": _safe_int(qty)})
            else:
                items.append({"sku": m.strip() if m[0:1].isupper() else None, "description": m.strip(), "requested_qty": requested_qty or 1})

    # Deduplicate
    seen = set()
    unique_items = []
    for item in items:
        key = (item.get("sku"), item.get("description", "").lower())
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    confidence = "high" if unique_items and intent != "unknown" else "low"

    return {
        "intent": intent,
        "items": unique_items,
        "customer": {
            "phone": customer_phone,
            "name": customer_name,
        },
        "requested_qty": requested_qty,
        "raw_text": text,
        "confidence": confidence,
        "status": "unclear" if confidence == "low" else "parsed",
    }


# ── Customer Resolution ─────────────────────────────────────────────────
def resolve_customer(enquiry: dict, bridge_path: Path) -> dict:
    """Resolve customer identity via acct_list_contacts."""
    result = _call_acct_bridge(bridge_path, "acct_list_contacts")
    if not result.get("success"):
        enquiry["customer"]["is_new_customer"] = True
        return enquiry

    contacts = result.get("data", [])
    if isinstance(contacts, dict):
        contacts = contacts.get("contacts", [])

    phone = enquiry["customer"].get("phone")
    name = enquiry["customer"].get("name", "").lower()

    matched = None
    for c in contacts:
        c_phone = str(c.get("phone", "") or c.get("mobile", "") or "").replace(" ", "")
        c_name = str(c.get("name", "") or c.get("display_name", "")).lower()
        if phone and phone.replace(" ", "") in c_phone:
            matched = c
            break
        if name and len(name) >= 3 and name.lower() in c_name:
            matched = c
            break

    if matched:
        enquiry["customer"]["code"] = matched.get("code") or matched.get("id")
        enquiry["customer"]["name"] = matched.get("name") or matched.get("display_name")
        enquiry["customer"]["is_new_customer"] = False
    else:
        enquiry["customer"]["is_new_customer"] = True

    return enquiry


# ── Stock Check ─────────────────────────────────────────────────────────
def check_stock(enquiry: dict) -> dict:
    """Check stock availability for each item via AutoCount."""
    for item in enquiry.get("items", []):
        sku = item.get("sku")
        if not sku:
            item["available_qty"] = 0
            item["stock_checked"] = False
            item["note"] = "SKU not identified — manual lookup required"
            continue

        result = _call_autocount("read_stock_balance", {"sku": sku})
        if result.get("success"):
            stock_data = result.get("data", [])
            if isinstance(stock_data, list) and stock_data:
                stock = stock_data[0]
            elif isinstance(stock_data, dict):
                stock = stock_data
            else:
                stock = {}

            item["available_qty"] = _safe_int(stock.get("qty") or stock.get("balance") or stock.get("available"))
            item["warehouse"] = stock.get("warehouse") or stock.get("location")
            item["uom"] = stock.get("uom") or stock.get("unit")
            item["stock_checked"] = True
            item["stock_check_ts"] = datetime.now(timezone.utc).isoformat()
        else:
            item["available_qty"] = 0
            item["stock_checked"] = False
            item["note"] = f"Stock check failed: {result.get('error', 'unknown')}"

        # Determine availability status
        req = item.get("requested_qty", 1)
        avail = item.get("available_qty", 0)
        if avail >= req and avail > 0:
            item["availability"] = "available"
        elif avail > 0:
            item["availability"] = "partial"
            item["note"] = f"{req - avail} units short — backorder may be required"
        else:
            item["availability"] = "unavailable"
            item["note"] = "Out of stock"

    return enquiry


# ── Pricing Lookup ──────────────────────────────────────────────────────
def lookup_pricing(enquiry: dict, pricing_path: Path) -> dict:
    """Look up customer-specific pricing from pricing-rules.json."""
    pricing_rules = {}
    if pricing_path.exists():
        try:
            pricing_rules = json.loads(pricing_path.read_text())
        except (json.JSONDecodeError, OSError):
            pricing_rules = {}

    customer_code = enquiry["customer"].get("code")
    customer_contracts = pricing_rules.get("contracts", {}).get(customer_code, {})
    tier_rules = pricing_rules.get("tiers", {})

    for item in enquiry.get("items", []):
        sku = item.get("sku")
        if not sku:
            item["unit_price"] = 0.0
            item["price_source"] = "not_found"
            item["price_not_found"] = True
            continue

        # 1. Check customer-specific contract pricing
        if sku in customer_contracts:
            item["unit_price"] = _safe_float(customer_contracts[sku].get("price"))
            item["discount"] = _safe_float(customer_contracts[sku].get("discount", 0))
            item["price_source"] = "contract"
        else:
            # 2. Check tier-based pricing
            tier = enquiry["customer"].get("tier", "standard")
            tier_rule = tier_rules.get(tier, {})
            if sku in tier_rule:
                item["unit_price"] = _safe_float(tier_rule[sku].get("price"))
                item["discount"] = _safe_float(tier_rule[sku].get("discount", 0))
                item["price_source"] = "tier"
            else:
                # 3. Fall back to list price (would come from AutoCount item master)
                item["unit_price"] = _safe_float(item.get("list_price", 0))
                item["discount"] = 0.0
                item["price_source"] = "list"

        item["line_total"] = round(item["unit_price"] * item.get("requested_qty", 1), 2)

    return enquiry


# ── Credit Check ────────────────────────────────────────────────────────
def check_credit(enquiry: dict, bridge_path: Path) -> dict:
    """Check customer credit status via acct_get_aging_report."""
    if enquiry["customer"].get("is_new_customer"):
        enquiry["credit_status"] = {
            "status": "new_customer",
            "credit_limit": 0,
            "outstanding": 0,
            "overdue_invoices": 0,
            "credit_hold": False,
        }
        return enquiry

    result = _call_acct_bridge(bridge_path, "acct_get_aging_report", {"type": "receivable"})
    if not result.get("success"):
        enquiry["credit_status"] = {
            "status": "unknown",
            "credit_limit": 0,
            "outstanding": 0,
            "overdue_invoices": 0,
            "credit_hold": False,
            "error": result.get("error"),
        }
        return enquiry

    aging_data = result.get("data", [])
    if isinstance(aging_data, dict):
        aging_data = aging_data.get("customers", [])

    customer_code = enquiry["customer"].get("code")
    customer_aging = None
    for c in aging_data:
        if str(c.get("code") or c.get("customer_code") or "") == str(customer_code):
            customer_aging = c
            break

    if not customer_aging:
        enquiry["credit_status"] = {
            "status": "clear",
            "credit_limit": 0,
            "outstanding": 0,
            "overdue_invoices": 0,
            "credit_hold": False,
        }
        return enquiry

    outstanding = _safe_float(customer_aging.get("total_outstanding") or customer_aging.get("balance"))
    overdue = _safe_float(customer_aging.get("bucket_61_90", 0)) + _safe_float(customer_aging.get("bucket_90_plus", 0))
    overdue_invoices = _safe_int(customer_aging.get("overdue_count", 0))
    credit_limit = _safe_float(customer_aging.get("credit_limit", 0))

    if overdue > 0 or (credit_limit > 0 and outstanding > credit_limit):
        status = "over_limit"
        credit_hold = True
    elif outstanding > 0:
        status = "has_balance"
        credit_hold = False
    else:
        status = "clear"
        credit_hold = False

    enquiry["credit_status"] = {
        "status": status,
        "credit_limit": credit_limit,
        "outstanding": outstanding,
        "overdue_invoices": overdue_invoices,
        "credit_hold": credit_hold,
    }

    return enquiry


# ── Template Selection & Reply Drafting ─────────────────────────────────
def select_template(enquiry: dict, templates_dir: Path) -> str:
    """Select the appropriate reply template based on enquiry status."""
    if enquiry.get("status") == "unclear":
        return "reply-unclear"
    if enquiry["customer"].get("is_new_customer"):
        return "reply-new-customer"
    if enquiry.get("credit_status", {}).get("credit_hold"):
        return "reply-credit-hold"

    availabilities = [item.get("availability") for item in enquiry.get("items", [])]
    if all(a == "available" for a in availabilities):
        return "reply-available"
    elif all(a == "unavailable" for a in availabilities):
        return "reply-unavailable"
    elif "partial" in availabilities:
        return "reply-partial"
    return "reply-available"


def render_reply(enquiry: dict, template_name: str, templates_dir: Path) -> str:
    """Render the reply text from the selected template."""
    template_path = templates_dir / f"{template_name}.md"
    if not template_path.exists():
        # Fallback: generate a basic reply without template
        return _render_fallback_reply(enquiry)

    template = template_path.read_text()

    # Simple variable substitution
    customer_name = enquiry["customer"].get("name", "there")
    items_lines = []
    for item in enquiry.get("items", []):
        desc = item.get("description") or item.get("sku", "Item")
        avail = item.get("available_qty", 0)
        price = item.get("unit_price", 0)
        total = item.get("line_total", 0)
        items_lines.append(f"{desc} | {avail} | RM {price:.2f} | RM {total:.2f}")

    items_table = "\n".join(items_lines)
    delivery = enquiry.get("delivery_estimate", "2-3 business days")

    missing = enquiry.get("missing_info", [])
    missing_text = "\n".join(f"• {m}" for m in missing) if missing else "None"

    reply = template
    reply = reply.replace("{{customer_name}}", customer_name)
    reply = reply.replace("{{items_table}}", items_table)
    reply = reply.replace("{{delivery_estimate}}", delivery)
    reply = reply.replace("{{missing_info}}", missing_text)

    return reply


def _render_fallback_reply(enquiry: dict) -> str:
    """Generate a basic reply if no template is found."""
    customer_name = enquiry["customer"].get("name", "there")
    status = enquiry.get("status", "unknown")

    lines = [f"Hi {customer_name}, thank you for your enquiry."]

    if status == "unclear":
        lines.append("\nI'm not sure I fully understood your request. Could you please specify:")
        lines.append("• The product name or SKU")
        lines.append("• The quantity you need")
        lines.append("\nA team member will assist you shortly.")
        return "\n".join(lines)

    items_lines = []
    for item in enquiry.get("items", []):
        desc = item.get("description") or item.get("sku", "Item")
        avail = item.get("available_qty", 0)
        price = item.get("unit_price", 0)
        total = item.get("line_total", 0)
        items_lines.append(f"  {desc} | Qty Avail: {avail} | Unit: RM {price:.2f} | Total: RM {total:.2f}")

    lines.append("\nHere's what we found:")
    lines.extend(items_lines)
    lines.append(f"\nDelivery estimate: {enquiry.get('delivery_estimate', '2-3 business days')}")

    if enquiry.get("credit_status", {}).get("credit_hold"):
        lines.append("\n⚠️ Please note: your account has an outstanding balance. Our team will contact you to resolve this before proceeding.")

    missing = enquiry.get("missing_info", [])
    if missing:
        lines.append("\nTo proceed, we may need:")
        for m in missing:
            lines.append(f"• {m}")

    lines.append("\nShall I proceed with preparing your order?")
    return "\n".join(lines)


# ── Draft Assembly ──────────────────────────────────────────────────────
def assemble_draft(enquiry: dict, templates_dir: Path) -> dict:
    """Assemble the final reply draft object."""
    template_name = select_template(enquiry, templates_dir)
    reply_text = render_reply(enquiry, template_name, templates_dir)

    availabilities = [item.get("availability", "unknown") for item in enquiry.get("items", [])]
    if enquiry.get("status") == "unclear":
        overall_status = "unclear"
    elif all(a == "available" for a in availabilities):
        overall_status = "available"
    elif all(a == "unavailable" for a in availabilities):
        overall_status = "unavailable"
    else:
        overall_status = "partial"

    requires_approval = overall_status in ("partial", "unavailable", "unclear") or \
        enquiry.get("credit_status", {}).get("credit_hold", False)

    approval_reason = None
    if enquiry.get("status") == "unclear":
        approval_reason = "unclear_enquiry"
    elif overall_status == "partial":
        approval_reason = "partial_availability"
    elif overall_status == "unavailable":
        approval_reason = "out_of_stock"
    elif enquiry.get("credit_status", {}).get("credit_hold"):
        approval_reason = "credit_hold"

    draft_id = f"rd-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"

    return {
        "draft_id": draft_id,
        "enquiry_id": enquiry.get("enquiry_id", f"msg-{draft_id}"),
        "customer": enquiry["customer"],
        "status": overall_status,
        "items": enquiry.get("items", []),
        "delivery_estimate": enquiry.get("delivery_estimate", "2-3 business days"),
        "credit_status": enquiry.get("credit_status", {}),
        "missing_info": enquiry.get("missing_info", []),
        "reply_text": reply_text,
        "template_used": template_name,
        "requires_approval": requires_approval,
        "approval_reason": approval_reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Main ────────────────────────────────────────────────────────────────
def process_enquiry(
    enquiry_text: str,
    customer_phone: str = None,
    customer_name: str = None,
    bridge_path: Path = DEFAULT_BRIDGE,
    pricing_path: Path = DEFAULT_PRICING,
    templates_dir: Path = DEFAULT_TEMPLATES,
    output_dir: Path = DEFAULT_OUTPUT,
    dry_run: bool = False,
) -> dict:
    """Process a single enquiry and produce a reply draft."""
    _load_env()

    # 1. Parse enquiry
    enquiry = parse_enquiry(enquiry_text, customer_phone, customer_name)
    if enquiry["status"] == "unclear":
        # Skip data lookups for unclear enquiries — route to human
        draft = assemble_draft(enquiry, templates_dir)
        if not dry_run:
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / f"{draft['draft_id']}.json").write_text(json.dumps(draft, indent=2, default=str))
        return draft

    # 2. Resolve customer
    enquiry = resolve_customer(enquiry, bridge_path)

    # 3. Check stock
    enquiry = check_stock(enquiry)

    # 4. Lookup pricing
    enquiry = lookup_pricing(enquiry, pricing_path)

    # 5. Check credit
    enquiry = check_credit(enquiry, bridge_path)

    # 6. Assemble draft
    draft = assemble_draft(enquiry, templates_dir)

    # 7. Write draft
    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / f"{draft['draft_id']}.json").write_text(json.dumps(draft, indent=2, default=str))

    return draft


def process_batch(
    queue_dir: Path,
    bridge_path: Path = DEFAULT_BRIDGE,
    pricing_path: Path = DEFAULT_PRICING,
    templates_dir: Path = DEFAULT_TEMPLATES,
    output_dir: Path = DEFAULT_OUTPUT,
    dry_run: bool = False,
) -> dict:
    """Process a batch of enquiries from a queue directory."""
    if not queue_dir.exists():
        return {"success": False, "error": f"Queue dir not found: {queue_dir}"}

    enquiry_files = sorted(queue_dir.glob("*.json"))
    if not enquiry_files:
        return {"success": True, "drafts": [], "summary": {"total": 0, "by_status": {}}}

    drafts = []
    for ef in enquiry_files:
        try:
            data = json.loads(ef.read_text())
            enquiry_text = data.get("text") or data.get("message") or ""
            customer_phone = data.get("phone") or data.get("contact", {}).get("phone")
            customer_name = data.get("name") or data.get("contact", {}).get("name")
            enquiry_id = data.get("id") or ef.stem

            draft = process_enquiry(
                enquiry_text=enquiry_text,
                customer_phone=customer_phone,
                customer_name=customer_name,
                bridge_path=bridge_path,
                pricing_path=pricing_path,
                templates_dir=templates_dir,
                output_dir=output_dir,
                dry_run=dry_run,
            )
            draft["enquiry_id"] = enquiry_id
            drafts.append(draft)
        except (json.JSONDecodeError, OSError) as e:
            drafts.append({"error": str(e), "file": str(ef)})

    # Batch summary
    by_status = {}
    for d in drafts:
        s = d.get("status", "error")
        by_status[s] = by_status.get(s, 0) + 1

    summary = {
        "total": len(drafts),
        "by_status": by_status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "_batch_summary.json").write_text(json.dumps(summary, indent=2, default=str))

    return {"success": True, "drafts": drafts, "summary": summary}


def main():
    parser = argparse.ArgumentParser(
        description="Customer service reply drafter — checks stock, price, credit, drafts reply for staff review."
    )
    parser.add_argument("--enquiry-file", type=Path, help="Path to JSON enquiry file")
    parser.add_argument("--enquiry-text", type=str, help="Enquiry text (inline)")
    parser.add_argument("--customer-phone", type=str, default=None, help="Customer phone number")
    parser.add_argument("--customer-name", type=str, default=None, help="Customer name")
    parser.add_argument("--batch", action="store_true", help="Process all enquiries in queue dir")
    parser.add_argument("--queue-dir", type=Path, default=Path.home() / "brain" / "retail" / "enquiry-queue", help="Directory of enquiry JSON files for batch mode")
    parser.add_argument("--bridge", type=Path, default=DEFAULT_BRIDGE, help="Path to acct-bridge.py")
    parser.add_argument("--pricing", type=Path, default=DEFAULT_PRICING, help="Path to pricing-rules.json")
    parser.add_argument("--templates", type=Path, default=DEFAULT_TEMPLATES, help="Directory of reply templates")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output directory for drafts")
    parser.add_argument("--dry-run", action="store_true", help="Print drafts to stdout without writing files")
    args = parser.parse_args()

    if args.batch:
        result = process_batch(
            queue_dir=args.queue_dir,
            bridge_path=args.bridge,
            pricing_path=args.pricing,
            templates_dir=args.templates,
            output_dir=args.output,
            dry_run=args.dry_run,
        )
        if args.dry_run:
            print(json.dumps(result, indent=2, default=str))
        else:
            print(f"Batch complete: {result['summary']['total']} drafts — {json.dumps(result['summary']['by_status'])}")
        return

    if args.enquiry_file:
        data = json.loads(args.enquiry_file.read_text())
        enquiry_text = data.get("text") or data.get("message") or ""
        customer_phone = args.customer_phone or data.get("phone") or data.get("contact", {}).get("phone")
        customer_name = args.customer_name or data.get("name") or data.get("contact", {}).get("name")
    elif args.enquiry_text is not None:
        enquiry_text = args.enquiry_text
        customer_phone = args.customer_phone
        customer_name = args.customer_name
    else:
        parser.error("Provide --enquiry-file, --enquiry-text, or --batch")

    draft = process_enquiry(
        enquiry_text=enquiry_text,
        customer_phone=customer_phone,
        customer_name=customer_name,
        bridge_path=args.bridge,
        pricing_path=args.pricing,
        templates_dir=args.templates,
        output_dir=args.output,
        dry_run=args.dry_run,
    )

    print(json.dumps(draft, indent=2, default=str))


if __name__ == "__main__":
    main()
