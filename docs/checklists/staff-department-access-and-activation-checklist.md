# Work Package Checklist: Staff Department Access and Activation

**Plan:** `docs/plans/staff-department-access-and-activation.md`
**Branch:** `feat/Shogun-OS-design`
**Status:** 🟡 In progress

## 🔧 Backend (Python FastAPI)

**Assignee:** /root

- [ ] Task 1: Clear a staff member’s temporary-password state on successful first-password change — `test_change_password_first_login_marks_staff_active`
- [ ] Task 2: Enforce assigned-department access on department and dashboard APIs — `test_require_department_access_denies_unassigned_staff`

## 🎨 Frontend (React / TypeScript)

**Assignee:** /root

- [ ] Task 3: Show staff Dashboard, Skill Library, and assigned departments only; refresh auth after password completion — `npm run lint` and `npm run build`
