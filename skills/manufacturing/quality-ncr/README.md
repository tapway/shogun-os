![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# Quality NCR

> Manage Non-Conformance Reports — create, disposition (use-as-is / rework / scrap / RTV), track closure, and generate defect Pareto and aging reports.

## What It Does

Manages the complete non-conformance lifecycle from identification through containment, investigation, disposition, and closure. Supports four disposition types (use-as-is, rework, scrap, return-to-vendor) with responsible person and due date enforcement. Includes defect Pareto analysis by code/product/line and aging reports with escalation recommendations.

## Quick Example

```bash
# Create an NCR
ncr create --product PROD-A --defect DIM-001 --quantity 5 \
  --disposition rework --source inspection
→ NCR-2026-001234 created | Disposition: Rework | Priority: Medium

# List open NCRs
ncr list --status open --priority high
→ NCR-2026-001230 | PROD-B | FUNC-001 | 12 days open
→ NCR-2026-001234 | PROD-A | DIM-001  | 3 days open

# Defect Pareto (last 30 days)
ncr pareto --from 2026-08-05 --to 2026-09-04
→ DIM-001: 18 (32%) | FIN-001: 12 (21%) | FUNC-001: 8 (14%)

# Aging report
ncr aging --days-open 7
→ 3 NCRs > 14 days | Recommend escalation for NCR-2026-001220
```

## When to Use / When NOT To

**Use when:**
- Documenting quality deviations or defects
- Dispositioning non-conforming product
- Generating defect Pareto for continuous improvement
- Tracking NCR aging and closure rates

**Don't use for:**
- Root cause analysis workflows → use quality-capa
- Safety-only incidents → use hse-incident

## Prerequisites

- [ ] NCR data storage path configured (`NCR_DATA_PATH`)
- [ ] Defect code catalog defined (`defect-codes.yaml`)
- [ ] Escalation levels configured
- [ ] Disposition workflow documented

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Quality) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | quality-capa, production-oee, erp-connector, hse-incident |

## Configuration

```bash
# .env
NCR_DATA_PATH=./data/ncr/
NCR_AUTO_ESCALATE_DAYS=14
NCR_CLOSURE_TIMEOUT_DAYS=30
NCR_DEFECT_CODES_PATH=./config/defect-codes.yaml
NCR_ESCALATION_LEVELS=supervisor,manager,director
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — NCR CRUD, 4 disposition types, defect Pareto, aging reports |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
