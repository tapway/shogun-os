# Facility Management Dashboard Rebuild — Detailed Tab Plan

**Date:** 2026-09-13
**Focus:** AI-powered universal visual compliance inspector
**Core loop:** Register location → Upload photos → AI inspects against type-specific checklist → Compliance report + action items

---

## Architecture Overview

### Navigation Structure (HR grouped sub-nav pattern)

```
Top-level groups (DashboardSubNav):
  [Overview]  [Locations]  [Inspect]  [Reports]  [Settings]

No second-level tabs needed — each group is one focused view.
```

### Data Models

```
FacilityLocation          ← replaces SiteInspectionUnit
  id, tenant_id
  name                    ← "Factory A - Line 1", "Block 3 Unit 12 Kitchen"
  location_type           ← factory_floor, hostel, canteen, toilet, warehouse, workshop, parking, construction, office, clinic
  site_name               ← estate/site grouping (nullable)
  area_sqm                ← optional
  responsible_person      ← optional
  inspection_frequency    ← daily, weekly, monthly, quarterly (default: monthly)
  last_inspection_date    ← denormalized
  last_overall_score      ← denormalized (0-100)
  last_overall_rating     ← denormalized (Excellent/Good/Moderate/Poor/Critical)
  status                  ← active, inactive
  notes                   ← free text
  created_at, updated_at

FacilityInspection        ← replaces SiteInspection
  id, tenant_id
  location_id             ← FK FacilityLocation
  inspected_by
  inspection_date
  photos[]                ← JSON [{filename, url, path, room_label}]
  location_type_snapshot  ← frozen at inspection time
  scores                  ← JSON {cleanliness: {score, rating}, assets: {score, rating}, safety: {score, rating}, ppe: {score, rating}, hygiene: {score, rating}}
  overall_score           ← 0-100
  overall_rating          ← Excellent/Good/Moderate/Poor/Critical
  checklist_results[]     ← JSON [{item, pass, evidence, critical, category}]
  action_items[]          ← JSON [{priority, category, description, photo_ref, status}]
  ai_raw_response         ← full LLM response for debugging
  created_at

FacilityActionItem        ← new table for tracking resolution
  id, tenant_id
  inspection_id           ← FK FacilityInspection
  location_id             ← FK FacilityLocation
  priority                ← urgent, high, medium, low
  category                ← safety, cleanliness, assets, ppe, hygiene
  description
  photo_ref               ← which photo showed this issue
  status                  ← open, in_progress, resolved, dismissed
  assigned_to             ← person name (optional)
  resolved_at             ← nullable
  resolved_by             ← nullable
  created_at

FacilityTemplate          ← inspection profile per location type
  id, tenant_id
  location_type           ← unique per tenant+type
  display_name
  scoring_weights         ← JSON {cleanliness: 0.2, assets: 0.15, safety: 0.35, ppe: 0.3}
  checklist               ← JSON [{category, item, critical, applies_when}]
  expected_assets         ← JSON [string]
  min_photos              ← int
  photo_guidance          ← string
  is_system_default       ← boolean (seed defaults, user can override)
  created_at, updated_at
```

### Backend API Endpoints

```
# Locations
GET    /api/departments/facility/dashboard/locations
POST   /api/departments/facility/dashboard/locations
PUT    /api/departments/facility/dashboard/locations/{id}
DELETE /api/departments/facility/dashboard/locations/{id}

# Inspections
POST   /api/departments/facility/dashboard/locations/{id}/assess    ← upload photos + AI
POST   /api/departments/facility/dashboard/locations/{id}/inspections  ← save confirmed
GET    /api/departments/facility/dashboard/inspections              ← list all (filterable)
GET    /api/departments/facility/dashboard/locations/{id}/inspections ← per-location history

# Action Items
GET    /api/departments/facility/dashboard/action-items             ← list (filterable)
PATCH  /api/departments/facility/dashboard/action-items/{id}        ← update status

# Stats / Overview
GET    /api/departments/facility/dashboard/stats                    ← aggregated KPIs

# Templates
GET    /api/departments/facility/dashboard/templates
PUT    /api/departments/facility/dashboard/templates/{location_type}

# Export
GET    /api/departments/facility/dashboard/export?type=csv|pdf&...

# Document Scanning (existing, reused from shared component)
POST   /api/departments/facility/dashboard/scan-document
GET    /api/departments/facility/dashboard/scanned-documents
```

