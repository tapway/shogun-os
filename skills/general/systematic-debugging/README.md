![General](https://img.shields.io/badge/dept-General-gray)

# Systematic Debugging

> 4-phase root cause debugging methodology — always find root cause before attempting fixes.

## What It Does

Enforces a disciplined debugging process: Phase 1 (Root Cause Investigation — read errors carefully, reproduce, trace causal chain), Phase 2 (Hypothesis Formation — propose explanations based on evidence), Phase 3 (Targeted Fix — implement minimal fix addressing root cause), Phase 4 (Verification — confirm fix works and doesn't introduce regressions). The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

## Quick Example

```
Bug: "Price sync fails intermittently on Shopee"

Phase 1 - INVESTIGATE:
  ✅ Read error: HTTP 429 Too Many Requests
  ✅ Reproduce: happens after 50+ updates in 1 minute
  ✅ Trace: no rate limiting in batch update loop
  Root cause: Missing throttle between API calls

Phase 2 - HYPOTHESIS:
  Adding 200ms delay between calls should stay under rate limit

Phase 3 - FIX:
  Add time.sleep(0.2) in batch loop + retry on 429

Phase 4 - VERIFY:
  ✅ 100 updates complete without 429
  ✅ No regression in update speed (< 5 min total)
```

## When to Use / When NOT To

**Use when:**
- Any test failure, bug, or unexpected behavior
- Performance problems or build failures
- Integration issues between systems
- ESPECIALLY when under time pressure or after failed fixes

**Don't use for:**
- Feature development (use `writing-plans` instead)
- Known issues with documented fixes
- Configuration typos (just fix them)

## Prerequisites

- [ ] Access to error logs, stack traces, or reproduction steps
- [ ] Ability to run tests or reproduce the issue
- [ ] Understanding of the affected system's architecture

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/systematic-debugging` |
| Related Skills | [company-workflow](../company-workflow/), [coding-workflow](../coding-workflow/), [writing-plans](../writing-plans/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-09-04 | Adapted from obra/superpowers — 4-phase methodology, Iron Law enforcement |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
