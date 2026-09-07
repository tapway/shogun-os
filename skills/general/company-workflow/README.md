![General](https://img.shields.io/badge/dept-General-gray)

# Company Workflow

> Mandatory 6-gate quality sequence for all feature/bug requests: triage → RCA → brainstorm → plan → TDD → E2E.

## What It Does

Enforces a non-skippable gate sequence before any implementation work begins. Every request to build, fix, or change functionality must pass through six gates: Triage (classify), RCA/Research (understand root cause), Brainstorm (explore approaches), Plan (write implementation plan), TDD (test-driven development), and E2E (end-to-end verification). Prevents premature coding and ensures quality.

## Quick Example

```
User: "Fix the price sync failing on Lazada"

Gate 1 - TRIAGE: Bug (broken behavior)
Gate 2 - RCA:    Trace error → HTTP 429 rate limit on batch update
Gate 3 - BRAINSTORM:
  Option A: Add retry with exponential backoff
  Option B: Reduce batch size + add throttling
  → Choose B (simpler, addresses root cause)
Gate 4 - PLAN:   Write bite-sized tasks
Gate 5 - TDD:    Write failing test → implement → pass
Gate 6 - E2E:    Run full sync against sandbox → verify
```

## When to Use / When NOT To

**Use when:**
- Any feature request, bug fix, refactor, or config change
- Before writing any implementation code
- When quality gates are required by policy

**Don't use for:**
- Simple questions or information lookups
- Reading documentation or checking status
- Emergency hotfixes (but still do RCA first)

## Prerequisites

- [ ] Understanding of the 6-gate sequence
- [ ] Access to relevant codebase or system
- [ ] Testing infrastructure available for TDD/E2E gates

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | All profiles |
| Slash Command | `/company-workflow` |
| Related Skills | [coding-workflow](../coding-workflow/), [systematic-debugging](../systematic-debugging/), [writing-plans](../writing-plans/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — 6 mandatory gates, classification taxonomy, no-skip enforcement |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
