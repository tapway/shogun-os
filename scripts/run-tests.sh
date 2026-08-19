#!/usr/bin/env bash
# scripts/run-tests.sh — single entry point for the full test suite.
# Runs all Python tests (excluding @slow) across both test directories.
# CI runs this exact command. Local dev can add -m slow to include everything.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
cd "$REPO_DIR"

# Detect python (prefer venv if present)
if [ -f "./venv/Scripts/python.exe" ]; then
  PY="./venv/Scripts/python.exe"
elif [ -f "./venv/bin/python" ]; then
  PY="./venv/bin/python"
else
  PY="python3"
fi

echo "=== Running test suite (excluding @slow) ==="
echo "Python: $($PY --version 2>&1)"
echo ""

$PY -m pytest tests/ shogun-web/server/tests/ -m "not slow" -v --tb=short

echo ""
echo "=== Test suite complete ==="