---

## Tab 1: Overview

### Purpose
Landing page. Answer: "How are my facilities doing right now?"

### Content Layout

```
┌─────────────────────────────────────────────────────────────┐
│  KPI Cards (5 across, clickable → navigate to source tab)   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │
│  │ Total    │ │ Avg      │ │ Open     │ │Overdue │ │Critical│ │
│  │ Locations│ │ Score    │ │ Actions  │ │Inspect │ │Alerts  │ │
│  │ 24       │ │ 72 Good  │ │ 18       │ │ 5      │ │ 3 🔴  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Charts Row (2 columns)                                     │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│  │ Compliance Trend        │ │ Score by Location Type      │ │
│  │ (LineChart, 6 months)   │ │ (BarChart, grouped)         │ │
│  │ x: month, y: avg score  │ │ x: type, y: avg score       │ │
│  │ dataKeys: [overall,     │ │ colors per type             │ │
│  │  safety, cleanliness]   │ │                             │ │
│  └─────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Top Violations This Week                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠ Fire extinguisher missing — Factory A Line 2 (urgent) │ │
│  │ ⚠ Oil spill on floor — Workshop B (high)                │ │
│  │ ⚠ 2/5 workers without hard hats — Construction Zone 1   │ │
│  │ ⚠ Mold in bathroom ceiling — Hostel Block 3 Unit 5      │ │
│  │ ⚠ Blocked emergency exit — Warehouse C (urgent)         │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Recent Inspections (last 5, compact cards)                 │
│  Each card: location name | date | score badge | inspector  │
│  Click → jump to that inspection record in Reports tab      │
└─────────────────────────────────────────────────────────────┘
```

### KPI Card Details

| Card | Value | Sub-text | Warn condition | Navigates to |
|------|-------|----------|----------------|-------------|
| Total Locations | count | "{n} active" | — | Locations tab |
| Avg Compliance Score | 0-100 + rating label | vs last month (↑/↓) | < 60 | Reports tab |
| Open Action Items | count | "{n} urgent" | > 0 urgent | Reports tab (filtered) |
| Overdue Inspections | count | locations past due | > 0 | Locations tab (filtered) |
| Critical Alerts | count | safety failures only | always warn if > 0 | Reports tab (critical filter) |

### Chart Data Sources

**Compliance Trend** (LineChart):
- X axis: last 6 months (or 12 weeks)
- Y axis: average score 0-100
- Lines: overall, safety, cleanliness (3 lines via `dataKeys`)
- Source: aggregate `FacilityInspection.overall_score` grouped by month

**Score by Location Type** (BarChart):
- X axis: location types that have inspections
- Y axis: average overall score
- Color-coded bars
- Source: aggregate by `FacilityLocation.location_type`

### Top Violations
- Query: `FacilityActionItem` where `status = 'open'`, sorted by priority desc, limit 5
- Each row shows: icon (⚠), description, location name, priority badge
- Click → navigate to Reports tab with that location pre-selected

### Recent Inspections
- Query: last 5 `FacilityInspection` records, joined with location name
- Compact card: location name, date, score badge (color-coded), inspector name
- Click → navigate to Reports tab, open that inspection detail

### Backend Endpoint: `/stats`

