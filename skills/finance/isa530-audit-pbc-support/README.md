![Finance](https://img.shields.io/badge/dept-Finance-blue)

# ISA 530 Audit PBC Support
> Use when executing ISA 530 Audit Sampling (deterministic Python random sampling), packaging Prepared by Client (PBC) documents, or vaulting audit trails. Produces a sample selection list and a PBC document package.

## What It Does

Executes ISA 530 compliant audit sampling using deterministic Python random selection with documented seeds for auditor replication. Packages Prepared by Client (PBC) documents into structured folders with cover indexes, and vaults period-end audit trails for 7-year retention compliance.

## Quick Example

```
Input: External auditor requests sample of 50 sales invoices
       Audit reference: AUD-2026-Q3

Processing:
  1. Pull population: 1,247 invoices for Q3 2026
  2. random.seed("AUD-2026-Q3") → deterministic sample of 50
  3. Package PBC documents with cover index

Output: Sample list saved to finance/audit/pbc/sample-AUD-2026-Q3.json
        PBC package at finance/audit/pbc/package-AUD-2026-Q3/
        Cover index: 50 items, 48 provided, 2 pending
        Seed documented: "AUD-2026-Q3" (replicable by auditor)
```

## When to Use / When NOT To

**Use when:**
- External auditors issued PBC request list
- Audit fieldwork requires random sample under ISA 530
- Internal audit needs statistically supportable sample
- Year-end close requires audit trail vault

**Don't use for:**
- Internal control testing → use [internal-control-governance](../internal-control-governance/)
- Statutory financial statement prep → use [financial-statement-prep](../financial-statement-prep/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_sales_invoices`, `acct_list_purchase_bills`, `acct_list_contacts`
- [ ] gbrain `finance` source for PBC packages at `finance/audit/pbc/`
- [ ] Audit reference string for deterministic seed

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/isa530-audit-pbc-support` |
| Related Skills | [internal-control-governance](../internal-control-governance/), [financial-statement-prep](../financial-statement-prep/), [period-end-close-checklist](../period-end-close-checklist/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — ISA 530 sampling, PBC packaging, audit trail vault |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
