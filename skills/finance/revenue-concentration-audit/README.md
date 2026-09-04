![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Revenue Concentration Audit
> Use when auditing revenue breakdown by client and flagging concentration risks (>20% total revenue from a single customer). Produces a client revenue concentration table with risk flags.

## What It Does

Analyzes revenue breakdown by customer and flags any single client exceeding 20% of total revenue as a concentration risk. Produces ranked concentration tables for board materials and governance disclosures, supporting both MTD and trailing 12-month structural risk assessments.

## Quick Example

```
Input: Monthly concentration audit for Aug 2026

Processing:
  1. Pull all sales invoices for period
  2. Aggregate revenue by customer
  3. Compute share % and rank descending
  4. Flag customers >20% threshold

Output: Client Revenue Concentration — Aug 2026
        | Rank | Customer       | Revenue   | Share  | Risk Flag              |
        |------|----------------|-----------|--------|------------------------|
        | 1    | MegaCorp Sdn   | RM98,000  | 20.2%  | ⚠️ >20% Concentration  |
        | 2    | TechStart      | RM72,000  | 14.8%  |                        |
        | 3    | GlobalTrade    | RM55,000  | 11.3%  |                        |
        ...
        Total Revenue: RM485,000 | Customers: 42

Saved to: finance/concentration-audit/2026-08.json
```

## When to Use / When NOT To

**Use when:**
- Monthly/quarterly finance review needs concentration assessment
- Board materials require concentration risk disclosure
- New large contract may push customer over 20% threshold
- `monthly-board-report` needs concentration section

**Don't use for:**
- Margin analysis by client → use [unit-economics-margin-analysis](../unit-economics-margin-analysis/)
- AR collections → use [ar-credit-control](../ar-credit-control/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_list_contacts`, `acct_list_sales_invoices`
- [ ] gbrain `finance` source for audit history at `finance/concentration-audit/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/revenue-concentration-audit` |
| Related Skills | [unit-economics-margin-analysis](../unit-economics-margin-analysis/), [cfo-executive-reporting](../cfo-executive-reporting/), [ar-credit-control](../ar-credit-control/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — >20% threshold flagging, ranked concentration table |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
