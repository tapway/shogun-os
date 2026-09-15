# Facility Management Dashboard Rebuild Plan

**Date:** 2026-09-12
**Department:** Facility Management (Eizen 営繕)
**Profile:** `facility-manager` · Port 9111 · Plantation industry
**Branch:** demo (SQLite mock data)

---

## Goal

Rebuild the Facility Management dashboard from a 4-tab inspection-only tool into a **full facility operations platform** with overview KPIs, work order management, preventive maintenance scheduling, enriched unit management, and the existing inspection + legal doc scanning features preserved and improved.

---

## Current State

### What exists
| Component | Files | Status |
|-----------|-------|--------|
| Unit Registration | `UnitRegistrationTab.tsx` | Basic CRUD (site/block/unit/capacity/type) |
| Daily Inspection | `DailyInspectionTab.tsx` | Photo upload → AI assess (furniture/cleanliness/condition) → save |
| Inspection Records | `InspectionRecordsTab.tsx` | Filter by unit/date, view per-photo breakdown, lightbox |
| Legal Doc Scanning | `EstateLegalScanTab.tsx` | Upload PDF/image → OCR → AI interpretation |
| Dashboard shell | `PlantationDashboard.tsx` | 4-tab nav, no overview |
| Backend models | `models.py:617-866` | `SiteInspectionUnit`, `SiteInspection`, `ScannedDocument` |
| Backend routes | `dashboard.py:1620-2500` | CRUD units, assess, save/list inspections, scan docs |
| Skills | `skills/facilities/quarters-inspection/` | Scripts only (assess_media_prompt, build_report, validate_*) |
| Dashboard meta | `dashboard.py:643-651` | 4 tabs registered |

### What's missing
- ❌ No Overview / KPI landing tab
- ❌ No Work Order management (inspect → fix loop broken)
- ❌ No Preventive Maintenance schedule
- ❌ Unit cards show no inspection status
- ❌ No trend charts or analytics
- ❌ No export / reporting
- ❌ No occupancy tracking
- ❌ No contractor assignment
- ❌ No grouped sub-navigation (HR pattern)

---

## Proposed Tab Structure

Follow HR's grouped sub-nav pattern (`DashboardSubNav` + second-level tabs):

```
┌─────────────────────────────────────────────────────┐
│  [Overview]  [Units & Assets]  [Work Orders]  [Docs] │  ← top groups
├─────────────────────────────────────────────────────┤
│                                                     │
│  Overview group:                                    │
│    • KPI cards (units, inspections, open WOs,       │
│      hazards, overdue PM)                           │
│    • Rating trend chart (last 12 months)            │
│    • Site comparison bar chart                      │
│    • Recent activity feed                           │
│    • Hazard Pareto chart                            │
│                                                     │
│  Units & Assets group:                              │
│    • Unit Directory (enriched cards with last       │
│      rating, days since inspection, open WOs)       │
│    • Unit Registration (existing CRUD, enhanced)    │
│    • Occupancy Tracker (capacity vs assigned)       │
│                                                     │
│  Work Orders group:                                 │
│    • Work Order Board (kanban: Open→Assigned→       │
│      In Progress→Completed→Verified)                │
│    • Work Order List (filterable table)             │
│    • PM Schedule (calendar + recurring templates)   │
│                                                     │
│  Docs group:                                        │
│    • Daily Inspection (existing, enhanced)          │
│    • Inspection Records (existing, enhanced)        │
│    • Legal Doc Scanning (existing)                  │
│    • Reports & Export                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab definitions for `dashboard.py` meta

```python
"facility": {
    "enabled": True,
    "tabs": [
        {"id": "overview", "label": "Overview", "icon": "LayoutDashboard"},
        {"id": "units", "label": "Units & Assets", "icon": "Home"},
        {"id": "workorders", "label": "Work Orders", "icon": "Wrench"},
        {"id": "docs", "label": "Documents", "icon": "FileText"},
    ],
},
```

Second-level tabs defined in frontend (like HR's `EMPLOYEE_TABS` / `RECRUITMENT_TABS` pattern).

---

## New Data Models

### 1. `WorkOrder` (new table)

```python
class WorkOrder(Base):
    __tablename__ = "work_orders"

    id              # PK
    tenant_id       # FK tenants
    unit_id         # FK site_inspection_units (nullable — some WOs are general)
    inspection_id   # FK site_inspections (nullable — manual WOs don't link)
    title           # String(256) — e.g. "Replace broken window latch"
    description     # Text
    category        # String(64) — electrical, plumbing, structural, furniture, safety, cleaning
    priority        # String(32) — low, medium, high, urgent
    status          # String(32) — open, assigned, in_progress, completed, verified, cancelled
    assigned_to     # String(256) — contractor name or staff name
    estimated_cost  # Float (nullable)
    actual_cost     # Float (nullable)
    due_date        # DateTime (nullable)
    completed_at    # DateTime (nullable)
    verified_by     # String(256) (nullable)
    created_by      # String(256)
    created_at      # DateTime
    updated_at      # DateTime
