#!/usr/bin/env python3
"""
QuickBooks Online Test Script — Verify Your Production Key Works
──────────────────────────────────────────────────────────────────
This script tests if you can pull data from QBO with your production credentials.

Usage:
  python3 test-qbo-connection.py

Before running:
  1. Set these environment variables OR put them in .env file:
     - ACCT_CLIENT_ID=your_client_id
     - ACCT_CLIENT_SECRET=your_client_secret
     - ACCT_REFRESH_TOKEN=your_refresh_token  (from OAuth flow)
     - ACCT_COMPANY_ID=your_company_id        (realm ID from OAuth flow)
     - ACCT_SANDBOX=false                     (production mode)

  2. If you only have Client ID + Secret but NO refresh token:
     → You MUST complete OAuth flow first (see QBO-FINANCE-SETUP-GUIDE.md Phase 3)
     → Client ID + Secret alone are INSUFFICIENT — you need refresh_token + company_id
"""

import json
import os
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# ── Configuration from environment ───────────────────────────────────────

CLIENT_ID = os.environ.get("ACCT_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("ACCT_CLIENT_SECRET", "")
REFRESH_TOKEN = os.environ.get("ACCT_REFRESH_TOKEN", "")
COMPANY_ID = os.environ.get("ACCT_COMPANY_ID", "")
USE_SANDBOX = os.environ.get("ACCT_SANDBOX", "false").lower() == "true"

if not COMPANY_ID:
    print("❌ ERROR: ACCT_COMPANY_ID is not set")
    print("\nYou need to complete the OAuth consent flow to get:")
    print("  - refresh_token")
    print("  - company_id (realm ID)")
    print("\nSee QBO-FINANCE-SETUP-GUIDE.md Phase 3 for instructions.")
    exit(1)

BASE_URL = f"https://sandbox-quickbooks.api.intuit.com/v3/company/{COMPANY_ID}" if USE_SANDBOX else f"https://quickbooks.api.intuit.com/v3/company/{COMPANY_ID}"

print("=" * 80)
print("QuickBooks Online Connection Test")
print("=" * 80)
print(f"Environment: {'SANDBOX' if USE_SANDBOX else 'PRODUCTION'}")
print(f"Company ID: {COMPANY_ID}")
print(f"Client ID: {CLIENT_ID[:20]}..." if len(CLIENT_ID) > 20 else f"Client ID: {CLIENT_ID}")
print(f"Has Refresh Token: {'Yes' if REFRESH_TOKEN else 'No'}")
print()

# ── Step 1: Try to get access token ───────────────────────────────────────

def get_access_token():
    """Exchange refresh token for access token."""
    if not REFRESH_TOKEN:
        return None, "Missing refresh token — complete OAuth flow first"
    
    if not CLIENT_ID or not CLIENT_SECRET:
        return None, "Missing client ID or secret"
    
    token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    
    data = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    
    req = urllib.request.Request(
        token_url,
        data=urllib.parse.urlencode(data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result.get("access_token"), None
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return None, f"Token exchange failed: HTTP {e.code} — {body}"
    except Exception as e:
        return None, f"Token exchange failed: {e}"


print("Step 1: Exchanging refresh token for access token...")
access_token, error = get_access_token()

if error:
    print(f"❌ FAILED: {error}")
    print("\nTROUBLESHOOTING:")
    print("  • If 'Missing refresh token': Complete OAuth flow (Phase 3 of setup guide)")
    print("  • If 'invalid_grant': Your refresh token expired — re-authorize")
    print("  • If 'unauthorized_client': Check Client ID/Secret are correct")
    exit(1)

print(f"✓ SUCCESS: Got access token ({len(access_token)} chars)")
print()

# ── Step 2: Test API call — Company Info ─────────────────────────────────

def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def api_call(method, path, params=None):
    """Make a QBO API call."""
    url = f"{BASE_URL}{path}"
    if params:
        qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
        url = f"{url}?{qs}"
    
    req = urllib.request.Request(url, method=method, headers=_headers(access_token))
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode()), None
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return None, f"HTTP {e.code}: {body}"
    except Exception as e:
        return None, str(e)


print("Step 2: Fetching company info...")
company_info, error = api_call("GET", "/companyinfo/1")

if error:
    print(f"❌ FAILED: {error}")
    print("\nTROUBLESHOOTING:")
    print("  • If '401 Unauthorized': Token expired or invalid — check credentials")
    print("  • If '403 Forbidden': Token doesn't have accounting scope")
    print("  • If '404 Not Found': Company ID may be wrong")
    exit(1)

print(f"✓ SUCCESS: Connected to company '{company_info.get('CompanyInfo', {}).get('CompanyName', 'Unknown')}'")
print()

# ── Step 3: Test accounting endpoints ────────────────────────────────────

print("Step 3: Testing accounting endpoints...")
print()

# Test 3a: List customers
print("  3a. Listing customers (limit=3)...")
result, error = api_call("GET", "/query", {"query": "SELECT * FROM Customer MAXRESULTS 3"})
if error:
    print(f"      ❌ FAILED: {error}")
else:
    count = len(result.get("QueryResponse", {}).get("Customer", []))
    print(f"      ✓ SUCCESS: Found {count} customers")

# Test 3b: Get P&L report
print("  3b. Getting Profit & Loss report (this month)...")
from datetime import date
today = date.today()
first_day = today.replace(day=1)
params = {
    "start_date": first_day.strftime("%Y-%m-%d"),
    "end_date": today.strftime("%Y-%m-%d")
}
result, error = api_call("GET", "/reports/profitloss", params)
if error:
    print(f"      ❌ FAILED: {error}")
else:
    # Extract summary
    header = result.get("Header", {})
    report = result.get("Report", {})
    rows = report.get("Rows", {}).get("Row", [])
    
    # Find net income
    net_income = "N/A"
    for row in rows:
        if row.get("ColData"):
            col_data = row["ColData"]
            if any("Net Income" in str(cell.get("value", "")) for cell in col_data):
                # Net Income row found
                for cell in col_data:
                    val = cell.get("value", "")
                    try:
                        net_income = float(val.replace(",", ""))
                        break
                    except:
                        continue
    
    print(f"      ✓ SUCCESS: P&L retrieved")
    print(f"          Period: {header.get('StartPeriod')} to {header.get('EndPeriod')}")
    print(f"          Net Income: {net_income}")

# Test 3c: Get Balance Sheet
print("  3c. Getting Balance Sheet...")
result, error = api_call("GET", "/reports/balancesheet", {"as_of_date": today.strftime("%Y-%m-%d")})
if error:
    print(f"      ❌ FAILED: {error}")
else:
    print(f"      ✓ SUCCESS: Balance Sheet retrieved")

# Test 3d: List invoices
print("  3d. Listing recent invoices (limit=5)...")
result, error = api_call("GET", "/query", {"query": "SELECT * FROM Invoice ORDERBY MetaData.CreateTime DESC MAXRESULTS 5"})
if error:
    print(f"      ❌ FAILED: {error}")
else:
    invoices = result.get("QueryResponse", {}).get("Invoice", [])
    print(f"      ✓ SUCCESS: Found {len(invoices)} invoices")
    if invoices:
        print(f"          Most recent: Invoice #{invoices[0].get('DocNumber', 'N/A')} - ${invoices[0].get('TotalAmt', 0):.2f}")

print()
print("=" * 80)
print("✅ ALL TESTS PASSED — Your QBO connection is working!")
print("=" * 80)
print()
print("NEXT STEPS:")
print("  1. Copy these credentials to ~/.hermes/profiles/finance-manager/.env")
print("  2. Add MCP server config to ~/.hermes/profiles/finance-manager/config.yaml")
print("  3. Restart gateway: hermes -p finance-manager gateway restart")
print("  4. Run snapshot writer to populate dashboard data")
print()
print("See QBO-FINANCE-SETUP-GUIDE.md for detailed instructions.")
