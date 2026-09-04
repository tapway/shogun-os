#!/usr/bin/env python3
"""
QuickBooks Environment Checker — Sandbox vs Production
───────────────────────────────────────────────────────
Tells you whether your QBO credentials are for sandbox or production,
and shows you which company you're connected to.

Usage:
  Set these env vars or put in .env file:
    ACCT_CLIENT_ID=...
    ACCT_CLIENT_SECRET=...
    ACCT_REFRESH_TOKEN=...
    ACCT_COMPANY_ID=...
  
  Then run:
    python3 check-qbo-environment.py
"""

import json
import os
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# ── Load credentials ─────────────────────────────────────────────────────

def load_creds():
    """Load credentials from .env file or environment."""
    creds = {}
    
    # Try .env file first
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    creds[key.strip()] = val.strip()
    
    # Environment variables override .env
    for key in ["ACCT_CLIENT_ID", "ACCT_CLIENT_SECRET", "ACCT_REFRESH_TOKEN", "ACCT_COMPANY_ID"]:
        if os.environ.get(key):
            creds[key] = os.environ.get(key)
    
    return creds


print("=" * 80)
print("QuickBooks Environment Checker")
print("=" * 80)
print()

creds = load_creds()

client_id = creds.get("ACCT_CLIENT_ID", "")
client_secret = creds.get("ACCT_CLIENT_SECRET", "")
refresh_token = creds.get("ACCT_REFRESH_TOKEN", "")
company_id = creds.get("ACCT_COMPANY_ID", "")

if not all([client_id, client_secret, refresh_token, company_id]):
    print("❌ ERROR: Missing credentials")
    print()
    print("Required:")
    print("  - ACCT_CLIENT_ID")
    print("  - ACCT_CLIENT_SECRET")
    print("  - ACCT_REFRESH_TOKEN")
    print("  - ACCT_COMPANY_ID")
    print()
    print("Add them to your .env file or set as environment variables.")
    exit(1)

print(f"Credentials loaded:")
print(f"  Client ID:     {client_id[:20]}...")
print(f"  Client Secret: {client_secret[:20]}...")
print(f"  Refresh Token: {refresh_token[:20]}...")
print(f"  Company ID:    {company_id}")
print()

# ── Step 1: Get access token ────────────────────────────────────────────

print("Step 1: Exchanging refresh token for access token...")

token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
data = {
    "grant_type": "refresh_token",
    "refresh_token": refresh_token,
    "client_id": client_id,
    "client_secret": client_secret,
}

