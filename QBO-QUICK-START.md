# QuickBooks Online Finance Integration — Quick Start Guide

**Goal:** Connect your production QuickBooks Online account to Shogun OS Finance dashboard via MCP connector.

**Architecture:** The connector already exists in `recipes/accounting/` — you just need to install and configure it.

---

## Phase 1: Test Your Production Key (5 minutes)

### Step 1.1 — Gather credentials

You need **4 values** from Intuit Developer Portal:

| Variable | Where to get it | Required? |
|----------|----------------|-----------|
| `ACCT_CLIENT_ID` | App Keys & Credentials page | ✓ Yes |
| `ACCT_CLIENT_SECRET` | App Keys & Credentials page | ✓ Yes |
| `ACCT_REFRESH_TOKEN` | OAuth consent flow (see below) | ✓ Yes |
| `ACCT_COMPANY_ID` | OAuth redirect URL (realmId) | ✓ Yes |

**⚠️ Critical:** Client ID + Secret alone are **INSUFFICIENT**. You MUST complete OAuth flow to get `refresh_token` and `company_id`.

### Step 1.2 — Complete OAuth flow (if you don't have refresh token)

**Option A: Use Intuit's OAuth2 Playground (Easiest)**

1. Go to [Intuit Developer Portal](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication)
2. Create app → Select "Private" (for internal company use)
3. Add redirect URI: `https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl`
4. Build authorize URL (replace YOUR_CLIENT_ID):

```
https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl&state=random123
```

5. Open URL → Sign in with production account → Select company → Approve
6. From redirect URL, copy:
   - `realmId` → This is `ACCT_COMPANY_ID`
   - `refresh_token` → This is `ACCT_REFRESH_TOKEN`

**Option B: Use local capture server (if you have localhost redirect URI registered)**

```bash
python3 recipes/accounting/qb-oauth-capture.py --port 8080
```

### Step 1.3 — Run test script

Create `.env` file in repo root:

```bash
ACCT_CLIENT_ID=your_client_id_here
ACCT_CLIENT_SECRET=your_client_secret_here
ACCT_REFRESH_TOKEN=your_refresh_token_here
ACCT_COMPANY_ID=your_company_id_here
ACCT_SANDBOX=false
```

Run test:

```bash
python3 test-qbo-connection.py
```

**Expected output:**
```
✅ ALL TESTS PASSED — Your QBO connection is working!
```

If it fails, see Troubleshooting section below.

---

## Phase 2: Install & Configure (10 minutes)

### Option A: Automated setup (Recommended)

```bash
python3 setup-qbo-finance.py
```

This script will:
- Check your credentials
- Install bridge scripts to `~/.hermes/scripts/accounting/`
- Configure finance-manager profile
- Restart gateway
- Guide you through next steps

### Option B: Manual installation

**Step 2.1 — Copy bridge files**

```bash
mkdir -p ~/.hermes/scripts/accounting/plugins
cp ~/shogun-os/recipes/accounting/bridges/acct-bridge.py ~/.hermes/scripts/accounting/
cp ~/shogun-os/recipes/accounting/oauth_helper.py ~/.hermes/scripts/accounting/
cp ~/shogun-os/recipes/accounting/plugins/quickbooks.py ~/.hermes/scripts/accounting/plugins/
```

**⚠️ Critical:** File must be named `oauth_helper.py` (underscore), NOT `oauth-helper.py`.

**Step 2.2 — Configure finance-manager profile**

Edit `~/.hermes/profiles/finance-manager/config.yaml`:

```yaml
mcp_servers:
  accounting:
    command: python3
    args:
      - C:/Users/user/.hermes/scripts/accounting/acct-bridge.py
    env:
      ACCT_PROVIDER: quickbooks
      ACCT_SANDBOX: 'false'              # Production mode
      ACCT_CLIENT_ID: '${ACCT_CLIENT_ID}'
      ACCT_CLIENT_SECRET: '${ACCT_CLIENT_SECRET}'
      ACCT_REFRESH_TOKEN: '${ACCT_REFRESH_TOKEN}'
      ACCT_COMPANY_ID: '${ACCT_COMPANY_ID}'
```

