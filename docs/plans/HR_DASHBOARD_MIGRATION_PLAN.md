# HR Dashboard Migration Plan — Notion → ShogunOS

> **Status:** DRAFT — brainstorm + plan, no code amended yet
> **Created:** 2026-08-24
> **Goal:** Replace Notion HR workspace with a full interactive HRMS inside ShogunOS web portal

---

## 1. Current State

### Source: Notion HR Dashboard (8 databases, 625 rows, 74 properties)

| # | Database | Rows | Purpose |
|---|----------|------|---------|
| 1 | Employee Directory | 32 | Master employee list (name, dept, role, manager, hire date, phone, LinkedIn, Q1–Q4 performance, leave taken, relations to Performance Review & Equipment) |
| 2 | Hiring Board | **530** | Candidate pipeline (name, email, phone, role, status, source, resume, screening answers, Hire?/Reject?/HR Review? buttons) |
| 3 | Onboarding task | 44 | New hire onboarding tasks (staff name, dept, start/end date, status, days, assigned to) |
| 4 | Job Openings | 7 | Open positions (title, dept, type, experience, budget, hiring manager, application start, status, formulas: Days Left / Overdue / Deadline) |
| 5 | Performance Review | 2 | Quarterly reviews (rating, level, manager, review date, areas of improvement, action items, attachments) |
| 6 | Equipment Tracker | 2 | Loaned equipment (name, category, condition, assigned to, purchase date, return due, loan document) |
| 7 | Training and Development | 2 | Training programs (name, staff, trainer, format, dates, charges, exam, bond agreement) |
| 8 | Trainer Details | 2 | Trainer vendor records (name, specialization, email, phone, quotation) |

### Target: ShogunOS HR (`hr-manager` profile, port 9101)

| Capability | Status |
|-----------|--------|
| `hr-manager` profile (Jinzai 人材) | ✅ Exists |
| Staff directory sync (BrioHR) | ✅ `briohr_sync.py`, `recipes/hr/staff-directory/` |
| Staff CRUD UI (basic list/add/CSV) | ✅ `StaffManagement.tsx` |
| Time tracking (Jibble) | ✅ `recipes/hr/time-tracking/` |
| **HR Dashboard (visual)** | ❌ **Missing — `components/dashboards/` has finance/procurement/crm/plantation, NO HR** |
| Recruitment pipeline UI | ❌ Missing |
| Onboarding tracker UI | ❌ Missing |
| Leave/performance/equipment/training trackers | ❌ Missing |
| Notion as data source | ❌ No bridge exists |

---

## 2. Notion Formulas (Reverse-Engineered — to replicate EXACTLY)

The Notion API doesn't expose formula *expressions* for legacy/templated databases. I reverse-engineered them by sampling computed values across rows and testing logic:

