---
name: notion-hr-bridge
description: "Sync a Notion HR workspace into ShogunOS SQLite + gbrain. Pulls 15 data sources (Employee Directory, Job Openings, Job Secured, 4 recruitment trackers, Onboarding, Performance, Equipment, Training, Trainers, Meetings, Action Items, Attendees), computes formula fields, writes brain pages."
version: 1.0.0
author: shogun-os
license: MIT
platforms: [linux, macos, windows]
prerequisites:
  env_vars: [NOTION_API_KEY]
metadata:
  hermes:
    tags: [HR, Notion, Sync, Bridge, Shogun-OS]
    homepage: ""
---

# Notion HR Bridge

One-way sync from a Notion HR workspace into the Shogun OS portal SQLite database and gbrain `hr/` source.

## What it does

`scripts/sync-notion-hr.py` pulls all 15 HR data sources from Notion via the data_sources API, upserts rows into the portal DB, downloads file attachments, and writes employee profiles as brain pages.

### Data sources synced

| Notion DB | SQLite table | Rows |
|-----------|-------------|------|
| Employee Directory | `hr_employees` | 32 |
| Job Openings | `hr_job_openings` | 7 |
| Job Secured | `hr_job_openings` (status=Hired) | 9 |
| Hiring Board (fulltime) | `hr_candidates` | 530 |
| Internship Hiring Tracker | `hr_candidates` (`internship`) | 387 |
| Freelancer Hiring Tracker | `hr_candidates` (`freelancer`) | 18 |
| Virtual Bench | `hr_candidates` (`virtual_bench`) | 1 |
| New Hire On-boarding Tasks | `hr_onboarding_tasks` | 44 |
| Performance Review | `hr_performance_reviews` | 2 |
| Equipment Tracker | `hr_equipment` | 2 |
| Training and Development | `hr_training` | 2 |
| Trainer Details | `hr_trainers` | 2 |
| Meeting Minutes | `hr_meetings` | 4 |
| Meeting Action Items | `hr_meeting_action_items` | 3 |
| Attendees and Absentees | `hr_meeting_attendees` | 3 |

### Formula fields (computed on read, not stored)

These replicate the Notion formulas exactly:

| Formula | Model | Expression |
|---------|-------|-----------|
| Deadline | HrJobOpening | `application_start + 90 days` |
| Days Left | HrJobOpening | `deadline - today()` in days |
| Overdue | HrJobOpening | `if days_left < 0 → "Overdue"` |
| Task Status | HrOnboardingTask | `In progress → 🟡 Task Ongoing, Done → ✅ Task Completed` |
| No. of Years | HrEmployee | Corrected tenure: `full years from date_of_hire to today` (Notion had a sign bug — we fixed it per user request) |

## Setup

### 1. Notion API key

```bash
# 1. Create integration at https://notion.so/my-integrations
# 2. Copy the secret (starts with ntn_ or secret_)
# 3. Share the HR page with the integration (••• → Connect to → your integration)
# 4. Set env var:
export NOTION_API_KEY=ntn_your_key_here
```

Add to `${HERMES_HOME:-~/.hermes}/.env` for persistence:
```
NOTION_API_KEY=ntn_your_key_here
```

### 2. Run the sync

```bash
# Dry run (counts only, no writes)
python scripts/sync-notion-hr.py --dry-run

# Full sync
python scripts/sync-notion-hr.py

# Verify formulas match Notion
python scripts/sync-notion-hr.py --verify
```

### 3. Schedule recurring sync (during Notion parallel period)

Create a cron job to sync every 2 hours:

```bash
# In Hermes:
/cron create
schedule: every 2h
prompt: Run the Notion HR sync script: `python scripts/sync-notion-hr.py` and report the sync summary (rows created, updated, errors).
```

Or manually via crontab:
```bash
0 */2 * * * cd /path/to/shogun-os && NOTION_API_KEY=ntn_... python scripts/sync-notion-hr.py >> /tmp/hr-sync.log 2>&1
```

## Verification

After sync, verify all 5 formula fields compute correctly:

```bash
python scripts/sync-notion-hr.py --verify
```

Expected output:
```
✓ No. of Years (Employee Name): 0
✓ Deadline (Job Title): '2026-04-12'
✓ Days Left (Job Title): -134
✓ Overdue (Job Title): 'Overdue'
✓ Task Status (Staff Name): '🟡 Task Ongoing'
Passed: 9, Failed: 0
```

## Data flow

```
Notion API
  ↓ data_sources/{id}/query (paginated, 100/page)
  ↓
sync-notion-hr.py
  ├── Upsert → SQLite (hr_employees, hr_candidates, …)
  ├── Download → ~/.shogun-os/hr-assets/ (profile pics, files, loan docs)
  └── Write → ~/brain/hr/ (employee brain pages as markdown)
```

## Decommissioning Notion

When ready to make ShogunOS the sole source of truth:

1. Run final sync: `python scripts/sync-notion-hr.py`
2. Verify all data present with `--verify`
3. Disable the sync cron job
4. Archive Notion workspace (read-only)
5. Rotate the Notion API key at https://notion.so/my-integrations
6. Future HR data entry happens in ShogunOS portal directly

## Troubleshooting

- **HTTP 400 "Invalid request URL"**: The dashboard-level database IDs are view references, not source databases. The script uses the correct `data_sources/{id}/query` endpoint discovered via `/v1/databases/{id}` metadata.
- **HTTP 404 "Could not find data_source"**: The integration doesn't have access to the page. Re-share the HR page with the integration in Notion (••• → Connect to).
- **File download failures**: Notion S3 URLs expire after 1 hour. The script downloads immediately during sync; if a sync runs later, stale URLs will fail gracefully (path stays empty).
- **Rate limits**: Notion allows ~3 req/s average. The script sleeps 0.4s between paginated requests.

## Notion page structure (reference)

Root page ID: `17574108-5eae-802d-9802-d03bc9f1e113`

Sub-pages: Employee Directory, Job Openings, Job Secured, Fulltime/Internship/Freelancer Recruitment Trackers, Virtual Bench, New Hire On-boarding Tasks, Leave Tracker, Performance Reviews, Equipment Tracker, Training and Development.

The Leave Tracker page contains a synced_block that references the Employee Directory database — there is no separate leave database. Leave data lives in the Q1–Q4 and Leave Taken fields on each employee.