Edit `~/.hermes/profiles/finance-manager/.env`:

```bash
ACCT_PROVIDER=quickbooks
ACCT_SANDBOX=false
ACCT_CLIENT_ID=your_production_client_id
ACCT_CLIENT_SECRET=your_production_client_secret
ACCT_REFRESH_TOKEN=your_production_refresh_token
ACCT_COMPANY_ID=your_production_realm_id
```

**Step 2.3 — Restart gateway**

```bash
hermes -p finance-manager gateway restart
```

Wait 10 seconds for gateway to start.

---

## Phase 3: Verify Connection (2 minutes)

### Step 3.1 — Check MCP tools are registered

```bash
hermes -p finance-manager mcp list | grep accounting
```

Should show the accounting MCP server.

### Step 3.2 — Test live data pull

```bash
hermes -p finance-manager --exec "Call acct_get_profit_loss with {\"date_from\":\"2026-01-01\",\"date_to\":\"2026-09-02\"}"
```

**Expected:** JSON with revenue, expenses, net_profit.

### Step 3.3 — Test other endpoints

```bash
# List customers
hermes -p finance-manager --exec "Call acct_list_contacts with {\"type\":\"customer\",\"limit\":5}"

# Get balance sheet
hermes -p finance-manager --exec "Call acct_get_balance_sheet with {\"as_of_date\":\"2026-09-02\"}"

# List invoices
hermes -p finance-manager --exec "Call acct_list_sales_invoices with {\"limit\":5}"
```

---

## Phase 4: Populate Dashboard Data (CRITICAL — 5 minutes)

**⚠️ Most Important Step:** Connecting MCP gives the **agent** access to QBO, but the **web dashboard** reads pre-computed snapshots. You MUST run the snapshot writer.

### Step 4.1 — Run snapshot writer

```bash
cd ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts
python3 write_snapshots.py
```

**Expected output:**
```
Finance Dashboard Snapshot Writer
  Provider: quickbooks  Company: 1231457...  Sandbox: false
  
Pulling data from QuickBooks...
  P&L: revenue=125000.00, expenses=98000.00
  Balance Sheet: assets=450000.00, liabilities=180000.00
  Invoices: 23 records
  ...

Writing snapshots...
  wrote C:/Users/user/brain/finance/snapshots/cash.json
  wrote C:/Users/user/brain/finance/snapshots/pl.json
  ...

Done. 8 snapshots written
```

### Step 4.2 — Verify snapshots

```bash
ls -lh ~/brain/finance/snapshots/
cat ~/brain/finance/snapshots/pl.json | python3 -m json.tool
```

Should show real QBO data (not zeros or mock data).

### Step 4.3 — Refresh dashboard

Restart web portal (if running):

```bash
# Kill existing portal
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *portal*"

# Restart
cd ~/shogun-os/shogun-web
python3 -m uvicorn server.main:app --reload --port 8787
```

Open browser → Navigate to Finance dashboard → Should see live QBO data.

---

## Phase 5: Set Up Daily Auto-Refresh (Optional but Recommended)

### Step 5.1 — Create cron job

```bash
hermes -p finance-manager cronjob create \
  --schedule "0 7 * * *" \
  --name "refresh-finance-dashboard" \
  --prompt "Run finance dashboard snapshot writer: python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py"
```

This runs every day at 7 AM.

### Step 5.2 — Verify cron job

```bash
hermes -p finance-manager cronjob list
```

---

## Troubleshooting

### Problem: "No valid access token"

**Causes:**
- OAuth flow not completed
- Token expired
- Credentials in wrong .env file

**Solution:**
1. Re-run OAuth flow (Phase 1.2)
2. Verify tokens in `~/.hermes/profiles/finance-manager/.env` (NOT `~/.hermes/.env`)
3. Delete stale token cache: `rm ~/.hermes/mcp-tokens/accounting-quickbooks.json`

### Problem: "ModuleNotFoundError: No module named 'oauth_helper'"

