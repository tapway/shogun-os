# Current Department Structure — Shogun OS

This document shows the exact structure of all departments currently deployed in Shogun OS. Use this as a reference when adding a new department to ensure consistency.

---

## Shared Profiles (Deployed for ALL Industries)

These 8 departments + default infrastructure are deployed for every company:

| # | Department | Profile Slug | Persona | Kanji | Gateway Port | gbrain Source | Scrum |
|---|------------|--------------|---------|-------|--------------|---------------|-------|
| 1 | **HR** | `hr-manager` | Jinzai | 人材 — "Talent" | **9101** | `hr/` | ✅ |
| 2 | **Finance** | `finance-manager` | Koku | 石 — "Stone" | **9102** | `finance/` | ✅ |
| 3 | **Procurement** | `procurement-manager` | Kura | 蔵 — "Vault" | **9103** | `procurement/` | ✅ |
| 4 | **CRM** | `crm-manager` | Kizuna | 絆 — "Bond" | **9104** | `crm/` | ✅ |
| 5 | **Marketing** | `marketing-manager` | Haiku | 俳句 | **9105** | `marketing/` | ✅ |
| 6 | **Compliance** | `compliance-manager` | Kata | 型 — "Form" | **9106** | `compliance/` | ✅ |
| 7 | **Customer Support** | `customer-support` | Boei | 防衛 — "Defense" | **9107** | `support/` | ✅ |
| 8 | **Coding** | `coding-agent` | Takumi | 匠 — "Artisan" | **9110** | `engineering/` | ❌ |

**Infrastructure:**
- **Default Profile**: Shared infrastructure crons (email, calendar, Drive sync)
- **Executive Assistant** (`executive-assistant`): Benkei 弁慶 — CEO scheduling, travel (optional deployment)

**General Industry Add-ons:**
| # | Department | Profile Slug | Persona | Kanji | Gateway Port | gbrain Source | Scrum |
|---|------------|--------------|---------|-------|--------------|---------------|-------|
| 9 | **Projects** | `project-manager` | Gorobei | 五郎兵衛 — "Strategist" | **9108** | `projects/` | ✅ |
| 10 | **Product** | `product-manager` | Shi | 志 — "Will" | **9109** | `products/` | ✅ |

---

## Manufacturing Industry Departments

Deployed when `--industry manufacturing` selected:

| # | Department | Profile Slug | Persona | Kanji | Gateway Port | gbrain Source | Scrum |
|---|------------|--------------|---------|-------|--------------|---------------|-------|
| 11 | **Production** | `production-manager` | Kojo | 工場 — "Factory" | **9111** | `production/` | ✅ |
| 12 | **Quality** | `quality-manager` | Kensa | 検査 — "Inspection" | **9112** | `quality/` | ✅ |
| 13 | **Maintenance** | `maintenance-manager` | Shuri | 修理 — "Repair" | **9113** | `maintenance/` | ✅ |
| 14 | **Warehouse** | `warehouse-manager` | Soko | 倉庫 — "Storehouse" | **9114** | `warehouse/` | ❌ |
| 15 | **HSE** | `hse-manager` | Anzen | 安全 — "Safety" | **9115** | `hse/` | ❌ |

**Total Manufacturing Profiles:** 13 (8 shared + 5 industry-specific)

---

## Retail Industry Departments

Deployed when `--industry retail` selected:

| # | Department | Profile Slug | Persona | Kanji | Gateway Port | gbrain Source | Scrum |
|---|------------|--------------|---------|-------|--------------|---------------|-------|
| 11 | **Stores** | `stores-manager` | Tenpo | 店舗 — "Shop" | **9116** | `stores/` | ✅ |
| 12 | **Merchandising** | `merchandising-manager` | Shohin | 商品 — "Goods" | **9117** | `merchandising/` | ✅ |
| 13 | **E-commerce** | `ecommerce-manager` | Denshi | 電子 — "Digital" | **9118** | `ecommerce/` | ✅ |
| 14 | **CRM/Loyalty** | `crm-retail-manager` | Kokyaku | 顧客 — "Customer" | **9119** | `crm-retail/` | ❌ |
| 15 | **Supply Chain** | `supplychain-manager` | Ryutsu | 流通 — "Distribution" | **9120** | `supplychain/` | ❌ |
| 16 | **Visual Merchandising** | `vm-manager` | Hyoji | 表示 — "Display" | **9121** | `vm/` | ❌ |

**Total Retail Profiles:** 14 (8 shared + 6 industry-specific)

---

## Plantation Industry Departments

Deployed when `--industry plantation` selected:

| # | Department | Profile Slug | Persona | Kanji | Gateway Port | gbrain Source | Scrum |
|---|------------|--------------|---------|-------|--------------|---------------|-------|
| 9 | **Facility Management** | `facility-manager` | Eizen | 営繕 | **9111** | `facilities/` | ❌ |

