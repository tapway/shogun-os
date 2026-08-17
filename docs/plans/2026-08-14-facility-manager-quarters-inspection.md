# Facility Manager Quarters Inspection — Implementation Plan

**Issue:** #15 — ⚙ Facility Manager (Eizen) — quarters image inspection
**Profile:** `facility-manager` (Eizen 営繕)
**Branch:** `feat/doc-scanning-image-processing`
**Status:** ✅ Complete (12/12 tasks)

## Task Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | Pack JSON schema + sample + validator + tests (16 tests) | ✅ |
| 2 | Report schema + validator + tests (12 tests) | ✅ |
| 3 | Deterministic report builder (6 tests) | ✅ |
| 4 | VLM prompt builder + JSON parser (14 tests) | ✅ |
| 5 | quarters-inspection SKILL.md + 3 reference docs | ✅ |
| 6 | facility PROFILE_META + Eizen SOUL | ✅ |
| 7 | Verification suite updates | ✅ |
| 8 | PROFILE_CATALOG + HUB + ARCHITECTURE docs | ✅ |
| 9 | Schema pack page types | ✅ |
| 10 | Fixtures README + e2e offline demo | ✅ |
| 11 | Dry-run smoke test | ✅ |
| 12 | Telegram pilot runbook | ✅ |

## Key Decisions

- **Option A** (chosen): New `facility-manager` profile with pack-driven VLM assessment
- **Rejected:** One-off skill on default profile (boss wants `*-manager` convention)
- **Sample format:** JSON (issue allows JSON instead of YAML if PyYAML not in dep path)
