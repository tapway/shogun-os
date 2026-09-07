# QuickBooks OAuth with Postman (Easiest Method)

If you can't find realmId in the OAuth Playground, use Postman instead. It shows everything clearly.

## Setup (One-Time)

1. **Download Postman** (free): https://www.postman.com/downloads/
2. **Open Postman** → Create new collection called "QBO Auth"

## Step-by-Step OAuth Flow

### Step 1: Configure OAuth 2.0 in Postman

1. In Postman, create a **new request** (any type, GET is fine)
2. Go to **"Authorization"** tab
3. Set **Type** = `OAuth 2.0`
4. Fill in these fields:

| Field | Value |
|-------|-------|
| **Grant Type** | Authorization Code |
| **Callback URL** | `https://oauth.pstmn.io/v1/callback` |
| **Authorize using browser** | ✅ Checked |
| **Auth URL** | `https://appcenter.intuit.com/connect/oauth2` |
| **Access Token URL** | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |
| **Client ID** | `ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d` |
| **Client Secret** | `LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf` |
| **Scope** | `com.intuit.quickbooks.accounting openid profile email` |
| **State** | `random123` |
| **Client Authentication** | Send as Basic Auth header |

5. Click **"Get New Access Token"** button

### Step 2: Authorize in Browser

1. Postman opens your browser automatically
2. **Sign in** with your QuickBooks Online account
3. **Select your company** (the real one, not sandbox)
4. Click **"Allow"**
5. Browser redirects back to Postman automatically

### Step 3: Copy Tokens from Postman

Postman will show a popup with your tokens:

```
✅ Successfully obtained access token

Access Token: eyJlbmMiOiJBMTI4R0NNIiwiYWxnIjoiZGlyIn0...
Refresh Token: L0123456789abcdef...
Realm ID: 123145789012345    ← THIS IS YOUR COMPANY ID
Token Type: bearer
Expires In: 3600
```

**Copy these values:**
- **Realm ID** → Save as `ACCT_COMPANY_ID`
- **Refresh Token** → Save as `ACCT_REFRESH_TOKEN`

### Step 4: Verify in Postman

1. Close the token popup
2. Postman auto-fills the Authorization header
3. Change request to **GET**:
   ```
   https://quickbooks.api.intuit.com/v3/company/{{realmId}}/companyinfo/1
   ```
4. Replace `{{realmId}}` with the Realm ID you just copied
5. Click **"Send"**
6. You should see your company info in the response

---

## Alternative: Manual curl Method

If you prefer command line:

### Step 1: Get Authorization Code

Open this URL in browser:
```
https://appcenter.intuit.com/connect/oauth2?client_id=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://oauth.pstmn.io/v1/callback&state=random123
```

After authorizing, copy the `code` parameter from the redirect URL.

### Step 2: Exchange Code for Tokens

```bash
curl -X POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer \
  -H "Accept: application/json" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d:LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf" \
  -d "grant_type=authorization_code&code=YOUR_CODE_HERE&redirect_uri=https://oauth.pstmn.io/v1/callback"
```

Response:
```json
{
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "L0123456789abcdef...",
  "access_token": "eyJlbmMiOiJBMTI4R0NNIiwiYWxnIjoiZGlyIn0...",
  "x_refresh_token_expires_in": 8726400,
  "realmId": "123145789012345"
}
```

**Copy:**
- `realmId` → `ACCT_COMPANY_ID`
- `refresh_token` → `ACCT_REFRESH_TOKEN`

---

## After Getting Tokens

Update your `.env` file:

```bash
ACCT_CLIENT_ID=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d
ACCT_CLIENT_SECRET=LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf
ACCT_REFRESH_TOKEN=<paste_refresh_token>
ACCT_COMPANY_ID=<paste_realmId>
ACCT_SANDBOX=false
```

Then verify:

```bash
python3 check-qbo-environment.py
```

---

## Why OAuth Playground Is Confusing

The OAuth Playground has TWO screens:

1. **First screen** (after redirect): Shows `code` and `realmId` in URL bar
   - Easy to miss if you're looking at the page content instead of URL
   
2. **Second screen** (after clicking "Get Tokens"): Shows tokens in a form
   - `realmId` appears here too, but sometimes hidden or in small text

**Postman is better** because it shows everything in one clear popup with labeled fields.

---

## Troubleshooting

### "Invalid redirect_uri" error
Make sure you added `https://oauth.pstmn.io/v1/callback` to your app's Redirect URIs in Developer Portal.

### "invalid_grant" error
Authorization code expired (only valid 30 minutes). Start over from Step 1.

### Can't see "Production keys" in Developer Portal
Toggle OFF "Development mode" at the top of Keys & Credentials page.

### Postman doesn't open browser
Check "Authorize using browser" checkbox in Authorization tab.

---

## Recommended: Use Postman

For first-time setup, **Postman is the easiest method**. Once you have the tokens, you won't need it again (the MCP bridge handles token refresh automatically).
