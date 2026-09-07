# Quick Direct Production QBO Connection (No Playground)

## Which Step Needs Authorization?

**Phase 3** — You must get two values from QuickBooks:
- `ACCT_REFRESH_TOKEN` (long-lived token)
- `ACCT_COMPANY_ID` (your QBO realm ID)

These only come from QuickBooks' OAuth consent flow. There's no way around this — Intuit requires it for all third-party connections.

---

## Direct Production Connection (5 Minutes)

### Step 1: Create App in Intuit Developer Portal

1. Go to https://developer.intuit.com/app/developer/qbo
2. Click **"Create an app"** (top right)
3. Select **"QuickBooks Online"** → Continue
4. Fill in:
   - **App name**: `Shogun OS Finance` (or any name)
   - **Description**: `Finance dashboard integration`
5. Click **"Create app"**

### Step 2: Get Client ID and Secret

1. On your app dashboard, go to **Keys & credentials** tab
2. Under **Production keys** (NOT development):
   - Toggle **"Development mode" OFF** (switch to production)
   - Copy **Client ID** → paste into `.env` as `ACCT_CLIENT_ID`
   - Click **"Show secret"** → copy → paste into `.env` as `ACCT_CLIENT_SECRET`

### Step 3: Add Redirect URI

1. Still in **Keys & credentials** tab
2. Scroll to **Redirect URIs**
3. Click **"Add redirect URI"**
4. Enter: `https://oauth.pstmn.io/v1/callback` (Postman's callback — easiest method)
5. Click **"Save"**

**Alternative:** If you have your own website, use: `https://yourdomain.com/oauth/callback`

### Step 4: Authorize Your Real QBO Account

Open this URL in your browser (replace `YOUR_CLIENT_ID` with actual value):

```
https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://oauth.pstmn.io/v1/callback&state=prod123
```

**What happens:**
1. You'll see QuickBooks login screen
2. Sign in with your **real production QBO account** (not sandbox)
3. Select your company file
4. Click **"Allow"** to authorize

### Step 5: Capture Tokens from Redirect

After clicking "Allow", your browser redirects to:

```
https://oauth.pstmn.io/v1/callback?code=Q0123456789...&realmId=123145789012345
```

From this URL, capture:
- **`realmId=123145789012345`** → This is your `ACCT_COMPANY_ID`
- **`code=Q0123456789...`** → Exchange this for refresh token (next step)

### Step 6: Exchange Code for Refresh Token

Use Postman or curl to exchange the code:

#### Option A: Using Postman (Easiest)

1. Open Postman
2. Create new POST request to: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
3. Go to **Authorization** tab:
   - Type: **OAuth 2.0**
   - Grant Type: **Authorization Code**
   - Access Token URL: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
   - Client ID: (your Client ID)
   - Client Secret: (your Client Secret)
   - Authorization Code: (the `code` from redirect URL)
   - Redirect URI: `https://oauth.pstmn.io/v1/callback`
4. Click **"Get New Access Token"**
5. In the response, find **`refresh_token`** → copy to `.env` as `ACCT_REFRESH_TOKEN`

#### Option B: Using curl (Command Line)

```bash
curl -X POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer \
  -H "Accept: application/json" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -d "grant_type=authorization_code&code=YOUR_AUTH_CODE&redirect_uri=https://oauth.pstmn.io/v1/callback"
```

Response will include:
```json
{
  "refresh_token": "L0123456789abcdefghijklmnopqrstuvwxyz...",
  "access_token": "eyJlbmMiOiJBMTI4R0NNIiwiYWxnIjoiZGlyIn0...",
  "realmId": "123145789012345"
}
```

Copy `refresh_token` → paste into `.env`

### Step 7: Update .env File

Edit `~/.hermes/profiles/finance-manager/.env`:

```bash
ACCT_PROVIDER=quickbooks
ACCT_SANDBOX=false                        # ← PRODUCTION (not sandbox)
ACCT_CLIENT_ID=Q0yF8xNz...                # ← From Step 2
ACCT_CLIENT_SECRET=5xK9mP2vL...           # ← From Step 2
ACCT_REFRESH_TOKEN=L0123456789abcdef...   # ← From Step 6
ACCT_COMPANY_ID=123145789012345           # ← From Step 5 (realmId)
```

---

## Verify Connection Works

### Test 1: Restart Gateway

```bash
hermes -p finance-manager gateway restart
```

Wait 10 seconds.

### Test 2: Pull Real Data

```bash
hermes -p finance-manager --exec "Call acct_get_profit_loss with {\"date_from\":\"2026-01-01\",\"date_to\":\"2026-09-02\"}"
```

**Expected output (real data from your QBO):**
```json
{
  "total_revenue": 125000.50,
  "total_expenses": 98234.75,
  "net_profit": 26765.75,
  "revenue_accounts": [...],
  "expense_accounts": [...]
}
```

If you see `{"error": "No valid access token"}`, re-check your tokens.

### Test 3: Generate Snapshots

```bash
python3 ~/shogun-os/skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py
```

Check output shows real numbers (not zeros).

---

## Common Issues

### Issue: "Invalid redirect_uri"

**Solution:** The redirect URI in your authorize URL MUST exactly match what's registered in your app settings. If you used `https://oauth.pstmn.io/v1/callback`, make sure it's added to your app's Redirect URIs list.

### Issue: "The state query parameter is missing"

**Solution:** Always include `&state=someRandomValue` in your authorize URL. It's required by Intuit for CSRF protection.

### Issue: Can't find Production keys (only see Development)

**Solution:** 
1. Go to your app dashboard
2. Click **"Keys & credentials"** tab
3. Toggle **"Development mode" OFF** (switch at top)
4. Now you'll see Production keys section

### Issue: Refresh token expires quickly

**Solution:** Refresh tokens should last 100 days if you use them at least once every 30 days. The snapshot writer cron job (daily refresh) keeps it alive automatically. Make sure `ACCT_SANDBOX=false` for production tokens.

---

## Alternative: Manual Token Exchange Without Postman

If you don't want to use Postman, create this simple Python script:

```python
# save as ~/get_qbo_token.py
import urllib.request
import urllib.parse
import json
import base64

CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
AUTH_CODE = "CODE_FROM_REDIRECT_URL"
REDIRECT_URI = "https://oauth.pstmn.io/v1/callback"

url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
data = urllib.parse.urlencode({
    "grant_type": "authorization_code",
    "code": AUTH_CODE,
    "redirect_uri": REDIRECT_URI
}).encode()

headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": "Basic " + base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
}

req = urllib.request.Request(url, data=data, headers=headers, method="POST")
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())

print("REFRESH_TOKEN:", result.get("refresh_token"))
print("COMPANY_ID (realmId):", result.get("realmId"))
```

Run it:
```bash
python3 ~/get_qbo_token.py
```

---

## Summary: What You Need

| Value | Where to Get | Example |
|-------|--------------|---------|
| `ACCT_CLIENT_ID` | App dashboard → Keys & credentials → Production | `Q0yF8xNz...` |
| `ACCT_CLIENT_SECRET` | Same place, click "Show secret" | `5xK9mP2vL...` |
| `ACCT_COMPANY_ID` | From OAuth redirect URL (`realmId=`) | `123145789012345` |
| `ACCT_REFRESH_TOKEN` | From token exchange (Step 6) | `L0123456789abcdef...` |

**Time required:** 5-10 minutes total

**No playground, no sandbox** — this connects directly to your live production QuickBooks account.
