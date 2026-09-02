#!/bin/bash
# verify-finance-live-data.sh
# Run this on the server after deploying feat/finance-ver2

set -e

PORTAL_URL="http://localhost:8787"
TOKEN="${PORTAL_TOKEN:-}"  # Set PORTAL_TOKEN env var or edit below

echo "=== Finance Dashboard Live Data Verification ==="
echo ""

# 1. Check MCP connectivity
echo "1. Testing gbrain MCP..."
MCP_RESP=$(curl -s http://127.0.0.1:7432/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')

if echo "$MCP_RESP" | grep -q "tools/list"; then
  echo "   ✓ MCP responding"
else
  echo "   ✗ MCP not reachable or tools/list not implemented"
  echo "   Response: $MCP_RESP"
fi
echo ""

# 2. Get auth token (if not provided)
if [ -z "$TOKEN" ]; then
  echo "2. Getting auth token..."
  TOKEN=$(curl -s "$PORTAL_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@localhost","password":"admin"}' \
    | jq -r '.token' 2>/dev/null || echo "")
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "   ✗ Failed to get token (edit script with real credentials)"
    exit 1
  fi
  echo "   ✓ Token obtained"
fi
echo ""

# 3. Check finance stats
echo "3. Checking finance dashboard data source..."
STATS=$(curl -s "$PORTAL_URL/api/dashboard/finance/stats" \
  -H "Authorization: Bearer $TOKEN")

DATA_SOURCE=$(echo "$STATS" | jq -r '.dataSource // "unknown"')
echo "   dataSource: $DATA_SOURCE"

case "$DATA_SOURCE" in
  "gbrain")
    echo "   ✓ LIVE DATA connected to gbrain"
    ;;
  "mock")
    echo "   ⚠ Using mock data (demo branch?)"
    ;;
  "empty")
    echo "   ⏳ Waiting for gbrain snapshots (writer cron hasn't run yet)"
    ;;
  *)
    echo "   ✗ Unknown data source"
    ;;
esac
echo ""

# 4. Test individual snapshot reads
echo "4. Testing snapshot reads via MCP..."
for slug in cash pl balance-sheet ar ap bva concentration; do
  RESP=$(curl -s http://127.0.0.1:7432/mcp -X POST \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":0,\"method\":\"tools/call\",\"params\":{\"name\":\"get_page\",\"arguments\":{\"slug\":\"finance/snapshots/$slug\"}}}")
  
  if echo "$RESP" | grep -q "\"error\""; then
    echo "   ✗ finance/snapshots/$slug: NOT FOUND"
  else
    echo "   ✓ finance/snapshots/$slug: EXISTS"
  fi
done
echo ""

echo "=== Verification Complete ==="
