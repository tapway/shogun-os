![Dev](https://img.shields.io/badge/dept-Dev-yellow)

# Release

> Bump semver, generate changelog, and create git tags for versioned releases.

## What It Does

Automates the release workflow: reads current version from `VERSION`, bumps patch/minor/major, moves unreleased changelog entries to `CHANGELOG.md` under a dated header, resets the unreleased file, and creates a git commit + tag. Replicates the `/release` slash command behavior.

## Quick Example

```bash
# Before release
echo "- Added user authentication" >> CHANGELOG.unreleased.md
echo "- Fixed pagination bug" >> CHANGELOG.unreleased.md

# Release
/release minor    # 0.1.0 → 0.2.0

# Result:
# VERSION contains "0.2.0"
# CHANGELOG.md has "## v0.2.0 (2026-09-04)" with both entries
# CHANGELOG.unreleased.md reset to empty
# Git commit + tag v0.2.0 created

# Push
git push && git push --tags
```

## When to Use / When NOT To

**Use when:**
- Ready to ship a new version
- Need to bump semver and tag a release
- Changelog entries accumulated in `CHANGELOG.unreleased.md`

**Don't use for:**
- Deployment → use deploy
- Feature development → use meta-software-development
- PR creation → use github-pr-workflow

## Prerequisites

- [ ] Clean git working tree (no uncommitted changes)
- [ ] `CHANGELOG.unreleased.md` has actual entries
- [ ] On the correct branch (usually main)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Software Development |
| Owning Profile | coding-agent |
| Slash Command | `/release` |
| Related Skills | deploy, github-pr-workflow |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — semver bump, changelog generation, git tagging |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
