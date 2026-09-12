# New Department Onboarding Checklist

Complete checklist for adding a new department to Shogun OS. Follow these steps in order to ensure the new department is fully integrated with all existing systems.

---

## Phase 1: Planning & Definition

### 1.1 Department Metadata
- [ ] **Department Name** (UI display name, e.g., "Human Resources", "Finance")
- [ ] **Profile Slug** (Hermes profile name, e.g., `hr-manager`, `finance-manager`)
- [ ] **Persona Name** (e.g., "Jinzai", "Koku")
- [ ] **Kanji** (e.g., 人材，石)
- [ ] **Gateway Port** (unique port 9101-9110+ for web portal)
- [ ] **gbrain Source** (knowledge base namespace, e.g., `hr/`, `finance/`)

### 1.2 Department Classification
- [ ] **Industry Vertical**: General / Manufacturing / Retail / Plantation / Custom
- [ ] **Shared or Industry-Specific**: Determines if deployed for all companies or only specific industries
- [ ] **Scrum Required**: Yes/No (most depts use 3-tier scrum)

---

## Phase 2: Profile Configuration

### 2.1 Create Profile Template
- [ ] Add entry in `scripts/generate-profile.py` → `PROFILE_META` dict:
  ```python
  "your-dept": {
      "description": "...",
      "template": "base-config.yaml" or "coding-config.yaml",
      "skills": ["skill1", "skill2"],
      "cron_templates": ["cron-9am", "cron-11am", "cron-5pm", "cron-holiday-gate"],
      "gbrain_source": "your-dept",
      "soul_snippet": "your-soul-snippet",
  }
  ```

### 2.2 Define Skills Inventory
- [ ] **Department-Specific Skills** (list all unique skills):
  - Skill 1: `your-skill-name`
  - Skill 2: `...`
- [ ] **Shared Skills** (auto-added by generator):
  - `company-workflow`
  - `shogunify`
  - `department-scrum` (if scrum enabled)
  - `slack-formatting`
  - `staff-lookup`
  - `task-management`
  - `brain-compliance`
  - `profile-enrichment`

### 2.3 Create SOUL.md Snippet (Optional)
- [ ] Create `templates/profiles/SOUL-your-dept.md` with:
  - Department persona description
  - Core responsibilities
  - Working style
  - Key relationships with other departments
- [ ] Reference snippet name in `generate-profile.py` meta

---

## Phase 3: Cron Job Configuration

### 3.1 Scrum Crons (If Enabled)
- [ ] Morning standup: `0 9 * * 1-5` (no_agent, deterministic)
- [ ] Midday check-in: `0 11 * * 1-5` (agent, LLM-driven)
- [ ] EOD wrap-up: `0 17 * * 1-5` (agent, LLM-driven)
- [ ] Holiday gate: `0 6 * * 1-5` (agent, checks public holidays)

### 3.2 Department-Specific Crons
Add to `scripts/wire-crons.py` → `EXTRA_CRONS` dict:
```python
"your-dept": [
    {
        "name": "{profile}-daily-report",
        "schedule": "0 8 * * 1-5",
        "prompt": "Generate daily department report...",
        "skills": ["your-skill"],
        "deliver": "local" or "origin",
    },
    # Add more crons as needed
]
```

Common cron patterns:
- [ ] Daily reports (6AM-9AM weekdays)
- [ ] Weekly summaries (Mon 9AM or Fri 5PM)
- [ ] Monthly reports (1st of month 8AM)
- [ ] Hourly checks (business hours only)
- [ ] Compliance audits (weekly/monthly)

---

## Phase 4: Provider Abstraction (If Applicable)

### 4.1 Define MCP Tool Contract
- [ ] Create `recipes/your-dept/CONTRACT.md`:
  - Tool prefix (e.g., `yd_*`)
  - List of MCP tool names and signatures
  - Expected inputs/outputs

### 4.2 Create Generic Skill
- [ ] Create `recipes/your-dept/GENERIC_SKILL.md`:
  - Agent-facing skill description
  - Tool usage examples
  - Integration patterns

