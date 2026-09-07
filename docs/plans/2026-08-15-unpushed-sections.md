# Unpushed Content — Section-by-Section Push Plan

> **Branch:** `feat/Shogun-OS-design` (PR #14)
> **Rule:** Must be functional (py_compile + tsc + vite build) before each push. No amend. No docs/plans commits.

## Current State

- **108 uncommitted files** in working tree
- **41 excluded** (docs/plans/scratch files — will NOT commit)
- **67 code files** to push in 6 sections

## Verification Done

| Check | Result |
|---|---|
| `py_compile` all 20 Python files | ✅ 0 errors |
| `tsc --noEmit` | ✅ 0 errors |
| `vite build` | ✅ 2549 modules, 35s |
| TODO/FIXME scan | ✅ none (all `pass` are legit empty-except blocks) |
| Incomplete function scan | ✅ none (all `return null` are legit React loading guards) |

---

## Section Dependency Map

```
Section 1: Backend Core (models, gateway, onboarding, staff, main, comms, email_templates)
    ↓ (UI api.ts calls comms + email_templates endpoints)
Section 2: QBO Live Fetch (dashboard.py + quickbooks plugin + budget.json)
    ↓ (Finance UI tabs depend on dashboard API returning QBO data)
Section 3: Finance Dashboard UI (8 new tabs + chart fixes + FinanceDashboard)
    ↓ (needs Section 2's dashboard endpoints)
Section 4: Cross-domain SSO (auth.py + SSO docs)
    ↓ (standalone — no UI dependency)
Section 5: UI Shell + Components (pages, components, lib, styles)
    ↓ (needs Section 1's backend APIs)
Section 6: Skills + Scripts + Recipes + Templates
    ↓ (standalone)
```

---

## Section 1: Backend Core
**Files (10):**
- `shogun-web/server/models.py` (M) — adds `CronJob` model, `must_change_password` property
- `shogun-web/server/gateway.py` (M) — adds `user_id` param to chat history (per-user)
- `shogun-web/server/onboarding.py` (M) — preserves `***` masked secrets in provider_config
- `shogun-web/server/staff.py` (M) — adds `department_admin` role + PATCH role endpoint
- `shogun-web/server/main.py` (M) — registers `comms` + `email_templates` routers
- `shogun-web/server/comms.py` (?? new, 552 lines) — communication channels API
- `shogun-web/server/email_templates.py` (?? new, 470 lines) — email template management
- `shogun-web/server/tests/test_staff_access_and_activation.py` (?? new)
- `shogun-web/ui/tailwind.config.js` (M)

**Verify:**
```bash
python -m py_compile shogun-web/server/models.py shogun-web/server/gateway.py shogun-web/server/onboarding.py shogun-web/server/staff.py shogun-web/server/main.py shogun-web/server/comms.py shogun-web/server/email_templates.py
# start server → /api/health → 200
```

**Commit:** `feat: backend core — CronJob model, per-user chat history, department_admin role, comms + email templates APIs`

---

## Section 2: QBO Live Fetch
**Files (5):**
- `shogun-web/server/dashboard.py` (M, +1228 lines) — `_fetch_qbo_balance_sheet`, `_fetch_qbo_profit_loss`, `_fetch_qbo_ar_invoices`, `_fetch_qbo_ap_bills`, `_call_acct_bridge`, `_load_acct_env`, asset classification, QBO→budget matching
- `recipes/accounting/plugins/quickbooks.py` (M) — fixes QBO SQL `Balance > 0` filter (client-side), Service item support for bill creation
- `recipes/accounting/oauth-helper.py → oauth_helper.py` (D + ??) — Windows path fix
- `examples/finance-budget.json` (M) — budget categories aligned to QBO chart of accounts
- `skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py` (M) — snapshot writer update

**Verify:**
```bash
python -m py_compile shogun-web/server/dashboard.py recipes/accounting/plugins/quickbooks.py skills/finance/finance-dashboard-snapshot/scripts/write_snapshots.py
# with QBO env: python -c "from server.dashboard import _run_finance_aggregation; r=_run_finance_aggregation([]); assert r.get('totalLiquidCash') != 1450000.0, 'still mock'"
```

**Commit:** `feat: QBO live fetch — balance sheet, P&L, AR/AP, asset classification, budget alignment`

---

## Section 3: Finance Dashboard UI
**Files (17):**
- **Delete (4 old tabs):** `CashRunwayTab.tsx`, `CloseTaxComplianceTab.tsx`, `ExecutivePulseTab.tsx`, `WorkingCapitalOpsTab.tsx`
- **New (8 tabs):** `ExecutiveOverviewTab.tsx`, `CashFlowTab.tsx`, `AssetTab.tsx`, `ArCollectionsTab.tsx`, `ApPaymentsTab.tsx`, `MarginsConcentrationTab.tsx`, `DunningEmailModal.tsx`, `FinanceDetailModal.tsx`
- **Modified (5):** `BvaUnitEconomicsTab.tsx`, `FinanceDashboard.tsx`, `BarChart.tsx`, `ComboChart.tsx`, `LineChart.tsx`

**Verify:**
```bash
cd shogun-web/ui && npx tsc --noEmit && npx vite build
```

**Commit:** `feat: finance dashboard 7-tab redesign — live QBO tabs, chart tooltip fixes`

---

## Section 4: Cross-Domain SSO
**Files (2):**
- `shogun-web/server/auth.py` (M, +501 lines) — SSO token create/verify, `/sso-login`, `/sso-exchange`, SSO peer management endpoints
- `shogun-web/docs/cross-domain-sso.md` + `sso-peers.example.json` (?? new)

**Note:** `config.py` SSO fields (`SSOPeer`, `sso_secret`, `sso_trusted_origins`) already committed in the PR #14 review fix commit.

**Verify:**
```bash
python -m py_compile shogun-web/server/auth.py
# token round-trip:
python -c "
from server.auth import create_sso_identity_token, verify_sso_identity_token
t = create_sso_identity_token('user@example.com', secret='test-secret-123', name='Test')
p = verify_sso_identity_token(t, secret='test-secret-123')
assert p and p['email'] == 'user@example.com'
print('SSO round-trip OK')
"
```

**Commit:** `feat: cross-domain SSO — signed identity tokens, peer management, browser + server exchange`

---

## Section 5: UI Shell + Components
**Files (24):**
- **Pages (8):** `ChangePassword.tsx`, `Dashboard.tsx`, `Department.tsx`, `NoAccess.tsx`, `Onboarding.tsx`, `SkillsCatalog.tsx`, `StaffManagement.tsx`, `TrainSkill.tsx` (new)
- **Components (13):** `BrainViewer.tsx`, `Chat.tsx`, `ChatHistory.tsx`, `DepartmentCard.tsx`, `DepartmentConnectors.tsx`, `DepartmentSkills.tsx`, `DocsViewer.tsx`, `FloatingChat.tsx`, `Layout.tsx`, `RightChatDock.tsx`, `StatusBadge.tsx`, `DepartmentCrons.tsx` (new), `EmailTemplatesManager.tsx` (new)
- **Lib (3):** `api.ts`, `auth.tsx`, `types.ts`
- **Styles (3):** `App.tsx`, `index.css`, `samurai.css`

**Verify:**
```bash
cd shogun-web/ui && npx tsc --noEmit && npx vite build
```

**Commit:** `feat: UI shell — chat, pages, components, lib, styles refresh`

---

## Section 6: Skills + Scripts + Templates
**Files (6):**
- `skills/finance/bva-variance-analysis/SKILL.md` (M) — skill doc update
- `scripts/parse-budget-excel.py` (?? new) — budget Excel parser
- `scripts/seed-qbo-assets.py` (?? new) — seed QBO asset accounts
- `scripts/seed-qbo-sandbox.py` (?? new) — seed QBO sandbox data
- `scripts/sync-budget-from-drive.py` (?? new) — sync budget from Google Drive
- `templates/profiles/SOUL-ecommerce.md` (?? new) — ecommerce profile soul

**Verify:**
```bash
python -m py_compile scripts/parse-budget-excel.py scripts/seed-qbo-assets.py scripts/seed-qbo-sandbox.py scripts/sync-budget-from-drive.py
```

**Commit:** `feat: skills + scripts — budget parser, QBO seeders, ecommerce soul`

---

## Push Order

| # | Section | Files | Verify | Depends on |
|---|---|---|---|---|
| 1 | Backend Core | 10 | py_compile + health | — |
| 2 | QBO Live Fetch | 5 | py_compile + QBO test | — |
| 3 | Finance Dashboard UI | 17 | tsc + vite build | Section 2 |
| 4 | Cross-domain SSO | 2 | py_compile + token test | — |
| 5 | UI Shell + Components | 24 | tsc + vite build | Section 1 |
| 6 | Skills + Scripts | 6 | py_compile | — |

Sections 1, 2, 4, 6 are independent. Sections 3 and 5 depend on 2 and 1 respectively.

**Recommended push order:** 1 → 2 → 3 → 4 → 5 → 6 (strictly sequential, verify after each)

**Excluded (will NOT commit):**
- All `docs/` and `docs/plans/` files
- All root-level scratch markdown files (TO-DO, Ver1, amend_, etc.)
- `.hermes/`, `out/`, `finance/` folders
