![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Plan Mode

> Write a detailed markdown plan without executing — brainstorm first, plan second, execute third.

## What It Does

Switches the agent into planning-only mode: inspects the repo with read-only commands, writes a concrete actionable plan to `.hermes/plans/`, and stops. Enforces the mandatory three-phase workflow (Brainstorm → Plan → Execute) with approval gates between each phase.

## Quick Example

```
User: /plan add user authentication

Agent:
1. Reads existing auth code, checks dependencies
2. Writes .hermes/plans/2026-09-04_143022-user-auth.md
   - Goal, approach, step-by-step tasks
   - Files to change: src/auth.py, tests/test_auth.py
   - Risks: session management, token rotation
3. Presents plan and waits for approval
4. Only executes after explicit "go ahead"
```

## When to Use / When NOT To

**Use when:**
- User explicitly requests a plan before implementation
- Complex multi-file changes need design review
- Brainstorming phase is complete and ready for structured planning

**Don't use for:**
- Simple one-file fixes (just do it)
- Tasks that haven't been brainstormed yet (brainstorm first)
- Execution phase (use the plan, don't re-plan)

## Prerequisites

- [ ] Brainstorming phase completed for this task
- [ ] Active workspace with `.hermes/plans/` directory access
- [ ] Read-only inspection tools available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | `/plan` |
| Related Skills | writing-plans, subagent-driven-development |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — three-phase gate, plan output format, save location |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
