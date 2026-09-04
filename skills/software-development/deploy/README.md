![Dev](https://img.shields.io/badge/dept-Dev-yellow)

# Deploy

> Generate deployment checklists and execute safe deployments following project conventions.

## What It Does

Provides a structured deployment pipeline: pre-deployment verification (tests, lint, clean git), branch-based deployment routing (develop→staging, main→production), post-deploy smoke testing across API/Supabase/auth layers, and rollback procedures. Includes WSL-specific pitfalls for Next.js server restarts.

## Quick Example

```bash
# Pre-deploy checklist
make test-all && make lint && git status --short

# Deploy to staging
git push origin develop    # CI auto-deploys

# Post-deploy verification
ss -tlnp | grep 3000     # port listening?
curl -s localhost:3000/api/tasks?limit=1  # API responding?
curl -s -o /dev/null -w "%{http_code}" localhost:3000/  # auth redirect?

# Rollback if needed
git revert HEAD && git push
```

## When to Use / When NOT To

**Use when:**
- Deploying to staging or production
- Restarting a Next.js dev/prod server
- Running post-deploy smoke tests
- Rolling back a failed deployment

**Don't use for:**
- Local development (just run the dev server)
- Version bumping → use release
- Code review → use github-code-review

## Prerequisites

- [ ] All tests passing (`make test-all`)
- [ ] Lint clean (`make lint`)
- [ ] Clean git working tree
- [ ] Correct branch checked out (develop or main)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Software Development |
| Owning Profile | coding-agent |
| Slash Command | N/A (agent-loaded) |
| Related Skills | release, meta-software-development, github-pr-workflow |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — pre-deploy checklist, branch routing, smoke tests, WSL pitfalls |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
