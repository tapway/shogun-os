# PLAN — HR Recruitment Workflow (Job Opening → Hired)

Status: **APPROVED-SCOPE, NOT STARTED** (user said "wait" — build only on explicit go)
Branch: `feat/hr-dashboard` · Portal: `shogun-web`

## Goal

Replace the current status-board pipeline with a guided recruitment workflow:
HR creates a job, adds applicants (auto-extracted from resume), runs screening,
schedules interviews, collects decisions, drafts/sends the offer — every step
recorded, with waiting states and reminders.

Notion is the source of the existing data but **will be removed in the future**;
the portal becomes the single source of truth. No sync-protection mechanism is
needed — when Notion is decommissioned, `sync-notion-hr.py` stops running and
portal-owned data simply stays.

## Decisions (locked with user, Aug 2026)

| # | Decision |
|---|----------|
| 1 | Email: **mailto compose** — portal prepares To/Subject/Body from template, click opens the user's default email client (Gmail/Outlook), HR clicks Send. **No SMTP needed, zero config.** Portal logs a `draft_opened` event (cannot confirm Send was clicked) |
| 2 | Screening questions: **one tenant-wide standard PDF** uploaded once by HR, attached to all screening emails |
| 3 | No portal-wins sync protection — Notion will be removed; keep sync as-is until then |
| 4 | Remove candidate = **soft reject** (`Rejected`, reason "No response"), record preserved for audit |
| 5 | Interview reminders delivered via **Telegram** (through the `hr-manager` profile) |
| 6 | Interviewer selection: **Employee Directory picker** with free-text fallback |
| 7 | Visibility: recruitment data is **HR-only** (no employee self-service; admin/HR access only) |
| 8 | Employee accounts (future launch) will be linked to `hr_employees` rows — groundwork column added in Phase 1, but no self-service UI |

## Stage machine (canonical flow)

```
Screening - Pending          resume uploaded → AI auto-fills name/email/phone;
                             date received = upload timestamp
  ↓ (email screening questions — Phase 2; attach standard PDF)
  ⏳ waiting: awaiting screening answers
HR Review                    HR uploads received answers file
  ↓ "Add into Recruitment Pipeline"
Schedule 1st Round of Interview   send scheduling template (Phase 2);
  ⏳ waiting: awaiting candidate confirmation
1st round of interview       candidate confirms → HR enters date/time →
                             interview row created (auto-added to schedule)
  ↓ comment → Continue | Reject
Schedule Manager Interview   send scheduling template (Phase 2)
  ⏳ waiting: awaiting confirmation
Manager Interview            confirmed → enter date/time → schedule row
  ↓ comment → Offer | Reject
Offer Sent                   draft offer letter (salary + start date) →
                             confirm & sign → upload signed copy → email (Phase 2)
  ↓
Hired
```

Manual drag-and-drop between all stages remains available as override.
Invariant: **Schedule stage ⇔ no interview row yet** for that round; creating
the row moves the candidate into the interview stage in one action.

## Data model additions

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `hr_candidate_files` | resume / screening answers / offer letter / other uploads | candidate_id, kind, file_url, filename, uploaded_by, uploaded_at |
| `hr_candidate_events` | workflow history / comments | candidate_id, event_type (stage_move, comment, decision, email, upload, review), note, from_status, to_status, actor_id/name/email, created_at |
| `hr_interviews` | interview schedule | candidate_id, job_id, round (`first`/`manager`), scheduled_at, interviewer_name, interviewer_employee_id (nullable), location/meet_link, status (scheduled/completed/cancelled), reminder_sent_at |
| `hr_employees.user_id` | future account linking (auto-match by email on registration/login) | nullable FK |
| `hr_candidates` | + workflow flags | waiting_since, waiting_reason, removed_reason (soft reject keeps row) |
| `hr_screening_pdf` | tenant-wide standard screening questions doc | single row/file per tenant |

Reuse the existing auth-gated `/api/doc-uploads` serving pattern (ownership
check extended to `hr_candidate_files`).

## Waiting states

- `waiting_since` + `waiting_reason` on the candidate; amber ⏳ chip on cards,
  red when older than threshold (default 14 days, configurable)
- **Waiting panel** at the top of the pipeline tab: waiting candidates sorted
  oldest-first, with actions: Resend (Phase 2), Mark replied, **Remove**
- Remove → status `Rejected`, `removed_reason="No response"`, event logged;
  row retained for audit

## Interview reminders (Telegram)

- `hr_interviews` rows in the next 24–48h → in-app banner in the pipeline tab:
  "N interviews tomorrow — remind candidates & interviewers" with per-row
  Send Reminder buttons (Phase 2 email; Phase 1 shows the banner only)
- Cron on the `hr-manager` profile: daily check of `web.db` for interviews in
  the next 24h → Telegram message to the HR channel + interviewer's Telegram ID
  (users self-register IDs via the existing `/auth/me/platform-id` flow)

## Permissions

- All recruitment tabs/actions: users with HR department access only
  (admin or HR staff) — enforced by existing `require_department_access`
- Interviewers: no portal recruitment access by default (future: view own
  interviews + add comments only — out of scope for v1)

## Phases

### Phase 1 — Flow skeleton (no email)
- New tables + migrations (defensive ALTER pattern in `database.init_db`)
- Resume upload with AI auto-fill (DeepSeek extraction; manual-edit fallback;
  date received = upload timestamp)
- Two Schedule stages added to `STATUS_ORDER` + aliases
- Decision buttons: Continue/Reject after 1st round; Offer/Reject after manager
  round — with mandatory comment (events table)
- Interview schedule: table + confirm-modal (enter date/time + interviewer
  picker from Employee Directory w/ free-text fallback) + Interview Schedule
  tab; confirming creates the row AND advances the stage in one action
- Candidate detail timeline (events render)
- Soft-reject Remove action + waiting-state fields + Waiting panel
- `hr_employees.user_id` column + auto-link by email (groundwork only)
- **Email compose (mailto, zero config)**: template store for HR (screening
  questions, interview schedule ×2, offer), placeholder fill, "Open in email
  app" button per stage, `draft_opened` event logged

### Phase 2 — Email polish (optional, only if SMTP is ever provided)
- Fully automated send from the portal (no user email client) — requires HR
  SMTP credentials; otherwise mailto compose covers everything
- Attachments via SMTP when available; until then standard PDFs are embedded
  as Drive links in the email body (Drive "anyone with link" view) with a
  Download button in the compose modal as manual-attach fallback

### Phase 3 — Reminders + hardening
- In-app reminder banner + Send Reminder buttons
- `hr-manager` Telegram cron for day-before interview reminders
- Age-out policy for stale waiting candidates (configurable)

## Out of scope / future
- Notion removal (separate decommission task once parity confirmed)
- Employee self-service (user said HR-only visibility)
- Vision OCR for scanned/image resumes (manual entry fallback for now)
- Offer salary negotiation workflow (single offer_salary + start_date fields)
