#!/usr/bin/env python3
"""
QuickBooks OAuth Helper — Get realmId + refresh_token easily
─────────────────────────────────────────────────────────────
This script starts a local server, opens your browser for OAuth,
and automatically captures realmId + refresh_token.

Usage:
  python3 get-qbo-tokens.py

It will:
  1. Start local server on port 8080
  2. Open browser to Intuit OAuth page
  3. You sign in + select company + approve
  4. Script catches callback, exchanges code for tokens
  5. Shows you realmId and refresh_token clearly
  6. Offers to save to .env file
"""

import http.server
import json
import os
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
import threading
import time

# ── Configuration ────────────────────────────────────────────────────────

CLIENT_ID = "ABVpYJ2qbgMn0M7kuzXCXlPiZFERFnc3GtSV6CQdE0L5EIFl2d"
CLIENT_SECRET = "LWLdPnm5sVtsauTANmrX9M15kcZbHqrQDSO0TQHf"
REDIRECT_URI = "http://localhost:8080/callback"
PORT = 8080

# ── Global state ─────────────────────────────────────────────────────────

captured_code = None
captured_realm_id = None


class OAuthCallbackHandler(http.server.BaseHTTPRequestHandler):
    """Handle the OAuth callback from Intuit."""
    
    def do_GET(self):
        global captured_code, captured_realm_id
        
        # Parse query parameters
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        if 'code' in params and 'realmId' in params:
            captured_code = params['code'][0]
            captured_realm_id = params['realmId'][0]
            
            # Send success page
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html = f"""
            <html>
            <head><title>OAuth Success</title></head>
            <body style="font-family: Arial; padding: 40px; background: #1a1a1a; color: #fff;">
                <h1 style="color: #4ade80;">✅ Authorization Successful!</h1>
                <p>You can close this tab now.</p>
                <p>The script has captured your tokens.</p>
                <hr style="border-color: #333;">
                <h3>Captured Values:</h3>
                <p><strong>Realm ID (Company ID):</strong> <code style="background: #333; padding: 4px 8px;">{captured_realm_id}</code></p>
                <p><strong>Authorization Code:</strong> <code style="background: #333; padding: 4px 8px;">{captured_code[:20]}...</code></p>
                <p style="margin-top: 20px; color: #888;">Check your terminal for next steps.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
            
            # Shutdown server after capturing
            threading.Thread(target=self.server.shutdown).start()
        else:
            # Error or missing params
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            error_msg = params.get('error', ['Unknown error'])[0]
            html = f"""
            <html>
            <body style="font-family: Arial; padding: 40px; background: #1a1a1a; color: #fff;">
                <h1 style="color: #f87171;">❌ Authorization Failed</h1>
                <p>Error: {error_msg}</p>
                <p>Please try again.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass


