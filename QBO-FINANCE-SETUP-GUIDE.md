# QuickBooks Online Finance Data Integration Guide

This guide walks you through connecting your live Shogun OS server to QuickBooks Online (QBO) so the Finance dashboard displays real accounting data instead of mock data.

## Architecture Overview

Your Shogun OS Finance dashboard uses a **snapshot-based architecture**:

```
QuickBooks Online API
       ↓
Accounting MCP Bridge (acct-bridge.py + quickbooks.py plugin)
       ↓
acct_* MCP tools (11 tools: get_profit_loss, get_balance_sheet, list_invoices, etc.)
       ↓
write_snapshots.py script (pulls data, builds 8 snapshots)
       ↓
~/brain/finance/snapshots/*.json (8 JSON files)
       ↓
gbrain HTTP service (port 3100) OR local file fallback
       ↓
dashboard.py backend (_run_finance_aggregation function)
       ↓
React Finance Dashboard UI
```

**Key insight:** The dashboard does NOT call QBO directly. It reads pre-computed JSON snapshots. You must run the snapshot writer to refresh data.

---

## Phase 1: Install Accounting Bridge Scripts

### Step 1.1 — Copy bridge files to Hermes scripts directory

```bash
# Create destination directories
mkdir -p ~/.hermes/scripts/accounting/plugins

# Copy bridge, OAuth helper, and QBO plugin from repo
cp ~/shogun-os/recipes/accounting/bridges/acct-bridge.py ~/.hermes/scripts/accounting/acct-bridge.py
cp ~/shogun-os/recipes/accounting/oauth_helper.py ~/.hermes/scripts/accounting/oauth_helper.py
cp ~/shogun-os/recipes/accounting/plugins/quickbooks.py ~/.hermes/scripts/accounting/plugins/quickbooks.py
```

**⚠️ Critical:** The file must be named `oauth_helper.py` (underscore), NOT `oauth-helper.py`. Python cannot import modules with hyphens in their names.

### Step 1.2 — Verify the bridge loads

```bash
ACCT_PROVIDER=quickbooks ACCT_COMPANY_ID=test123 \
python3 -c "
import json, subprocess
req = {'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}}
p = subprocess.run(['python3', r'C:/Users/user/.hermes/scripts/accounting/acct-bridge.py'],
                   input=json.dumps(req)+'\n', capture_output=True, text=True, timeout=15)
resp = json.loads(p.stdout)
tools = [t['name'] for t in resp.get('tools',[])]
print(f'{len(tools)} tools loaded: {tools}')
"
```

**Expected output:** `11 tools loaded: ['acct_list_sales_invoices', 'acct_create_sales_invoice', ...]`

If you see `ModuleNotFoundError: No module named 'oauth_helper'`, rename the file:
```bash
mv ~/.hermes/scripts/accounting/oauth-helper.py ~/.hermes/scripts/accounting/oauth_helper.py
```

---

## Phase 2: Configure Finance Manager Profile

### Step 2.1 — Add MCP server config to finance-manager profile

Edit `~/.hermes/profiles/finance-manager/config.yaml`:

```yaml
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
```

### Step 2.2 — Add credentials to profile .env file

Edit `~/.hermes/profiles/finance-manager/.env`:

```bash
# === Accounting Provider (QuickBooks Online) ===
ACCT_PROVIDER=quickbooks
ACCT_SANDBOX=true                        # false for production
ACCT_CLIENT_ID=your_client_id_from_intuit_developer_portal
ACCT_CLIENT_SECRET=your_client_secret_from_intuit_developer_portal
ACCT_REFRESH_TOKEN=will_be_obtained_from_oauth_flow
ACCT_COMPANY_ID=will_be_obtained_from_oauth_flow
```

**⚠️ Security:** Never commit this file. It's already in `.gitignore`.

---

## Phase 3: OAuth Consent Flow (Get Refresh Token + Company ID)

You CANNOT skip this step. Client ID + Secret alone are insufficient — you need a `refresh_token` and `company_id` (realm ID) from the OAuth consent flow.

