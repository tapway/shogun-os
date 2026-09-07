![Brain](https://img.shields.io/badge/dept-Brain-purple)

# gbrain Media Ingest

> Ingest video, audio, PDFs, and screenshots into gbrain — extract transcripts/OCR, describe content, extract entities, file correctly.

## What It Does

Handles media-specific ingestion that requires transcription, OCR, or visual description before the content can enter the brain. Processes videos (YouTube transcripts), audio/voice notes (Whisper transcription), PDFs (OCR text extraction), and screenshots (vision-based description). Preserves exact phrasing for voice notes and quotes while summarizing long-form content. All extracted content gets entity-linked and filed under the correct brain path.

## Quick Example

```
User sends voice note: "Remember that Kossan wants to renew in Q3..."

→ Transcribe via Whisper API (preserve EXACT phrasing)
→ Extract entities: Kossan (company), Q3 renewal (deal signal)
→ mcp_gbrain_search("Kossan") → found companies/kossan
→ Write ideas/kossan-q3-renewal-intent.md
   Content: verbatim transcript + context
→ mcp_gbrain_add_link(from="companies/kossan", to=slug)
→ mcp_gbrain_add_timeline_entry("companies/kossan", date, "Renewal intent expressed")
```

## When to Use / When NOT To

**Use when:**
- Processing video content (YouTube, recorded meetings)
- Transcribing audio/voice notes
- OCR-extracting text from PDFs or scanned documents
- Describing screenshots or images for brain storage

**Don't use for:**
- Plain text/markdown files (use `gbrain-ingest`)
- Web articles without media (use `gbrain-idea-ingest`)
- Paraphrasing voice notes — always preserve exact phrasing

## Prerequisites

- [ ] YouTube transcript access (`youtube-content` skill)
- [ ] PDF OCR tools (pymupdf or marker-pdf via `ocr-and-documents` skill)
- [ ] Vision capability for screenshot analysis
- [ ] Audio transcription pipeline (Whisper or equivalent)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Brain |
| Owning Profile | default |
| Slash Command | N/A (triggered by media content) |
| Related Skills | [gbrain-ingest](../gbrain-ingest/), [gbrain-idea-ingest](../gbrain-idea-ingest/), [capture](../capture/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release — video/audio/PDF/screenshot pipelines, preservation rules |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
