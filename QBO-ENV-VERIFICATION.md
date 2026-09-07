# QBO Developer App vs Accounting Data — How to Verify the Link

**Your question:** *"QBO developer is different page with QBO accounting data pages, how I know whether they linked?"*

This is a **critical question**. The Developer Portal and QuickBooks Accounting are indeed separate systems. Here's how they connect and how to verify.

---

## Architecture: How Developer Apps Connect to Accounting Data

```
Intuit Developer Portal          QuickBooks Online (Accounting)
─────────────────────           ─────────────────────────────────
• Create app                      • Your actual company data
• Get Client ID/Secret            • Invoices, customers, P&L, etc.
• Configure OAuth                 • Real accounting records
        │                                    │
        │         OAuth 2.0                  │
        └──────────Flow──────────────────────┘
                    ↓
        • You authorize the app
        • Select WHICH company to grant access to
        • Get refresh_token + realmId (company ID)
```

**Key insight:** The Developer Portal gives you the **keys** (Client ID/Secret), but you only get access to actual accounting data after completing the **OAuth consent flow** where you explicitly choose which company to connect.

---

## Step-by-Step: Verify Your App Is Connected to Real Data

### Method 1: Run the Environment Checker Script (Recommended)

I've created a script that tells you definitively:

```bash
# Add your credentials to .env
cat > .env << EOF
ACCT_CLIENT_ID=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d
ACCT_CLIENT_SECRET=LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf
ACCT_REFRESH_TOKEN=<your_refresh_token_from_oauth>
ACCT_COMPANY_ID=<your_company_id_from_oauth>
ACCT_SANDBOX=false
EOF

# Run the checker
python3 check-qbo-environment.py
```

**The script will tell you:**
- ✅ "You are connected to PRODUCTION (live) accounting data" — if connected to real company
- ⚠️ "WARNING: This appears to be a SANDBOX environment" — if connected to test data

It checks:
- Company name (sandbox companies have names like "Joe's Blo's Flowers")
- Physical address (real companies have addresses)
- Country (sandbox often defaults to US)
- Revenue data (sandbox often has zero or fake values)

---

### Method 2: Manual Verification via OAuth Flow

#### Step 1: Check Your OAuth Redirect URL

When you authorized your app, Intuit redirected you to a URL like:

```
https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl?code=ABC123&realmId=123145789012345
```

**Look at the `realmId` parameter:**
- This is your **Company ID**
- If you don't have this value, you haven't completed OAuth yet

#### Step 2: Log Into QuickBooks Directly

1. Go to https://qbo.intuit.com (NOT sandbox.qbo.intuit.com)
2. Log in with the SAME account you used during OAuth
3. Look at the top-left corner — what company name do you see?

**Compare:**
- Does the company name match what the script shows? → Same company ✓
- Does it say "Sandbox Company" or similar? → Test data ⚠️

#### Step 3: Check the URL

- **Production**: `https://qbo.intuit.com/app/...`
- **Sandbox**: `https://sandbox.qbo.intuit.com/app/...`

If you're on the sandbox URL, you're looking at test data.

---

### Method 3: Compare Company IDs

1. **In QuickBooks Online (production):**
   - Go to Gear icon → Account and Settings
   - Look at the URL: `.../company/123145789012345/...`
   - The number is your **Company ID (realmId)**

2. **Compare with your .env:**
   - Is `ACCT_COMPANY_ID` the same number? → Connected to production ✓
   - Different number? → Connected to different company (possibly sandbox)

---

## Common Scenarios

### Scenario A: "I only have Client ID and Secret"

**Status:** ❌ NOT connected to any accounting data yet

**What you have:**
- Keys to build an app
- Ability to start OAuth flow

**What you're missing:**
- `refresh_token` — only comes from OAuth consent flow
- `company_id` (realmId) — only comes from OAuth consent flow

**Action required:** Complete OAuth flow (see below)

---

### Scenario B: "I completed OAuth but selected Sandbox Company"

**Status:** ⚠️ Connected to test data, not real accounting

**How to tell:**
- Company name is "Joe's Blo's Flowers" or similar test name
- Revenue is $0 or obviously fake numbers
- No real customers/invoices

**Fix:**
1. Re-run OAuth flow
2. When signing in, select your **real company** (not sandbox)
3. Copy the new `realmId` and `refresh_token`
4. Update your `.env` file