### Formula 1: Job Openings — `Deadline` (date)
```
Deadline = Application Start + 90 days
```
**Verified:** App Start `2026-01-12` + 90d = `2026-04-12` ✓ (matches Notion's returned value)
Returns null when Application Start is empty (rows 2–7 with status "Not Initiated").

### Formula 2: Job Openings — `Days Left` (number)
```
Days Left = Deadline - today()  (in days)
```
**Verified:** `2026-04-12` − `2026-08-24` = −134 ✓ (matches Notion)
Returns null when Deadline is null (i.e., when Application Start is empty).

### Formula 3: Job Openings — `Overdue` (string)
```
Overdue = if(Days Left < 0, "Overdue", null)
```
**Verified:** Days Left = −134 < 0 → `"Overdue"` ✓

### Formula 4: Onboarding task — `Task Status` (string, emoji)
```
Task Status = switch(Status,
  "In progress", "🟡 Task Ongoing",
  "Done", "✅ Task Completed",
  "Not started", "⚪ Not Started")
```
**Verified:** `In progress` → `🟡 Task Ongoing` ✓; `Done` → `✅ Task Completed` ✓

### Formula 5: Employee Directory — `No. of Years` (number)
```
No. of Years = year(Date of Hire) - year(today())
```
**Verified:** All 8 sample rows match exactly.
⚠️ This formula has a quirk: it returns `0` for current-year hires and `-1` for prior-year hires (it measures calendar-year difference, not tenure). User confirmed: **replicate exactly as Notion** — we will reproduce this behavior, not "fix" it.

---

## 3. Industry Research — Modern HR Dashboard Patterns

Studied: BambooHR, Personio, Workable, BrioHR. Common modules:

| Module | What it does | ShogunOS mapping |
|--------|-------------|------------------|
| **Employee Directory / Org Chart** | People records, org hierarchy, profile cards | Directory tab → Employee Directory DB |
| **Recruitment / ATS** | Job openings + candidate pipeline (kanban by stage) | Recruitment tab → Job Openings + Hiring Board DBs |
| **Onboarding** | Task checklists, progress tracking, new hire portal | Onboarding tab → Onboarding task DB |
| **Time Off / Leave** | Leave requests, balances, calendar view | Leave tab → Leave Tracker (synced block from Leave Tracker page) |
| **Performance** | Reviews, ratings, 360°, goals | Performance tab → Performance Review DB |
| **Equipment / Assets** | Asset assignment, return tracking | Equipment tab → Equipment Tracker DB |
| **Training / L&D** | Training programs, trainer management, bonds | Training tab → Training + Trainer Details DBs |

**UI patterns observed:**
- KPI cards (3–6 per overview) with big numbers + trend indicators
- Kanban board for recruitment pipeline (columns by Status)
- Data tables with inline status chips, filter/search, row-click detail modal
- Progress bars for onboarding completion
- Tabbed sub-navigation (pills, same as ShogunOS `DashboardSubNav`)
- Org chart visualization (BambooHR) / department breakdown charts (Personio)

---

## 4. Design Language — Match Existing ShogunOS Dashboards

Studied `finance/`, `procurement/`, `crm/` dashboards. Design tokens:

| Token | Value (dark theme) | (light theme) |
|-------|-------------------|---------------|
| `--samurai-bg` | `#070b14` | `#f4f7fc` |
| `--samurai-surface` | `#0e1424` | `#ffffff` |
| `--samurai-surface-2` | `#151c2e` | `#f8fbff` |
| `--samurai-border` | `#243047` | `#d6dfeb` |
| `--samurai-text` | `#ffffff` | `#1a2e52` |
| `--samurai-muted` | `#a8a8a8` | `#5a6c88` |
| `--samurai-lime` | `#ceef7d` | `#32b25c` |
| `--samurai-ok` | `#86efac` | — |
| `--samurai-warning` | `#fbbf24` | — |
| `--samurai-danger` | `#f87171` | — |

**Component patterns to reuse:**
- `DashboardSubNav` — pill tabs (already exists)
- `sd-kpi-grid` / `sd-kpi-card` — KPI cards
- `sd-chart-card` — chart containers
- `sd-stack` — vertical layout
- `sd-empty` — loading/empty states
- Charts: `BarChart`, `LineChart`, `PieChart`, `FunnelChart`, `ComboChart` (all exist in `dashboards/charts/`)
- Action modal pattern: `ProcurementActionModal` — modal that sends instructions to Hermes gateway via chat socket
- `useQuery` with 120s refetch for stats

**HR dashboard component contract** (same as others):
```tsx
interface Props { department: string; color: string }
// Register in DashboardViewer's DASHBOARD_COMPONENTS map:
//   hr: HrDashboard,
```

---

## 5. Architecture — 3 Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: gbrain hr/ source (knowledge)                  │
│ - Employee profiles as brain pages (markdown)           │
│ - HR policies, SOPs, handbook                           │
│ - Jinzai references these in chat                      │
│ - Federated read of shared/ (staff directory)           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Layer 2: SQLite tables (structured data)                │
│ - hr_employees, hr_job_openings, hr_candidates          │
│ - hr_onboarding_tasks, hr_leave_balances                │
│ - hr_performance_reviews, hr_equipment, hr_training     │
│ - hr_trainers                                          │
│ - Synced from Notion via notion-hr-bridge skill         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Web portal dashboard UI (visual)               │
│ - components/dashboards/hr/HrDashboard.tsx               │
│ - 8 tabs mirroring Notion layout                        │
│ - Interactive: kanban, approve/reject, CRUD, charts     │
│ - Action modal → Hermes gateway → writes back           │
└─────────────────────────────────────────────────────────┘
```

### Notion Bridge Sync Flow (during parallel period)
```
Notion API → notion-hr-bridge skill (cron every 2h)
  → Pull all 8 databases via data_sources/{id}/query
  → Upsert into SQLite tables
  → Download file attachments (profile pics, employee files, loan docs) to local storage
  → Write employee profiles to gbrain hr/ source as brain pages
  → Compute formulas (Deadline, Days Left, Overdue, Task Status, No. of Years) in Python
```

---

## 6. Database Schema (SQLite) — Maps Notion 1:1

### `hr_employees` (Employee Directory — 32 rows)
| Column | Type | Source property |
|--------|------|----------------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | Notion page ID |
| employees_name | TEXT | Employees Name (people → name) |
| department | TEXT | Department (select) |
| role | TEXT | Role (select) |
| manager_id | INTEGER FK→hr_employees | Manager (people → id) |
| date_of_hire | DATE | Date of Hire |
| phone_number | TEXT | Phone Number |
| linkedin_profile | URL | LinkedIn Profile |
| profile_picture_path | TEXT | Profile Picture (file → local path) |
| employee_file_path | TEXT | Employee File (file → local path) |
| q1 | TEXT | Q1 (select) |
| q2 | TEXT | Q2 (select) |
| q3 | TEXT | Q3 (select) |
| q4 | TEXT | Q4 (select) |
| no_of_years | INTEGER GENERATED | **FORMULA**: year(date_of_hire) - year(today()) |
| leave_taken | TEXT | Leave Taken (title) |
| created_at | TIMESTAMP | auto |
| updated_at | TIMESTAMP | auto |

### `hr_job_openings` (Job Openings — 7 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| job_title | TEXT | Job Title (title) |
| job_status | TEXT | Job Status (status) |
| department | TEXT | Department (multi_select) |
| employment_type | TEXT | Employment Type (select) |
| experience | TEXT | Experience (select) |
| budget_max | REAL | Budget (Max) (number) |
| hiring_manager | TEXT | Hiring Manager (people → name) |
| application_start | DATE | Application Start (date) |
| job_description | TEXT | Job Description (rich_text) |
| deadline | DATE GENERATED | **FORMULA**: application_start + 90 days |
| days_left | INTEGER GENERATED | **FORMULA**: deadline - today() |
| overdue | TEXT GENERATED | **FORMULA**: if(days_left < 0, "Overdue", null) |

### `hr_candidates` (Hiring Board — 530 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| name | TEXT | Name (title) |
| email | TEXT | Email |
| phone_no | TEXT | Phone No. |
| role | TEXT | Role (select) |
| status | TEXT | Status (select) |
| source | TEXT | Source (select) |
| resume_url | TEXT | Resume (url) |
| screening_answers_url | TEXT | Screening Answers (url) |
| date_entry | TIMESTAMP | Date Entry (created_time) |
| last_edited | TIMESTAMP | Last Edited (last_edited_time) |

### `hr_onboarding_tasks` (Onboarding task — 44 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| staff_name | TEXT | Staff Name (title) |
| department | TEXT | Department (select) |
| start_date | DATE | Start Date |
| end_date | DATE | End Date |
| status | TEXT | Status (status) |
| days | INTEGER | Days (number) |
| assigned_to | TEXT | Assigned to Employee (people → name) |
| task_status | TEXT GENERATED | **FORMULA**: switch(status, "In progress"→"🟡 Task Ongoing", "Done"→"✅ Task Completed", "Not started"→"⚪ Not Started") |

### `hr_performance_reviews` (Performance Review — 2 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| quarterly_performance | TEXT | Quarterly performance (title) |
| employee_id | INTEGER FK→hr_employees | Employee Name from Directory (relation) |
| department | TEXT | Department (select) |
| performance_rating | TEXT | Performance Rating (select) |
| performance_level | TEXT | Performance Level (select) |
| manager_id | INTEGER FK→hr_employees | Manager (relation) |
| review_date | DATE | Review Date |
| areas_of_improvement | TEXT | Areas of Improvement (rich_text) |
| action_items | TEXT | Action Items/Next goals (multi_select) |
| attachments_path | TEXT | Attachments (files → local) |

### `hr_equipment` (Equipment Tracker — 2 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| equipment_name | TEXT | Equipment name (title) |
| category | TEXT | Category (multi_select) |
| condition | TEXT | Condition (select) |
| assigned_to | TEXT | Assigned to (rich_text) |
| purchase_date | DATE | Purchase Date |
| return_due_date | DATE | Return Due date |
| loan_document_path | TEXT | Loan Document (files → local) |

### `hr_training` (Training and Development — 2 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| training_name | TEXT | Training name (title) |
| staff_name | TEXT | Staff Name (people → name) |
| trainer_id | INTEGER FK→hr_trainers | Trainer Details (relation) |
| training_format | TEXT | Training Format (select) |
| start_date | DATE | Start Date |
| end_date | DATE | Training End Date |
| training_charges | REAL | Training Charges (number) |
| exam_included | BOOLEAN | Exam Included (checkbox) |
| bond_agreement | BOOLEAN | Bond Agreement (checkbox) |
| feedback_form_url | TEXT | Feedback Form URL |

### `hr_trainers` (Trainer Details — 2 rows)
| Column | Type | Source |
|--------|------|--------|
| id | INTEGER PK | auto |
| notion_page_id | TEXT UNIQUE | — |
| name | TEXT | Name (title) |
| specialization | TEXT | Specialization (multi_select) |
| contact_email | TEXT | Contact Email |
| phone_number | TEXT | Phone Number |
| trainer_pic | TEXT | Trainer Pic (rich_text) |
| trainer_quotation_path | TEXT | Trainer Quotation (files → local) |

### `hr_leave_balances` (from Leave Tracker page — synced block)
> The Leave Tracker sub-page contains a synced_block reference. Need to extract the actual leave database from that page during implementation. The Employee Directory has a `Leave Taken` field and Q1–Q4 (likely leave quarters). The Leave Tracker page likely has a dedicated leave database.

---

## 7. UI Design — HR Dashboard (8 Tabs)

Register `hr: HrDashboard` in `DashboardViewer.tsx`'s `DASHBOARD_COMPONENTS` map.

### Tab 1: Overview (HR Pulse)
- KPI cards: Total Employees (32), Open Positions (7), Active Candidates (530), Onboarding In Progress, Pending Reviews, Equipment On Loan, Upcoming Trainings
- Charts: Headcount by Department (bar), Hiring Pipeline Funnel (funnel chart), Onboarding Completion (progress bars), Monthly Hire Trend (line)
- Status chips: overdue jobs (red), in-progress onboarding (yellow), completed (green)

### Tab 2: Employee Directory
- Searchable/filterable table: Name, Department, Role, Manager, Date of Hire, No. of Years (formula), Q1–Q4
- Row click → employee detail modal: full profile, picture, LinkedIn, performance history, equipment assigned, leave taken
- Department filter pills
- Org chart view toggle (tree by manager_id)

### Tab 3: Job Openings
- Table: Job Title, Department, Employment Type, Experience, Budget, Hiring Manager, Application Start, Job Status
- Computed columns: Deadline (formula), Days Left (formula), Overdue (formula)
- Status chips: Not Initiated / Test Ongoing / etc.
- Overdue rows highlighted red
- "Create Job Opening" button → action modal

### Tab 4: Recruitment Pipeline (Hiring Board — 530 rows)
- **Kanban board** (columns by Status): New / Screened / Interview / Test / Offer / Hired / Rejected
- Each card: Name, Role, Source, Resume link
- Drag to change status (or button click)
- Filter by Role, Source
- Search by name/email
- Card click → candidate detail modal with Hire?/Reject?/HR Review? action buttons (like procurement action modal)
- Funnel chart at top showing counts per stage

### Tab 5: Onboarding
- Table: Staff Name, Department, Start Date, End Date, Days, Assigned to, Status
- Task Status (formula): 🟡 Task Ongoing / ✅ Task Completed / ⚪ Not Started
- Progress bar: completed vs in-progress vs not-started
- Row click → onboarding checklist detail

### Tab 6: Leave Tracker
- Quarterly leave table (Q1–Q4 from Employee Directory)
- Leave balance per employee
- Leave calendar view (who's on leave when)
- (Depends on discovering the actual Leave Tracker database structure — TBD in implementation)

### Tab 7: Performance Reviews
- Table: Employee, Department, Rating, Level, Review Date, Manager
- Rating distribution chart (bar)
- Row click → review detail modal: areas of improvement, action items, attachments

### Tab 8: Equipment Tracker
- Table: Equipment Name, Category, Condition, Assigned To, Purchase Date, Return Due
- Category filter (Windows, etc.)
- Condition chips (Pre-loved, New, etc.)
- Overdue returns highlighted

### Tab 9: Training & Development
- Split view: Training list + Trainer list
- Training: Name, Staff, Format, Start/End, Charges, Exam, Bond
- Trainer: Name, Specialization, Email, Phone
- Training charges total (sum)

---

## 8. Implementation Phases

### Phase 1: Notion Bridge + Data Sync (~2 hrs)
**Goal:** Get all 8 databases into SQLite + gbrain, verify formulas match.

1. Create `notion-hr-bridge` skill under `skills/hr/`
2. Script `scripts/sync-notion-hr.py`:
   - Reads `NOTION_API_KEY` from env
   - Queries all 8 data_sources
   - Downloads file attachments to `~/.shogun-os/hr-assets/`
   - Upserts into SQLite tables (new tables in `shogun-web/server/models.py`)
   - Computes formula columns in Python (matching Notion exactly)
   - Writes employee profiles to gbrain `hr/` source
3. Cron job: every 2 hours during parallel period
4. **Verify:** formula values match Notion exactly (Deadline, Days Left, Overdue, Task Status, No. of Years)

### Phase 2: Dashboard UI (~1-2 days)
**Goal:** Build the HR dashboard with all 8-9 tabs.

1. Create `shogun-web/ui/src/components/dashboards/hr/` directory
2. Build `HrDashboard.tsx` (main shell + tab state, same pattern as `ProcurementDashboard.tsx`)
3. Build tab components:
   - `OverviewTab.tsx` (KPIs + charts)
   - `EmployeeDirectoryTab.tsx` (table + detail modal)
   - `JobOpeningsTab.tsx` (table with formula columns)
   - `RecruitmentPipelineTab.tsx` (kanban board — most complex)
   - `OnboardingTab.tsx` (table + progress bars)
   - `LeaveTrackerTab.tsx`
   - `PerformanceTab.tsx`
   - `EquipmentTab.tsx`
   - `TrainingTab.tsx`
4. Build `HrActionModal.tsx` (action modal — approve/reject candidates, etc.)
5. Register `hr: HrDashboard` in `DashboardViewer.tsx`
6. Add HR dashboard config endpoint in `shogun-web/server/dashboard.py`
7. Add types to `shogun-web/ui/src/lib/types.ts`
8. Add API methods to `shogun-web/ui/src/lib/api.ts`

### Phase 3: Interactive Actions (~2-3 days)
**Goal:** Make it a full HRMS — Jinzai can take actions.

1. Candidate actions: Move stage, Hire, Reject, HR Review (via action modal → Hermes gateway)
2. Onboarding task CRUD: Create, update status, assign
3. Job opening CRUD: Create, update status, set application start
4. Leave approval workflow (if leave database is discovered)
5. Equipment assignment/return
6. Performance review creation
7. Training program CRUD
8. Two-way sync: actions in ShogunOS write back to Notion (during parallel period)

### Phase 4: Notion Decommission (~1 day)
**Goal:** Remove Notion dependency.

1. Final sync verification — all data in SQLite
2. Disable Notion bridge cron
3. Switch all actions to write-only to SQLite
4. Archive Notion workspace (read-only)
5. Rotate Notion API key

---

## 9. Priority Order (suggested)

1. **Employee Directory** — foundation, all relations point here
2. **Job Openings** — small (7 rows), includes formulas to verify
3. **Onboarding task** — small (44 rows), has Task Status formula
4. **Hiring Board** — biggest (530 rows), most operational, highest value
5. **Performance Review** — small (2 rows)
6. **Equipment Tracker** — small (2 rows)
7. **Training and Development** + **Trainer Details** — paired (2+2 rows)
8. **Leave Tracker** — needs structure discovery first

---

## 10. Open Questions (need your input before building)

1. **Leave Tracker structure**: The Leave Tracker sub-page has a synced_block. I need to explore it further to find the actual leave database. OK to do this during implementation?

2. **Formula bug**: The `No. of Years` formula returns `-1` for employees hired in 2025 (it's `year(hire) - year(today)`, which goes negative). You said "use back exactly same as Notion" — confirmed you want the negative values too, not a corrected tenure calculation?

3. **File attachments**: Profile pictures, employee files, loan documents, trainer quotations are hosted on Notion's S3 (URLs expire in 1 hour). The bridge will download them to `~/.shogun-os/hr-assets/`. Where should these live long-term? (gbrain media? local disk? S3?)

4. **Two-way sync**: During the parallel period, when someone acts in ShogunOS (e.g., moves a candidate to "Hired"), should we write that change back to Notion? Or is Notion read-only-source and ShogunOS is the new source of truth from day 1?

5. **Recruitment kanban Status values**: I saw statuses like `Test Ongoing` (Job Openings) and various Status values on Hiring Board. I need to pull the full list of Status options for the kanban columns. OK to do this during implementation?

6. **gbrain hr/ source**: Does this source already exist on your GBrain instance, or do I need to create it?
