# Onboarding Flow — Industry-Aware Registration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add an industry selection step to the onboarding wizard so new companies register → choose industry → see industry-specific departments → configure → launch dashboard. Currently the wizard shows a flat list of 10 departments with no industry context.

**Architecture:** Insert a new "Industry" step before "Departments". The industry choice filters which departments appear in the Departments step. Industry-specific departments (Estate Operations, Production, Stores, etc.) only appear when their industry is selected. The 8 shared departments always appear regardless of industry.

**Tech Stack:** React + TypeScript (UI), FastAPI + SQLAlchemy (backend), existing onboarding wizard pattern.

---

## Current State

### Existing Onboarding Wizard (4 steps)

```
Step 0: Departments  →  Step 1: Company  →  Step 2: Providers  →  Step 3: Review
```

**Problem:** Step 0 shows a FLAT list of 10 departments (hr, finance, crm, marketing, compliance, support, engineering, projects, product, procurement). No industry context. No way to select Plantation, Manufacturing, or Retail-specific departments.

### Existing Files

| File | What it does |
|------|-------------|
| `shogun-web/ui/src/pages/Onboarding.tsx` (591 lines) | 4-step wizard UI |
| `shogun-web/ui/src/lib/types.ts` | `DepartmentKey` type, `DEPARTMENT_CATALOG` |
| `shogun-web/server/onboarding.py` | Onboarding API endpoints, `activate_department` |
| `shogun-web/server/config.py` | `DEFAULT_DEPARTMENTS` list (10 flat departments) |
| `shogun-web/server/models.py` | `OnboardingState` model, `Department` model |

### Existing Department Catalog (flat, no industry)

```typescript
export type DepartmentKey =
  | 'hr' | 'finance' | 'crm' | 'marketing'
  | 'compliance' | 'support' | 'engineering'
  | 'projects' | 'product' | 'procurement';
```

```python
DEFAULT_DEPARTMENTS = [
    {"name": "hr", "profile_name": "hr-manager", "label": "HR", "port_offset": 1},
    {"name": "finance", ...},
    {"name": "procurement", ...},
    {"name": "crm", ...},
    {"name": "marketing", ...},
    {"name": "compliance", ...},
    {"name": "customer-support", ...},
    {"name": "coding", ...},
    {"name": "executive", ...},
    {"name": "projects", ...},
]
```

---

## Target State

### New Onboarding Wizard (5 steps)

```
Step 0: Industry     →  Step 1: Departments  →  Step 2: Company  →  Step 3: Providers  →  Step 4: Review
```

### Industry Catalog

| Industry | Slug | Description | Industry-Specific Departments |
|----------|------|-------------|-------------------------------|
| General / Services | `general` | Consulting, software, agencies | Projects, Product |
| Manufacturing | `manufacturing` | Factory, production, OEM | Production, Quality, Maintenance, Warehouse, HSE |
| Retail | `retail` | Stores, e-commerce, omnichannel | Stores, Merchandising, E-commerce, CRM-Loyalty, Supply Chain, Visual Merchandising |
| Plantation | `plantation` | Estate, mill, agriculture | Estate Operations, Worker Welfare |

### Department Catalog (restructured by industry)

```
SHARED (always shown, regardless of industry):
  HR, Finance, Procurement, CRM, Marketing, Compliance, Customer Support, Coding

INDUSTRY-SPECIFIC (only shown when industry selected):
  General:       Projects, Product
  Manufacturing: Production, Quality, Maintenance, Warehouse, HSE
  Retail:        Stores, Merchandising, E-commerce, CRM-Loyalty, Supply Chain, Visual Merchandising
  Plantation:    Estate Operations, Worker Welfare
```

---

## Onboarding Flow — User Journey

### Step 0: Industry Selection

**User sees:** 4 industry cards (General, Manufacturing, Retail, Plantation) with icons and descriptions.

**User action:** Clicks one card to select.

**What happens:** Industry is saved to `OnboardingState`. Next button appears.

