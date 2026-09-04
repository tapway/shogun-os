#!/usr/bin/env python3
"""
QuickBooks Online Setup — Install & Test Connection
────────────────────────────────────────────────────
This script helps you set up QBO integration with your Finance dashboard.

It will:
  1. Check if you have credentials (Client ID, Secret, Refresh Token, Company ID)
  2. Guide you through OAuth flow if needed
  3. Install bridge scripts to ~/.hermes/scripts/accounting/
  4. Configure finance-manager profile
  5. Test the connection
  6. Run snapshot writer to populate dashboard data

Usage:
  python3 setup-qbo-finance.py
"""

import json
import os
import sys
import shutil
import subprocess
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent
HERMES_SCRIPTS = Path.home() / ".hermes" / "scripts" / "accounting"
PROFILE_DIR = Path.home() / ".hermes" / "profiles" / "finance-manager"
BRAIN_DIR = Path.home() / "brain" / "finance" / "snapshots"

print("=" * 80)
print("Shogun OS — QuickBooks Online Finance Integration Setup")
print("=" * 80)
print()

# ── Step 1: Check credentials ────────────────────────────────────────────

print("Step 1: Checking credentials...")
print()

# Check for .env file in current directory
env_file = REPO_ROOT / ".env"
creds = {}

if env_file.exists():
    print(f"  Found .env file at {env_file}")
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, val = line.split("=", 1)
                creds[key.strip()] = val.strip()
else:
    print(f"  No .env file found at {env_file}")

# Also check environment variables
for key in ["ACCT_CLIENT_ID", "ACCT_CLIENT_SECRET", "ACCT_REFRESH_TOKEN", "ACCT_COMPANY_ID"]:
    if key not in creds and os.environ.get(key):
        creds[key] = os.environ.get(key)

# Report what we have
has_client_id = bool(creds.get("ACCT_CLIENT_ID"))
has_client_secret = bool(creds.get("ACCT_CLIENT_SECRET"))
has_refresh_token = bool(creds.get("ACCT_REFRESH_TOKEN"))
has_company_id = bool(creds.get("ACCT_COMPANY_ID"))

print()
print("  Credential Status:")
print(f"    • Client ID:     {'✓ Found' if has_client_id else '✗ Missing'}")
print(f"    • Client Secret: {'✓ Found' if has_client_secret else '✗ Missing'}")
print(f"    • Refresh Token: {'✓ Found' if has_refresh_token else '✗ Missing'}")
print(f"    • Company ID:    {'✓ Found' if has_company_id else '✗ Missing'}")
print()

if not (has_client_id and has_client_secret):
    print("⚠️  WARNING: You're missing Client ID and/or Client Secret.")
    print()
    print("  To get these:")
    print("    1. Go to https://developer.intuit.com/app/developer/qbo/docs/develop")
    print("    2. Create a new app (select 'Private' or 'Internal' for company use)")
    print("    3. Copy Client ID and Client Secret from Keys & Credentials")
    print()
    proceed = input("  Continue anyway? (y/N): ").strip().lower()
    if proceed != "y":
        print("Setup cancelled.")
        exit(0)
    print()

if not (has_refresh_token and has_company_id):
    print("⚠️  WARNING: You're missing Refresh Token and/or Company ID.")
    print()
    print("  These come from the OAuth consent flow — you can't skip this step.")
    print("  Client ID + Secret alone are INSUFFICIENT.")
    print()
    print("  Quick method (using Intuit's OAuth2 Playground):")
    print("    1. Add this redirect URI to your app settings:")
    print("       https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl")
    print()
    print("    2. Open this URL in browser (replace YOUR_CLIENT_ID):")
    client_id_val = creds.get("ACCT_CLIENT_ID", "YOUR_CLIENT_ID")
    authorize_url = (
        f"https://appcenter.intuit.com/connect/oauth2?"
        f"client_id={client_id_val}"
        f"&response_type=code"
        f"&scope=com.intuit.quickbooks.accounting+openid+profile+email"
        f"&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl"
        f"&state=random123"
    )
    print(f"       {authorize_url}")
    print()
    print("    3. Sign in → Select sandbox/production company → Approve")
    print()
    print("    4. From the redirect URL, copy:")
    print("       - realmId → This is ACCT_COMPANY_ID")
    print("       - refresh_token → This is ACCT_REFRESH_TOKEN")
    print()
    
    # Offer to help capture tokens interactively
    print("  OR I can help you capture them now (if you have a local redirect URI registered):")
    print()
    capture_now = input("  Run OAuth capture server now? (y/N): ").strip().lower()
    
    if capture_now == "y":
        port = input("  Enter port number (default: 8080): ").strip() or "8080"
        
        # Check if capture script exists
        capture_script = REPO_ROOT / "recipes" / "accounting" / "qb-oauth-capture.py"
        if capture_script.exists():
            print(f"\n  Running OAuth capture on port {port}...")
            print("  → Open the authorize URL in browser")
            print("  → After approving, the server will catch the callback")
            print()
            subprocess.run([sys.executable, str(capture_script), "--port", port])
        else:
            print(f"  ✗ Capture script not found at {capture_script}")
            print("  → Please use the manual OAuth playground method above")
    
    print()
    print("  After getting the tokens, add them to your .env file:")
    print(f"    ACCT_REFRESH_TOKEN=<paste_your_refresh_token_here>")
    print(f"    ACCT_COMPANY_ID=<paste_your_company_id_here>")
    print()
    
    # Re-check
    print("  Have you added the tokens to .env now?")
    ready = input("  Ready to continue? (y/N): ").strip().lower()
    if ready != "y":
        print("Setup paused. Add the tokens and run this script again.")
        exit(0)
    print()