### Option A: Use Intuit's OAuth2 Playground (Easiest)

1. **Register your app** at [Intuit Developer Portal](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication)
   - Create new app
   - Select "QuickBooks Online"
   - Note down Client ID and Client Secret

2. **Add redirect URI** to your app settings:
   ```
   https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl
   ```

3. **Build the authorize URL** (replace YOUR_CLIENT_ID):
   ```
   https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl&state=random123
   ```
   
   **⚠️ Critical:** The `state` parameter is REQUIRED. Intuit rejects requests without it.

4. **Open the URL in browser** → Sign in with your QBO sandbox account → Select company → Approve

5. **Capture from redirect URL:**
   - `realmId` → This is your `ACCT_COMPANY_ID`
   - `refresh_token` → This is your `ACCT_REFRESH_TOKEN`

6. **Update your .env file** with these values

### Option B: Use Local OAuth Capture Server (Advanced)

If you have a local redirect URI registered (e.g., `http://localhost:8080/callback`), use the provided capture script:

```bash
python3 ~/.hermes/scripts/accounting/qb-oauth-capture.py --port 8080
```

This starts a local HTTP server, catches the callback, exchanges the code automatically, and writes the token cache.

---

## Phase 4: Restart Gateway and Verify Connection

### Step 4.1 — Restart the finance-manager gateway

```bash
hermes -p finance-manager gateway restart
```

Wait 10 seconds for the gateway to start.

### Step 4.2 — Verify MCP tools are registered

```bash
hermes -p finance-manager mcp list | grep accounting
```

You should see the accounting server listed.

### Step 4.3 — Test live data pull

```bash
hermes -p finance-manager --exec "Call acct_get_profit_loss with {\"date_from\":\"2026-01-01\",\"date_to\":\"2026-09-02\"}"
```

**Expected output:** JSON with `total_revenue`, `total_expenses`, `net_profit` fields.

If you see `{"error": "No valid access token"}`, your OAuth token expired or wasn't set correctly. Re-run Phase 3.

---

## Phase 5: Run Snapshot Writer to Populate Dashboard Data

**⚠️ Critical:** Connecting the MCP bridge gives the **agent** access to QBO, but the **web dashboard** reads snapshots. You MUST run the snapshot writer.

### Step 5.1 — Run the snapshot writer manually

```bash
cd ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts
python3 write_snapshots.py
```

**Expected output:**
```
Finance Dashboard Snapshot Writer
  Provider: quickbooks  Company: 1231457...  Sandbox: true
  Bridge: C:/Users/user/.hermes/scripts/accounting/acct-bridge.py
  Output: C:/Users/user/brain/finance/snapshots

Pulling data from QuickBooks...
  P&L: revenue=125000.00, expenses=98000.00
  Balance Sheet: assets=450000.00, liabilities=180000.00
  Invoices: 23 records
  Bills: 15 records
  Customers: 12 records

Building snapshots...
Writing snapshots...
  wrote C:/Users/user/brain/finance/snapshots/cash.json (1234 bytes)
  wrote C:/Users/user/brain/finance/snapshots/assets.json (2345 bytes)
  wrote C:/Users/user/brain/finance/snapshots/pl.json (567 bytes)
  wrote C:/Users/user/finance/snapshots/concentration.json (890 bytes)
  wrote C:/Users/user/brain/finance/snapshots/bva.json (1234 bytes)
  wrote C:/Users/user/brain/finance/snapshots/ar.json (2345 bytes)
  wrote C:/Users/user/brain/finance/snapshots/ap.json (1234 bytes)
  wrote C:/Users/user/brain/finance/snapshots/compliance.json (456 bytes)

Done. 8 snapshots written to C:/Users/user/brain/finance/snapshots
Refresh the finance dashboard to see live QuickBooks data.
```

### Step 5.2 — Verify snapshots were created

```bash
ls -lh ~/brain/finance/snapshots/
```

You should see 8 JSON files with recent timestamps.

