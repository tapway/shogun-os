---
name: purchase-order-workflow
description: "End-to-end purchase order lifecycle — from requisition approval to supplier delivery tracking."
departments: [procurement]
version: 1.0.0
author: Shogun OS
tags: [po, requisition, supplier, delivery]
metadata:
  hermes:
    related_skills: [ap-vendor-management, inventory-item-management]
---

# Purchase Order Workflow

Use when creating, approving, or tracking purchase orders through the procurement cycle.

## Stages

1. **Requisition** — Department submits PR with item, qty, budget code
2. **Approval** — Auto-route based on value (≤RM5K: manager, >RM5K: director)
3. **PO Creation** — Generate PO from approved PR, send to supplier
4. **Acknowledgement** — Track supplier confirmation within 48 hours
5. **Delivery Tracking** — Monitor ETA, flag delays >3 days
6. **GRN Receipt** — Warehouse confirms goods received, quality check
7. **Closure** — Match GRN to PO, close line items

## Approval Thresholds

| Value (RM) | Approver | SLA |
|------------|----------|-----|
| ≤ 5,000 | Department Manager | 1 day |
| 5,001 – 25,000 | Director | 2 days |
| > 25,000 | CEO + Finance | 3 days |

## Pitfalls

| Issue | Solution |
|-------|----------|
| PR without budget code | Reject and return to requester |
| Supplier no response 48h | Auto-escalate to procurement lead |
| Partial delivery | Keep PO open, track remaining qty |

## Verification

- [ ] PR has valid budget code and approver
- [ ] PO sent to correct supplier email
- [ ] GRN matches PO line items
