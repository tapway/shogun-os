# Google Drive API Setup for Shogun OS Document Scanning

This guide walks you through setting up Google API access for the document scanning feature.

## Option A: Service Account with Domain-Wide Delegation (Recommended for Companies)

Use this if you have a Google Workspace domain and admin access.

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **"Create Project"** (or select existing one)
3. Name it: `shogun-os-doc-scan`
4. Click **"Create"**

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **Google Drive API**
   - **Google Sheets API** (if using Excel templates from Drive)

### Step 3: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Fill in:
   - **Service account name**: `shogun-doc-scanner`
   - **Service account ID**: auto-generated (e.g., `shogun-doc-scanner@your-project.iam.gserviceaccount.com`)
   - **Description**: "Document scanning for Shogun OS"
4. Click **"Create and Continue"**
5. Skip role assignment (click **"Continue"**)
6. Click **"Done"**

### Step 4: Create Service Account Key

1. Click on the newly created service account email
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"**
6. **Download the JSON file** immediately (you can't get it again!)
7. Save it as: `~/.hermes/service-account-key.json`

### Step 5: Enable Domain-Wide Delegation

1. In the service account details page, click **"Enable G Suite Domain-wide Delegation"**
2. Check the box: **"Enable G Suite Domain-wide Delegation"**
3. Note the **Client ID** (you'll need this)
4. Click **"Save"**

### Step 6: Authorize in Google Admin Console

1. Go to https://admin.google.com/
2. Navigate to: **Security** → **API Controls** → **Domain-wide Delegation**
3. Click **"Add New"**
4. Enter:
   - **Client ID**: (from Step 5)
   - **OAuth scopes**: Paste this exact list:
     ```
     https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/spreadsheets
     ```
5. Click **"Authorize"**

### Step 7: Share Drive Folder with Service Account

1. Go to your shared folder: https://drive.google.com/drive/folders/1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig
2. Click **"Share"**
3. Add the service account email as a collaborator:
   - Email: `shogun-doc-scanner@YOUR-PROJECT-ID.iam.gserviceaccount.com`
   - Permission: **Editor** (needs write access to download files)
4. Click **"Share"**

### Step 8: Test Authentication

```bash
cd D:\Github\shogun-os
venv\Scripts\python.exe skills\google-workspace\scripts\setup.py --client-secret "C:\Users\user\AppData\Local\hermes\service-account-key.json"
```

Then test Drive access:
```bash
venv\Scripts\python.exe skills\google-workspace\scripts\google_api.py drive search "'1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig' in parents" --max 10
```

Expected output: JSON list of files in the folder.

---

## Option B: OAuth User Token (For Personal/Testing Use)

Use this if you don't have a Google Workspace domain.

### Step 1: Create OAuth Client ID

1. Go to https://console.cloud.google.com/
2. Create/select project (same as Option A, Steps 1-2)
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. Application type: **Desktop app**
6. Name: `shogun-os-local`
7. Click **"Create"**
8. Download the OAuth client secret JSON
9. Save as: `~/.hermes/google_client_secret.json`

### Step 2: Run Interactive Auth

```bash
cd D:\Github\shogun-os
venv\Scripts\python.exe skills\google-workspace\scripts\setup.py --auth-url
```

This will print an authorization URL. 

1. Open the URL in your browser
2. Sign in with your Google account
3. Grant permissions
4. Copy the **authorization code** from the redirect URL
5. Run:
   ```bash
   venv\Scripts\python.exe skills\google-workspace\scripts\setup.py --auth-code YOUR_CODE_HERE
   ```

### Step 3: Share Drive Folder

1. Go to: https://drive.google.com/drive/folders/1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig
2. Click **"Share"**
3. Add **your Google email** as Editor
4. Click **"Share"**

### Step 4: Test

```bash
venv\Scripts\python.exe skills\google-workspace\scripts\google_api.py drive search "'1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig' in parents" --max 10
```

---

## Troubleshooting

### Error: "Not authenticated"
- Check token file exists: `C:\Users\user\AppData\Local\hermes\google_token.json`
- Re-run setup with `--check` to verify

### Error: "Access denied" or "File not found"
- Ensure the service account (or your user) has **Editor** access to the folder
- Verify the folder ID is correct: `1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig`

### Error: "Unauthorized client" (DWD)
- Verify scopes in admin.google.com match exactly:
  ```
  https://www.googleapis.com/auth/drive
  https://www.googleapis.com/auth/drive.file
  https://www.googleapis.com/auth/spreadsheets
  ```
- Wait 5-10 minutes after adding DWD authorization (propagation delay)

### Error: "ModuleNotFoundError: googleapiclient"
```bash
venv\Scripts\pip.exe install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

---

## Next Steps After Authentication

Once the test command returns JSON with file listings:

1. **Configure a scan source in the Finance Dashboard:**
   - Go to Finance → Document Scanning tab
   - Click "Add Source"
   - Title: `Invoices`
   - Drive URL: `https://drive.google.com/drive/folders/1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig`
   - Document Type: `invoice`
   - Schedule: `manual` (or `daily` for automated runs)
   - Upload Excel template (optional, for structured extraction)
   - Click "Save"

2. **Run first scan:**
   - Click "Run Now" on the source
   - Wait for OCR processing (~5-10 seconds per image)
   - Review extracted results
   - Click ✓ to verify or ✗ to reject

3. **Set up automated scheduling (optional):**
   - Change schedule to `daily`
   - System will run automatically every day at 6 AM

---

## Security Notes

- **Never commit** `service-account-key.json` or `google_token.json` to Git
- These files are stored in `~/.hermes/` (gitignored by default)
- For production: rotate service account keys every 90 days
- Limit DWD scopes to only what's needed