### Step 5.3 — Check snapshot content

```bash
cat ~/brain/finance/snapshots/pl.json | python3 -m json.tool
```

You should see real QBO data (not zeros or mock data).

---

## Phase 6: Dashboard Backend Configuration

Your dashboard backend (`shogun-web/server/dashboard.py`) already has the correct logic:

1. **If gbrain is running:** Fetches snapshots via `gbrain_fetch_page(source_id="finance", slug="snapshots/cash")`
2. **If gbrain is NOT running:** Falls back to local files at `~/brain/finance/snapshots/*.json`

### Step 6.1 — Ensure gbrain HTTP service is running (optional)

If you want gbrain to serve the snapshots (recommended for production):

```bash
# Start gbrain HTTP service on port 3100
bash ~/shogun-os/scripts/gbrain-http-service.sh start

# Verify it's running
curl http://localhost:3100/health
```

### Step 6.2 — Import snapshots into gbrain (if using gbrain)

```bash
# List pages to verify gbrain is accessible
gbrain list-pages --source finance

# Import snapshot files as gbrain pages
for f in ~/brain/finance/snapshots/*.json; do
  slug=$(basename "$f" .json)
  gbrain put-page --source finance --slug "snapshots/$slug" --file "$f"
done
```

---

## Phase 7: Set Up Daily Cron Job for Automatic Refresh

To keep your dashboard data fresh, set up a daily cron job:

### Step 7.1 — Create cron job definition

```bash
hermes -p finance-manager cronjob create \
  --schedule "0 7 * * *" \
  --name "refresh-finance-dashboard" \
  --prompt "Run the finance dashboard snapshot writer to pull live QBO data and refresh all 8 snapshots. Execute: python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py"
```

This runs every day at 7 AM.

### Step 7.2 — Verify cron job is scheduled

```bash
hermes -p finance-manager cronjob list
```

---

## Phase 8: Switch to Production (Live QBO Data)

Once you've tested with sandbox successfully:

### Step 8.1 — Update .env for production

Edit `~/.hermes/profiles/finance-manager/.env`:

```bash
ACCT_SANDBOX=false                    # ← Change this
ACCT_CLIENT_ID=production_client_id
ACCT_CLIENT_SECRET=production_client_secret
ACCT_REFRESH_TOKEN=production_refresh_token
ACCT_COMPANY_ID=production_realm_id
```

### Step 8.2 — Re-run OAuth flow for production

Follow Phase 3 again, but sign in with your **production** QBO company (not sandbox).

### Step 8.3 — Restart gateway and refresh snapshots

```bash
hermes -p finance-manager gateway restart
python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py
```

---

## Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'oauth_helper'"

**Solution:** Rename the file:
```bash
mv ~/.hermes/scripts/accounting/oauth-helper.py ~/.hermes/scripts/accounting/oauth_helper.py
```

### Problem: "Provider plugin not found: quickbooks"

**Solution:** Ensure the plugin is in the correct location:
```bash
ls -la ~/.hermes/scripts/accounting/plugins/quickbooks.py
```

If missing, copy it:
```bash
cp ~/shogun-os/recipes/accounting/plugins/quickbooks.py ~/.hermes/scripts/accounting/plugins/
```

### Problem: "No valid access token"

**Causes:**
- OAuth flow not completed
- Token expired
- Credentials in wrong .env file

**Solution:**
1. Re-run Phase 3 OAuth flow
2. Verify tokens are in `~/.hermes/profiles/finance-manager/.env` (NOT `~/.hermes/.env`)
3. Delete stale token cache: `rm ~/.hermes/mcp-tokens/accounting-quickbooks.json`

### Problem: Dashboard still shows mock data after running snapshot writer

**Check:**
1. Are snapshots actually written? `ls -lh ~/brain/finance/snapshots/`
2. Do snapshots contain real data? `cat ~/brain/finance/snapshots/pl.json`
3. Is dashboard backend reading the right path? Check `dashboard.py:_load_local_snapshots()`