**UI:**

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Shogun OS                                   │
│  What industry is your company in?                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ General  │  │Manufactur │  │  Retail  │  │Plantation││
│  │ Services │  │  Factory  │  │  Stores  │  │  Estate  ││
│  │   🏢     │  │    🏭     │  │   🛒     │  │   🌴     ││
│  │Consulting│  │Production │  │E-commerce│  │Agricultur││
│  │Software  │  │    OEM    │  │Omnichannel│  │   Mill   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                         │
│                              [Continue →]               │
└─────────────────────────────────────────────────────────┘
```

### Step 1: Department Selection

**User sees:** Two sections — "Core Departments" (8 shared, always shown) and "Industry Departments" (filtered by Step 0 selection).

**User action:** Toggles departments on/off. Core departments are pre-selected. Industry departments are optional.

**UI:**

```
┌─────────────────────────────────────────────────────────┐
│  Plantation Industry → Select Departments               │
│                                                         │
│  CORE DEPARTMENTS (every company gets these)            │
│  [✓] HR — Jinzai          [✓] Finance — Koku           │
│  [✓] Procurement — Kura   [✓] CRM — Kizuna             │
│  [✓] Marketing — Haiku    [✓] Compliance — Kata        │
│  [✓] Customer Support     [✓] Coding — Takumi           │
│                                                         │
│  PLANTATION DEPARTMENTS                                  │
│  [ ] Estate Operations — Gozen (御前)                    │
│      Runs the plantation estate: documents, inspections │
│  [ ] Worker Welfare — Ryō (寮)                          │
│      Staff quarters, welfare, site conditions            │
│                                                         │
│  [Select All]  [Clear All]              [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Company Info

**User sees:** Company name, timezone, logo upload. (Same as current Step 1.)

### Step 3: Provider Configuration

**User sees:** Provider config per selected department (API keys, subdomains). (Same as current Step 2.)

### Step 4: Review & Launch

**User sees:** Summary of industry + departments + company info. Click "Go Live" → redirected to dashboard.

---

## Data Model Changes

### OnboardingState — add `industry` field

**Current** (`server/models.py` — `OnboardingState`):
```python
class OnboardingState(Base):
    __tablename__ = "onboarding_state"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    current_step = Column(String, default="welcome")
    data = Column(JSON, default=dict)  # ← industry goes here
    completed_at = Column(DateTime, nullable=True)
```

**Change:** Add `industry` to the `data` JSON dict (no new column needed — `data` is flexible JSON):
```python
# data dict now contains:
{
    "ui_step": 1,
    "industry": "plantation",           # ← NEW
    "selected_departments": ["hr", "finance", "estate-ops", "worker-welfare"],
    "company": {"name": "Gozen Estate Sdn Bhd", "timezone": "Asia/Kuala_Lumpur"},
    "department_configs": {},
}
```

### Department model — add `industry` column

**Current** (`server/models.py` — `Department`):
```python
class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    name = Column(String, unique=False)
    profile_name = Column(String)
    status = Column(String, default="inactive")
    gateway_port = Column(Integer)
    provider_config = Column(JSON, default=dict)
```

**Change:** Add `industry` column:
```python
class Department(Base):
    # ... existing fields ...
    industry = Column(String, nullable=True)  # ← NEW: "general" | "manufacturing" | "retail" | "plantation" | None (shared)
```

---

## Configuration Changes

### `server/config.py` — add INDUSTRY_CATALOG

```python
INDUSTRY_CATALOG: List[Dict[str, Any]] = [
    {
        "slug": "general",
        "label": "General / Services",
        "description": "Consulting, software, agencies",
        "icon": "🏢",
        "departments": ["projects", "product"],
    },
    {
        "slug": "manufacturing",
        "label": "Manufacturing",
        "description": "Factory, production, OEM",
        "icon": "🏭",
        "departments": ["production", "quality", "maintenance", "warehouse", "hse"],
    },
    {
        "slug": "retail",
        "label": "Retail",
        "description": "Stores, e-commerce, omnichannel",
        "icon": "🛒",
        "departments": ["stores", "merchandising", "e-commerce", "crm-loyalty", "supply-chain", "visual-merchandising"],
    },
    {
        "slug": "plantation",
        "label": "Plantation",
        "description": "Estate, mill, agriculture",
        "icon": "🌴",
        "departments": ["estate-ops", "worker-welfare"],
    },
]

# Shared departments — always available regardless of industry
SHARED_DEPARTMENTS: List[Dict[str, Any]] = [
    {"name": "hr", "profile_name": "hr-manager", "label": "HR", "port_offset": 1},
    {"name": "finance", "profile_name": "finance-manager", "label": "Finance", "port_offset": 2},
    {"name": "procurement", "profile_name": "procurement-manager", "label": "Procurement", "port_offset": 3},
    {"name": "crm", "profile_name": "crm-manager", "label": "CRM", "port_offset": 4},
    {"name": "marketing", "profile_name": "marketing-manager", "label": "Marketing", "port_offset": 5},
    {"name": "compliance", "profile_name": "compliance-manager", "label": "Compliance", "port_offset": 6},
    {"name": "customer-support", "profile_name": "customer-support-manager", "label": "Customer Support", "port_offset": 7},
    {"name": "coding", "profile_name": "coding-manager", "label": "Coding", "port_offset": 8},
]

# Industry-specific departments — only available when their industry is selected
INDUSTRY_DEPARTMENTS: Dict[str, List[Dict[str, Any]]] = {
    "general": [
        {"name": "projects", "profile_name": "projects-manager", "label": "Projects", "port_offset": 9},
        {"name": "product", "profile_name": "product-manager", "label": "Product", "port_offset": 10},
    ],
    "manufacturing": [
        {"name": "production", "profile_name": "production-manager", "label": "Production", "port_offset": 11},
        {"name": "quality", "profile_name": "quality-manager", "label": "Quality", "port_offset": 12},
        {"name": "maintenance", "profile_name": "maintenance-manager", "label": "Maintenance", "port_offset": 13},
        {"name": "warehouse", "profile_name": "warehouse-manager", "label": "Warehouse", "port_offset": 14},
        {"name": "hse", "profile_name": "hse-manager", "label": "HSE", "port_offset": 15},
    ],
    "retail": [
        {"name": "stores", "profile_name": "stores-manager", "label": "Stores", "port_offset": 11},
        {"name": "merchandising", "profile_name": "merchandising-manager", "label": "Merchandising", "port_offset": 12},
        {"name": "e-commerce", "profile_name": "ecommerce-manager", "label": "E-commerce", "port_offset": 13},
        {"name": "crm-loyalty", "profile_name": "crm-loyalty-manager", "label": "CRM/Loyalty", "port_offset": 14},
        {"name": "supply-chain", "profile_name": "supply-chain-manager", "label": "Supply Chain", "port_offset": 15},
        {"name": "visual-merchandising", "profile_name": "vm-manager", "label": "Visual Merchandising", "port_offset": 16},
    ],
    "plantation": [
        {"name": "estate-ops", "profile_name": "estate-ops-manager", "label": "Estate Operations", "port_offset": 11},
        {"name": "worker-welfare", "profile_name": "worker-welfare-manager", "label": "Worker Welfare", "port_offset": 12},
    ],
}

def get_departments_for_industry(industry: str) -> List[Dict[str, Any]]:
    """Return shared + industry-specific departments for the given industry."""
    industry_depts = INDUSTRY_DEPARTMENTS.get(industry, [])
    return SHARED_DEPARTMENTS + industry_depts
```

### `ui/src/lib/types.ts` — add IndustryKey and restructure

```typescript
// NEW: Industry type
export type IndustryKey = 'general' | 'manufacturing' | 'retail' | 'plantation';

export const INDUSTRY_CATALOG: Record<IndustryKey, {
  label: string;
  description: string;
  icon: string;
  departments: DepartmentKey[];
}> = {
  general: {
    label: 'General / Services',
    description: 'Consulting, software, agencies',
    icon: '🏢',
    departments: ['projects', 'product'],
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'Factory, production, OEM',
    icon: '🏭',
    departments: ['production', 'quality', 'maintenance', 'warehouse', 'hse'],
  },
  retail: {
    label: 'Retail',
    description: 'Stores, e-commerce, omnichannel',
    icon: '🛒',
    departments: ['stores', 'merchandising', 'e-commerce', 'crm-loyalty', 'supply-chain', 'visual-merchandising'],
  },
  plantation: {
    label: 'Plantation',
    description: 'Estate, mill, agriculture',
    icon: '🌴',
    departments: ['estate-ops', 'worker-welfare'],
  },
};

// Shared departments — always available
export const SHARED_DEPARTMENT_KEYS: DepartmentKey[] = [
  'hr', 'finance', 'procurement', 'crm', 'marketing', 'compliance', 'support', 'engineering',
];

// Extended DepartmentKey — add new industry-specific departments
export type DepartmentKey =
  | 'hr' | 'finance' | 'crm' | 'marketing'
  | 'compliance' | 'support' | 'engineering'
  | 'projects' | 'product' | 'procurement'
  // Manufacturing
  | 'production' | 'quality' | 'maintenance' | 'warehouse' | 'hse'
  // Retail
  | 'stores' | 'merchandising' | 'e-commerce' | 'crm-loyalty' | 'supply-chain' | 'visual-merchandising'
  // Plantation
  | 'estate-ops' | 'worker-welfare';

// Helper: get all departments for an industry (shared + industry-specific)
export function getDepartmentsForIndustry(industry: IndustryKey): DepartmentKey[] {
  return [...SHARED_DEPARTMENT_KEYS, ...INDUSTRY_CATALOG[industry].departments];
}
```

---

## Implementation Tasks

### Task 1: Add industry column to database

**Objective:** Add `industry` column to the `departments` table and the `OnboardingState` data schema.

**Files:**
- Modify: `shogun-web/server/models.py`

**Step 1: Add `industry` column to `Department` model**

Add to the `Department` class:
```python
industry = Column(String, nullable=True)  # "general" | "manufacturing" | "retail" | "plantation" | None (shared)
```

**Step 2: Create a migration**

```bash
cd D:/Github/shogun-os/shogun-web
# Add the column to the existing SQLite DB
python -c "
import sqlite3
conn = sqlite3.connect('shogun.db')
conn.execute('ALTER TABLE departments ADD COLUMN industry TEXT')
conn.commit()
conn.close()
print('migration done')
"
```

**Step 3: Verify**

```bash
python -c "
import sqlite3
conn = sqlite3.connect('shogun.db')
cursor = conn.execute('PRAGMA table_info(departments)')
for row in cursor:
    print(row)
"
```

Expected: `industry` column appears in the schema.

---

### Task 2: Add industry catalog to backend config

**Objective:** Add `INDUSTRY_CATALOG`, `SHARED_DEPARTMENTS`, `INDUSTRY_DEPARTMENTS`, and `get_departments_for_industry()` to `config.py`.

**Files:**
- Modify: `shogun-web/server/config.py`

**Step 1: Add the catalog** (as shown in the Configuration Changes section above).

**Step 2: Keep `DEFAULT_DEPARTMENTS` as-is** for backward compatibility (existing code references it).

**Step 3: Add a new endpoint to fetch the industry catalog**

In `shogun-web/server/onboarding.py`:

```python
@router.get("/industries")
async def get_industries() -> Dict[str, Any]:
    """Return the industry catalog for the onboarding wizard."""
    from config import INDUSTRY_CATALOG, SHARED_DEPARTMENTS, INDUSTRY_DEPARTMENTS
    return {
        "industries": INDUSTRY_CATALOG,
        "shared_departments": SHARED_DEPARTMENTS,
        "industry_departments": INDUSTRY_DEPARTMENTS,
    }
```

**Step 4: Verify**

```bash
curl http://localhost:8787/api/industries | python -m json.tool | head -20
```

---

### Task 3: Update onboarding API to accept industry

**Objective:** Save the selected industry in `OnboardingState.data` and filter departments by industry on activation.

**Files:**
- Modify: `shogun-web/server/onboarding.py`

**Step 1: Update `UiOnboardingSave` model**

```python
class UiOnboardingSave(BaseModel):
    step: Optional[int] = None
    industry: Optional[str] = None  # ← NEW
    selected_departments: Optional[List[str]] = None
    company: Optional[Dict[str, Any]] = None
    department_configs: Optional[Dict[str, Any]] = None
    completed: Optional[bool] = None
```

**Step 2: Update `_ui_state()` to return industry**

```python
def _ui_state(state, tenant, go_live_info=None):
    data = dict(state.data or {})
    return {
        "step": int(data.get("ui_step", 0) or 0),
        "industry": data.get("industry"),  # ← NEW
        "selected_departments": list(data.get("selected_departments") or []),
        # ... rest unchanged ...
    }
```

**Step 3: Update `save` endpoint to persist industry**

```python
@router.put("/onboarding")
async def save_onboarding(payload: UiOnboardingSave, ...):
    state = _get_onboarding(db, tenant.id)
    data = dict(state.data or {})
    if payload.industry is not None:
        data["industry"] = payload.industry
    if payload.selected_departments is not None:
        data["selected_departments"] = payload.selected_departments
    # ... rest unchanged ...
    state.data = data
    db.commit()
```

**Step 4: Update `activate_department` to set industry**

```python
@router.post("/departments/{name}/activate")
async def activate_department(name: str, user, db):
    # ... existing logic ...
    dept = Department(
        tenant_id=tenant.id,
        name=name,
        profile_name=...,
        status="inactive",
        provider_config={},
        gateway_port=...,
        industry=state_data.get("industry"),  # ← NEW: set industry on the dept row
    )
    db.add(dept)
    db.commit()
```

---

### Task 4: Add industry types to frontend

**Objective:** Add `IndustryKey`, `INDUSTRY_CATALOG`, and `getDepartmentsForIndustry()` to the frontend types.

**Files:**
- Modify: `shogun-web/ui/src/lib/types.ts`

**Step 1: Add the types** (as shown in the Configuration Changes section above).

**Step 2: Update `DEPARTMENT_CATALOG`** to include the new industry-specific departments (Production, Quality, Estate Ops, etc.) with their metadata (persona, color, icon, description).

**Step 3: Export `INDUSTRY_CATALOG` and `getDepartmentsForIndustry`** from the types module.

**Step 4: Verify TypeScript compiles**

```bash
cd D:/Github/shogun-os/shogun-web/ui
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

---

### Task 5: Add Industry Selection step to onboarding wizard

**Objective:** Insert a new Step 0 (Industry) before the current Step 0 (Departments). Shift all existing steps +1.

**Files:**
- Modify: `shogun-web/ui/src/pages/Onboarding.tsx`

**Step 1: Update STEPS array**

```typescript
// OLD:
const STEPS = ['Departments', 'Company', 'Providers', 'Review'] as const;

// NEW:
const STEPS = ['Industry', 'Departments', 'Company', 'Providers', 'Review'] as const;
```

**Step 2: Add industry state**

```typescript
const [industry, setIndustry] = useState<IndustryKey | null>(null);
```

**Step 3: Load industry from onboarding state**

In the `useEffect` that loads `stateQuery.data`:
```typescript
if (s.industry) setIndustry(s.industry as IndustryKey);
```

**Step 4: Add Step 0 render — Industry Selection**

```tsx
{step === 0 && (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">What industry is your company in?</h2>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {(Object.keys(INDUSTRY_CATALOG) as IndustryKey[]).map((key) => {
        const ind = INDUSTRY_CATALOG[key];
        const selected = industry === key;
        return (
          <button
            key={key}
            onClick={() => setIndustry(key)}
            className={`rounded-lg border p-6 text-center transition ${
              selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
            }`}
          >
            <div className="text-4xl">{ind.icon}</div>
            <div className="mt-2 font-semibold">{ind.label}</div>
            <div className="mt-1 text-xs text-slate-500">{ind.description}</div>
          </button>
        );
      })}
    </div>
  </div>
)}
```

**Step 5: Update Step 1 (Departments) to filter by industry**

```tsx
{step === 1 && (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Select Departments</h2>
    
    {/* Core Departments — always shown */}
    <div>
      <h3 className="mb-3 text-sm font-medium text-slate-500">CORE DEPARTMENTS</h3>
      <div className="grid grid-cols-2 gap-3">
        {SHARED_DEPARTMENT_KEYS.map((key) => (
          <DepartmentToggle key={key} deptKey={key} selected={selected} onToggle={toggleDept} />
        ))}
      </div>
    </div>
    
    {/* Industry Departments — filtered by Step 0 */}
    {industry && (
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-500">
          {INDUSTRY_CATALOG[industry].label.toUpperCase()} DEPARTMENTS
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {INDUSTRY_CATALOG[industry].departments.map((key) => (
            <DepartmentToggle key={key} deptKey={key} selected={selected} onToggle={toggleDept} />
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

**Step 6: Update `goNext` to handle the new step**

```typescript
const goNext = async () => {
  if (step === 0) {  // Industry step
    if (!industry) {
      toast.error('Please select an industry');
      return;
    }
    await persist({ step: 1, industry });
    setStep(1);
    return;
  }
  if (step === 1) {  // Departments step (was step 0)
    await persist({ step: 2, selected_departments: selected });
    setStep(2);
    return;
  }
  // ... shift remaining steps +1 ...
};
```

**Step 7: Update `persist` to include industry**

```typescript
const persist = async (next: Partial<OnboardingState> & { step: number }) => {
  await saveMutation.mutateAsync({
    industry,  // ← NEW
    selected_departments: selected,
    company: { name: companyName, timezone, logo_url: logoPreview || undefined },
    department_configs: configs,
    completed: false,
    ...next,
  });
};
```

**Step 8: Verify the wizard runs**

```bash
cd D:/Github/shogun-os/shogun-web/ui
npx vite build 2>&1 | tail -5
```

Then open the portal and test the onboarding flow.

---

### Task 6: Update dashboard to show after onboarding

**Objective:** After the user completes onboarding and clicks "Go Live", redirect to the dashboard showing their industry-appropriate departments.

**Files:**
- Modify: `shogun-web/ui/src/pages/Dashboard.tsx`

**Current behavior:** After onboarding completes, `navigate('/dashboard')` shows the main dashboard with department cards.

**Change:** No structural change needed — the dashboard already shows department cards based on what's in the DB. Since the onboarding now activates industry-specific departments, they'll appear automatically.

**Verify:** After completing onboarding with Plantation → Estate Ops, the dashboard should show:
- 8 shared department cards (HR, Finance, etc.)
- 1 Estate Operations card
- (If selected) 1 Worker Welfare card

---

## Verification Checklist

- [ ] New company registers → sees Industry step first
- [ ] Selects "Plantation" → sees Estate Ops + Worker Welfare in Departments step
- [ ] Core 8 departments always visible regardless of industry
- [ ] Selects Manufacturing → sees Production, Quality, Maintenance, Warehouse, HSE
- [ ] Selects Retail → sees Stores, Merchandising, E-commerce, etc.
- [ ] Completes onboarding → dashboard shows selected departments
- [ ] Existing companies (already onboarded) still work — industry field is null, all departments visible
- [ ] Backend `GET /api/industries` returns the catalog
- [ ] `OnboardingState.data.industry` persists across sessions
- [ ] `Department.industry` column populated on activation

---

## Backward Compatibility

Existing companies that onboarded before this change:
- `OnboardingState.data.industry` will be `null` — the wizard shows all departments (fallback to current behavior)
- `Department.industry` will be `null` — departments show as "shared" in the UI
- No data migration needed — null industry = "show all"

---

## Timeline

| Task | Effort | Depends on |
|------|--------|------------|
| Task 1: DB migration | 10 min | Nothing |
| Task 2: Backend config | 15 min | Task 1 |
| Task 3: Onboarding API | 20 min | Task 2 |
| Task 4: Frontend types | 15 min | Task 2 |
| Task 5: Onboarding wizard UI | 45 min | Task 4 |
| Task 6: Dashboard verify | 10 min | Task 5 |
| **Total** | ~2 hrs | |

---

## Pitfalls

- ❌ Forgetting to shift existing step numbers (Step 0 → Step 1, etc.) — causes state confusion
- ❌ Not handling `industry=null` for existing companies — breaks their onboarding state
- ❌ Hardcoding department lists in the wizard instead of using the catalog — defeats the purpose
- ❌ Not pre-selecting the 8 shared departments — user might skip HR/Finance by mistake
- ❌ Forgetting to update `goNext` logic for the new step count — wizard gets stuck
