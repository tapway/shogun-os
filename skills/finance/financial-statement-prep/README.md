![Finance](https://img.shields.io/badge/dept-Finance-blue)

# Financial Statement Preparation
> Use when preparing statutory Profit & Loss, Balance Sheet, Statement of Cash Flows, and Statement of Changes in Equity compliant with MFRS / MPERS.

## What It Does

Prepares the four primary statutory financial statements (P&L, Balance Sheet, Cash Flows, Changes in Equity) formatted per Malaysian MFRS/MPERS disclosure requirements. Derives cash flow and equity movement statements from P&L and balance sheet data, ensuring all statements reconcile internally and to source GL.

## Quick Example

```
Input: Period-end date 31-Aug-2026

Processing:
  1. Pull P&L via acct_get_profit_loss
  2. Pull Balance Sheet via acct_get_balance_sheet
  3. Derive Cash Flow Statement from BS movements + non-cash items
  4. Derive Changes in Equity from equity movements

Output: Four MFRS-compliant statements saved to
        finance/statements/2026-08/
        ✓ All statements reconcile internally
        ✓ Cash flow ties to net cash movement
```

## When to Use / When NOT To

**Use when:**
- Statutory period-end requires primary financial statements
- Cash flow statement must be derived from P&L and BS movements
- Statements must comply with MFRS/MPERS presentation requirements

**Don't use for:**
- Trial balance verification / period lock → use [period-end-close-checklist](../period-end-close-checklist/)
- Revenue recognition assurance → use [mfrs15-revenue-recognition](../mfrs15-revenue-recognition/)

## Prerequisites

- [ ] Owning profile: `finance-manager`
- [ ] MCP tools: `acct_get_profit_loss`, `acct_get_balance_sheet`
- [ ] gbrain `finance` source for statement archive at `finance/statements/`

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Finance |
| Owning Profile | finance-manager |
| Slash Command | `/financial-statement-prep` |
| Related Skills | None |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — MFRS/MPERS compliant statement preparation |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
