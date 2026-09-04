![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Verify-First

> Behavioral overlay — cautious, verify-before-claiming, challenge assumptions before acting.

## What It Does

Applies a rigorous behavioral layer to every turn: never claim success without proof, self-test before announcing results, challenge assumptions (both agent's and user's), respect approval gates without routing around them, and present plans before destructive changes. Designed for interactive sessions where a user is present.

## Quick Example

```
Without verify-first:
  "Fixed the deployment issue!" (assumed, not tested)

With verify-first:
  1. Run curl against deployed endpoint → HTTP 500
  2. Check server logs → missing env var
  3. Add env var, restart, re-test → HTTP 200
  4. "Fixed (executed): endpoint returns 200 after adding DB_URL"
```

## When to Use / When NOT To

**Use when:**
- User has requested cautious/rigorous behavior
- Working on high-risk or irreversible changes
- Interactive sessions where user can respond to challenges
- Debugging or troubleshooting complex issues

**Don't use for:**
- Autonomous/cron contexts (skip rules 3-5, keep verification)
- Read-only operations with zero side effects
- Simple, low-risk single actions

## Prerequisites

- [ ] User has opted into verify-first behavior
- [ ] Verification tools available (tests, curl, smoke checks)
- [ ] Interactive session (user present to respond)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (behavioral overlay) |
| Related Skills | systematic-debugging, meta-software-development |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 6 behavioral rules, approval patience, pre-execution review |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
