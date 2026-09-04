![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Payroll Statutory Accounting
> Use when auditing monthly payroll disbursements and verifying statutory employee/employer contributions for EPF (KWSP), SOCSO (PERKESO), EIS (SIP), and PCB tax. Produces a payroll reconciliation and statutory contribution schedule.

## What It Does

Audits monthly payroll disbursements and verifies statutory contributions for EPF, SOCSO, EIS, and PCB tax against current Malaysian contribution tables. Produces reconciliation journals and remittance schedules with due dates to prevent late payment penalties from KWSP, PERKESO, and LHDN.

## Quick Example

```
Input: August 2026 payroll register (45 employees)

Processing:
  1. Verify EPF: Employee 11%, Employer 13% per salary band
  2. Verify SOCSO: Per contribution table (capped at RM5,000)
  3. Verify EIS: Per EIS schedule
  4. Verify PCB: Per LHDN e-PCB calculation

Output: Payroll Reconciliation Journal:
        Dr Wages Expense         RM285,000
          Cr EPF Payable          RM34,200
          Cr SOCSO Payable         RM4,500
          Cr EIS Payable           RM1,800
          Cr PCB Payable          RM28,500
          Cr Net Salary Payable  RM216,000

        Remittance Due: 15-Sep-2026 (EPF, SOCSO, EIS, PCB)
```

## When to Use / When NOT To

**Use when:**
- Month-end payroll processed, statutory amounts need verification
- New employee onboarding requires contribution band configuration
- Year-end EA Form prep needs PCB reconciliation
- Audit queries statutory deduction accuracy

**Don't use for:**
- Contractor/agent WHT tracking → use [malaysia-contractor-cp58-wht](../malaysia-contractor-cp58-wht/)
- Expense reimbursement audit → use [expense-claim-audit](../expense-claim-audit/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_purchase_bills`, `acct_get_profit_loss`
- [ ] gbrain `finance` source with payroll register at `finance/payroll/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/payroll-statutory-accounting` |
| Related Skills | [malaysia-contractor-cp58-wht](../malaysia-contractor-cp58-wht/), [expense-claim-audit](../expense-claim-audit/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — EPF/SOCSO/EIS/PCB verification, remittance scheduling |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