Returns:
```json
{
  "total_locations": 24,
  "active_locations": 22,
  "avg_score": 72,
  "avg_score_trend": "+3",
  "open_actions": 18,
  "urgent_actions": 3,
  "overdue_inspections": 5,
  "critical_alerts": 3,
  "trend_data": [{"month": "Apr", "overall": 68, "safety": 55, "cleanliness": 75}, ...],
  "type_scores": [{"type": "factory_floor", "label": "Factory", "score": 65}, ...],
  "top_violations": [...],
  "recent_inspections": [...]
}
```

---

## Tab 2: Locations

### Purpose
Register and manage all inspectable places. See health status at a glance.

### Content Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar                                                    │
│  [+ Add Location]  [Filter: Type ▾] [Status ▾] [Search...] │
├─────────────────────────────────────────────────────────────┤
│  Location Cards Grid (sd-grid sd-dept-grid)                 │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │ 🏭 Factory A Line 1 │ │ 🏠 Block 3 Unit 12  │            │
│  │                     │ │                     │            │
│  │ Score: 82 ● Good   │ │ Score: 45 ● Poor    │            │
│  │ Last: 3 days ago   │ │ Last: 45 days ago ⚠ │            │
│  │ Open actions: 2    │ │ Open actions: 5     │            │
│  │ Freq: Weekly       │ │ Freq: Monthly       │            │
│  │ Resp: Ahmad        │ │ Resp: Siti          │            │
│  │                     │ │                     │            │
│  │ [Inspect →] [Edit] │ │ [Inspect →] [Edit]  │            │
│  └─────────────────────┘ └─────────────────────┘            │
│  ... more cards ...                                         │
└─────────────────────────────────────────────────────────────┘
```

### Add/Edit Location Form (modal or inline expand)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | ✅ | "Factory A - Production Line 1" |
| Location Type | select | ✅ | Dropdown from template list |
| Site Name | text | ❌ | Estate/site grouping |
| Area (sqm) | number | ❌ | Optional |
| Responsible Person | text | ❌ | Free text name |
| Inspection Frequency | select | ✅ | daily/weekly/monthly/quarterly |
| Notes | textarea | ❌ | Free text |

When location type is selected, show preview of what the template checks (e.g., "Factory template checks: safety, PPE, cleanliness, assets — 18 checklist items").

### Location Card Details

Each card shows:
- **Icon**: emoji or lucide icon based on location_type
- **Name**: bold
- **Score badge**: color-coded circle + rating text (uses `ratingColor()` helper)
- **Last inspected**: relative time ("3 days ago") + ⚠ if overdue based on frequency
- **Open actions**: count, red if > 0
- **Frequency**: inspection cadence
- **Responsible person**: if set
- **Actions**: "Inspect →" button (navigates to Inspect tab with this location pre-selected), "Edit" button

### Overdue Logic
A location is overdue when:
```
now - last_inspection_date > frequency_threshold
frequency_threshold = {daily: 1d, weekly: 7d, monthly: 30d, quarterly: 90d}
```
Overdue cards get a subtle warning border (`--samurai-warning`).

### Filter Options
- **Type**: multi-select checkboxes (factory, hostel, canteen, toilet, warehouse, workshop, parking, construction, office, clinic)
- **Status**: active / inactive / all
- **Health**: excellent / good / moderate / poor / critical / overdue / never inspected
- **Search**: text search on name

### Empty State
"No locations registered yet. Click '+ Add Location' to register your first facility."

---

## Tab 3: Inspect

### Purpose
The core workflow: select a location, upload photos, run AI assessment, review findings, confirm and save.

### Content Layout (stepper flow)

```
Step 1: SELECT LOCATION          Step 2: UPLOAD PHOTOS         Step 3: AI ASSESSMENT          Step 4: REVIEW & SAVE
┌─────────────────────┐         ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│ Search/select       │         │ Drag-drop or click  │       │ ⏳ Analyzing...     │       │ Per-photo findings  │
│ from dropdown or    │   ──▶   │ to upload photos    │  ──▶  │                     │  ──▶  │ ✓/✗ checklist       │
│ click from Locations│         │                     │       │ Progress bar        │       │                     │
│ tab                 │         │ Photo previews with │       │ (per photo)         │       │ Override / add notes│
│                     │         │ remove button       │       │                     │       │                     │
│ Shows: type, last   │         │                     │       │                     │       │ [Save Inspection]   │
│ score, template     │         │ Min photos hint     │       │                     │       │ [Discard]           │
│ preview             │         │ from template       │       │                     │       │                     │
└─────────────────────┘         └─────────────────────┘       └─────────────────────┘       └─────────────────────┘
```

### Step 1: Select Location

- Dropdown with search, grouped by site_name
- Each option shows: icon + name + type badge + last score
- When selected, show info panel below:
  - Location type + template name
  - What will be checked (checklist preview: "Safety: 6 items, PPE: 5 items, Cleanliness: 4 items, Assets: 4 items")
  - Last inspection date + score
  - Photo guidance from template ("Take wide shot of area + close-ups of specific concerns")
  - Minimum photos required

### Step 2: Upload Photos

- Drag-drop zone or click-to-upload
- Accept: image/*, video/*
- Multi-file upload
- Preview grid with remove button per photo
- Show counter: "{n} photos uploaded (min: {min})"
- Template photo guidance displayed as hint text
- "Run Assessment" button appears when ≥ min_photos

### Step 3: AI Assessment

- Calls `POST /locations/{id}/assess` with FormData (photos)
- Backend: saves photos → builds type-specific prompt from template → calls `_call_estate_agent("facility", prompt, photo_paths)` → parses structured JSON response
- Frontend shows progress:
  - Spinner + "Analyzing {n} photos..."
  - If multiple photos, show per-photo progress as they complete
- On error: show error message with retry button

### Step 4: Review & Save

This is the most important UI. Shows AI results in a reviewable, editable format.

#### Layout: Per-Photo Findings

For each photo, show a collapsible card:

```
┌─────────────────────────────────────────────────────────┐
│ 📷 photo_001.jpg                          [▼ collapse] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CLEANLINESS  Score: 72 Good                            │
│  ✓ Floor clean                                          │
│  ✗ Trash bin overflowing — "Photo shows bin at corner  │
│    filled beyond capacity"                              │
│  ✓ Walls clean                                          │
│                                                         │
│  SAFETY  Score: 45 Poor                                 │
│  ✗ Fire extinguisher not visible — "No extinguisher    │
│    detected in frame"                                   │
│  ✗ Emergency exit blocked by boxes — "Stacked cartons  │
│    blocking exit door"                                  │
│  ✓ Electrical panels closed                             │
│                                                         │
│  PPE  Score: 60 Moderate                                │
│  ✓ Hard hats worn (3/3 workers)                         │
│  ✗ Safety goggles missing at grinding station           │
│                                                         │
│  ACTION ITEMS GENERATED:                                │
│  🔴 Urgent: Clear boxes from emergency exit             │
│  🟠 High: Install fire extinguisher near entrance       │
│  🟡 Medium: Enforce goggle policy at grinding station   │
│  🟡 Medium: Empty trash bin                             │
│                                                         │
│  [Add manual note...]                                   │
└─────────────────────────────────────────────────────────┘
```

#### Checklist Item Display

Each checklist item from the template is shown with:
- ✓ green check or ✗ red cross
- Item text
- AI evidence quote (italic, muted)
- Toggle to override (user can flip ✓/✗ if AI was wrong)
- Text input to add manual note

#### Action Items Panel

Below all photo cards, consolidated action items:
- Grouped by priority (urgent → high → medium → low)
- Each item: priority badge, category tag, description, linked photo thumbnail
- Status dropdown: open / in_progress / resolved / dismissed
- Assign-to text field (optional)
- Edit description (inline edit)

#### Footer Buttons

- **Save Inspection**: persists inspection record + creates action items in DB
- **Discard**: clears everything, returns to step 1
- **Re-analyze**: re-runs AI on same photos (if user changed template mid-review)

### Backend AI Prompt Construction

The assess endpoint builds the prompt dynamically from the location's template:

```
You are a facility compliance inspector. Analyze these photos of a {location_type}.

