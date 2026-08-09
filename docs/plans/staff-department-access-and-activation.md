## Plan: Staff Department Access and Activation

**Goal:** Restrict staff to the dashboard, Skill Library, and their assigned departments, while requiring a new staff member to replace their temporary password before becoming active.
**Tech stack:** FastAPI >=0.110 / SQLAlchemy 2 / React 19 / TypeScript 5.7
**Related skills needed:** tdd, code-review
**Estimated tasks:** 3

### Assumptions

- “Staff” means any non-admin, non-owner user; HR and department-admin users are still limited to explicitly assigned departments unless they are a global admin/owner.
- “Active” is represented from the account’s activation state: `first_login=False` and `is_temporary_password=False`; no database migration is needed because the current staff status is derived from these fields.
- The temporary password supplied when staff are created remains the current-password proof required for their first password change.

### Simpler Alternative Considered

Only hide unassigned department links in the sidebar. This is insufficient because a staff member could still open or call another department URL directly, so API-level authorization is required as well.

### File Map

CREATE `docs/plans/staff-department-access-and-activation.md`
CREATE `docs/checklists/staff-department-access-and-activation-checklist.md`
CREATE `shogun-web/server/tests/test_staff_access_and_activation.py`
MODIFY `shogun-web/server/auth.py`
MODIFY `shogun-web/server/departments.py`
MODIFY `shogun-web/server/onboarding.py`
MODIFY `shogun-web/server/dashboard.py`
MODIFY `shogun-web/ui/src/components/Layout.tsx`
MODIFY `shogun-web/ui/src/pages/ChangePassword.tsx`

### Task 1: Define and test staff account activation

**Files:** `shogun-web/server/tests/test_staff_access_and_activation.py`, `shogun-web/server/auth.py`
**Success criteria:** `test_change_password_first_login_marks_staff_active` passes and verifies first-login and temporary-password flags are cleared after a valid password change.

**Steps:**

1. Write `test_change_password_first_login_marks_staff_active` against the change-password handler using a temporary-password staff user.
2. Verify the test fails because the temporary-password state remains set.
3. Update `change_password` to clear `is_temporary_password` when the password is changed successfully.
4. Verify the test passes.

### Task 2: Define and test department authorization

**Files:** `shogun-web/server/tests/test_staff_access_and_activation.py`, `shogun-web/server/auth.py`, `shogun-web/server/departments.py`, `shogun-web/server/onboarding.py`, `shogun-web/server/dashboard.py`
**Success criteria:** `test_require_department_access_denies_unassigned_staff` passes and all department data routes reject unassigned staff with HTTP 403 while global admins retain access.

**Steps:**

1. Write `test_require_department_access_denies_unassigned_staff` for a staff user assigned to one department and requesting another.
2. Verify the test fails because the current routes only authenticate the user.
3. Add one reusable department-access guard and apply it to department detail/data routes, the department list, and dashboard endpoints.
4. Verify the test passes and global admin access remains unchanged.

### Task 3: Keep staff navigation and password completion aligned with API state

**Files:** `shogun-web/ui/src/components/Layout.tsx`, `shogun-web/ui/src/pages/ChangePassword.tsx`
**Success criteria:** TypeScript lint passes; non-admin sidebar includes Dashboard and Skill Library plus only assigned department entries; password completion refreshes the authenticated user before redirecting to Dashboard.

**Steps:**

1. Preserve Dashboard and Skill Library links for staff while retaining their assigned-department filter.
2. Refresh the user after password change so the client no longer uses stale first-login state.
3. Run TypeScript lint and production build.
