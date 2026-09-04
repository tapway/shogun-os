![General](https://img.shields.io/badge/dept-General-gray)

# Coding Workflow

> Routes all coding tasks to the dedicated coding-agent profile following the Superpowers 11-step workflow.

## What It Does

Serves as the routing convention for all coding work in Shogun OS. When any user request involves building, implementing, fixing, refactoring, deploying, or reviewing code, this skill delegates to the `coding-agent` profile which follows a disciplined 11-step workflow: Brainstorm → Plan → Commit Docs → TDD → Cleanup → Simplify → Self-Review → PR → Deploy → Release → Verify.

## Quick Example

```
User: "Add a new endpoint for customer returns"

→ Load coding-workflow skill
→ Classify: Feature (new functionality)
→ Delegate to coding-agent profile:
  "Implement POST /api/returns endpoint with validation,
   tests, and documentation"
→ coding-agent executes: brainstorm → plan → TDD → PR → deploy
```

## When to Use / When NOT To

**Use when:**
- Building new features or endpoints
- Fixing bugs or debugging failures
- Refactoring or improving existing code
- Deploying, releasing, or shipping changes
- PR review or code review requests

**Don't use for:**
- Product management (PRDs, epics, sprint planning)
- Non-coding tasks (document writing, research)
- Configuration changes that don't involve code

## Prerequisites

- [ ] `coding-agent` Hermes profile configured and available
- [ ] Project repository accessible
- [ ] Relevant project skills loaded in coding-agent profile

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any (delegates to coding-agent) |
| Slash Command | `/coding-workflow` |
| Related Skills | [company-workflow](../company-workflow/), [writing-plans](../writing-plans/), [systematic-debugging](../systematic-debugging/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — routing convention, 3 delegation options, Superpowers 11-step reference |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
