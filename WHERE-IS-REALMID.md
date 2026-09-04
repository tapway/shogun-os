# Where to Find realmId (Visual Guide)

## ❌ realmId is NOT in QuickBooks Accounting UI

You will **NEVER** find realmId by looking at:
- QuickBooks Online dashboard
- Company settings
- Account and Settings page
- Any menu or report in QBO

**realmId only exists in the OAuth flow.**

---

## ✅ Where realmId DOES Appear

### Location 1: Browser URL Bar (After Clicking "Allow")

When you complete OAuth authorization, your browser redirects to a URL like this:

```
https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl?code=ABC123XYZ&realmId=123145789012345
                                                          ↑                              ↑
                                                    Look here!                    THIS IS REALMID
```

**How to see it:**
1. Complete OAuth flow (sign in → select company → click Allow)
2. Look at the **address bar** in your browser
3. Find `realmId=` in the URL
4. Copy the number after it

⚠️ **Easy to miss:** The URL might be long and scroll off screen. Scroll right in the address bar!

---

### Location 2: Token Exchange Response (JSON)

When you exchange the authorization code for tokens, the API returns:

```json
{
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "L0123456789abcdef...",
  "access_token": "eyJlbmMiOiJBMTI4R0NNIiwiYWxnIjoiZGlyIn0...",
  "x_refresh_token_expires_in": 8726400,
  "realmId": "123145789012345"    ← HERE IT IS!
}
```

**This is the most reliable place** — it's in the JSON response body, not hidden in a URL.

---

## Easiest Methods to Get realmId

### Method 1: Use Our Script (Recommended) ⭐

```bash
python3 get-qbo-tokens.py
```

This script:
- Starts a local server
- Opens browser for OAuth
- **Automatically captures realmId** from the callback
- Shows it to you clearly on screen
- Saves everything to `.env` file

**You don't need to hunt for realmId manually.**

---

### Method 2: Use Postman

1. Configure OAuth 2.0 in Postman (see `QBO-POSTMAN-GUIDE.md`)
2. Click "Get New Access Token"
3. Postman shows a popup with labeled fields:
   ```
   Realm ID: 123145789012345    ← Clearly labeled!
   Refresh Token: L012345...
   ```

No URL parsing needed.

---

### Method 3: Manual Browser Method

If you want to do it manually:

1. Open this URL:
   ```
   https://appcenter.intuit.com/connect/oauth2?client_id=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d&response_type=code&scope=com.intuit.quickbooks.accounting+openid+profile+email&redirect_uri=https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl&state=random123
   ```

2. Sign in → Select company → Click Allow

3. **Look at browser address bar** — copy the full URL

4. Paste into a text editor and find `realmId=`:
   ```
   ...&realmId=123145789012345&...
              ^^^^^^^^^^^^^^^^
              Copy this number
   ```

5. Then go to OAuth Playground page and click "Get Tokens" to get refresh_token

---

## Why You Can't Find It in QBO UI

QuickBooks Online uses **internal IDs** that are different from the API realmId:

| What you see in QBO UI | What API uses |
|------------------------|---------------|
| Company name | realmId (numeric) |
| Account numbers | Internal account IDs |
| Customer names | Customer IDs (different format) |

The realmId is an **API-only identifier**. Intuit doesn't expose it in the accounting UI because normal users don't need it — only developers integrating via API.

---

## Quick Test: Verify Your realmId

Once you have a realmId, test it immediately:

```bash
# Set credentials
export ACCT_CLIENT_ID=ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d
export ACCT_CLIENT_SECRET=LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf
export ACCT_REFRESH_TOKEN=<your_refresh_token>
export ACCT_COMPANY_ID=<your_realmId>
export ACCT_SANDBOX=false

# Run verification
python3 check-qbo-environment.py
```

If it says "✅ PRODUCTION environment" and shows your real company name → realmId is correct!

If it fails → realmId is wrong or belongs to a different company.

---

## Summary

| Question | Answer |
|----------|--------|
| Where is realmId in QBO UI? | **NOWHERE** — it's API-only |
| Where does realmId appear? | OAuth redirect URL + token response JSON |
| Easiest way to get it? | Run `python3 get-qbo-tokens.py` |
| Can I guess my realmId? | **NO** — must come from OAuth flow |
| Is realmId the same as company name? | **NO** — it's a numeric ID |

---

## Recommended Action

**Just run the script:**

```bash
python3 get-qbo-tokens.py
```

It handles everything automatically and shows you the realmId clearly. No manual hunting required.