def exchange_code_for_tokens(code, redirect_uri):
    """Exchange authorization code for access + refresh tokens."""
    token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    
    req = urllib.request.Request(
        token_url,
        data=urllib.parse.urlencode(data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode()), None
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return None, f"HTTP {e.code}: {body}"
    except Exception as e:
        return None, str(e)


def main():
    global captured_code, captured_realm_id
    
    print("=" * 80)
    print("QuickBooks OAuth Token Getter")
    print("=" * 80)
    print()
    print(f"Client ID: {CLIENT_ID[:20]}...")
    print(f"Redirect URI: {REDIRECT_URI}")
    print()
    
    # Check if redirect URI is registered
    print("⚠️  IMPORTANT: Before continuing, make sure this redirect URI is registered:")
    print(f"   {REDIRECT_URI}")
    print()
    print("   To register:")
    print("   1. Go to https://developer.intuit.com/app/developer/dashboard")
    print("   2. Click on your app")
    print("   3. Go to 'Keys & Credentials' tab")
    print("   4. Scroll to 'Redirect URIs' section")
    print(f"   5. Add: {REDIRECT_URI}")
    print("   6. Click Save")
    print()
    
    ready = input("Have you registered the redirect URI? (y/N): ").strip().lower()
    if ready != 'y':
        print("\nPlease register the redirect URI first, then run this script again.")
        return
    
    # Build authorize URL
    auth_url = (
        f"https://appcenter.intuit.com/connect/oauth2?"
        f"client_id={CLIENT_ID}&"
        f"response_type=code&"
        f"scope=com.intuit.quickbooks.accounting+openid+profile+email&"
        f"redirect_uri={urllib.parse.quote(REDIRECT_URI)}&"
        f"state=random123"
    )
    
    print()
    print("Starting local server...")
    
    # Start HTTP server
    server = http.server.HTTPServer(('localhost', PORT), OAuthCallbackHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    print(f"✓ Server running on http://localhost:{PORT}")
    print()
    print("Opening browser for authorization...")
    print("(If browser doesn't open, paste this URL manually:)")
    print()
    print(auth_url)
    print()
    
    # Open browser
    webbrowser.open(auth_url)
    
    print("Waiting for authorization...")
    print("(Complete the OAuth flow in your browser)")
    print()
    
    # Wait for callback (max 5 minutes)
    timeout = 300
    start_time = time.time()
    while captured_code is None and (time.time() - start_time) < timeout:
        time.sleep(0.5)
    
    server.shutdown()
    
    if captured_code is None:
        print("❌ Timeout waiting for authorization.")
        print("   Please try again.")
        return
    
    print()
    print("=" * 80)
    print("✅ AUTHORIZATION CAPTURED!")
    print("=" * 80)
    print()
    print(f"Realm ID (Company ID): {captured_realm_id}")
    print(f"Authorization Code: {captured_code[:30]}...")
    print()
    
    # Exchange code for tokens
    print("Exchanging code for tokens...")
    tokens, error = exchange_code_for_tokens(captured_code, REDIRECT_URI)
    
    if error:
        print(f"❌ Token exchange failed: {error}")
        print()
        print("The authorization code may have expired. Please run the script again.")
        return
    
    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")
    realm_id_from_token = tokens.get("realmId")
    
    print("✅ TOKENS RECEIVED!")
    print()
    print("=" * 80)
    print("YOUR CREDENTIALS (copy these)")
    print("=" * 80)
    print()
    print(f"ACCT_CLIENT_ID={CLIENT_ID}")
    print(f"ACCT_CLIENT_SECRET={CLIENT_SECRET}")
    print(f"ACCT_REFRESH_TOKEN={refresh_token}")
    print(f"ACCT_COMPANY_ID={realm_id_from_token or captured_realm_id}")
    print(f"ACCT_SANDBOX=false")
    print()
    print("=" * 80)
    print()
    
    # Offer to save to .env
    save = input("Save these credentials to .env file? (Y/n): ").strip().lower()
    if save != 'n':
        env_content = f"""# QuickBooks Online Credentials
# Generated by get-qbo-tokens.py on {time.strftime('%Y-%m-%d %H:%M:%S')}

ACCT_CLIENT_ID={CLIENT_ID}
ACCT_CLIENT_SECRET={CLIENT_SECRET}
ACCT_REFRESH_TOKEN={refresh_token}
ACCT_COMPANY_ID={realm_id_from_token or captured_realm_id}
ACCT_SANDBOX=false
"""
        env_path = Path(".env")
        with open(env_path, "w") as f:
            f.write(env_content)
        
        print(f"✓ Saved to {env_path.absolute()}")
        print()
    
    # Next steps
    print("=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print()
    print("1. Verify connection:")
    print("   python3 check-qbo-environment.py")
    print()
    print("2. Install MCP bridge:")
    print("   python3 setup-qbo-finance.py")
    print()
    print("3. Test live data:")
    print('   hermes -p finance-manager --exec "Call acct_get_profit_loss with {\\"date_from\\":\\"2026-01-01\\",\\"date_to\\":\\"2026-09-03\\"}"')
    print()
    print("4. Populate dashboard:")
    print("   python3 skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py")
    print()


if __name__ == "__main__":
    main()
