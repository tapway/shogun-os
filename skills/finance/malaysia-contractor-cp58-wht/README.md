![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Malaysia Contractor CP58 & WHT
> Use when tracking payouts to local independent contractors/agents for LHDN Form CP58 (>RM 5,000 threshold), LHDN Self-Billed e-Invoicing, or Section 107A/109B Withholding Tax (WHT) for foreign vendors. Produces a CP58 register and WHT computation.

## What It Does

Tracks payouts to Malaysian independent contractors for LHDN Form CP58 reporting (triggered when annual payments exceed RM5,000), handles self-billed e-Invoicing mandates, and computes Section 107A/109B withholding tax for foreign vendor payments. Produces annual CP58 registers and per-payment WHT schedules.

## Quick Example

```
Input: Year-end CP58 compilation + foreign vendor payment

Processing:
  1. Aggregate contractor payments for calendar year
  2. Flag payees exceeding RM5,000 threshold
  3. Compute WHT for foreign vendor: RM20,000 × 10% = RM2,000

Output: CP58 Register:
        | Contractor      | IC/BRN      | Total Paid | CP58 Required |
        |-----------------|-------------|------------|---------------|
        | Ali bin Abu     | 850101-14-XXXX | RM8,500  | ✓ Yes         |
        | Siti Consulting | 1234567-X   | RM3,200    | ✗ No          |

        WHT Computation (Section 107A):
        Gross: RM20,000 | WHT (10%): RM2,000 | Net: RM18,000
        Remittance due: 30-Sep-2026
```

## When to Use / When NOT To

**Use when:**
- Payment to contractor exceeds RM5,000 cumulative in calendar year
- Self-billed e-Invoice required under LHDN mandate
- Foreign vendor payment subject to Section 107A/109B WHT
- Year-end CP58 forms need compilation and distribution

**Don't use for:**
- Regular employee payroll tax → use [payroll-statutory-accounting](../payroll-statutory-accounting/)
- Corporate SST filing → use [tax-sst-compliance](../tax-sst-compliance/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_purchase_bills`, `acct_list_contacts`
- [ ] gbrain `finance` source with contractor master at `finance/contractors/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/malaysia-contractor-cp58-wht` |
| Related Skills | [payroll-statutory-accounting](../payroll-statutory-accounting/), [ap-vendor-management](../ap-vendor-management/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — CP58 register, self-billed e-Invoice, WHT computation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