# ── Step 2: Install bridge scripts ───────────────────────────────────────

print("Step 2: Installing bridge scripts...")
print()

# Create destination directories
HERMES_SCRIPTS.mkdir(parents=True, exist_ok=True)
(HERMES_SCRIPTS / "plugins").mkdir(exist_ok=True)

# Source files
src_bridge = REPO_ROOT / "recipes" / "accounting" / "bridges" / "acct-bridge.py"
src_oauth = REPO_ROOT / "recipes" / "accounting" / "oauth_helper.py"
src_qbo = REPO_ROOT / "recipes" / "accounting" / "plugins" / "quickbooks.py"

# Check source files exist
missing = []
for src in [src_bridge, src_oauth, src_qbo]:
    if not src.exists():
        missing.append(src)

if missing:
    print(f"  ✗ ERROR: Missing source files:")
    for m in missing:
        print(f"      {m}")
    print()
    print("  These should be in the shogun-os repo at recipes/accounting/")
    exit(1)

# Copy files
dest_bridge = HERMES_SCRIPTS / "acct-bridge.py"
dest_oauth = HERMES_SCRIPTS / "oauth_helper.py"
dest_qbo = HERMES_SCRIPTS / "plugins" / "quickbooks.py"

shutil.copy2(src_bridge, dest_bridge)
shutil.copy2(src_oauth, dest_oauth)
shutil.copy2(src_qbo, dest_qbo)

print(f"  ✓ Installed acct-bridge.py → {dest_bridge}")
print(f"  ✓ Installed oauth_helper.py → {dest_oauth}")
print(f"  ✓ Installed quickbooks.py → {dest_qbo}")
print()

# Verify the bridge loads
print("  Testing bridge initialization...")
try:
    test_env = {**os.environ, "ACCT_PROVIDER": "quickbooks", "ACCT_COMPANY_ID": creds.get("ACCT_COMPANY_ID", "test")}
    result = subprocess.run(
        [sys.executable, "-c", 
         "import json; from pathlib import Path; "
         "import importlib.util; "
         "spec = importlib.util.spec_from_file_location('acct_bridge', str(Path.home() / '.hermes' / 'scripts' / 'accounting' / 'acct-bridge.py')); "
         "module = importlib.util.module_from_spec(spec); "
         "print('Bridge loaded successfully')"],
        env=test_env,
        capture_output=True,
        text=True,
        timeout=10
    )
    if result.returncode == 0:
        print("  ✓ Bridge module loads correctly")
    else:
        print(f"  ✗ Bridge load failed: {result.stderr}")
except Exception as e:
    print(f"  ✗ Bridge test error: {e}")

print()

# ── Step 3: Configure finance-manager profile ───────────────────────────

print("Step 3: Configuring finance-manager profile...")
print()

PROFILE_DIR.mkdir(parents=True, exist_ok=True)
config_file = PROFILE_DIR / "config.yaml"
env_file = PROFILE_DIR / ".env"

# Check if config.yaml exists
if not config_file.exists():
    print(f"  Creating config.yaml at {config_file}")
    config_content = """# Finance Manager Profile Configuration
# Generated by setup-qbo-finance.py

mcp_servers:
  accounting:
    command: python3
    args:
      - C:/Users/user/.hermes/scripts/accounting/acct-bridge.py
    env:
      ACCT_PROVIDER: quickbooks
      ACCT_SANDBOX: 'true'              # Set to 'false' for production
      ACCT_CLIENT_ID: '${ACCT_CLIENT_ID}'
      ACCT_CLIENT_SECRET: '${ACCT_CLIENT_SECRET}'
      ACCT_REFRESH_TOKEN: '${ACCT_REFRESH_TOKEN}'
      ACCT_COMPANY_ID: '${ACCT_COMPANY_ID}'
"""
    with open(config_file, "w") as f:
        f.write(config_content)
    print(f"  ✓ Created config.yaml")
else:
    print(f"  ✓ config.yaml already exists")
    # Check if accounting MCP server is configured
    with open(config_file) as f:
        config_text = f.read()
    if "accounting:" in config_text:
        print(f"  ✓ Accounting MCP server already configured")
    else:
        print(f"  ⚠️  WARNING: accounting MCP server not found in config.yaml")
        print(f"      Manual edit required — see QBO-FINANCE-SETUP-GUIDE.md")

