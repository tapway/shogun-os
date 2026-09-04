![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Profile Enrichment

> Universal brain enrichment pipeline — research people and companies after every interaction and update ~/brain/.

## What It Does

After processing emails, meetings, calendar events, or social exports, enriches `~/brain/persons/` and `~/brain/companies/` with web-researched profiles, LinkedIn data, and Apollo.io structured intel. Each person gets their own file with timeline entries. Supports batch enrichment via parallel subagents and Chrome CDP for authenticated LinkedIn access.

## Quick Example

```
Input: Email from "Sarah Chen, VP Engineering @ Acme Corp"

Enrichment pipeline:
1. Check ~/brain/persons/sarah-chen.md → not found
2. Web search: "Sarah Chen Acme Corp VP Engineering"
3. LinkedIn via Chrome CDP: extract role, background, education
4. Apollo.io: verify email, get phone, employee count
5. Create ~/brain/persons/sarah-chen.md with frontmatter
6. Create ~/brain/companies/acme-corp.md if missing
7. Append timeline entry to both files
```

## When to Use / When NOT To

**Use when:**
- After processing emails, meeting transcripts, or calendar events
- After importing conference contacts or business cards
- After receiving Facebook/LinkedIn social exports
- Any time a new person or company appears in interactions

**Don't use for:**
- Internal staff (@your-domain.com) — skip enrichment
- noreply/notification senders — automated systems
- Already-enriched recurring contacts — just add timeline entry

## Prerequisites

- [ ] gbrain initialized (`gbrain doctor` passes)
- [ ] Chrome CDP running for LinkedIn (optional but recommended)
- [ ] Apollo.io API key configured
- [ ] Web search capability available

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (auto-triggered) |
| Related Skills | gbrain-ingest, brain-first-lookup, gbrain-enrich |

## Configuration

Chrome CDP connection:
```bash
# Verify from WSL
GW=$(ip route show default | awk '{print $3}')
curl -s "http://${GW}:9222/json/version"
```

Apollo.io API key in profile `.env`:
```bash
APOLLO_API_KEY=your-key-here
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.6.0 | 2026-09-04 | Current — Chrome CDP, Apollo enrichment, batch subagents, personal contacts path |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