### 4.3 Implement Providers (Optional)
- [ ] Create `recipes/your-dept/providers/` directory
- [ ] Document each provider (e.g., `vendor-a.md`, `vendor-b.md`)
- [ ] Implement bridge plugin if needed (OAuth, API auth)

### 4.4 Update PROFILE_CATALOG.md
- [ ] Add provider recipe path: `recipes/your-dept/`
- [ ] Document tool prefix in table

---

## Phase 5: Web Portal Integration

### 5.1 Department Card Configuration
- [ ] Add to `templates/web-portal/config.yaml`:
  ```yaml
  departments:
    - name: "Your Department"
      profile: "your-dept-manager"
      gatewayPort: 91XX
      icon: "Users"  # Lucide icon name
      color: "#XXXXXX"  # Department brand color
  ```

### 5.2 Update Web Portal Code
- [ ] Add department to UI type definitions (`shogun-web/ui/src/lib/types.ts`)
- [ ] Add API methods if needed (`shogun-web/ui/src/lib/api.ts`)
- [ ] Test department card rendering in onboarding wizard

### 5.3 Gateway Port Registration
- [ ] Ensure gateway port is unique across all departments
- [ ] Document port in `PROFILE_CATALOG.md` table
- [ ] Update `~/.hermes/profiles/your-dept/.gateway-port` during generation

---

## Phase 6: Dashboard & UI Components

### 6.1 Dashboard Tab Components
Create React components for department dashboard:
- [ ] `shogun-web/ui/src/components/dashboards/your-dept/YourDeptDashboard.tsx`
- [ ] Tab 1: Overview (KPI cards, charts)
- [ ] Tab 2: Main workspace (table, kanban, or list view)
- [ ] Tab 3: Secondary feature (reports, settings, etc.)
- [ ] Additional tabs as needed

### 6.2 Backend API Endpoints
Add to `shogun-web/server/dashboard.py`:
- [ ] `GET /api/departments/{dept}/dashboard/stats` — Dashboard statistics
- [ ] `GET /api/departments/{dept}/dashboard/items` — Main data listing
- [ ] `POST /api/departments/{dept}/dashboard/action` — Actions (if needed)
- [ ] Mock data loader for demo branch: `_load_your_dept_mock()`

### 6.3 Mock Data for Demo
- [ ] Create `examples/your-dept-dashboard-mock.json`:
  - Stats object with KPIs
  - Items array (10-15 representative records)
  - Variance in statuses, priorities, dates
  - No real company/staff names

---

## Phase 7: Slack Bot Integration

### 7.1 Slack App Creation
- [ ] Create Slack app at https://api.slack.com/apps
- [ ] Configure bot token scopes:
  - `chat:write` — Send messages
  - `im:read`, `im:write` — DM users
  - `channels:read` — Read channel info (if needed)
- [ ] Install app to workspace

### 7.2 Token Configuration
- [ ] Store bot token: `SLACK_BOT_TOKEN_your_dept` in `.env`
- [ ] Store app ID: `SLACK_APP_ID_your_dept`
- [ ] Store signing secret: `SLACK_SIGNING_SECRET_your_dept`
- [ ] Test bot authentication

### 7.3 Slack Message Formatting
- [ ] Use `slack-formatting` skill for mrkdwn output
- [ ] Test message rendering (blocks, sections, buttons)
- [ ] Configure default delivery channel for cron jobs

---

## Phase 8: gbrain Source Setup

### 8.1 Create gbrain Source
```bash
gbrain sources add your-dept --path ~/brain/your-dept
```

### 8.2 Initialize Brain Structure
- [ ] Create `~/brain/your-dept/shared/` — Federated read content
- [ ] Create `~/brain/your-dept/private/` — Department-specific content
- [ ] Seed with initial pages (policies, SOPs, templates)

### 8.3 Schema Pack (Optional)
- [ ] Create custom page types for department workflows
- [ ] Define frontmatter fields for structured data
- [ ] Run schema pack migration

---

## Phase 9: Testing & Verification

