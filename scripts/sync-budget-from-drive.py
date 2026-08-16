#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync-budget-from-drive.py — Sync budget Excel from Google Drive → finance/budget.json

Watches a Google Drive folder for the latest budget Excel file, downloads it,
parses it via parse-budget-excel.py, and writes:
  - finance/budget.json (canonical budget for bva-variance-analysis skill)
  - examples/finance-budget.json (dashboard mock data with bvaLineItems)

Designed to run as a cron job (e.g. daily or weekly). The budget is annual —
re-uploading a new Excel to Drive each year is all that's needed; this script
picks it up automatically.

Requirements:
  - Google Workspace skill (gws CLI or google_api.py) configured with DWD
  - openpyxl installed (pip install openpyxl)
  - parse-budget-excel.py in the same scripts/ directory

Usage:
    python scripts/sync-budget-from-drive.py [--folder-id <drive_folder_id>]
                                             [--file-pattern "Budget"]
                                             [--ytd-months 5]
                                             [--dry-run]

Environment:
    Uses the gws CLI (google-workspace skill) for Drive API calls.
    Ensure gws is on PATH and authenticated (google DWD setup).

Cron schedule:
    Recommended: daily at 6 AM (budget file changes are infrequent)
    schedule: "0 6 * * *"
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[1]
PARSE_SCRIPT = REPO_ROOT / "scripts" / "parse-budget-excel.py"
DEFAULT_OUTPUT_BUDGET = REPO_ROOT / "finance" / "budget.json"
DEFAULT_OUTPUT_MOCK = REPO_ROOT / "examples" / "finance-budget.json"
STATE_FILE = Path.home() / ".hermes" / "budget-sync-state.json"


