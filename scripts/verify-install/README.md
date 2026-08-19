# Verify Install Scripts

These are **post-install environment verification scripts**, not regression tests.

They check that the host machine has the required tools installed (Ollama,
PostgreSQL, etc.) and that provisioning scripts are syntactically valid.

## When to run

- After a fresh install of Shogun OS on a new machine
- After upgrading gbrain infrastructure
- NOT in CI (CI runner doesn't have Ollama/PG)

## Scripts

| Script | What it checks | External service? |
|--------|---------------|-------------------|
| `test-backup-script.sh` | gbrain-backup.sh content | No |
| `test-docs-updated.sh` | ARCHITECTURE.md + CHANGELOG.md content | No |
| `test-dream-cron.sh` | gbrain-dream-cron.sh content | No |
| `test-http-service.sh` | gbrain HTTP service + systemd unit | No |
| `test-init-gbrain-v12.sh` | init-gbrain.sh v1.2.0 sections | No |
| `test-migration-script.sh` | migration script content | No |
| `test-ollama-setup.sh` | Ollama binary + model + service | **Yes — Ollama** |
| `test-pg-install.sh` | PostgreSQL + pgvector | **Yes — PG** |

## Run all

```bash
for f in scripts/verify-install/test-*.sh; do bash "$f"; done
```
