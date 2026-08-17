# Facility Manager Quarters Inspection — Checklist

## Pre-deploy
- [x] Pack JSON schema created + validated
- [x] Report JSON schema created + validated
- [x] Deterministic report builder works (no VLM needed)
- [x] VLM prompt builder generates correct prompts from pack
- [x] VLM JSON parser handles fenced/raw/leading text
- [x] quarters-inspection SKILL.md documents Telegram + web workflow
- [x] facility PROFILE_META + Eizen SOUL in generate-profile.py
- [x] Verification suite includes facility + quarters-inspection
- [x] PROFILE_CATALOG + HUB + ARCHITECTURE updated
- [x] Schema pack page types (inspection-pack, quarters-inspection)
- [x] E2E offline demo runs successfully
- [x] Dry-run profile generation works
- [x] Telegram pilot runbook written

## Pre-merge (code review)
- [x] Security audit — auth on all endpoints + file serving
- [x] Pre-review cleanup — no placeholders/TODO/secrets
- [x] 48 tests pass
- [x] 15 server tests pass
- [x] tsc --noEmit passes
- [x] py_compile passes

## Post-merge (live)
- [ ] Create Telegram bot via @BotFather
- [ ] Add TELEGRAM_BOT_TOKEN to profile .env
- [ ] Add DASHSCOPE_API_KEY to profile .env
- [ ] Generate profile: `python scripts/generate-profile.py facility-manager --type facility`
- [ ] Start gateway: `hermes serve --profile facility-manager --port 9111`
- [ ] Send `inspect estate-demo Block-A-12` with photos
- [ ] Verify structured report returned