### 9.1 Profile Generation Test
```bash
python scripts/generate-profile.py your-dept-manager --type your-dept --dry-run
```
- [ ] Verify skills list
- [ ] Verify cron templates
- [ ] Verify gbrain source assignment
- [ ] Verify SOUL snippet injection

### 9.2 Cron Wiring Test
```bash
python scripts/wire-crons.py your-dept-manager --type your-dept --list
```
- [ ] Verify scrum crons (if enabled)
- [ ] Verify extra department crons
- [ ] Check schedule syntax
- [ ] Confirm deliver targets

### 9.3 Full Deployment Test
```bash
./scripts/install.sh --deploy-profile your-dept-manager --type your-dept
```
- [ ] Profile created in `~/.hermes/profiles/`
- [ ] Skills linked correctly
- [ ] Config file generated
- [ ] Gateway port assigned

### 9.4 Gateway Health Check
```bash
hermes -p your-dept-manager --exec "mcp_gbrain_whoami"
```
- [ ] Gateway starts successfully
- [ ] MCP servers connect
- [ ] gbrain source accessible
- [ ] No errors in gateway logs

### 9.5 Web Portal Test
- [ ] Department appears in onboarding wizard
- [ ] Department card renders correctly
- [ ] Chat tab connects to gateway
- [ ] Brain tab reads/writes correctly
- [ ] Docs tab shows providers (if configured)

### 9.6 Cron Execution Test
```bash
hermes cronjob run --job-id <scrum-morning-job-id>
```
- [ ] Cron executes without errors
- [ ] DMs sent to team members (test users)
- [ ] Replies collected and summarized
- [ ] Output delivered to configured target

---

## Phase 10: Documentation

### 10.1 Update Catalog Files
- [ ] Add department to `PROFILE_CATALOG.md`:
  - Persona table entry
  - Skills list
  - Crons list
  - gbrain source
  - Gateway port
  - Task ID format (if applicable)
- [ ] Add crons to `CRON_INVENTORY.md`:
  - Schedule
  - Type (deterministic/agent)
  - Skills used
  - Purpose

### 10.2 Create Department README
- [ ] `docs/departments/your-dept.md`:
  - Overview and purpose
  - Key features
  - Configuration guide
  - Troubleshooting tips
  - Example workflows

### 10.3 Update Install Scripts
- [ ] Add to `SHARED_PROFILES` or industry-specific lists in `install.sh`
- [ ] Add to `SHARED_TYPES` or industry-specific types
- [ ] Update help text if needed

---

## Phase 11: Production Deployment

### 11.1 Pre-Deployment Checklist
- [ ] All tests passing (pytest, build, integration)
- [ ] Mock data cleaned (no hardcoded names/values)
- [ ] Gateway ports documented and unique
- [ ] Slack bots configured and tested
- [ ] gbrain sources initialized
- [ ] Cron jobs wired and tested

### 11.2 Deploy to Production
```bash
# 1. Install skills and assets
./scripts/install.sh --force

# 2. Generate profile
python scripts/generate-profile.py your-dept-manager --type your-dept

# 3. Wire crons
python scripts/wire-crons.py your-dept-manager --type your-dept --apply

# 4. Start gateway
hermes -p your-dept-manager gateway start

# 5. Verify
./scripts/verify-install.sh --quick
```

### 11.3 Post-Deployment Verification
- [ ] Gateway running and healthy
- [ ] Cron jobs scheduled (check `hermes cronjob list`)
- [ ] Slack bot responsive
- [ ] Web portal department card active
- [ ] First scrum cycle completes successfully

---

## Quick Reference: Existing Departments

### Shared Profiles (All Industries)
| Profile | Persona | Gateway Port | gbrain Source | Scrum |
|---------|---------|--------------|---------------|-------|
| `hr-manager` | Jinzai | 9101 | `hr/` | ✅ |
| `finance-manager` | Koku | 9102 | `finance/` | ✅ |
| `procurement-manager` | Kura | 9103 | `procurement/` | ✅ |
| `crm-manager` | Kizuna | 9104 | `crm/` | ✅ |
| `marketing-manager` | Haiku | 9105 | `marketing/` | ✅ |
| `compliance-manager` | Kata | 9106 | `compliance/` | ✅ |
| `customer-support` | Boei | 9107 | `support/` | ✅ |
| `coding-agent` | Takumi | 9110 | `engineering/` | ❌ |