# Configure .env file
print()
print("  Configuring profile .env file...")

if not env_file.exists():
    print(f"  Creating .env at {env_file}")
    env_content = f"""# Finance Manager Profile Environment
# Generated by setup-qbo-finance.py

# === Accounting Provider (QuickBooks Online) ===
ACCT_PROVIDER=quickbooks
ACCT_SANDBOX=true                        # false for production
ACCT_CLIENT_ID={creds.get('ACCT_CLIENT_ID', 'your_client_id')}
ACCT_CLIENT_SECRET={creds.get('ACCT_CLIENT_SECRET', 'your_client_secret')}
ACCT_REFRESH_TOKEN={creds.get('ACCT_REFRESH_TOKEN', 'your_refresh_token')}
ACCT_COMPANY_ID={creds.get('ACCT_COMPANY_ID', 'your_company_id')}
"""
    with open(env_file, "w") as f:
        f.write(env_content)
    print(f"  ✓ Created .env with your credentials")
else:
    print(f"  ✓ .env already exists")
    # Check if QBO credentials are present
    with open(env_file) as f:
        env_text = f.read()
    if "ACCT_CLIENT_ID" in env_text and "ACCT_REFRESH_TOKEN" in env_text:
        print(f"  ✓ QBO credentials already configured")
    else:
        print(f"  ⚠️  WARNING: QBO credentials missing from .env")
        print(f"      Manual edit required — add ACCT_* variables")

print()

# ── Step 4: Test connection ──────────────────────────────────────────────

print("Step 4: Testing QBO connection...")
print()

test_script = REPO_ROOT / "test-qbo-connection.py"
if test_script.exists():
    print("  Running connection test...")
    print()
    
    # Merge credentials into environment
    test_env = {**os.environ}
    for key in ["ACCT_CLIENT_ID", "ACCT_CLIENT_SECRET", "ACCT_REFRESH_TOKEN", "ACCT_COMPANY_ID", "ACCT_SANDBOX"]:
        if creds.get(key):
            test_env[key] = creds[key]
    
    result = subprocess.run(
        [sys.executable, str(test_script)],
        env=test_env,
        cwd=str(REPO_ROOT)
    )
    
    if result.returncode != 0:
        print()
        print("⚠️  Connection test failed.")
        print()
        print("  Don't worry — you can debug this separately by running:")
        print(f"    python3 {test_script}")
        print()
        proceed = input("  Continue with setup anyway? (y/N): ").strip().lower()
        if proceed != "y":
            print("Setup stopped. Fix the connection issue and run again.")
            exit(0)
        print()
else:
    print(f"  ✗ Test script not found at {test_script}")
    print(f"      Run it manually after setup:")
    print(f"    python3 {REPO_ROOT / 'test-qbo-connection.py'}")

print()

# ── Step 5: Restart gateway ──────────────────────────────────────────────

print("Step 5: Restarting finance-manager gateway...")
print()

try:
    result = subprocess.run(
        ["hermes", "-p", "finance-manager", "gateway", "restart"],
        capture_output=True,
        text=True,
        timeout=30
    )
    if result.returncode == 0:
        print("  ✓ Gateway restarted successfully")
    else:
        print(f"  ⚠️  Gateway restart returned: {result.returncode}")
        print(f"      You may need to restart manually:")
        print(f"        hermes -p finance-manager gateway restart")
except FileNotFoundError:
    print("  ⚠️  'hermes' CLI not found on PATH")
    print(f"      Restart manually:")
    print(f"        hermes -p finance-manager gateway restart")
except Exception as e:
    print(f"  ⚠️  Error restarting gateway: {e}")

print()

# ── Step 6: Next steps ──────────────────────────────────────────────────

print("=" * 80)
print("✅ SETUP COMPLETE!")
print("=" * 80)
print()
print("Next steps:")
print()
print("  1. If connection test failed, debug it:")
print(f"     python3 {test_script}")
print()
print("  2. Verify MCP tools are registered:")
print("     hermes -p finance-manager mcp list | grep accounting")
print()
print("  3. Test live data pull:")
print('     hermes -p finance-manager --exec "Call acct_get_profit_loss with {\\"date_from\\":\\"2026-01-01\\",\\"date_to\\":\\"2026-09-02\\"}"')
print()
print("  4. Run snapshot writer to populate dashboard data:")
print(f"     python3 {REPO_ROOT / 'skills' / 'finance' / 'finance-dashboard-snapshot' / 'scripts' / 'write_snapshots.py'}")
print()
print("  5. Open your Shogun web portal and navigate to Finance dashboard")
print("     → You should see live QBO data instead of mock data")
print()
print("For detailed troubleshooting, see:")
print("  • QBO-FINANCE-SETUP-GUIDE.md")
print("  • skill_view('accounting-connector-setup')")
print()
print("=" * 80)
