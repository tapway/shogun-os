![Brain](https://img.shields.io/badge/dept-Brain-purple)

# Timeline Injector v2

> Inject ## Timeline sections with gbrain-compatible format: `- **YYYY-MM-DD** | Source — Summary`. For companies and people pages.

## What It Does

Injects `## Timeline` sections into company and people pages using the exact format that `gbrain extract timeline` parses. The format must be `- **YYYY-MM-DD** | Source — Summary` (bold dates, pipe separator, em-dash before summary) or the extractor silently skips entries. Proven campaign results: 383 pages processed, 26 new timeline entries extracted. Timeline coverage compounds naturally as meetings, deals, and emails get linked over time.

## Quick Example

```markdown
## Timeline
- **2026-05-11** | frontmatter — First encountered in brain
- **2014-01-01** | frontmatter — Company founded
- **2026-03-15** | meeting — Strategy review: expand to Johor
```

```bash
# Dry run
python3 /tmp/timeline-inject-v2.py

# Apply changes
python3 /tmp/timeline-inject-v2.py --apply

# Extract timeline entries into gbrain DB
cd ~/brain && gbrain extract timeline && gbrain extract all
```

## When to Use / When NOT To

**Use when:**
- Adding timeline entries to company or people pages
- Running bulk timeline injection campaigns
- After collecting dated events that need timeline representation
- As part of brain maintenance to improve timeline coverage

**Don't use for:**
- Pages without meaningful dates
- Using plain `- YYYY-MM-DD | text` format (won't extract — must be bold)
- Running both CLI `timeline-add` and section injection on same page (dedup conflicts)

## Prerequisites

- [ ] gbrain CLI installed with `extract timeline` command
- [ ] Brain repo at `~/brain/`
- [ ] Timeline injector script at `/tmp/timeline-inject-v2.py`
- [ ] Git access for committing timeline changes

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (campaign/maintenance trigger) |
| Related Skills | [meeting-brain-classifier](../meeting-brain-classifier/), [brain-compliance](../brain-compliance/), [maintain](../maintain/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-06-21 | Updated format spec, proven campaign results, automatic source documentation |
| 1.0.0 | 2026-06-01 | Initial release — timeline injection with gbrain-compatible format |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
