# Questionnaire — Skill

Use for Hermes `SKILL.md` packages (agent procedures), not raw MCP contracts.

## Entry

Confirm: **mode=skill**, **skill name** (kebab-case), **owning profile** or `shared`/`all`.

## Questions

1. **Name?** lowercase hyphens, ≤64 chars  
2. **Description?** trigger-focused, ≤1024 chars, prefer "Use when …"  
3. **Category / folder?**  
   - Shogun repo: under `skills/<category>/` (e.g., `skills/finance/`, `skills/general/`, `skills/hermes/`)
   - Match existing peers when possible  
4. **Department?** (REQUIRED)  
   - Which department(s) does this skill belong to?  
   - This determines which department profiles get this skill during onboarding.  
   - Select one or more:  
     - `shared` — installed to ALL departments (use if unsure or cross-department)  
     - `hr` | `finance` | `procurement` | `crm` | `marketing` | `compliance` | `customer-support` | `coding`  
     - `e-commerce` — cross-industry add-on  
     - `production` | `quality` | `maintenance` | `warehouse` | `hse` (manufacturing)  
     - `stores` | `merchandising` | `crm-loyalty` | `supply-chain` | `visual-merchandising` (retail)  
     - `facility` (plantation)  
   - If the user doesn't know, default to `shared`.  
   - This is written to the `departments` field in SKILL.md frontmatter.  
5. **Owning profile(s)?**  
   - one profile | list | all Shogun dept profiles | default only  
   - Auto-suggested from department selection above (e.g. `finance` → `finance-manager`).  
6. **Triggers** (phrases / slash intent)  
7. **Tools required:** terminal | file | web | browser | mcp(which) | delegation | vision | memory | cronjob  
8. **Workflows:** 3–10 named procedures with steps + completion criteria  
9. **Prerequisites:** env vars, MCP servers, other skills, files  
10. **Supporting files?** scripts/ | references/ | templates/  
11. **Cron companion?** if yes → also run workflow questionnaire  
12. **Pitfalls** known now (or "discover during first run")  
13. **Gbrain writes?** if yes: source, page types, frontmatter rules (brain-compliance)  
14. **Ship to repo?** default yes for reusable skills  

## Generation targets

```
# Repo (if shipping)
~/shogun-os/skills/<category>/<name>/
  SKILL.md
  scripts/ ...
  references/ ...
  templates/ ...

# Live Hermes
# default:
~/.hermes/skills/<name>/
# each named owner:
~/.hermes/profiles/<profile>/skills/<name>  → symlink or copy

# Indexes
HUB.md
scripts/install.sh   # full-install already loops skills/*
scripts/verify-install.sh  # add check_skill if core
scripts/generate-profile.py  # add to PROFILE_META[type].skills if profile-default
```

## SKILL.md minimum

- Frontmatter: `name`, `description`, `version`, `departments`, `metadata.hermes.tags`  
  - `departments` is REQUIRED — a list of department slugs (e.g. `[finance]`, `[hr, procurement]`, `[shared]`)  
  - Use `[shared]` if the skill is cross-department or the user is unsure  
  - Valid values: `shared`, `hr`, `finance`, `procurement`, `crm`, `marketing`, `compliance`, `customer-support`, `coding`, `e-commerce`, `production`, `quality`, `maintenance`, `warehouse`, `hse`, `stores`, `merchandising`, `crm-loyalty`, `supply-chain`, `visual-merchandising`, `facility`  
- Body: Overview | When to Use | Procedure | Pitfalls | Verification  
- Description becomes slash-command help text  

## Slash command

Skill `name: foo-bar` → **`/foo-bar`** on every profile that has the skill installed under its skills tree.

## Done when

- [ ] Frontmatter validates (including `departments` field is present and non-empty)  
- [ ] Installed on every owning profile  
- [ ] `/name` works after new session / gateway skill refresh  
- [ ] HUB row if shipped  
- [ ] `validate-skills.py` passes (department field is valid)  