---

### Scenario C: "I'm not sure which company I selected during OAuth"

**Status:** ? Unknown — need to verify

**Action:** Run the environment checker script:

```bash
python3 check-qbo-environment.py
```

It will fetch your actual company name and details from QBO API and tell you definitively.

---

## How to Complete OAuth Flow (If You Haven't Yet)

You **MUST** complete this step — Client ID + Secret alone are useless.

### Option A: Use Intuit's OAuth2 Playground

1. **Build the authorize URL** (replace YOUR_CLIENT_ID):

```
https://appcenter.intuit.com/connect/oauth2?client_id=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl&state=random123
```

2. **Open URL in browser**

3. **Sign in with your REAL QuickBooks account** (the one with your actual company data)

4. **Select your company** when prompted (NOT sandbox)

5. **Approve the permissions**

6. **Copy from redirect URL:**
   - `realmId=123145789012345` → This is `ACCT_COMPANY_ID`
   - Click "Get Tokens" button → Copy `refresh_token` → This is `ACCT_REFRESH_TOKEN`

7. **Update your .env:**

```bash
ACCT_CLIENT_ID=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d
ACCT_CLIENT_SECRET=LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf
ACCT_REFRESH_TOKEN=<paste_refresh_token_here>
ACCT_COMPANY_ID=<paste_realmId_here>
ACCT_SANDBOX=false
```

### Option B: Use Local Capture Server (Advanced)

If you have a local redirect URI registered:

```bash
python3 recipes/accounting/qb-oauth-capture.py --port 8080
```

This automatically catches the callback and extracts tokens.

---

## After OAuth: Verify Connection

```bash
python3 check-qbo-environment.py
```

**Expected output for production:**

```
✅ This appears to be a PRODUCTION environment

Indicators:
  • Company name 'YOUR ACTUAL COMPANY NAME' looks like a real business
  • Has a physical address: 123 Main St, Kuala Lumpur, Malaysia
  • Country is MY (sandbox defaults to US)

You are connected to your REAL QuickBooks accounting data.
```

---

## Troubleshooting

### Problem: "I don't see my company during OAuth sign-in"

**Cause:** You're signing in with the wrong Intuit account.

**Solution:**
- Make sure you're using the same email/password you use for QuickBooks Online
- If your company uses SSO, use that login method

### Problem: "I only see sandbox companies"

**Cause:** You created a developer account but never signed up for actual QuickBooks subscription.

**Solution:**
1. Go to https://quickbooks.intuit.com
2. Sign up for a QuickBooks Online subscription (or start free trial)
3. Set up your company profile
4. Then re-run OAuth flow

### Problem: "realmId doesn't match my company"

**Cause:** You authorized a different company during OAuth.

**Solution:**
1. Re-run OAuth flow
2. Carefully select the correct company when prompted
3. Copy the new realmId

---

## Security Notes

⚠️ **Your credentials are sensitive:**
- Client ID: `ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d`
- Client Secret: `LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf`

**Do:**
- Store in `.env` file (already in `.gitignore`)
- Use environment variables
- Rotate if accidentally committed to git

**Don't:**
- Commit to git
- Share publicly
- Use in client-side code

---

## Next Steps After Verification

Once confirmed you're connected to production data:

1. **Run setup script:**
   ```bash
   python3 setup-qbo-finance.py
   ```

2. **Test MCP connection:**
   ```bash
   hermes -p finance-manager --exec "Call acct_get_profit_loss with {\"date_from\":\"2026-01-01\",\"date_to\":\"2026-09-03\"}"
   ```

3. **Populate dashboard:**
   ```bash
   python3 skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py
   ```

4. **Open Finance dashboard** → Should see your real company data

---

## Related Files

| File | Purpose |
|------|---------|
| `check-qbo-environment.py` | Tells you sandbox vs production |
| `test-qbo-connection.py` | Tests API connectivity |
| `setup-qbo-finance.py` | Automated installation |
| `QBO-QUICK-START.md` | Full setup guide |
| `QBO-FINANCE-SETUP-GUIDE.md` | Detailed documentation |

---

**Last updated:** September 3, 2026  
**Branch:** `feat/finance-ver2` (based on `main` ✓)
