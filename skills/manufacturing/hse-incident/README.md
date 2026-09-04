![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# HSE Incident Management

> Report, investigate, and track Health, Safety & Environment incidents — from near-misses to fatalities — with severity classification and safety metrics.

## What It Does

Manages the full HSE incident lifecycle from reporting through investigation and closure. Covers all incident types (near-miss, first aid, medical treatment, LTI, fatality, environmental) with a severity matrix, root cause investigation workflow, and leading/lagging indicator tracking including TRIR and LTIF rates.

## Quick Example

```bash
# Report a near-miss
hse report --type near_miss \
  --description "Slippery floor near line 3" \
  --location "Plant A, Line 3" --reporter "John Doe"
→ INC-2026-001234 created | Severity: Low

# Run investigation
hse investigate INC-2026-001234 \
  --root-cause "Inadequate spill response training"
→ Investigation complete, corrective actions assigned

# Safety dashboard
hse dashboard --from 2026-08-01 --to 2026-08-31
→ TRIR: 2.1 | LTIF: 0.4 | Near-misses: 12 | Training: 94%
```

## When to Use / When NOT To

**Use when:**
- Reporting any safety incident or near-miss
- Running incident investigations with root cause analysis
- Tracking safety KPIs (TRIR, LTIF, leading indicators)
- Regulatory compliance reporting

**Don't use for:**
- Quality-only defects without safety implications → use quality-ncr
- Equipment maintenance issues → use maintenance-downtime

## Prerequisites

- [ ] HSE data storage path configured (`HSE_DATA_PATH`)
- [ ] Escalation contacts defined in environment
- [ ] Regulatory body standard identified (OSHA, DOSH, etc.)
- [ ] No-blame reporting culture established

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (HSE) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | quality-capa, quality-ncr, maintenance-pm |

## Configuration

```bash
# .env
HSE_DATA_PATH=./data/hse/
HSE_REPORTING_HOURS=24
HSE_LTI_BASE_HOURS=200000
HSE_AUTO_ESCALATE_DAYS=7
HSE_REGULATORY_BODY=OSHA
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — incident CRUD, severity matrix, investigation workflow, safety metrics |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