req = urllib.request.Request(
    token_url,
    data=urllib.parse.urlencode(data).encode(),
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        token_result = json.loads(resp.read().decode())
        access_token = token_result.get("access_token")
        print(f"✓ Got access token ({len(access_token)} chars)")
except Exception as e:
    print(f"❌ FAILED: {e}")
    print()
    print("Your refresh token may be invalid or expired.")
    print("Re-authorize using the OAuth flow.")
    exit(1)

print()

# ── Step 2: Fetch company info ─────────────────────────────────────────

print("Step 2: Fetching company information...")

base_url = f"https://quickbooks.api.intuit.com/v3/company/{company_id}"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

req = urllib.request.Request(
    f"{base_url}/companyinfo/1",
    headers=headers,
    method="GET"
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        company_info = json.loads(resp.read().decode())
except urllib.error.HTTPError as e:
    body = e.read().decode() if e.fp else ""
    print(f"❌ API call failed: HTTP {e.code}")
    print(f"   Response: {body}")
    print()
    if e.code == 401:
        print("Your access token is invalid or expired.")
    elif e.code == 403:
        print("Your token doesn't have permission to access this company.")
    elif e.code == 404:
        print(f"Company ID {company_id} not found.")
        print("This could mean:")
        print("  • Wrong company ID")
        print("  • You're trying to access sandbox with production token (or vice versa)")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Extract company details
qbo_company = company_info.get("CompanyInfo", {})
company_name = qbo_company.get("CompanyName", "Unknown")
legal_name = qbo_company.get("LegalName", "Unknown")
company_addr = qbo_company.get("CompanyAddr", {})
addr_line1 = company_addr.get("Line1", "")
city = company_addr.get("City", "")
country = qbo_company.get("Country", "")
fiscal_year_start = qbo_company.get("FiscalYearStartMonth", "N/A")

print(f"✓ Connected to company:")
print()
print(f"  Company Name:   {company_name}")
print(f"  Legal Name:     {legal_name}")
print(f"  Address:        {addr_line1}, {city}, {country}" if addr_line1 else f"  Country:        {country}")
print(f"  Fiscal Year:    Starts month {fiscal_year_start}" if fiscal_year_start != "N/A" else "")
print(f"  Company ID:     {company_id}")
print()

# ── Step 3: Determine environment ──────────────────────────────────────

print("Step 3: Analyzing environment...")
print()

# Check for sandbox indicators
is_sandbox = False
sandbox_indicators = []

if "sandbox" in company_name.lower():
    is_sandbox = True
    sandbox_indicators.append("Company name contains 'sandbox'")

if "test" in company_name.lower():
    is_sandbox = True
    sandbox_indicators.append("Company name contains 'test'")

if "demo" in company_name.lower():
    is_sandbox = True
    sandbox_indicators.append("Company name contains 'demo'")

# Common sandbox company patterns
if any(x in company_name for x in ["Joe's", "Blo's", "Sample", "Test"]):
    is_sandbox = True
    sandbox_indicators.append("Matches known Intuit sandbox company pattern")

# Check country (sandbox often defaults to US)
if country == "US" and len(addr_line1) == 0:
    sandbox_indicators.append("US company with no address (common in sandbox)")

print("Environment Analysis:")
print()

if is_sandbox:
    print("⚠️  WARNING: This appears to be a SANDBOX environment")
    print()
    print("Indicators:")
    for indicator in sandbox_indicators:
        print(f"  • {indicator}")
    print()
    print("SANDBOX companies have FAKE data — not your real accounting.")
    print()
    print("To connect to PRODUCTION:")
    print("  1. Go back to OAuth authorize URL")
    print("  2. Sign in with your REAL QuickBooks account (not sandbox)")
    print("  3. Select your actual company when prompted")
    print("  4. Copy the new realmId and refresh_token")
else:
    print("✅ This appears to be a PRODUCTION environment")
    print()
    print("Indicators:")
    print(f"  • Company name '{company_name}' looks like a real business")
    if addr_line1:
        print(f"  • Has a physical address: {addr_line1}")
    if country != "US":
        print(f"  • Country is {country} (sandbox defaults to US)")
    print()
    print("You are connected to your REAL QuickBooks accounting data.")

print()

# ── Step 4: Quick data sanity check ────────────────────────────────────

print("Step 4: Quick data sanity check...")
print()

# Try to get a few customers
query_req = urllib.request.Request(
    f"{base_url}/query?query=SELECT COUNT(*) FROM Customer",
    headers=headers,
    method="GET"
)

try:
    with urllib.request.urlopen(query_req, timeout=30) as resp:
        query_result = json.loads(resp.read().decode())
        customer_count = query_result.get("QueryResponse", {}).get("maxResults", 0)
        print(f"  Customers in database: {customer_count}")
except Exception as e:
    print(f"  Could not query customers: {e}")
    customer_count = None

# Try to get P&L
today = "2026-09-03"
first_day = "2026-09-01"
pl_req = urllib.request.Request(
    f"{base_url}/reports/profitloss?start_date={first_day}&end_date={today}",
    headers=headers,
    method="GET"
)

try:
    with urllib.request.urlopen(pl_req, timeout=30) as resp:
        pl_result = json.loads(resp.read().decode())
        rows = pl_result.get("Report", {}).get("Rows", {}).get("Row", [])
        
        # Look for total revenue
        revenue = "N/A"
        expenses = "N/A"
        net_income = "N/A"
        
        for row in rows:
            col_data = row.get("ColData", [])
            for i, cell in enumerate(col_data):
                val = cell.get("value", "")
                if "Total Income" in str(val) or "Total Revenue" in str(val):
                    try:
                        revenue = col_data[i+1].get("value", "N/A") if i+1 < len(col_data) else "N/A"
                    except:
                        pass
                if "Net Income" in str(val):
                    try:
                        net_income = col_data[i+1].get("value", "N/A") if i+1 < len(col_data) else "N/A"
                    except:
                        pass
        
        print(f"  P&L (this month): Revenue={revenue}, Net Income={net_income}")
        
        # Sanity check: if revenue is 0 or very small, might be sandbox
        try:
            rev_num = float(str(revenue).replace(",", ""))
            if rev_num == 0:
                print()
                print("  ⚠️  WARNING: Zero revenue detected")
                print("      This could indicate sandbox/test data")
        except:
            pass
            
except Exception as e:
    print(f"  Could not fetch P&L: {e}")

print()

# ── Final verdict ──────────────────────────────────────────────────────

print("=" * 80)
print("VERDICT")
print("=" * 80)
print()

if is_sandbox:
    print("❌ You are connected to SANDBOX (test) data")
    print()
    print("NEXT STEPS:")
    print("  1. Re-authorize with your PRODUCTION QuickBooks account")
    print("  2. Use the OAuth playground or capture server")
    print("  3. When signing in, select your REAL company (not sandbox)")
    print("  4. Update your .env with the new realmId and refresh_token")
else:
    print("✅ You are connected to PRODUCTION (live) accounting data")
    print()
    print("NEXT STEPS:")
    print("  1. Run the setup script to install the MCP bridge")
    print("  2. Configure your finance-manager profile")
    print("  3. Run snapshot writer to populate dashboard")
    print()
    print(f"  Your company '{company_name}' data will appear in the Finance dashboard.")

print()
print("=" * 80)