LOCATION: {location.name}
TYPE: {location.location_type}

INSPECTION CHECKLIST:
{for each category in template.checklist}:
  {category}:
    - {item} (critical: {yes/no})

EXPECTED ASSETS: {template.expected_assets}

SCORING WEIGHTS: {template.scoring_weights}

For EACH photo, evaluate every applicable checklist item. Return JSON:
{expected schema}

Be specific — cite what you see in each photo as evidence.
Flag anything that doesn't match expectations.
Generate actionable fix recommendations with priority levels.
```

---

## Tab 4: Reports

### Purpose
View inspection history, track action items, compare locations, export reports.

### Content Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Sub-tabs: [Inspection History] [Action Items] [Compare]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INSPECTION HISTORY sub-tab:                                │
│  Filters: Location ▾ | Date Range | Rating ▾ | Type ▾      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Factory A Line 1 — 12 Sep 2026 — Score: 82 Good        ││
│  │ By: Ahmad | 4 photos | Safety: 75 | Clean: 88 | PPE: 80││
│  │ Open actions: 2                                        ││
│  │ [View Detail]                                          ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Block 3 Unit 12 — 10 Sep 2026 — Score: 45 Poor         ││
│  │ By: Siti | 3 photos | Safety: 30 | Clean: 55           ││
│  │ Open actions: 5                                        ││
│  │ [View Detail]                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ACTION ITEMS sub-tab:                                      │
│  Filters: Status ▾ | Priority ▾ | Category ▾ | Location ▾  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔴 URGENT                                              ││
│  │ ✗ Clear boxes from emergency exit — Factory A Line 1   ││
│  │   Assigned: Ahmad | Open since 12 Sep                  ││
│  │   [Mark In Progress] [Mark Resolved] [Dismiss]         ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ 🟠 HIGH                                                 ││
│  │ ✗ Install fire extinguisher — Factory A Line 1         ││
│  │   Unassigned | Open since 12 Sep                       ││
│  │   [Assign...] [Mark In Progress] [Mark Resolved]       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  COMPARE sub-tab:                                           │
│  Select 2-4 locations → side-by-side score comparison       │
│  Radar chart or grouped bar chart                           │
│  Table: dimension scores side by side                       │
└─────────────────────────────────────────────────────────────┘
```