def log(msg: str, level: str = "INFO") -> None:
    """Print log message with timestamp."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}", flush=True)


def load_state() -> dict:
    """Load sync state (tracks file_id → modified_time for dedup)."""
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state: dict) -> None:
    """Save sync state."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def find_budget_on_drive(folder_id: str = None, file_pattern: str = "Budget") -> dict | None:
    """Search Google Drive for the latest budget Excel file.

    Returns: dict with {id, name, modifiedTime, mimeType} or None if not found.
    """
    # Build search query
    q_parts = [
        f"name contains '{file_pattern}'",
        "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
        "trashed=false",
    ]
    if folder_id:
        q_parts.append(f"'{folder_id}' in parents")
    query = " and ".join(q_parts)

    # Use gws CLI to search Drive — gws takes --params as JSON
    params = {
        "q": query,
        "pageSize": 10,
        "fields": "files(id,name,mimeType,modifiedTime,webViewLink)",
    }
    cmd = ["gws", "drive", "files", "list", "--params", json.dumps(params)]
    log(f"Searching Drive: {query}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            log(f"gws command failed: {result.stderr.strip()}", "ERROR")
            # Fallback: try google_api.py directly
            return _find_budget_via_api(query)
        files = json.loads(result.stdout).get("files", [])
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        log(f"gws CLI unavailable ({e}), trying google_api.py fallback", "WARNING")
        return _find_budget_via_api(query)

    if not files:
        log(f"No budget Excel found on Drive matching '{file_pattern}'")
        return None

    # Sort by modifiedTime descending — pick the most recent
    files.sort(key=lambda f: f.get("modifiedTime", ""), reverse=True)
    latest = files[0]
    log(f"Found budget file: {latest.get('name')} (modified: {latest.get('modifiedTime')})")
    return latest


def _find_budget_via_api(query: str) -> dict | None:
    """Fallback: use google_api.py directly instead of gws CLI."""
    google_api = REPO_ROOT / "skills" / "google-workspace" / "scripts" / "google_api.py"
    if not google_api.exists():
        log(f"google_api.py not found at {google_api}", "ERROR")
        return None

    # google_api.py drive search takes positional query arg
    cmd = [sys.executable, str(google_api), "drive", "search", query, "--max", "10"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            log(f"google_api.py failed: {result.stderr.strip()}", "ERROR")
            return None
        files = json.loads(result.stdout)
        if isinstance(files, list) and files:
            files.sort(key=lambda f: f.get("modifiedTime", ""), reverse=True)
            return files[0]
    except (subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        log(f"google_api.py error: {e}", "ERROR")

    return None


def download_from_drive(file_id: str, output_path: Path) -> bool:
    """Download a file from Google Drive by file_id."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Try gws CLI first — gws drive files get-media takes --params with fileId
    params = {"fileId": file_id}
    cmd = ["gws", "drive", "files", "get-media", "--params", json.dumps(params),
           "--output", str(output_path)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0 and output_path.exists():
            log(f"Downloaded to {output_path}")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Fallback: google_api.py (positional file_id + --output)
    google_api = REPO_ROOT / "skills" / "google-workspace" / "scripts" / "google_api.py"
    if google_api.exists():
        cmd = [sys.executable, str(google_api), "drive", "download",
               file_id, "--output", str(output_path)]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0 and output_path.exists():
                log(f"Downloaded to {output_path} (via google_api.py)")
                return True
            log(f"google_api.py download failed: {result.stderr.strip()}", "ERROR")
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            log(f"google_api.py download error: {e}", "ERROR")

    return False


def run_parse_script(excel_path: Path, output_budget: Path, output_mock: Path,
                     ytd_months: int) -> bool:
    """Run parse-budget-excel.py to generate budget.json + update mock data."""
    cmd = [
        sys.executable, str(PARSE_SCRIPT), str(excel_path),
        "--output-budget", str(output_budget),
        "--output-mock", str(output_mock),
        "--ytd-months", str(ytd_months),
    ]
    log(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            log(f"Parse successful\n{result.stdout.strip()}")
            return True
        log(f"Parse failed (exit {result.returncode}):\n{result.stderr.strip()}", "ERROR")
    except subprocess.TimeoutExpired:
        log("Parse script timed out after 120s", "ERROR")

    return False


def main():
    parser = argparse.ArgumentParser(
        description="Sync budget Excel from Google Drive → finance/budget.json"
    )
    parser.add_argument("--folder-id", default=None,
                        help="Google Drive folder ID to search in (default: all Drive)")
    parser.add_argument("--file-pattern", default="Budget",
                        help="Name pattern to search for (default: 'Budget')")
    parser.add_argument("--ytd-months", type=int, default=None,
                        help="YTD months override (default: auto-compute from current month)")
    parser.add_argument("--output-budget", default=str(DEFAULT_OUTPUT_BUDGET),
                        help=f"Output budget.json path (default: {DEFAULT_OUTPUT_BUDGET})")
    parser.add_argument("--output-mock", default=str(DEFAULT_OUTPUT_MOCK),
                        help=f"Output mock data path (default: {DEFAULT_OUTPUT_MOCK})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Search and report, but don't download or parse")
    parser.add_argument("--force", action="store_true",
                        help="Force re-download even if file hasn't changed")
    args = parser.parse_args()

    # Auto-compute YTD months from current month (Jan=1, Dec=12)
    if args.ytd_months is None:
        args.ytd_months = min(datetime.now().month, 12)
        log(f"Auto-detected YTD months: {args.ytd_months}")

    log(f"Budget sync starting (folder={args.folder_id or 'all'}, pattern='{args.file_pattern}')")

    # 1. Find the latest budget Excel on Drive
    budget_file = find_budget_on_drive(args.folder_id, args.file_pattern)
    if not budget_file:
        log("No budget file found on Drive. Exiting.", "WARNING")
        return 1

    file_id = budget_file.get("id")
    file_name = budget_file.get("name", "budget.xlsx")
    modified_time = budget_file.get("modifiedTime", "")

    log(f"Latest budget: {file_name} (id={file_id}, modified={modified_time})")

    # 2. Check state — skip if unchanged (unless --force)
    state = load_state()
    last_modified = state.get(file_id, {}).get("modified", "")
    if not args.force and modified_time == last_modified:
        log(f"Budget file unchanged since last sync (modified={modified_time}). Skipping.")
        log("Use --force to re-sync anyway.")
        return 0

    if args.dry_run:
        log("Dry run — would download and parse. Exiting.")
        return 0

    # 3. Download the Excel
    temp_excel = Path.home() / ".hermes" / "tmp" / f"budget-{file_id}.xlsx"
    if not download_from_drive(file_id, temp_excel):
        log("Failed to download budget file from Drive", "ERROR")
        return 1

    # 4. Parse it
    output_budget = Path(args.output_budget)
    output_mock = Path(args.output_mock)
    if not run_parse_script(temp_excel, output_budget, output_mock, args.ytd_months):
        log("Failed to parse budget Excel", "ERROR")
        return 1

    # 5. Update state
    state[file_id] = {
        "name": file_name,
        "modified": modified_time,
        "synced_at": datetime.now().isoformat(),
        "budget_json_path": str(output_budget),
    }
    save_state(state)

    # 6. Cleanup temp file
    try:
        temp_excel.unlink()
    except OSError:
        pass

    log("✅ Budget sync complete.")
    log(f"   Budget: {output_budget}")
    log(f"   Mock: {output_mock}")
    log(f"   Actuals: QBO (via acct_get_profit_loss, dynamic at dashboard load)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
