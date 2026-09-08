---
name: customer-onboarding
description: "Post-sale customer onboarding workflow — account setup, training scheduling, and success milestone tracking."
departments: [crm]
version: 1.0.0
author: Shogun OS
tags: [onboarding, customer-success, training, handover]
metadata:
  hermes:
    related_skills: [handover-workflow, customer-communication-onboarding]
---

# Customer Onboarding

Use when a new customer signs a contract and needs to be onboarded onto the platform or service.

## Phases

### Phase 1: Handover (Day 0–2)
- Sales completes handover form (contract value, key contacts, go-live date)
- CS manager assigned based on tier (Enterprise/SMB)
- Welcome email sent with onboarding portal link

### Phase 2: Setup (Day 3–14)
- Account provisioning (users, roles, integrations)
- Data migration plan confirmed
- Kickoff call scheduled with stakeholders

### Phase 3: Training (Day 15–30)
- Role-based training sessions (admin, end-user, reporting)
- Knowledge base access granted
- First support ticket test

### Phase 4: Go-Live & Review (Day 30–45)
- Go-live checklist completed
- 30-day health check survey sent
- Success metrics baseline established

## Tier Assignment

| Contract Value | Tier | CS Ratio | Onboarding Duration |
|---------------|------|----------|-------------------|
| > RM 100K/yr | Enterprise | 1:15 | 45 days |
| RM 20K–100K | Mid-Market | 1:30 | 30 days |
| < RM 20K | SMB | 1:50 | 14 days |

## Pitfalls

| Issue | Solution |
|-------|----------|
| No kickoff within 5 days | Auto-escalate to CS director |
| Training attendance < 60% | Reschedule + send recording |
| Data migration delayed | Flag as at-risk, extend timeline |

## Verification

- [ ] Handover form complete with all fields
- [ ] Kickoff call held within first week
- [ ] All users provisioned before training
- [ ] 30-day health check survey sent
