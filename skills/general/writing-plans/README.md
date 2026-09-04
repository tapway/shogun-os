![General](https://img.shields.io/badge/dept-General-gray)

# Writing Plans

> Writes comprehensive implementation plans with bite-sized tasks, file paths, code snippets, and testing commands.

## What It Does

Produces detailed implementation plans assuming the implementer has zero context for the codebase. Documents everything needed: which files to touch, complete code, testing commands, docs to check, and verification steps. Each task is 2–5 minutes of focused work. Follows DRY, YAGNI, TDD principles with frequent commits. Must be preceded by brainstorming.

## Quick Example

```
Plan: Add return endpoint to orders API

## Task 1: Write failing test (2 min)
File: tests/test_returns.py
Code:
  def test_create_return_valid_order():
      resp = client.post("/api/returns", json={...})
      assert resp.status_code == 201

## Task 2: Create Return model (3 min)
File: app/models/return.py
Code: [complete model definition]
Verify: python -m pytest tests/test_models.py -v

## Task 3: Implement endpoint (5 min)
File: app/routes/returns.py
Code: [complete route handler]
Verify: python -m pytest tests/test_returns.py -v

## Task 4: Add validation (2 min)
...
```

## When to Use / When NOT To

**Use when:**
- Before implementing multi-step features
- Breaking down complex requirements
- Delegating to subagents or junior developers
- Any feature that touches multiple files

**Don't use for:**
- Single-line fixes or typos
- Tasks already fully understood and trivial
- Skipping brainstorming (brainstorm → plan → execute)

## Prerequisites

- [ ] Completed brainstorming phase (Phase 1)
- [ ] Understanding of target codebase structure
- [ ] Clear requirements or user story

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/writing-plans` |
| Related Skills | [company-workflow](../company-workflow/), [systematic-debugging](../systematic-debugging/), [coding-workflow](../coding-workflow/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-09-04 | Adapted from obra/superpowers — bite-sized tasks, TDD-first, DRY/YAGNI principles |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
