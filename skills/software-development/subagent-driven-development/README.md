![Dev](https://img.shields.io/badge/dept-Dev-yellow)

# Subagent-Driven Development

> Execute implementation plans via fresh subagents per task with mandatory three-gate review (TDD → Spec → Quality).

## What It Does

Dispatches a fresh subagent for each task in an implementation plan, then runs three mandatory review gates: TDD verification (RED→GREEN evidence), spec compliance check, and code quality review. Prevents context pollution, catches issues early, and enforces test-driven development automatically.

## Quick Example

```
Plan: 5-task auth feature

Task 1: Create User model
  → Dispatch implementer subagent (writes test first, then code)
  → TDD Gate: ✅ PASS (test commit before feat commit)
  → Spec Review: ✅ PASS (all fields present)
  → Quality Review: ✅ APPROVED
  → Mark complete

Task 2: Password hashing
  → Implementer combines test+code in one commit
  → TDD Gate: ❌ FAIL (no RED→GREEN evidence)
  → Re-dispatch with strict TDD
  → TDD Gate: ✅ PASS
  → Spec Review → Quality Review → Complete

... continue for all tasks ...

Final: Integration reviewer checks cross-task consistency
```

## When to Use / When NOT To

**Use when:**
- You have an implementation plan with multiple tasks
- Tasks are mostly independent
- Quality and spec compliance matter
- Automated review between tasks is desired

**Don't use for:**
- Single-file fixes (just do it directly)
- Tasks that share files (risk of conflicts)
- Exploration/prototyping without a plan

## Prerequisites

- [ ] Implementation plan written (via writing-plans or plan skill)
- [ ] Tasks decomposed to 2-5 minute granularity
- [ ] Testing framework configured
- [ ] `delegate_task` tool available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Software Development |
| Owning Profile | coding-agent |
| Slash Command | N/A (agent-loaded) |
| Related Skills | writing-plans, meta-software-development, deploy |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-09-04 | Current — three-gate review (TDD→Spec→Quality), fresh subagent per task, context budget discipline |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