**Solution:** Restart the web portal:
```bash
# Stop existing portal
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *portal*"

# Restart portal
cd ~/shogun-os/shogun-web
python3 -m uvicorn server.main:app --reload --port 8787
```

### Problem: QBO report returns `"error": "could not convert string to float: 'Total Income'"`

**Cause:** The parser is reading the label (index 0) instead of the amount (index 1) from QBO's `Summary.ColData` array.

**Solution:** This bug was fixed in `quickbooks.py` — ensure you have the latest version from the repo. The `_safe_float()` function now strips commas, and `_summary_amount()` extracts from index `[1]`.

### Problem: Balance sheet missing accounts (Checking, Savings, etc.)

**Cause:** QBO nests accounts under sections like `ASSETS → Current Assets → Bank Accounts → Data rows`. A flat parser misses these.

**Solution:** The current `quickbooks.py` uses recursive walking (`_walk_balance_sheet()` and `_collect_data_rows()`). Ensure you have the latest version.

---

## Snapshot Schema Reference

The dashboard expects these 8 snapshots with exact field names:

| File | Key Fields |
|------|-----------|
| `cash.json` | `total_liquid_cash`, `net_monthly_burn`, `bank_accounts[]`, `forecast_13w` |
| `assets.json` | `current_assets[]`, `non_current_assets[]`, `total_assets` |
| `pl.json` | `revenue_mtd`, `revenue_ytd`, `gross_margin_pct`, `ebitda_margin_pct` |
| `concentration.json` | `clients[{name, revenue_pct, ytd_revenue}]` |
| `bva.json` | `line_items[{account_name, budget_ytd, actual_ytd, variance, variance_pct}]` |
| `ar.json` | `total_ar`, `bucket_0_30`, `bucket_31_60`, `bucket_61_90`, `bucket_90_plus`, `dunning_queue[]` |
| `ap.json` | `total_ap`, `ap_overdue`, `bills[{bill, vendor, amount, due_date}]` |
| `compliance.json` | `close_checklist[]`, `sst_readiness`, `cp58_register[]`, `wht_queue[]` |

See `~/shogun-os/recipes/DASHBOARD_SNAPSHOT_CONTRACT.md` for the full schema.

---

## Related Files

- `~/shogun-os/recipes/accounting/` — Bridge, plugins, OAuth helper
- `~/shogun-os/skills/finance/finance-dashboard-snapshot/` — Snapshot writer skill
- `~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py` — Main script
- `~/shogun-os/shogun-web/server/dashboard.py` — Backend aggregation (lines ~49000)
- `~/shogun-os/recipes/DASHBOARD_SNAPSHOT_CONTRACT.md` — Snapshot schema spec
- `skill_view('accounting-connector-setup')` — Detailed wiring guide
- `skill_view('shogun-finance-dashboard')` — Dashboard architecture

---

## Quick Reference Commands

```bash
# Test bridge connection
hermes -p finance-manager --exec "Call acct_list_contacts with {\"type\":\"customer\",\"limit\":5}"

# Manual snapshot refresh
python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py

# Dry-run (see data without writing)
python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py --dry-run

# Check snapshot files
ls -lh ~/brain/finance/snapshots/

# View snapshot content
cat ~/brain/finance/snapshots/pl.json | python3 -m json.tool

# Restart finance gateway
hermes -p finance-manager gateway restart

# List cron jobs
hermes -p finance-manager cronjob list
```

---

## Next Steps After Setup

1. **Verify dashboard shows live data** — Open your Shogun web portal, navigate to Finance dashboard, confirm numbers match QBO
2. **Set up budget.json** — Upload your annual budget Excel, run `parse-budget-excel.py` to generate `~/brain/finance/budget.json` for BvA tracking
3. **Configure compliance skills** — Enable SST, CP58/WHT tracking via finance compliance skills
4. **Test month-end close workflow** — Run period-end-close-checklist skill after first month

---

**Last updated:** September 2, 2026  
**Applies to:** Shogun OS commit cc496de (demo branch)