**Total Plantation Profiles:** 9 (8 shared + 1 industry-specific)

---

## Department Configuration Breakdown

### HR Manager (`hr-manager`)
**Skills:**
- Core: `mc-application`, `jibble-compliance`, `leave-balance`, `leave-management`, `people-ops`, `time-tracking`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (7 total):**
- Scrum: 9am (no_agent), 11am (agent), 5pm (agent), Holiday gate (6am)
- Extra: Candidate Pipeline (Mon 10AM), Recruitment GDrive Sync (Daily 6AM), Time Tracking Attendance (Weekdays 9:30AM), Time Tracking Timesheet (Mon 10AM)

**Task IDs:** `HR-\d+`

---

### Finance Manager (`finance-manager`)
**Skills:**
- Core: `accounting-provider`, `ar-credit-control`, `ap-vendor-management`, `malaysia-contractor-cp58-wht`, `payroll-statutory-accounting`, `expense-claim-audit`, `bank-payment-reconciliation`, `general-ledger-journal-prep`, `period-end-close-checklist`, `financial-statement-prep`, `budget-financial-modeling`, `bva-variance-analysis`, `cash-runway-forecasting`, `unit-economics-margin-analysis`, `revenue-concentration-audit`, `cfo-executive-reporting`, `mfrs15-revenue-recognition`, `tax-sst-compliance`, `internal-control-governance`, `isa530-audit-pbc-support`, `treasury-fx-facility-mgmt`, `weekly-pulse-report`, `monthly-board-report`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (7 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate
- Extra: Daily Burn Rate (8AM), Invoice Aging (Mon 8AM), Weekly Budget/Pulse (Mon 8AM), Monthly P&L/Board Report (1st 8AM)

**Task IDs:** `PO-\d+`, `INV-\d+`

---

### Procurement Manager (`procurement-manager`)
**Skills:**
- Core: `company-workflow`, `procurement-provider`, `department-scrum`, `inventory-item-management`, `stock-movement-audit`, `location-binning`, `reorder-alert-watchdog`, `dead-slow-stock-detector`, `weekly-inventory-valuation`, `inventory-valuation-report`, `reorder-alert-report`, `accounting-bridge-sync`
- Shared: `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (6 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate
- Extra: Reorder Watchdog (Mon–Fri 8AM), Inventory Valuation (Fri 5PM)

**Task IDs:** `PO-\d+`

---

### CRM Manager (`crm-manager`)
**Skills:**
- Core: `crm-assistant`, `crm-deal-pipeline`, `crm-provider`, `customer-communication-onboarding`, `respondio-bridge`, `chatwoot-bridge`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (7 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate
- Extra: Deal Activity Sync (Hourly 9-18), Sales Pipeline (Mon 9AM), Weekly Summary (Fri 5PM)

---

### Marketing Manager (`marketing-manager`)
**Skills:**
- Core: `your-company-deck`, `your-company-brand`, `campaign-manager`, `haiku`, `your-company-presentations`, `competitive-intel`, `roadmap`, `marketing-provider`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (4 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate

---

### Compliance Manager (`compliance-manager`)
**Skills:**
- Core: `compliance-policy-lifecycle`, `compliance-provider`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (4 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate

---

### Customer Support (`customer-support`)
**Skills:**
- Core: `support-tickets`, `support-provider`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (4 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate

**Task IDs:** `TS-20\d{2}-\d{3}`

---

### Coding Agent (`coding-agent`)
**Skills:**
- Core: `github-code-review`, `github-issues`, `simplify-code`, `code-review`, `debugging`, `skill-authoring`, `your-company-app-dev`, `engineering-provider`
- Shared: `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons:** None (ad-hoc only, no daily standup)

---

### Project Manager (`project-manager`)
**Skills:**
- Core: `risk-scorer`, `gantt-renderer`, `meeting-extractor`, `pm-interview`, `procurement-planner`, `projects-provider`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (4 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate

**Task IDs:** `TS-20\d{2}-\d{3}`

---

### Product Manager (`product-manager`)
**Skills:**
- Core: `competitive-intel`, `roadmap`, `brainstorming`, `product-provider`
- Shared: `department-scrum`, `slack-formatting`, `staff-lookup`, `task-management`, `brain-compliance`, `profile-enrichment`

**Crons (5 total):**
- Scrum: 9am, 11am, 5pm, Holiday gate
- Extra: Sprint Cycle (Bi-weekly Mon)

**Task IDs:** `SAM-\d{2}-\d{2}-\d{3,4}`, `INT-\d+`, `EP-\d+`

---

## Provider Abstractions by Department

Each department uses provider recipes for vendor integrations:

| Department | Recipe Path | Tool Prefix | Example Providers |
|------------|-------------|-------------|-------------------|
| HR | `recipes/hr/time-tracking/` | `tt_*` | Jibble, Kami |
| Finance | `recipes/accounting/` | `acct_*` | Bukku, QuickBooks, Xero |
| Procurement | `recipes/procurement/` | `proc_*` | (plugin slot) |
| CRM | `recipes/crm/` | `crm_*` | HubSpot |
| Marketing | `recipes/marketing/` | `mkt_*` | (plugin slot) |
| Compliance | `recipes/compliance/` | `comp_*` | (plugin slot) |
| Support | `recipes/support/` | `spt_*` | (plugin slot) |
| Projects | `recipes/projects/` | `proj_*` | (plugin slot) |
| Product | `recipes/product/` | `pd_*` | (plugin slot) |
| Engineering | `recipes/engineering/` | `eng_*` | (plugin slot) |

---

## Web Portal Department Mapping

The web portal maps UI departments to Hermes profiles:

| UI Department Name | Hermes Profile | Gateway Port | Provider Skill |
|--------------------|----------------|--------------|----------------|
| HR | `hr-manager` | 9101 | `time-tracking` → `recipes/hr/time-tracking/` |
| Finance | `finance-manager` | 9102 | `accounting-provider` → `recipes/accounting/` |
| Procurement | `procurement-manager` | 9103 | `procurement-provider` → `recipes/procurement/` |
| CRM | `crm-manager` | 9104 | `crm-provider` → `recipes/crm/` |
| Marketing | `marketing-manager` | 9105 | `marketing-provider` → `recipes/marketing/` |
| Compliance | `compliance-manager` | 9106 | `compliance-provider` → `recipes/compliance/` |
| Customer Support | `customer-support` | 9107 | `support-provider` → `recipes/support/` |
| Project | `project-manager` | 9108 | `projects-provider` → `recipes/projects/` |
| Product | `product-manager` | 9109 | `product-provider` → `recipes/product/` |
| Coding | `coding-agent` | 9110 | `engineering-provider` → `recipes/engineering/` |

---

## Cron Job Summary by Type

### Deterministic Crons (no_agent = true)
Run scripts without LLM involvement:
- Email collector (every 30 min)
- Calendar sync (6AM daily)
- Drive sync (12, 16, 20 weekdays)
- Token utilization (Mon 8AM)
- All 9am scrum standups
- Department-specific reports (6-9AM)

### Agent Crons (no_agent = false)
LLM-driven jobs:
- Brain ingest pipeline (9, 13, 17 weekdays)
- Drive enrichment (13, 17 weekdays)
- All 11am and 5pm scrum check-ins
- Holiday gates
- Weekly/monthly reports

---

## Gateway Port Allocation Strategy

**Current Usage:**
- 9101-9107: Shared departments (HR through Support)
- 9108-9109: General industry (Projects, Product)
- 9110: Coding agent
- 9111-9115: Manufacturing (Production through HSE)
- 9116-9121: Retail (Stores through VM)
- 9122+: Available for future expansion

**Rule:** Always assign the next available port above the highest used port for your industry vertical.

---

## Skills Installation Pattern

Every department gets:
1. **Core skills** — Department-specific functionality
2. **Shared skills** — Auto-added by `generate-profile.py`:
   - `company-workflow`
   - `shogunify`
   - `department-scrum` (if enabled)
   - `slack-formatting`
   - `staff-lookup`
   - `task-management`
   - `brain-compliance`
   - `profile-enrichment`

**Note:** The generator automatically prepends shared skills without duplicates.

---

## File Locations Reference

### Profile Configuration
- Template: `templates/profiles/base-config.yaml` or `coding-config.yaml`
- Generated: `~/.hermes/profiles/<slug>/config.yaml`
- SOUL snippet: `templates/profiles/SOUL-<dept>.md`
- Scrum config: `~/.hermes/profiles/<slug>/scrum.yaml`

### Scripts
- Profile generator: `scripts/generate-profile.py`
- Cron wirer: `scripts/wire-crons.py`
- Install script: `scripts/install.sh`
- Verification: `scripts/verify-install.sh`

### Documentation
- Profile catalog: `PROFILE_CATALOG.md`
- Cron inventory: `CRON_INVENTORY.md`
- Setup guide: `SETUP.md`
- Architecture: `ARCHITECTURE.md`

---

## Quick Deploy Commands

```bash
# Generate a new profile
python scripts/generate-profile.py <profile-slug> --type <type>

# Wire cron jobs
python scripts/wire-crons.py <profile-slug> --type <type> --apply

# Verify gateway
hermes -p <profile-slug> --exec "mcp_gbrain_whoami"

# List cron jobs
hermes cronjob list --profile <profile-slug>

# Start gateway
hermes -p <profile-slug> gateway start
```

---

**Last Updated:** 2026-09-08  
**Branch:** demo  
**Total Departments:** 8 shared + 2 general + 5 manufacturing + 6 retail + 1 plantation