### Inspection History Sub-Tab

**Filters:**
- Location: multi-select or search
- Date range: from/to + quick presets (7d, 30d, 90d)
- Rating: excellent/good/moderate/poor/critical
- Location type: multi-select

**List items** (clickable cards):
- Location name + type icon
- Date + inspector
- Overall score badge (color-coded)
- Dimension scores inline (Safety: 75 | Clean: 88 | PPE: 80)
- Photo count
- Open action items count
- "View Detail" → opens inspection detail modal

**Inspection Detail Modal:**
Same layout as Inspect tab Step 4 (review view), but read-only. Shows:
- All photos with thumbnails (clickable → lightbox)
- Per-photo checklist results
- Action items with current status
- Metadata: date, inspector, location info

### Action Items Sub-Tab

**Filters:**
- Status: open / in_progress / resolved / dismissed / all
- Priority: urgent / high / medium / low
- Category: safety / cleanliness / assets / ppe / hygiene
- Location: multi-select

**Grouped by priority** (urgent section first, then high, medium, low).

Each action item card:
- Priority badge (color-coded)
- Category tag
- Description
- Location name (clickable → filter to that location)
- Linked photo thumbnail (clickable → lightbox)
- Assigned to (editable inline)
- Status buttons: [Mark In Progress] [Mark Resolved] [Dismiss]
- Age: "Open since {date}" or "Resolved {date} by {person}"