**Solution:** Rename the file:
```bash
mv ~/.hermes/scripts/accounting/oauth-helper.py ~/.hermes/scripts/accounting/oauth_helper.py
```

### Problem: "Provider plugin not found: quickbooks"

**Solution:**
```bash
ls -la ~/.hermes/scripts/accounting/plugins/quickbooks.py
# If missing:
cp ~/shogun-os/recipes/accounting/plugins/quickbooks.py ~/.hermes/scripts/accounting/plugins/
```

### Problem: Dashboard still shows mock data after running snapshot writer

**Check:**
1. Are snapshots written? `ls -lh ~/brain/finance/snapshots/`
2. Do snapshots contain real data? `cat ~/brain/finance/snapshots/pl.json`
3. Is gbrain running? If not, dashboard uses local file fallback (should work automatically)

**Solution:** Restart web portal (see Phase 4.3).

### Problem: "HTTP 401: Unauthorized"

**Causes:**
- Invalid/expired refresh token
- Wrong client ID/secret
- Token doesn't have accounting scope

**Solution:**
1. Re-authorize with correct scopes: `com.intuit.quickbooks.accounting+openid+profile+email`
2. Verify Client ID/Secret match the app that issued the refresh token
3. Delete token cache and retry

### Problem: "could not convert string to float: 'Total Income'"

**Cause:** QBO report parser reading label instead of amount.

**Solution:** Update to latest `quickbooks.py` from repo — this bug was fixed. The `_safe_float()` function now strips commas.

### Problem: Balance sheet missing accounts (Checking, Savings, etc.)

**Cause:** QBO nests accounts under sections. Flat parser misses these.

**Solution:** Update to latest `quickbooks.py` — uses recursive walking now.

---

## Available MCP Tools

Once connected, you have access to 11 accounting tools:

| Tool | Purpose |
|------|---------|
| `acct_list_sales_invoices` | List invoices with filters |
| `acct_create_sales_invoice` | Create new invoice |
| `acct_list_purchase_bills` | List bills with filters |
| `acct_create_purchase_bill` | Create new bill |
| `acct_list_contacts` | List customers/vendors |
| `acct_create_contact` | Create customer/vendor |
| `acct_list_products` | List products/services |
| `acct_get_profit_loss` | P&L for date range |
| `acct_get_balance_sheet` | Balance sheet as of date |
| `acct_get_aging_report` | AR/AP aging report |
| `acct_update_invoice_status` | Void invoice/bill |

---

## Files Reference

| File | Purpose |
|------|---------|
| `test-qbo-connection.py` | Standalone connection test |
| `setup-qbo-finance.py` | Automated setup script |
| `recipes/accounting/bridges/acct-bridge.py` | MCP bridge loader |
| `recipes/accounting/oauth_helper.py` | OAuth token management |
| `recipes/accounting/plugins/quickbooks.py` | QBO API implementation |
| `skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py` | Snapshot writer |
| `QBO-FINANCE-SETUP-GUIDE.md` | Detailed setup guide |
| `skill_view('accounting-connector-setup')` | Hermes skill with wiring instructions |

---

## Security Notes

- **Never commit** `.env` files or credentials to git
- Credentials go ONLY in profile `.env` (`~/.hermes/profiles/finance-manager/.env`)
- For production, set `ACCT_SANDBOX=false`
- Rotate credentials if accidentally exposed
- Service account keys belong in `~/.hermes/secrets/`

---

## Next Steps After Setup

1. ✅ Verify dashboard shows live data
2. 📊 Upload annual budget Excel → Run `parse-budget-excel.py` → Generate `~/brain/finance/budget.json` for Budget vs Actual tracking
3. 🔐 Configure compliance skills (SST, CP58/WHT)
4. 📅 Test month-end close workflow with `period-end-close-checklist` skill

---

**Last updated:** September 3, 2026  
**Applies to:** Shogun OS demo branch  
**Support:** See `skill_view('accounting-connector-setup')` or `QBO-FINANCE-SETUP-GUIDE.md`
