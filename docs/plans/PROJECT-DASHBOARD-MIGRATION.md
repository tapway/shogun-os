# Project Dashboard Migration

**Branch:** `project-dashboard`
**Status:** Phase 1 — Cross-server HTTP sync
**Date:** 2026-08-25

## Overview

This migration imports project and task data from the existing project
tracker (`PROJECT_DASHBOARD_API_URL`, configured in `.env`) into ShogunOS.

## Architecture

### Phase 1: Cross-server sync (current)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Project tracker (remote)        ShogunOS server           │
│                                                             │
│   ┌──────────────┐                 ┌──────────────────┐     │
│   │  App + API   │                 │  ShogunOS web    │     │
│   │              │                 │  + SQLite        │     │
│   │  /api/projects ──────────────▶│  sync script     │     │
│   │  /api/tasks    │  HTTPS (GET)  │  (cron job)      │     │
│   │              │                 │                  │     │
│   └──────────────┘                 └──────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
- Sync script runs on the ShogunOS server (cron, e.g. every 6 hours)
- Makes HTTPS `GET` requests to the tracker's API endpoints
- Parses JSON responses and upserts into the ShogunOS SQLite database
- No direct database connection needed — the API is the bridge

### Phase 2: Same-server direct connection (later)

Once the project tracker moves to the same server as ShogunOS:

**Option A: Localhost API (recommended)**
- Point `PROJECT_DASHBOARD_API_URL` at the local instance (e.g. `http://localhost:3000`)
- Same sync script, different URL
- **Effort:** config change only

**Option B: Unified database**
- Migrate tracker data into the ShogunOS schema directly
- Single source of truth
- **Effort:** ~1 week (migration + testing)

## Files added

### Backend (server)

- `shogun-web/server/models.py` — new models:
  - `Project` — main project entity
  - `Goal` — project goals (keyed by project + goal ref)
  - `Task` — project tasks
  - `Risk` — project risks
  - `TeamMember` — project team members
  - `DefinitionOfDone` — DoD items

- `shogun-web/server/dashboard.py` — new read-only endpoints:
  - `GET /departments/{name}/dashboard/projects` — list projects
  - `GET /departments/{name}/dashboard/projects/{id}` — single project with nested data
  - `GET /departments/{name}/dashboard/tasks` — list tasks
  - `GET /departments/{name}/dashboard/projects/{id}/tasks` — tasks for one project
  - `GET /departments/{name}/dashboard/projects/stats` — dashboard statistics

### Scripts

- `scripts/sync-project-dashboard.py` — sync script (run via cron)
  - Fetches data from `PROJECT_DASHBOARD_API_URL` (set in `.env`, same convention as `CRM_API_URL`)
  - Upserts into SQLite (idempotent — safe to re-run)
  - Handles nested data (goals, tasks, risks, team members, DoD)

## Configuration

### Environment variables

```bash
# Source project dashboard API URL (Phase 1: remote, Phase 2: localhost)
# Same convention as CRM_API_URL — configured in .env, no hardcoded default.
export PROJECT_DASHBOARD_API_URL="https://project.example.com"
```

### Cron job setup

```bash
# Every 6 hours
0 */6 * * * cd /path/to/shogun-os && PROJECT_DASHBOARD_API_URL=... python scripts/sync-project-dashboard.py >> /var/log/shogun/project-sync.log 2>&1
```

## API endpoints

### List projects

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/departments/crm/dashboard/projects"
```

Query parameters: `status`, `pm`, `gate`

### Get single project

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/departments/crm/dashboard/projects/PRJ-001"
```

### List tasks

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/departments/crm/dashboard/tasks"
```

Query parameters: `project_id`, `owner`, `status`, `priority`, `overdue=true`

### Project statistics

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/departments/crm/dashboard/projects/stats"
```

Response shape:

```json
{
  "projects": { "total": 46, "active": 27 },
  "tasks": { "total": 490, "completed": 303, "overdue": 12 }
}
```

## Data model (summary)

Project: id, name, client, pm, status, product, valueRm, gate, gateStatus,
startDate, targetEnd, actualEnd, charter/sow/racl links, handoverStatus,
nested goals/tasks/risks/teamMembers/dodItems.

Task: id, projectId, title, owner, created, deadline, priority, status,
notes, completed, dependsOn; computed `daysLeft` / `isOverdue` in `to_dict()`.

## Rollout timeline

| Phase | Description | Timing |
|-------|-------------|--------|
| 1 | Cross-server HTTP sync | Week 1-2 |
| 2 | Validate data + dashboard UI | Week 3-4 |
| 3 | Move tracker to same server | Week 5 |
| 4 | Switch to localhost API | Week 5 (config change) |
| 5 | Unified DB (optional) | Week 6+ |

## Notes

- Sync is read-only (never writes back to the source tracker)
- Upserts are idempotent — safe to run repeatedly
- Computed fields (`daysLeft`, `isOverdue`) are derived in `to_dict()`

## Troubleshooting

- **Sync fails with HTTP error:** confirm `PROJECT_DASHBOARD_API_URL` is reachable and the `/api/projects`, `/api/tasks` endpoints respond with JSON lists.
- **Database locked:** ensure no other process holds `web.db` open while syncing.
- **Missing fields:** the source schema may have changed — inspect a raw API response and adjust the model/sync mapping.
