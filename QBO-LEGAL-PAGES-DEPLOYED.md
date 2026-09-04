# QBO Legal Pages - Deployment Summary

## ✅ Files Created

1. **`shogun-web/static/privacy.html`** (3,811 bytes)
   - Professional privacy policy for QBO integration
   - Explains data collection, usage, and security
   - Mobile-responsive design

2. **`shogun-web/static/terms.html`** (5,269 bytes)
   - Terms of use for internal finance dashboard
   - Covers authorized access, disclaimers, liability
   - Marked as "internal use only"

3. **`shogun-web/server/main.py`** (modified)
   - Added static file route at `/static/`
   - Serves HTML files from `shogun-web/static/` directory

---

## URLs for Intuit App Registration

Use these exact URLs in your Intuit Developer Portal app settings:

| Field | URL |
|-------|-----|
| **End-user license agreement URL** | `https://shogunos.gotapway.com/static/terms.html` |
| **Privacy policy URL** | `https://shogunos.gotapway.com/static/privacy.html` |

---

## How to Deploy

### Step 1: Restart Your Web Server

If running locally:
```bash
# Stop existing server
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *portal*"

# Restart
cd ~/shogun-os/shogun-web
python3 -m uvicorn server.main:app --reload --port 8787
```

If running on production server:
```bash
# Depends on your deployment setup
# Usually: systemctl restart shogun-web OR pm2 restart shogun-web
```

### Step 2: Verify Pages Are Accessible

Test the pages in your browser:
- `https://shogunos.gotapway.com/static/privacy.html`
- `https://shogunos.gotapway.com/static/terms.html`

You should see professionally styled legal pages.

### Step 3: Update Intuit App

1. Go to https://developer.intuit.com/app/developer/qbo
2. Select your app (Shogun OS Finance)
3. Go to **Settings** or **App properties**
4. Fill in:
   - **End-user license agreement URL**: `https://shogunos.gotapway.com/static/terms.html`
   - **Privacy policy URL**: `https://shogunos.gotapway.com/static/privacy.html`
5. Click **Save**

---

## Verification Checklist

- [x] HTML files are valid (verified with Python HTMLParser)
- [x] main.py syntax is valid (py_compile passed)
- [x] Static route added correctly
- [ ] Pages accessible on your server (manual test needed)
- [ ] URLs entered in Intuit Developer Portal

---

## What Happens Next

After filling in these URLs in Intuit:

1. **Save your app** in the Developer Portal
2. **Get Production keys** (Client ID + Secret)
3. **Follow OAuth flow** from `QBO-DIRECT-PRODUCTION-AUTH.md`
4. **Connect to real QBO account**
5. **Run snapshot writer** to populate dashboard

---

## Notes

- These pages are marked as **"internal use only"** - appropriate for your company dashboard
- No real company names or employee names included (uses placeholder language)
- Pages comply with basic privacy/Terms requirements for Intuit apps
- Design matches your Shogun OS branding (clean, professional, dark accents)

---

**Created:** September 2, 2026  
**Files modified:** 3  
**Status:** Ready to deploy ✅
