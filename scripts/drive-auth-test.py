#!/usr/bin/env python3
"""Quick Drive auth test - requests ONLY drive scope."""
import os
import sys
from pathlib import Path

# Add google_api.py to path
sys.path.insert(0, str(Path(__file__).parent / "skills" / "google-workspace" / "scripts"))

from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials

HERMES_HOME = Path(os.environ.get("HERMES_HOME", Path.home() / "AppData" / "Local" / "hermes"))
TOKEN_PATH = HERMES_HOME / "google_token.json"
CLIENT_SECRET_PATH = HERMES_HOME / "google_client_secret.json"

# ONLY request drive scope
SCOPES = ["https://www.googleapis.com/auth/drive"]

def main():
    if not CLIENT_SECRET_PATH.exists():
        print(f"ERROR: Client secret not found at {CLIENT_SECRET_PATH}")
        print("Download OAuth client JSON from Google Cloud Console and save it there.")
        return 1
    
    # Delete old token to force re-auth
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()
        print("Deleted old token")
    
    print("Starting OAuth flow with DRIVE scope only...")
    print("A browser window will open. Sign in and grant permission.")
    print()
    
    flow = InstalledAppFlow.from_client_secrets_file(
        str(CLIENT_SECRET_PATH),
        SCOPES,
        redirect_uri="http://localhost:8080/"  # Use port 8080 instead of 1
    )
    
    # This will open browser automatically
    creds = flow.run_local_server(port=8080, open_browser=True)
    
    # Save token
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())
    
    print(f"\n✅ Token saved to {TOKEN_PATH}")
    print(f"Scopes granted: {creds.scopes}")
    
    # Test access
    from googleapiclient.discovery import build
    service = build("drive", "v3", credentials=creds)
    
    folder_id = "1nJNt1VMuMmI7rYsjtIB418YiT5Sc6Eig"
    try:
        results = service.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            pageSize=20,
            fields="files(id, name, mimeType)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = results.get("files", [])
        print(f"\n📁 Found {len(files)} files in shared folder:")
        for f in files[:10]:
            print(f"   - {f['name']} ({f['mimeType']})")
    except Exception as e:
        print(f"\n❌ Error accessing folder: {e}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
