![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Internal Control Governance
> Use when testing internal controls aligned with MCCG (Malaysian Code on Corporate Governance) and Bursa Malaysia SRMIC guidelines. Produces an internal control test report and segregation-of-duties matrix.

## What It Does

Tests internal controls against MCCG and Bursa Malaysia SRMIC guidelines, producing pass/fail reports with exception details and remediation recommendations. Generates Segregation of Duties (SoD) matrices identifying conflicting access combinations and recommending compensating controls or access removal.

## Quick Example

```
Input: Annual internal control review request

Processing:
  1. Load control register from finance/governance/controls.json
  2. Test each control (sample payment approvals, verify dual-approval)
  3. Load SoD matrix, identify conflicts

Output: Internal Control Test Report:
        | Control               | Owner   | Result    | Exception     |
        |-----------------------|---------|-----------|---------------|
        | Payment dual-approval | Finance | ✓ Pass    |               |
        | Vendor creation       | AP Clerk| ✗ Fail    | 3 single-user |

        SoD Conflict: AP Clerk can create vendor AND approve payment
        Recommendation: Remove approval right; add MD review as compensating control
```

## When to Use / When NOT To

**Use when:**
- Annual internal control review or board audit committee needs assurance report
- New financial process needs SoD assessment before go-live
- Bursa Malaysia or external auditor requests control testing evidence
- Control failure needs root-cause investigation

**Don't use for:**
- External audit sampling → use [isa530-audit-pbc-support](../isa530-audit-pbc-support/)
- Tax compliance filing → use [tax-sst-compliance](../tax-sst-compliance/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_purchase_bills`, `acct_list_sales_invoices`, `acct_list_contacts`
- [ ] gbrain `finance` source with control register at `finance/governance/controls.json`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/internal-control-governance` |
| Related Skills | [isa530-audit-pbc-support](../isa530-audit-pbc-support/), [tax-sst-compliance](../tax-sst-compliance/), [period-end-close-checklist](../period-end-close-checklist/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — MCCG/SRMIC control testing, SoD matrix |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