**Bulk actions:** Select multiple → mark resolved / dismiss / assign

### Compare Sub-Tab

- Select 2-4 locations from dropdown
- Side-by-side comparison:
  - **Grouped BarChart**: dimensions on X axis, scores on Y axis, one bar group per location
  - **Table**: rows = dimensions, columns = selected locations, cells = score + rating
  - **Trend**: if multiple inspections exist, show mini sparkline per location

### Export Button (top-right of Reports tab)

- Export CSV: all visible records (respects current filters)
- Export PDF: formatted report with charts + action items
- Calls `GET /export?type=csv|pdf&filters=...`

---

## Tab 5: Settings

### Purpose
Configure inspection templates per location type. Manage legal document scanning.

### Content Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Sub-tabs: [Inspection Templates] [Document Scanning]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INSPECTION TEMPLATES sub-tab:                              │
│                                                             │
│  Location Type: [Factory Floor ▾]                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Template: Factory / Production Floor                    ││
│  │                                                         ││
│  │ SCORING WEIGHTS                                         ││
│  │ Safety ████████████░░░░ 35%                             ││
│  │ PPE    ██████████░░░░░░ 30%                             ││
│  │ Clean  ██████░░░░░░░░░░ 20%                             ││
│  │ Assets ████░░░░░░░░░░░░ 15%                             ││
│  │ [Edit weights]                                          ││
│  │                                                         ││
│  │ CHECKLIST                                               ││
│  │ Safety (6 items)                                        ││
│  │   ☑ Fire extinguisher visible and accessible [critical] ││
│  │   ☑ Emergency exit signs illuminated [critical]         ││
│  │   ☑ Machine guards in place [critical]                  ││
│  │   ☑ No blocked walkways or aisles                       ││
│  │   ☑ Electrical panels closed and labeled                ││
│  │   ☑ First aid kit accessible                            ││
│  │   [+ Add item]                                          ││
│  │                                                         ││
│  │ PPE (5 items)                                           ││
│  │   ☑ Workers wearing hard hats [when people visible]     ││
│  │   ☑ Safety shoes worn [when people visible]             ││
│  │   ...                                                   ││
│  │                                                         ││
│  │ EXPECTED ASSETS                                         ││
│  │ fire_extinguisher, first_aid_kit, emergency_exit_sign,  ││
│  │ safety_signage, machine_guards                          ││
│  │ [+ Add asset]                                           ││
│  │                                                         ││
│  │ PHOTO REQUIREMENTS                                      ││
│  │ Min photos: 2                                           ││
│  │ Guidance: "Take wide shot + close-ups of concerns"      ││
│  │                                                         ││
│  │ [Save Changes] [Reset to Default]                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  DOCUMENT SCANNING sub-tab:                                 │
│  (Reuse shared DocumentScanningTab component)               │
└─────────────────────────────────────────────────────────────┘
```

### Template Editor

**Location type selector** at top. When changed, loads that type's template.

**Scoring Weights:**
- Visual slider bars for each dimension
- Must sum to 100% (auto-normalize or validate)
- Dimensions shown depend on template (factory has PPE, hostel doesn't)

**Checklist Editor:**
- Grouped by category (safety, cleanliness, assets, ppe, hygiene)
- Each item: checkbox text input + critical toggle + applies_when text field
- Drag to reorder within category
- Add/remove items
- Category headers are editable

**Expected Assets:**
- Tag-style input (add/remove tags)
- Autocomplete from common asset names

**Photo Requirements:**
- Min photos: number input
- Guidance: text input

**Save Changes:** PUT to `/templates/{location_type}`
**Reset to Default:** restores system default template

### Seed Default Templates

On first load, if no templates exist for a tenant, seed defaults for all 10 location types. These come from a JSON fixture file or hardcoded in the backend.

### Document Scanning Sub-Tab

Reuse the existing `shared/DocumentScanningTab.tsx` component. Pass `department="facility"` and `color` props. No changes needed — it already works generically.

---

## File Inventory

### New Frontend Files

| File | Purpose |
|------|---------|
| `plantation/FacilityDashboard.tsx` | Main dashboard shell with grouped nav |
| `plantation/FacilityOverviewTab.tsx` | Overview KPIs + charts + violations |
| `plantation/FacilityLocationsTab.tsx` | Location registry + cards + add/edit |
| `plantation/FacilityInspectTab.tsx` | 4-step inspection workflow |
| `plantation/FacilityReportsTab.tsx` | History + action items + compare |
| `plantation/FacilitySettingsTab.tsx` | Template editor + doc scanning |
| `plantation/FacilityInspectionReview.tsx` | Shared review component (used in Inspect step 4 + Reports detail modal) |

### Modified Frontend Files

| File | Change |
|------|--------|
| `DashboardViewer.tsx` | Update import: `PlantationDashboard` → `FacilityDashboard` |
| `lib/types.ts` | Add FacilityLocation, FacilityInspection, FacilityActionItem, FacilityTemplate, FacilityStats types |
| `lib/api.ts` | Add facilityApi object with all endpoint functions |

### Deleted Frontend Files

| File | Reason |
|------|--------|
| `plantation/PlantationDashboard.tsx` | Replaced by FacilityDashboard |
| `plantation/DailyInspectionTab.tsx` | Replaced by FacilityInspectTab |
| `plantation/InspectionRecordsTab.tsx` | Replaced by FacilityReportsTab |
| `plantation/UnitRegistrationTab.tsx` | Replaced by FacilityLocationsTab |
| `plantation/EstateLegalScanTab.tsx` | Replaced by shared DocumentScanningTab in Settings |

### New Backend Files

| File | Purpose |
|------|---------|
| `scripts/seed_facility_demo_data.py` | Seed locations, inspections, action items, templates |
| `scripts/facility_templates.json` | Default template definitions for all 10 location types |

### Modified Backend Files

| File | Change |
|------|--------|
| `server/models.py` | Add FacilityLocation, FacilityInspection, FacilityActionItem, FacilityTemplate models; deprecate old SiteInspectionUnit/SiteInspection |
| `server/dashboard.py` | New endpoints for locations, inspections, action items, stats, templates, export; update meta tabs |

---

## Implementation Order

| Phase | Deliverable | Dependencies |
|-------|------------|-------------|
| **1** | Models + migration + seed script | None |
| **2** | Backend API (locations, templates, stats) | Phase 1 |
| **3** | FacilityDashboard shell + Overview tab | Phase 2 |
| **4** | Locations tab (CRUD + cards) | Phase 2 |
| **5** | Inspect tab (upload + AI + review) | Phase 2 + 4 |
| **6** | Reports tab (history + action items + compare) | Phase 5 |
| **7** | Settings tab (template editor + doc scanning) | Phase 2 |
| **8** | Polish: tsc check, visual review, demo data verification | All |

**Visual review checkpoint after Phase 3** (shell + overview) before continuing.

---

## Design Principles Applied

- ✅ All colors use `--samurai-*` CSS vars (no hardcoded colors)
- ✅ Every KPI card, location card, inspection record is clickable (interactive by default)
- ✅ Reuse existing chart components (BarChart, LineChart, PieChart)
- ✅ Reuse existing DashboardSubNav for grouped navigation
- ✅ Reuse existing shared DocumentScanningTab
- ✅ Follow HR dashboard patterns (KPI grid, chart cards, sd-stack layout)
- ✅ Lime accent buttons use dark text (#0a0a0a)
- ✅ No info banners/warnings on dashboard (clean)
- ✅ Human-readable formatting (• bullets, plain tables, emoji headers where appropriate)