```

### 2. `PMSchedule` (new table — Preventive Maintenance)

```python
class PMSchedule(Base):
    __tablename__ = "pm_schedules"

    id              # PK
    tenant_id       # FK tenants
    unit_id         # FK site_inspection_units (nullable — site-wide PMs)
    template_name   # String(256) — e.g. "Monthly Quarter Inspection"
    frequency       # String(32) — weekly, monthly, quarterly, biannual, annual
    next_due        # DateTime
    last_completed  # DateTime (nullable)
    assigned_to     # String(256) (nullable)
    is_active       # Boolean default True
    created_at      # DateTime
```

### 3. `UnitOccupancy` (new table)

```python
class UnitOccupancy(Base):
    __tablename__ = "unit_occupancy"

    id              # PK
    tenant_id       # FK tenants
    unit_id         # FK site_inspection_units
    occupant_name   # String(256)
    employee_id     # String(64) (nullable — link to HR)
    check_in        # DateTime
    check_out       # DateTime (nullable)
    notes           # Text (nullable)
```

### 4. Enhance `SiteInspectionUnit`

Add columns:
- `last_inspection_date` (DateTime, nullable) — denormalized for fast queries
- `last_overall_rating` (String(64), nullable) — denormalized
- `open_work_orders` (Integer, default 0) — denormalized counter
- `notes` (Text, nullable) — free-form unit notes

These are updated via triggers/hooks when inspections/WOs are saved.

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Models + API)

| # | Task | Files | Est. |
|---|------|-------|------|
| 1.1 | Add `WorkOrder`, `PMSchedule`, `UnitOccupancy` models to `models.py` | `server/models.py` | 30min |
| 1.2 | Add new columns to `SiteInspectionUnit` | `server/models.py` | 10min |
| 1.3 | Run Alembic migration (or add to seed script for demo branch) | `server/migrations/` or `scripts/` | 20min |
| 1.4 | Work Order CRUD endpoints (create, list, update status, delete) | `server/dashboard.py` | 45min |
| 1.5 | PM Schedule CRUD endpoints | `server/dashboard.py` | 30min |
| 1.6 | Unit Occupancy CRUD endpoints | `server/dashboard.py` | 20min |
| 1.7 | Overview stats aggregation endpoint (`/api/departments/facility/dashboard/stats`) | `server/dashboard.py` | 45min |
| 1.8 | Update `save_inspection()` to update unit denormalized fields | `server/dashboard.py` | 15min |
| 1.9 | Seed demo data for WOs, PM schedules, occupancy | `scripts/seed_facility_demo_data.py` | 30min |

### Phase 2: Frontend Shell + Overview

| # | Task | Files | Est. |
|---|------|-------|------|
| 2.1 | Create `FacilityDashboard.tsx` with grouped sub-nav (replace `PlantationDashboard.tsx`) | `plantation/FacilityDashboard.tsx` | 30min |
| 2.2 | Update `DashboardViewer.tsx` mapping: `facility` → `FacilityDashboard` | `DashboardViewer.tsx` | 5min |
| 2.3 | Update `dashboard.py` meta tabs for facility | `server/dashboard.py:643-651` | 5min |
| 2.4 | Build `OverviewTab.tsx` — KPI cards, rating trend, site comparison, hazard Pareto, activity feed | `plantation/OverviewTab.tsx` | 2h |
| 2.5 | Add facility stats type to `types.ts` | `lib/types.ts` | 10min |
| 2.6 | Add facility API functions to `api.ts` | `lib/api.ts` | 20min |

### Phase 3: Enhanced Units & Assets

| # | Task | Files | Est. |
|---|------|-------|------|
| 3.1 | Build `UnitDirectoryTab.tsx` — enriched cards with last rating badge, days since inspection, open WO count, click → history | `plantation/UnitDirectoryTab.tsx` | 1.5h |
| 3.2 | Enhance `UnitRegistrationTab.tsx` — add notes field, edit capability (currently create/delete only) | `plantation/UnitRegistrationTab.tsx` | 30min |
| 3.3 | Build `OccupancyTrackerTab.tsx` — capacity vs occupied, check-in/out form, utilization % | `plantation/OccupancyTrackerTab.tsx` | 1.5h |

### Phase 4: Work Orders

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.1 | Build `WorkOrderBoardTab.tsx` — kanban board with drag-drop columns (Open → Assigned → In Progress → Completed → Verified) | `plantation/WorkOrderBoardTab.tsx` | 3h |
| 4.2 | Build `WorkOrderListTab.tsx` — filterable table with status/priority/category filters, inline status change | `plantation/WorkOrderListTab.tsx` | 1.5h |
| 4.3 | Build `PMScheduleTab.tsx` — calendar view of upcoming PMs, create/edit recurring templates, mark complete | `plantation/PMScheduleTab.tsx` | 2h |
| 4.4 | Add "Create Work Order" button to `DailyInspectionTab.tsx` results modal | `plantation/DailyInspectionTab.tsx` | 30min |
| 4.5 | Add "Create Work Order" button to `InspectionRecordsTab.tsx` detail modal | `plantation/InspectionRecordsTab.tsx` | 20min |

### Phase 5: Documents & Reporting

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.1 | Move existing tabs into Docs group (DailyInspection, InspectionRecords, EstateLegalScan) | `FacilityDashboard.tsx` | 15min |
| 5.2 | Build `ReportsTab.tsx` — monthly summary, export CSV, print-friendly view | `plantation/ReportsTab.tsx` | 1.5h |
| 5.3 | Add backend export endpoint (`/api/departments/facility/dashboard/export`) | `server/dashboard.py` | 30min |

### Phase 6: Polish + Verification

| # | Task | Files | Est. |
|---|------|-------|------|
| 6.1 | TypeScript compile check (`tsc --noEmit`) | — | 10min |
| 6.2 | Python syntax check on all modified .py files | — | 5min |
| 6.3 | Visual review — run dev server, screenshot each tab | — | 30min |
| 6.4 | Test work order lifecycle end-to-end | — | 20min |
| 6.5 | Test PM schedule creation + completion flow | — | 15min |
| 6.6 | Verify overview KPIs match actual data | — | 15min |

---

## Files Changed Summary

### New files (frontend)
- `shogun-web/ui/src/components/dashboards/plantation/FacilityDashboard.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/OverviewTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/UnitDirectoryTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/OccupancyTrackerTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/WorkOrderBoardTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/WorkOrderListTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/PMScheduleTab.tsx`
- `shogun-web/ui/src/components/dashboards/plantation/ReportsTab.tsx`

### Modified files (frontend)
- `shogun-web/ui/src/components/dashboards/DashboardViewer.tsx` — update import
- `shogun-web/ui/src/components/dashboards/plantation/UnitRegistrationTab.tsx` — add edit + notes
- `shogun-web/ui/src/components/dashboards/plantation/DailyInspectionTab.tsx` — add WO creation
- `shogun-web/ui/src/components/dashboards/plantation/InspectionRecordsTab.tsx` — add WO creation
- `shogun-web/ui/src/lib/types.ts` — add Facility types
- `shogun-web/ui/src/lib/api.ts` — add Facility API functions

### Modified files (backend)
- `shogun-web/server/models.py` — 3 new models + unit enhancements
- `shogun-web/server/dashboard.py` — new endpoints + meta tabs + stats aggregation

### New files (backend/scripts)
- `scripts/seed_facility_demo_data.py` — demo data seeder

### Deleted files
- `shogun-web/ui/src/components/dashboards/plantation/PlantationDashboard.tsx` — replaced by `FacilityDashboard.tsx`

---

## Design Decisions

1. **Grouped sub-nav** (HR pattern) over flat tabs — 4 top groups × 2-3 sub-tabs each keeps navigation clean as features grow
2. **Kanban for work orders** — facility managers think in workflow stages, not tables; but also provide list view for bulk operations
3. **Denormalized unit fields** — `last_inspection_date`, `last_overall_rating`, `open_work_orders` on the unit model avoids N+1 queries on the directory/overview
4. **PM Schedule as separate table** — not just cron jobs; needs UI management, completion tracking, and history
5. **Demo-first** — all new features get mock data via seed script before gbrain integration
6. **No hardcoded colors** — all styling uses `--samurai-*` CSS vars per user preference
7. **Interactive by default** — every KPI card navigates to its source tab, every unit card opens history, every WO card opens detail

---

## Risks & Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Kanban drag-drop adds complexity | Use simple click-to-move-status buttons first, drag-drop as enhancement |
| Denormalized fields can go stale | Update in same transaction as inspection/WO save; add recompute endpoint |
| Too many tabs overwhelms | Grouped nav hides complexity; Overview is always the landing |
| PM schedule without cron integration is manual | Phase 1 is UI-only; cron auto-generation is future work |
| Occupancy without HR link is isolated | Employee ID field is optional; HR integration is future enhancement |

---

## Open Questions

1. Should work orders have photo attachments? (Probably yes — reuse existing upload infra)
2. Should PM completion auto-create an inspection record? (Or just mark PM done?)
3. Do we need contractor/vendor master data, or just free-text `assigned_to`?
4. Should the Overview tab show real-time alerts (e.g., "3 units overdue for inspection") as dismissible banners?

---

## Estimated Total Effort

| Phase | Time |
|-------|------|
| Phase 1: Foundation | ~3.5h |
| Phase 2: Shell + Overview | ~3.5h |
| Phase 3: Units & Assets | ~3.5h |
| Phase 4: Work Orders | ~7.5h |
| Phase 5: Docs & Reporting | ~2.5h |
| Phase 6: Polish | ~1.5h |
| **Total** | **~22h** |

Recommended execution order: Phase 1 → 2 → 3 → 4 → 5 → 6, with visual review checkpoint after Phase 2 (shell + overview) before continuing.
