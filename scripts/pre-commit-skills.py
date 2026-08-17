#!/usr/bin/env python3
"""
Pre-commit hook: validate SKILL.md departments field.

Install (in repo root):
  echo 'python scripts/validate-skills.py' >> .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit

Or with pre-commit framework (.pre-commit-config.yaml):
  repos:
    - repo: local
      hooks:
        - id: validate-skills
          name: Validate SKILL.md departments
          entry: python scripts/validate-skills.py
          language: system
          pass_filenames: false
          files: ^skills/.*SKILL\\.md$
"""

# This file is documentation-only — the actual validation
# runs from scripts/validate-skills.py directly.
# See .pre-commit-config.yaml for the framework integration.