### General Industry Extra
| Profile | Persona | Gateway Port | gbrain Source | Scrum |
|---------|---------|--------------|---------------|-------|
| `project-manager` | Gorobei | 9108 | `projects/` | ✅ |
| `product-manager` | Shi | 9109 | `products/` | ✅ |

### Manufacturing Industry Extra
| Profile | Persona | Gateway Port | gbrain Source | Scrum |
|---------|---------|--------------|---------------|-------|
| `production-manager` | Kojo | 9111 | `production/` | ✅ |
| `quality-manager` | Kensa | 9112 | `quality/` | ✅ |
| `maintenance-manager` | Shuri | 9113 | `maintenance/` | ✅ |
| `warehouse-manager` | Soko | 9114 | `warehouse/` | ❌ |
| `hse-manager` | Anzen | 9115 | `hse/` | ❌ |

### Retail Industry Extra
| Profile | Persona | Gateway Port | gbrain Source | Scrum |
|---------|---------|--------------|---------------|-------|
| `stores-manager` | Tenpo | 9116 | `stores/` | ✅ |
| `merchandising-manager` | Shohin | 9117 | `merchandising/` | ✅ |
| `ecommerce-manager` | Denshi | 9118 | `ecommerce/` | ✅ |
| `crm-retail-manager` | Kokyaku | 9119 | `crm-retail/` | ❌ |
| `supplychain-manager` | Ryutsu | 9120 | `supplychain/` | ❌ |
| `vm-manager` | Hyoji | 9121 | `vm/` | ❌ |

---

## Common Pitfalls & Solutions

### Issue: Gateway Port Conflict
**Symptom:** Gateway fails to start, port already in use  
**Solution:** Assign unique port above highest used port, update config files

### Issue: Cron Jobs Not Running
**Symptom:** Crons scheduled but not executing  
**Solution:** Check `hermes cronjob list`, verify profile gateway is running, check deliver target

### Issue: Slack Bot Not Responding
**Symptom:** Bot authenticated but no messages sent  
**Solution:** Verify token scopes, check rate limits, test with simple message first

### Issue: gbrain Source Empty
**Symptom:** Brain queries return no results  
**Solution:** Run `gbrain sources sync`, verify source path exists, check federated read config

### Issue: Dashboard Shows No Data
**Symptom:** UI loads but tables/charts empty  
**Solution:** Check backend endpoint returns data, verify mock data structure matches UI expectations

---

## Estimated Time per Phase

| Phase | Time Estimate | Dependencies |
|-------|---------------|--------------|
| 1. Planning | 30 min | None |
| 2. Profile Config | 1 hour | Phase 1 |
| 3. Cron Config | 1-2 hours | Phase 2 |
| 4. Provider (Optional) | 2-4 hours | Phase 2 |
| 5. Web Portal | 2-3 hours | Phase 2 |
| 6. Dashboard UI | 4-8 hours | Phase 5 |
| 7. Slack Bot | 1 hour | Phase 2 |
| 8. gbrain Setup | 1 hour | Phase 2 |
| 9. Testing | 2-3 hours | Phases 2-8 |
| 10. Documentation | 1-2 hours | All phases |
| 11. Production Deploy | 1 hour | Phase 9 |

**Total (without provider):** ~15-22 hours  
**Total (with provider):** ~17-26 hours

---

## Next Steps After Completion

Once all phases are complete:
1. Add department to default deploy list (if shared profile)
2. Update industry selection prompt in `install.sh`
3. Create sample scrum config for the department
4. Document department-specific workflows in SETUP.md
5. Add to verification script checks
6. Update this checklist if any gaps discovered

---

**Last Updated:** 2026-09-08  
**Version:** 1.0  
**Maintained By:** Shogun OS Core Team
