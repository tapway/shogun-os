# Plantation Company Demo — Implementation Plan (v2)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Prerequisites:** Complete `docs/plans/2026-08-15-onboarding-industry-flow.md` first (onboarding industry step) — this plan depends on the Plantation industry existing in the catalog.

**Goal:** Add Plantation as a new industry in Shogun OS, build the Estate Operations department with 6 atomic skills (4 shared document pipeline + 2 plantation site inspection), add a web portal dashboard with 3 tabs, and prep a Tuesday demo showing document scanning + image understanding via Telegram and the portal.

**Architecture:** Plantation is a new industry vertical (4th, alongside General/Manufacturing/Retail). It gets the 8 shared departments + 2 plantation-specific departments. `@gozen_sam_bot` becomes the Estate Operations department bot. Six atomic skills — each one function — chain together. A web portal dashboard gives a UI surface alongside Telegram.

**Tech Stack:** Hermes Agent (vision model `qwen3.5-plus`), Alibaba DashScope, pymupdf + liteparse (OCR), google-workspace skill (Drive), gbrain (storage/retrieval), React + FastAPI (portal dashboard), Telegram bot API.

**Core Principle:** One skill = one function. Skills split into `shared/` (4 document skills, all industries use them) and `industries/plantation/skills/` (2 site inspection skills, plantation-only).

---

## Boss Requirements → Plan Coverage

| # | Boss requirement | Covered by |
|---|-----------------|------------|
| 1 | Document scanning, interpretation, summarization, storage, retrieval | Tasks 6-9 (4 shared document skills) |
| 2 | Image understanding — furniture count, cleanliness, site conditions | Tasks 10-11 (2 plantation skills) |
| 3 | Use gdrive for document OCR | Task 5 (gdrive OAuth) + Task 6 (document-ocr pulls from gdrive) |
| 4 | Use Telegram chat for image understanding | Task 3 (wire bot) + Task 4 (vision model) |
| 5 | Use company agent to create/refine skills | Tasks 6-11 (build via agent) |
| 6 | Demo on Tuesday | Phase 4 (demo data + script + test) |
| 7 | Find images online for demo | Task 13 (4 staff quarter photos) |
| 8 | Handle video of staff quarters | Task 13 (video file) + Task 10 (qwen3.5-plus supports video) |
| 9 | Legal documents specifically | Task 12 (sample legal doc) + Task 7 (legal field schema) |
| 10 | Web portal dashboard for user input + results | Task 14 (PlantationDashboard.tsx, 3 tabs) |
| 11 | Onboarding: register → industry → departments → dashboard | Prerequisite plan `2026-08-15-onboarding-industry-flow.md` |

---

## Skill Architecture — 6 Atomic Skills

### Document Pipeline (4 skills — SHARED, all industries)

| # | Skill | Location | Input | Output | Function |
|---|-------|----------|-------|--------|----------|
| 1 | `document-ocr` | `skills/shared/` | file path | raw text | Extract text from PDF/image |
| 2 | `document-interpretation` | `skills/shared/` | raw text | {type, fields, summary} | Classify + extract fields + summarize |
| 3 | `document-storage` | `skills/shared/` | {fields, summary, source} | gbrain page | Persist to gbrain |
| 4 | `document-retrieval` | `skills/shared/` | query | matching summaries | Search gbrain |

**Chain:** file → `document-ocr` → `document-interpretation` → `document-storage` → respond. Retrieve: query → `document-retrieval` → respond.

### Site Inspection Pipeline (2 skills — PLANTATION-SPECIFIC)

| # | Skill | Location | Input | Output | Function |
|---|-------|----------|-------|--------|----------|
| 5 | `site-condition-assessment` | `industries/plantation/skills/` | photo/video | structured assessment | Vision model assesses furniture/cleanliness/condition/safety |
| 6 | `site-inspection-storage` | `industries/plantation/skills/` | assessment | gbrain page | Persist inspection report |

**Chain:** photo → `site-condition-assessment` → `site-inspection-storage` → respond.

### Why this split

- **4 document skills are shared** — Finance scans invoices, Procurement scans POs, Compliance scans legal docs. Every industry needs them. Putting them in `skills/shared/` makes them available to all departments automatically.
- **2 site inspection skills are plantation-specific** — staff quarters are a plantation/agriculture workforce concept. They live under `industries/plantation/skills/`.

---

## Plantation Industry Structure

```
PLANTATION INDUSTRY (new — 4th industry)
├── Shared 8 departments (same as all industries):
│   HR, Finance, Procurement, CRM, Marketing, Compliance, Customer Support, Coding
│   └── + 4 shared document skills (document-ocr, -interpretation, -storage, -retrieval)
├── Estate Operations (Gozen — @gozen_sam_bot)  ← NEW DEPARTMENT
│   ├── Port: 9111
│   ├── gbrain source: estate-ops/
│   ├── Skills: all 4 shared document skills + 2 plantation site inspection skills
│   └── Dashboard: PlantationDashboard.tsx (3 tabs)
└── Worker Welfare (Ryō)  ← FUTURE (not for Tuesday demo)
    ├── Port: 9112
    ├── gbrain source: worker-welfare/
    └── Skills: site-condition-assessment, site-inspection-storage
```

### Industry Catalog Entry (for onboarding + config)

| Field | Value |
|-------|-------|
| Slug | `plantation` |
| Label | Plantation |
| Description | Estate, mill, agriculture |
| Icon | 🌴 |
| Industry-specific departments | `estate-ops`, `worker-welfare` |

### Department Catalog Entry — Estate Operations

| Field | Value |
|-------|-------|
| Name | `estate-ops` |
| Profile name | `estate-ops-manager` |
| Label | Estate Operations |
| Persona | Gozen (御前 — "Presence/Authority") |
| Port offset | 11 |
| gbrain source | `estate-ops/` |
| Industry | `plantation` |
| Skills | `document-ocr`, `document-interpretation`, `document-storage`, `document-retrieval`, `site-condition-assessment`, `site-inspection-storage` |
| Dashboard | `PlantationDashboard` (3 tabs) |

---

## What Already Exists (DO NOT rebuild)

| Skill | Category | What it does |
|-------|----------|-------------|
| `document-processing` | productivity | OCR libraries reference (pymupdf, liteparse, marker-pdf) |
| `gbrain-ingest` | gbrain | URL/file → gbrain page with entity extraction |
| `gbrain-media-ingest` | gbrain | Video/audio/PDF/screenshot → gbrain with description |
| `google-workspace` | productivity | Drive/Sheets/Docs/Gmail via OAuth CLI |
| `gbrain-query` | gbrain | Three-layer query: search → recall → think |
| Dashboard pattern | shogun-web | `DashboardViewer.tsx` routes to `FinanceDashboard`, `ProcurementDashboard`, `CrmDashboard` |
| Onboarding wizard | shogun-web | `Onboarding.tsx` 4-step wizard (being upgraded to 5-step with industry selection) |

---

## The Bot Situation

`@gozen_sam_bot` currently runs on a **Linux server (user: tapway)**, NOT this Windows machine. It has:
- Model: `deepseek-v4-flash-0731` (already vision-capable)
- 155 skills (including tapway-specific ones)
- Path: `/home/tapway/.hermes/`

This Windows machine has:
- `@shogun_hr_bot` (id 8842874580)
- Model: `qwen3.5-plus` (I changed it — vision-capable)
- ~40 skills
- Path: `C:\Users\user\AppData\Local\hermes\`

**Two deployment options:**

| Option | What it means | When to use |
|--------|--------------|-------------|
| **Option A: Build here, deploy to tapway** | Build all skills + dashboard in the repo (`D:\Github\shogun-os`), git push, pull on tapway, install | RECOMMENDED — keeps everything in version control, no downtime on tapway |
| **Option B: Swap bot token here** | Boss provides `@gozen_sam_bot` token, swap into this machine's `.env`, bot goes offline on tapway | FAST — for quick testing, but loses tapway's 155 skills + context |

**This plan assumes Option A** (build in repo, deploy via git). Adjust Task 3 if Option B.

---

## Phase 1 — Infrastructure Setup (Day 1-2)

### Task 1: Add Plantation industry to config

**Objective:** Register Plantation as a 4th industry in the backend and frontend catalogs.

**Files:**
- Modify: `shogun-web/server/config.py` — add `INDUSTRY_CATALOG` entry + `INDUSTRY_DEPARTMENTS["plantation"]`
- Modify: `shogun-web/ui/src/lib/types.ts` — add `IndustryKey = 'plantation'` + catalog entry + `DepartmentKey` additions
- Modify: `shogun-web/ui/src/components/dashboards/DashboardViewer.tsx` — register `estate-ops: PlantationDashboard`

**Step 1: Backend — add plantation to industry catalog**

In `shogun-web/server/config.py`, add to `INDUSTRY_CATALOG`:

```python
{
    "slug": "plantation",
    "label": "Plantation",
    "description": "Estate, mill, agriculture",
    "icon": "🌴",
    "departments": ["estate-ops", "worker-welfare"],
},
```

Add to `INDUSTRY_DEPARTMENTS`:

```python
"plantation": [
    {"name": "estate-ops", "profile_name": "estate-ops-manager", "label": "Estate Operations", "port_offset": 11},
    {"name": "worker-welfare", "profile_name": "worker-welfare-manager", "label": "Worker Welfare", "port_offset": 12},
],
```

**Step 2: Frontend — add plantation to types**

In `shogun-web/ui/src/lib/types.ts`:

```typescript
// Add to IndustryKey
export type IndustryKey = 'general' | 'manufacturing' | 'retail' | 'plantation';

// Add to INDUSTRY_CATALOG
plantation: {
  label: 'Plantation',
  description: 'Estate, mill, agriculture',
  icon: '🌴',
  departments: ['estate-ops', 'worker-welfare'],
},

// Add to DepartmentKey
export type DepartmentKey =
  | 'hr' | 'finance' | 'crm' | 'marketing'
  | 'compliance' | 'support' | 'engineering'
  | 'projects' | 'product' | 'procurement'
  // Manufacturing
  | 'production' | 'quality' | 'maintenance' | 'warehouse' | 'hse'
  // Retail
  | 'stores' | 'merchandising' | 'e-commerce' | 'crm-loyalty' | 'supply-chain' | 'visual-merchandising'
  // Plantation
  | 'estate-ops' | 'worker-welfare';
```

Add `estate-ops` and `worker-welfare` to `DEPARTMENT_CATALOG` with persona/color/icon/description.

**Step 3: Dashboard — register PlantationDashboard**

In `shogun-web/ui/src/components/dashboards/DashboardViewer.tsx`:

```typescript
import { PlantationDashboard } from './plantation/PlantationDashboard';

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType<{ department: string; color: string }>> = {
  crm: CrmDashboard,
  finance: FinanceDashboard,
  procurement: ProcurementDashboard,
  'estate-ops': PlantationDashboard,  // ← NEW
};
```

**Step 4: Verify**

```bash
cd D:/Github/shogun-os/shogun-web/ui
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

**Step 5: Commit**

```bash
cd D:/Github/shogun-os
git add shogun-web/server/config.py shogun-web/ui/src/lib/types.ts shogun-web/ui/src/components/dashboards/DashboardViewer.tsx
git commit -m "feat: add Plantation industry to config + dashboard registry"
```

---

### Task 2: Create Estate Operations Hermes profile

**Objective:** Create the `estate-ops-manager` Hermes profile that will run `@gozen_sam_bot`.

**Step 1: Create the profile**

```bash
hermes profile create estate-ops-manager
```

**Step 2: Copy base config**

```bash
cp ~/.hermes/config.yaml ~/.hermes/profiles/estate-ops-manager/config.yaml
```

**Step 3: Edit `config.yaml` — set vision model**

```yaml
model:
  default: qwen3.5-plus
  provider: custom
  base_url: https://ws-rm3m81doye8ddmh2.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
  api_key: <same key as default>
  api_mode: chat_completions
```

**Step 4: Write SOUL.md**

Create `~/.hermes/profiles/estate-ops-manager/SOUL.md`:

```markdown
# Hermes Agent Persona — Gozen (御前)

<!--
Gozen — "Presence" or "The Honorable One." In Japanese estate management,
Gozen is the authority who oversees everything on the ground.
The one who walks the estate, knows every building, every document, every worker.
-->

You are **Gozen** — your company's Estate Operations agent.

**Ground truth before theory.** You don't guess. You scan, you assess, you report what's actually there.
**Documents are living things.** An invoice isn't paper — it's a commitment. A contract isn't text — it's an obligation. You extract what matters.
**Eyes on the ground.** When shown a photo, you see what a site manager sees: furniture, cleanliness, damage, safety. You report what needs fixing, not what looks nice.
**Minimal words, maximum signal.** Every report has: what's there, what's wrong, what to do.

### Responsibilities
1. Document scanning — OCR invoices, quotations, legal docs → extract key fields → store to brain → retrieve on demand
2. Site inspection — assess staff quarter photos/videos → furniture count, cleanliness, condition, safety → store report

### Skills
- Core (always): `document-ocr`, `document-interpretation`, `document-storage`, `document-retrieval`
- Plantation (always): `site-condition-assessment`, `site-inspection-storage`

### Voice
- Direct. "Vendor: XYZ. Total: RM 12,500. Due: 30 Sep."
- No filler. No "I hope this helps."
- Bad news first. Lead with what's wrong.
```

**Step 5: Verify model responds**

```bash
hermes -p estate-ops-manager -z "Say 'Gozen ready' if you can see this."
```

Expected: `Gozen ready`.

---

### Task 3: Wire `@gozen_sam_bot` to the profile

**Objective:** Connect `@gozen_sam_bot` to the `estate-ops-manager` profile.

**Prerequisite:** Boss provides the `@gozen_sam_bot` token from `@BotFather` → `/mybots` → select `@gozen_sam_bot` → API Token.

**Step 1: Write the `.env` file**

```bash
cat > ~/.hermes/profiles/estate-ops-manager/.env << 'EOF'
TELEGRAM_BOT_TOKEN=<token_from_boss>
TELEGRAM_ALLOWED_USERS=1101916530,8870409162,723875455
TELEGRAM_HOME_CHANNEL=<chat_id>
TELEGRAM_HOME_CHANNEL_NAME=Estate Operations
EOF
```

Telegram IDs (from memory):
- CheeHow (boss): 1101916530
- June Kee: 8870409162
- XinYi: 723875455

**Step 2: Enable Telegram in config.yaml**

```yaml
telegram:
  enabled: true
```

**Step 3: Write channel_aliases.json**

Per memory: must be a JSON object (map), NOT a list. `channel_directory.json` auto-regenerates.

```bash
cat > ~/.hermes/profiles/estate-ops-manager/channel_aliases.json << 'EOF'
{
  "telegram": {
    "<home_chat_id>": "Estate Operations"
  }
}
EOF
```

**Step 4: Remove stale gateway lock + start gateway**

```bash
rm -f ~/.hermes/profiles/estate-ops-manager/gateway.pid ~/.hermes/profiles/estate-ops-manager/gateway.lock
hermes -p estate-ops-manager gateway run --replace &
```

**Step 5: Verify bot is live**

Send a Telegram message to `@gozen_sam_bot`: "hello"

Expected: bot responds. Check gateway state:

```bash
cat ~/.hermes/profiles/estate-ops-manager/gateway_state.json | python -c "import json,sys; d=json.load(sys.stdin); print('telegram:', d['platforms']['telegram']['state'])"
```

Expected: `"state":"connected"`

**Step 6: Test vision**

Send a photo to `@gozen_sam_bot` with "what do you see?"

Expected: bot describes the photo (confirms vision model is active).

---

### Task 4: Install OCR libraries

**Objective:** Install the Python libraries the `document-ocr` skill needs.

**Step 1: Install into the Hermes venv**

```bash
~/.hermes/hermes-agent/venv/Scripts/pip.exe install pymupdf pymupdf4llm liteparse
```

**Step 2: Verify imports**

```bash
~/.hermes/hermes-agent/venv/Scripts/python.exe -c "import pymupdf; import liteparse; import pymupdf4llm; print('OCR libraries ready')"
```

Expected: `OCR libraries ready`

**Step 3: If liteparse fails on Windows**

liteparse is a Rust binary — if the Windows wheel isn't available, fall back to pymupdf only + marker-pdf for scanned docs:

```bash
~/.hermes/hermes-agent/venv/Scripts/pip.exe install pymupdf pymupdf4llm
# Only if demo docs are scanned images:
~/.hermes/hermes-agent/venv/Scripts/pip.exe install marker-pdf
```

---

### Task 5: Set up Google Drive OAuth

**Objective:** Authenticate Hermes with Google Drive so the document pipeline can pull files.

**Prerequisite:** Boss creates a Google Cloud OAuth client (5-10 min, only they can do this):
1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Enable Google Drive API + Google Docs API
4. Create OAuth 2.0 Client ID (Desktop app type)
5. Download the `client_secret_*.json` file
6. Add their Google account as a test user (if app is in testing)

**Step 1: Place the client secret file**

```bash
cp /path/to/client_secret_*.json ~/.hermes/google_client_secret.json
```

**Step 2: Run the setup script**

```bash
cd ~/.hermes/skills/productivity/google-workspace
python scripts/setup.py --client-secret ~/.hermes/google_client_secret.json
```

**Step 3: Get the auth URL**

```bash
python scripts/setup.py --auth-url --services drive,docs --format json
```

Expected: JSON with `auth_url` field. Send this URL to the boss.

**Step 4: Boss authorizes in browser**

Boss opens the URL → signs in → grants Drive + Docs access → browser fails on `localhost:1` (expected) → boss copies the entire redirected URL → pastes it back.

**Step 5: Exchange the auth code**

```bash
python scripts/setup.py --auth-code "<the_url_boss_pasted>" --format json
```

Expected: `status: authenticated`

**Step 6: Verify**

```bash
python scripts/setup.py --check
```

Expected: `AUTHENTICATED`

**Step 7: Test Drive access**

```bash
GAPI="python ~/.hermes/skills/productivity/google-workspace/scripts/google_api.py"
$GAPI drive search "demo" --max 5
```

Expected: JSON array (empty if no files match, but no auth error).

---

## Phase 2 — Build 6 Atomic Skills (Day 2-3)

### Task 6: Create `document-ocr` skill (SHARED)

**Objective:** Extract raw text from a PDF or image file. One function: OCR extraction only.

**Files:**
- Create: `skills/shared/document-ocr/SKILL.md`
- Create: `skills/shared/document-ocr/scripts/ocr.py`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/skills/shared/document-ocr/scripts
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: document-ocr
description: "Use when extracting raw text from a PDF or image file. Input: file path. Output: raw text. Tries pymupdf first (text PDFs), falls back to liteparse (scanned/images). Does NOT classify, summarize, or store."
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, ocr, text-extraction, shared]
---

# Document OCR

Extract raw text from a PDF or image file. One function: text extraction only.

Does NOT classify document type. Does NOT extract fields. Does NOT summarize. Does NOT store.

Those are separate skills: `document-interpretation`, `document-storage`.

## When to Load

- User sends a PDF or image and needs text extracted
- Another skill needs raw text from a file (called as a sub-step)
- Works for: invoices, quotations, legal docs, contracts, delivery orders, any document

## Input

File path (local), or file bytes (from Telegram download or gdrive download).

## Output

Raw text string. If OCR fails, returns empty string with an error note.

## Pipeline

1. Try `pymupdf` — works for text-based PDFs (born digital). Fast, instant.
2. If pymupdf returns empty text → try `liteparse` — works for scanned PDFs and images. Uses OCR.
3. If liteparse unavailable or fails → fall back to vision model (the agent uses `vision_analyze`).

## Usage

### As a Python module

```python
from ocr import extract_text

text = extract_text("/path/to/invoice.pdf")
print(text)
```

### As a CLI script

```bash
python scripts/ocr.py /path/to/invoice.pdf
# Prints raw text to stdout
```

## gdrive Files

If the file is in Google Drive, the agent first downloads it using the `google-workspace` skill:

```bash
GAPI="python ~/.hermes/skills/productivity/google-workspace/scripts/google_api.py"
$GAPI drive download <FILE_ID> --output /tmp/document.pdf
```

Then pass the local path to `document-ocr`.

## Dependencies

- `pymupdf` (text PDFs) — pip install pymupdf
- `liteparse` (scanned/images) — pip install liteparse + `lit` CLI
- Falls back to vision model if both fail (the agent can use `vision_analyze`)

## Pitfalls

- ❌ Summarizing or classifying — that's `document-interpretation`'s job
- ❌ Storing the text — that's `document-storage`'s job
- ❌ Using marker-pdf for single docs (too slow, 1-14s/page) — only for batch
- ❌ Not checking if text is empty before returning — always validate
```

**Step 3: Write `scripts/ocr.py`**

```python
#!/usr/bin/env python3
"""
Document OCR — extract raw text from a PDF or image file.
Input: file path (first arg) or {file_path} via stdin JSON
Output: raw text to stdout (or JSON with error)
"""
import sys
import json
import os
import subprocess


def extract_text(file_path):
    """
    Extract text from a PDF or image.
    Try pymupdf first (text PDFs), fall back to liteparse (scanned/images).
    Returns (text, engine_used, error).
    """
    if not os.path.exists(file_path):
        return "", "error", f"File not found: {file_path}"

    # Try pymupdf for text-based PDFs
    try:
        import pymupdf
        doc = pymupdf.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        if text.strip():
            return text, "pymupdf", None
    except Exception:
        pass

    # Try liteparse for scanned PDFs and images
    try:
        result = subprocess.run(
            ["lit", "parse", file_path, "--format", "markdown"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout, "liteparse", None
    except FileNotFoundError:
        pass
    except subprocess.TimeoutExpired:
        pass

    return "", "none", "No OCR engine could extract text from this file"


def main():
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        input_data = json.load(sys.stdin)
        file_path = input_data["file_path"]

    text, engine, error = extract_text(file_path)

    if error:
        print(json.dumps({"error": error, "file_path": file_path}, ensure_ascii=False))
        sys.exit(1)

    print(text)


if __name__ == "__main__":
    main()
```

**Step 4: Verify**

```bash
~/.hermes/hermes-agent/venv/Scripts/python.exe D:/Github/shogun-os/skills/shared/document-ocr/scripts/ocr.py /path/to/test.pdf
```

Expected: raw text printed to stdout.

**Step 5: Commit**

```bash
cd D:/Github/shogun-os
git add skills/shared/document-ocr/
git commit -m "feat: add document-ocr skill (text extraction only, shared)"
```

---

### Task 7: Create `document-interpretation` skill (SHARED)

**Objective:** Take raw text and classify the document type + extract key fields + generate a summary. One function: interpretation.

**Files:**
- Create: `skills/shared/document-interpretation/SKILL.md`
- Create: `skills/shared/document-interpretation/scripts/interpret.py`
- Create: `skills/shared/document-interpretation/references/field-schemas.md`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/skills/shared/document-interpretation/{scripts,references}
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: document-interpretation
description: "Use when classifying a document type and extracting key fields from raw text. Input: raw text. Output: {type, fields, summary}. Does NOT OCR. Does NOT store."
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, interpretation, classification, extraction, shared]
---

# Document Interpretation

Classify a document's type, extract its key fields, and generate a 3-line summary. One function: interpretation only.

Does NOT extract text from files (that's `document-ocr`). Does NOT store to brain (that's `document-storage`).

## When to Load

- After `document-ocr` has produced raw text
- User pastes text and asks "what type of document is this?" or "extract the key info"

## Input

Raw text string (from OCR or paste).

## Output

JSON object:
```json
{
  "document_type": "invoice | quotation | legal_contract | purchase_order | delivery_order | other",
  "fields": { ... type-specific fields ... },
  "summary": "3-line summary"
}
```

## Document Types & Field Schemas

See `references/field-schemas.md` for the full schema per document type. Covers:
- Invoice: vendor, invoice_number, date, due_date, line_items, subtotal, tax, total, currency, payment_terms
- Quotation: vendor, quote_number, validity, line_items, total, terms
- Legal: document_type, parties, effective_date, key_clauses, obligations
- Purchase Order: po_number, issuer, vendor, line_items, total, delivery_date
- Delivery Order: do_number, vendor, delivery_date, items, condition_notes

## Classification Method

Use the LLM to classify. Prompt:

```
Classify this document as one of: invoice, quotation, legal_contract, purchase_order, delivery_order, other.
Respond with only the type name.

Document text:
---
[raw text]
---
```

## Summary Generation

3-line summary format:
- Line 1: [type] from [vendor/parties]
- Line 2: key amount or obligation
- Line 3: key date (invoice date / validity / effective date)

## Usage

### As a Python module

```python
from interpret import interpret_document

result = interpret_document(raw_text)
# result = {"document_type": "invoice", "fields": {...}, "summary": "..."}
```

### As a CLI script

```bash
echo "raw text..." | python scripts/interpret.py
# Or:
python scripts/interpret.py --file /path/to/text.txt
```

## Pitfalls

- ❌ OCRing the file — that's `document-ocr`'s job
- ❌ Storing the result — that's `document-storage`'s job
- ❌ Extracting fields without classifying first — different types have different fields
- ❌ Long summaries — 3 lines max, Telegram-friendly
```

**Step 3: Write `references/field-schemas.md`**

```markdown
# Document Field Schemas

## Classification Prompt

```
Classify this document as one of: invoice, quotation, legal_contract, purchase_order, delivery_order, other.
Respond with only the type name.

Document text:
---
[raw text]
---
```

## Invoice Extraction Prompt

```
Extract from this invoice the following fields as JSON:
- vendor_name: string
- invoice_number: string
- invoice_date: YYYY-MM-DD (or null)
- due_date: YYYY-MM-DD (or null)
- line_items: array of {description, quantity, unit_price, amount}
- subtotal: number
- tax: number
- total: number
- currency: string (e.g. "RM", "USD")
- payment_terms: string (e.g. "Net 30")

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Quotation Extraction Prompt

```
Extract from this quotation the following fields as JSON:
- vendor_name: string
- quote_number: string
- quote_date: YYYY-MM-DD
- validity_date: YYYY-MM-DD
- line_items: array of {description, quantity, unit_price, amount}
- total: number
- currency: string
- terms: string (payment terms, delivery terms)

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Legal Contract Extraction Prompt

```
Extract from this legal document the following fields as JSON:
- document_type: string (contract, agreement, MOU, letter, other)
- parties: array of strings (company/person names)
- effective_date: YYYY-MM-DD
- termination_date: YYYY-MM-DD (or null)
- key_clauses: array of {clause_name, summary}
- obligations: array of {party, obligation}

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Purchase Order Extraction Prompt

```
Extract from this purchase order the following fields as JSON:
- po_number: string
- issuer: string (our company name)
- vendor: string
- po_date: YYYY-MM-DD
- line_items: array of {description, quantity, unit_price, amount}
- total: number
- currency: string
- delivery_date: YYYY-MM-DD

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```

## Delivery Order Extraction Prompt

```
Extract from this delivery order the following fields as JSON:
- do_number: string
- vendor: string
- delivery_date: YYYY-MM-DD
- items: array of {description, quantity_delivered}
- received_by: string (or null)
- condition_notes: string (or null)

Return only JSON. If a field is not present, use null.

Document text:
---
[raw text]
---
```
```

**Step 4: Write `scripts/interpret.py`**

```python
#!/usr/bin/env python3
"""
Document Interpretation — classify + extract fields + summarize.
Input: raw text (stdin or --file)
Output: JSON {document_type, fields, summary} to stdout

Note: The actual LLM calls are done by the agent (Hermes) using its model.
This script provides the structure and prompts. When called by the agent,
it formats the text and returns the prompts to use.
"""
import sys
import json


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--file":
        with open(sys.argv[2], 'r', encoding='utf-8') as f:
            raw_text = f.read()
    else:
        raw_text = sys.stdin.read()

    if not raw_text.strip():
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)

    result = {
        "raw_text": raw_text,
        "text_length": len(raw_text),
        "instruction": "Use the field schemas in references/field-schemas.md to classify and extract",
        "status": "ready_for_interpretation"
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

**Step 5: Commit**

```bash
cd D:/Github/shogun-os
git add skills/shared/document-interpretation/
git commit -m "feat: add document-interpretation skill (classify + extract only, shared)"
```

---

### Task 8: Create `document-storage` skill (SHARED)

**Objective:** Persist a document's fields + summary to gbrain. One function: storage.

**Files:**
- Create: `skills/shared/document-storage/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/skills/shared/document-storage
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: document-storage
description: "Use when storing a scanned document's fields and summary to gbrain. Input: {fields, summary, source}. Output: gbrain page path. Does NOT interpret. Does NOT retrieve."
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, storage, gbrain, persist, shared]
---

# Document Storage

Persist a document record to gbrain at the correct path with proper frontmatter. One function: storage only.

Does NOT classify or extract fields (that's `document-interpretation`). Does NOT search/retrieve (that's `document-retrieval`).

## When to Load

- After `document-interpretation` has produced {type, fields, summary}
- User says "save this" / "store this document"

## Input

JSON object:
```json
{
  "document_type": "invoice",
  "fields": {
    "vendor_name": "XYZ Sdn Bhd",
    "invoice_number": "INV-2026-001",
    "total": 12500,
    "currency": "RM"
  },
  "summary": "Invoice from XYZ Sdn Bhd, RM 12,500, due 30 Sep 2026",
  "source": "telegram://file_id" | "gdrive://file_id" | "local://path"
}
```

## Output

gbrain page path: `references/documents/<type>/<vendor>-<number>.md`

## Storage Path Convention

```
references/documents/
├── invoices/
│   └── <vendor_slug>-<invoice_number>.md
├── quotations/
│   └── <vendor_slug>-<quote_number>.md
├── legal/
│   └── <type>-<party1>-<party2>.md
├── purchase_orders/
│   └── <po_number>.md
├── delivery_orders/
│   └── <do_number>.md
└── other/
    └── <description>-<date>.md
```

## Page Template

```yaml
---
title: "[Type]: [vendor/parties] [number] — [date]"
type: reference
tags: [document, <type>]
source: "telegram://file_id" or "gdrive://file_id"
stored: "2026-08-15"
document_type: invoice
---

## Summary
[3-line summary from interpretation]

## Key Fields
- Vendor: [vendor_name]
- Invoice #: [invoice_number]
- Date: [invoice_date]
- Total: [currency] [total]
- Due: [due_date]

## Full Fields
<details>
[complete JSON fields]
</details>
```

## How to Store

Use the gbrain MCP tool:

```
mcp_gbrain_put_page(
  path="references/documents/invoices/xyz-inv-2026-001.md",
  content="[page content from template above]"
)
```

Then add a timeline entry if the document has a date:

```
mcp_gbrain_add_timeline_entry(
  page_path="references/documents/invoices/xyz-inv-2026-001.md",
  date="[invoice_date]",
  event="Invoice [number] from [vendor], [total]"
)
```

## Pitfalls

- ❌ Interpreting the document — that's `document-interpretation`'s job
- ❌ Retrieving documents — that's `document-retrieval`'s job
- ❌ Not including the source field — can't trace back to the original file
- ❌ Wrong path — invoices go in `invoices/`, not a flat directory
- ❌ Missing tags — `document` and the type tag are required for retrieval to work
```

**Step 3: Commit**

```bash
cd D:/Github/shogun-os
git add skills/shared/document-storage/
git commit -m "feat: add document-storage skill (persist to gbrain only, shared)"
```

---

### Task 9: Create `document-retrieval` skill (SHARED)

**Objective:** Search gbrain for stored documents by keyword. One function: retrieval.

**Files:**
- Create: `skills/shared/document-retrieval/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/skills/shared/document-retrieval
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: document-retrieval
description: "Use when searching for previously scanned documents by keyword. Input: query string. Output: matching document summaries. Does NOT store."
version: 1.0.0
author: Shogun OS
category: shared
tags: [document, retrieval, search, gbrain, shared]
---

# Document Retrieval

Search gbrain for previously stored documents by keyword. One function: retrieval only.

Does NOT store documents (that's `document-storage`). Does NOT OCR or interpret (those are upstream).

## When to Load

- User says "find the invoice from [vendor]" / "show me [keyword]"
- User asks "what invoices do we have from August?"
- User asks to retrieve a previously scanned document

## Input

Query string — vendor name, document number, date, or type.

## Output

Array of matching document summaries:
```json
[
  {
    "path": "references/documents/invoices/xyz-inv-2026-001.md",
    "title": "Invoice: XYZ Sdn Bhd INV-2026-001 — 2026-08-15",
    "summary": "Invoice from XYZ Sdn Bhd, RM 12,500, due 30 Sep 2026",
    "fields": { ... key fields ... }
  }
]
```

## Search Strategy

1. **gbrain search** — `mcp_gbrain_search("document <query>")`
2. **Filter** — only results under `references/documents/`
3. **Rank** — by relevance to the query
4. **Format** — return title + summary + key fields (not full text)

## Query Examples

| User says | Search query |
|-----------|-------------|
| "find the XYZ invoice" | `document XYZ invoice` |
| "what invoices from August" | `document invoice August 2026` |
| "show me the fertilizer quotation" | `document quotation fertilizer` |
| "find contract with ABC Sdn Bhd" | `document contract ABC` |

## Response Format (Telegram)

For a single match:
```
📄 Found: Invoice from XYZ Sdn Bhd
• Invoice #: INV-2026-001
• Date: 15 Aug 2026
• Total: RM 12,500
• Due: 30 Sep 2026
• Stored: 15 Aug 2026
```

For multiple matches:
```
📄 Found 3 documents matching "XYZ":

1. Invoice XYZ-001 (RM 12,500, 15 Aug 2026)
2. Quotation XYZ-Q-045 (RM 8,200, 10 Aug 2026)
3. Delivery Order XYZ-DO-012 (received 12 Aug 2026)

Reply with a number to see details.
```

## Pitfalls

- ❌ Storing documents — that's `document-storage`'s job
- ❌ Returning full OCR text — too long for Telegram; return summary + fields only
- ❌ Not filtering to documents path — would return unrelated brain pages
- ❌ Returning 0 results silently — always say "no documents found matching [query], try [suggestion]"
```

**Step 3: Commit**

```bash
cd D:/Github/shogun-os
git add skills/shared/document-retrieval/
git commit -m "feat: add document-retrieval skill (search gbrain only, shared)"
```

---

### Task 10: Create `site-condition-assessment` skill (PLANTATION)

**Objective:** Assess a photo/video of staff quarters via the vision model. One function: assessment.

**Files:**
- Create: `industries/plantation/skills/site-condition-assessment/SKILL.md`
- Create: `industries/plantation/skills/site-condition-assessment/references/assessment-rubric.md`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/industries/plantation/skills/site-condition-assessment/references
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: site-condition-assessment
description: "Use when assessing a photo or video of staff quarters via vision model. Input: image/video file. Output: structured assessment (furniture, cleanliness, condition, safety). Does NOT store."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, vision, assessment, staff-quarters]
---

# Site Condition Assessment

Analyze a photo or video of plantation staff quarters via the vision model. One function: assessment only.

Produces a structured assessment with furniture count, cleanliness rating, site condition, and safety hazards.

Does NOT store the report (that's `site-inspection-storage`).

## When to Load

- User sends a photo or video via Telegram of a room, building, or site
- User says "inspect this quarter" / "check the condition" / "assess furniture"
- User sends multiple photos of the same location from different angles

## Input

Image or video file (local path, downloaded from Telegram, or uploaded via portal).

## Output

Structured assessment:
```json
{
  "furniture": [
    {"item": "single bed", "quantity": 2, "condition": "fair"},
    {"item": "study table", "quantity": 1, "condition": "good"},
    {"item": "chair", "quantity": 2, "condition": "fair"},
    {"item": "locker", "quantity": 1, "condition": "good"}
  ],
  "cleanliness": {
    "floor": "needs sweeping",
    "walls": "clean",
    "bedding": "present, needs changing",
    "overall": "moderate"
  },
  "site_condition": {
    "walls": "intact",
    "ceiling": "intact, fan working",
    "windows": "2, functional",
    "lighting": "functional",
    "ventilation": "adequate"
  },
  "safety_hazards": ["none visible"],
  "overall_rating": "acceptable",
  "priority_actions": [
    "Sweep and mop floors",
    "Change bed sheets",
    "General wipe-down of surfaces"
  ]
}
```

## Vision Analysis

Use `vision_analyze` tool with this question:

```
Analyze this image of plantation staff quarters. Provide:

1. FURNITURE INVENTORY
   - List each visible piece of furniture with quantity
   - Note condition of each (good/fair/poor)

2. CLEANLINESS ASSESSMENT
   - Floor: clean / needs sweeping / dirty
   - Walls: clean / marks / damage
   - Bedding/sheets: present & clean / present & dirty / absent
   - Overall cleanliness: good / moderate / poor

3. SITE CONDITION
   - Walls: intact / cracks / water damage / structural issues
   - Ceiling: intact / leaks / missing panels
   - Windows: present & functional / broken / missing
   - Lighting: functional / partial / none
   - Ventilation: adequate / poor

4. SAFETY HAZARDS
   - List any visible hazards (exposed wiring, broken glass, etc.)
   - If none, state "None visible"

5. OVERALL ASSESSMENT
   - Habitability: good / acceptable / needs maintenance / uninhabitable
   - Priority actions: list top 3 issues to address
```

## Rubric

See `references/assessment-rubric.md` for the cleanliness and habitability scales.

## Multi-Image Handling

If user sends multiple photos:
- Analyze each separately via `vision_analyze`
- Merge furniture counts (deduplicate if same item visible in multiple shots)
- Take the worst cleanliness/condition rating across photos
- Note which photo each issue was visible in

## Video Handling

If user sends a video:
- qwen3.5-plus supports video input natively
- Use `vision_analyze` with the video file
- Prompt: "This is a video tour of staff quarters. Describe each room/area visible, the furniture in each, and the overall condition."
- Structure the response by room/area

## Pitfalls

- ❌ Storing the report — that's `site-inspection-storage`'s job
- ❌ Guessing furniture count from a single angle — note "at least N" if uncertain
- ❌ Rating cleanliness without seeing the floor — state "floor not visible" if so
- ❌ Ignoring safety hazards — always scan for exposed wiring, broken glass, structural damage
- ❌ Long paragraphs — use bullet points for Telegram readability
```

**Step 3: Write `references/assessment-rubric.md`**

```markdown
# Assessment Rubric

## Cleanliness Scale

| Rating | Floor | Walls | Bedding |
|--------|-------|-------|---------|
| Good | Swept/mopped, no stains | Clean, no marks | Fresh sheets, clean |
| Moderate | Needs sweeping | Minor marks | Sheets present, need changing |
| Poor | Visible dirt/debris | Stains/marks | Dirty or no sheets |

## Habitability Scale

| Rating | Criteria |
|--------|---------|
| Good | All furniture present & functional, clean, no hazards |
| Acceptable | Basic furniture present, moderate cleanliness, no major hazards |
| Needs Maintenance | Missing/broken furniture, poor cleanliness, or minor hazards |
| Uninhabitable | Structural damage, safety hazards, or no basic amenities |

## Furniture to Look For

Standard plantation staff quarter items:
- Bed (single or double)
- Mattress
- Study table
- Chair
- Locker/wardrobe
- Ceiling fan / lighting
- Window with grill
- Door with lock

## Condition Ratings

| Rating | Meaning |
|--------|---------|
| Good | Functional, no damage, clean |
| Fair | Functional but worn, minor damage |
| Poor | Non-functional, broken, or missing parts |
```

**Step 4: Commit**

```bash
cd D:/Github/shogun-os
git add industries/plantation/skills/site-condition-assessment/
git commit -m "feat: add site-condition-assessment skill (vision analysis, plantation)"
```

---

### Task 11: Create `site-inspection-storage` skill (PLANTATION)

**Objective:** Persist a site inspection report to gbrain. One function: storage.

**Files:**
- Create: `industries/plantation/skills/site-inspection-storage/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p D:/Github/shogun-os/industries/plantation/skills/site-inspection-storage
```

**Step 2: Write `SKILL.md`**

```markdown
---
name: site-inspection-storage
description: "Use when storing a site inspection report to gbrain. Input: assessment + source. Output: gbrain page path. Does NOT assess."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, site-inspection, storage, gbrain, persist]
---

# Site Inspection Storage

Persist a site inspection report to gbrain at the correct path with proper frontmatter. One function: storage only.

Does NOT assess the photo/video (that's `site-condition-assessment`).

## When to Load

- After `site-condition-assessment` has produced a structured assessment
- User says "save this inspection" / "record this"

## Input

JSON object:
```json
{
  "assessment": { ... from site-condition-assessment ... },
  "source": "telegram://file_id",
  "location": "Block A, Room 12"
}
```

## Output

gbrain page path: `references/inspections/<date>-<location>.md`

## Storage Path Convention

```
references/inspections/
└── 2026-08-15-block-a-room-12.md
```

If location not identifiable: `2026-08-15-unspecified.md`

## Page Template

```yaml
---
title: "Inspection: [location] — [date]"
type: reference
tags: [plantation, inspection, staff-quarters]
source: "telegram://file_id"
inspected: "2026-08-15"
location: "Block A, Room 12"
overall_rating: acceptable
---

## Furniture Inventory
- 2× Single bed (fair)
- 1× Study table (good)
- 2× Chair (fair)
- 1× Locker (good)

## Cleanliness
- Floor: needs sweeping
- Walls: clean
- Bedding: present, needs changing
- Overall: moderate

## Site Condition
- Walls: intact
- Ceiling: intact, fan working
- Windows: 2, functional
- Lighting: functional
- Ventilation: adequate

## Safety
None visible

## Overall: Acceptable — needs cleaning

## Priority Actions
1. Sweep and mop floors
2. Change bed sheets
3. General wipe-down of surfaces
```

## How to Store

Use the gbrain MCP tool:

```
mcp_gbrain_put_page(
  path="references/inspections/2026-08-15-block-a-room-12.md",
  content="[page content from template above]"
)
```

## Pitfalls

- ❌ Assessing the photo — that's `site-condition-assessment`'s job
- ❌ Missing the source field — can't trace back to the original photo
- ❌ Missing the overall_rating in frontmatter — can't filter by rating later
- ❌ Wrong path — inspections go in `inspections/`, not with documents
```

**Step 3: Commit**

```bash
cd D:/Github/shogun-os
git add industries/plantation/skills/site-inspection-storage/
git commit -m "feat: add site-inspection-storage skill (persist to gbrain, plantation)"
```

---

### Task 11.5: Add `estate-ops` persona to gateway catalog (before Task 12)

**Objective:** `gateway.py:_generate_department_response_async` (line 292) has a hardcoded `catalog_personas` dict with 10 departments. `estate-ops` is not in it — the fallback gives display_name="Estate-ops", persona="Assistant" instead of "Gozen". Must add the entry before the dashboard calls it.

**Files:**
- Modify: `shogun-web/server/gateway.py` — add to `catalog_personas` dict

**Step 1: Add estate-ops + worker-welfare to catalog_personas**

In `shogun-web/server/gateway.py`, find the `catalog_personas` dict (line ~296) and add:

```python
"estate-ops": ("Estate Operations", "Gozen", "estate management, document scanning, site inspections, and worker welfare"),
"worker-welfare": ("Worker Welfare", "Ryō", "staff quarters, welfare, and site conditions"),
```

**Step 2: Verify**

```bash
python -c "
import sys; sys.path.insert(0, 'shogun-web/server')
from gateway import _generate_department_response_async
import asyncio
r = asyncio.run(_generate_department_response_async('estate-ops', 'who are you'))
print(r)
"
```

Expected: response mentions "Gozen" and "Estate Operations", not "Assistant".

**Step 3: Commit**

```bash
git add shogun-web/server/gateway.py
git commit -m "feat: add estate-ops + worker-welfare personas to gateway catalog"
```

---

## Phase 2.5 — Build Dashboard (Day 2-3)

### Task 12: Create PlantationDashboard component

**Objective:** A web portal dashboard with 3 tabs — Document Scanning, Site Inspection, Stored Documents — that lets users upload files and see results.

**Files:**
- Create: `shogun-web/ui/src/components/dashboards/plantation/PlantationDashboard.tsx`
- Create: `shogun-web/ui/src/components/dashboards/plantation/DocumentScanningTab.tsx`
- Create: `shogun-web/ui/src/components/dashboards/plantation/SiteInspectionTab.tsx`
- Create: `shogun-web/ui/src/components/dashboards/plantation/StoredDocumentsTab.tsx`
- Modify: `shogun-web/ui/src/components/dashboards/DashboardViewer.tsx` — register `estate-ops: PlantationDashboard`

**Step 1: Create the dashboard directory**

```bash
mkdir -p D:/Github/shogun-os/shogun-web/ui/src/components/dashboards/plantation
```

**Step 2: Write `PlantationDashboard.tsx`**

```tsx
import { useState } from 'react';
import { FileScan, Home, Search } from 'lucide-react';
import { DocumentScanningTab } from './DocumentScanningTab';
import { SiteInspectionTab } from './SiteInspectionTab';
import { StoredDocumentsTab } from './StoredDocumentsTab';

const TABS = [
  { id: 'scan', label: 'Document Scanning', icon: FileScan },
  { id: 'inspect', label: 'Site Inspection', icon: Home },
  { id: 'stored', label: 'Stored Documents', icon: Search },
] as const;

type TabId = typeof TABS[number]['id'];

interface PlantationDashboardProps {
  department: string;
  color: string;
}

export function PlantationDashboard({ department, color }: PlantationDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scan');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'border-b-2 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              style={active ? { borderColor: color } : {}}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'scan' && <DocumentScanningTab color={color} />}
      {activeTab === 'inspect' && <SiteInspectionTab color={color} />}
      {activeTab === 'stored' && <StoredDocumentsTab color={color} />}
    </div>
  );
}
```

**Step 3: Write `DocumentScanningTab.tsx`**

```tsx
import { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface DocumentScanningTabProps {
  color: string;
}

export function DocumentScanningTab({ color }: DocumentScanningTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', 'estate-ops');

    try {
      // Upload to portal backend → backend sends to Hermes agent → agent runs OCR + interpretation + storage
      const response = await fetch('/api/departments/estate-ops/dashboard/scan-document', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to scan document' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">Upload a PDF or image (invoice, quotation, legal doc)</p>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            onClick={handleScan}
            disabled={!file || loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
              </span>
            ) : (
              'Scan Document'
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold capitalize">{result.document_type}</h3>
              </div>
              <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs dark:bg-slate-900">
                {JSON.stringify(result.fields, null, 2)}
              </pre>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Summary</h4>
                <p className="text-sm">{result.summary}</p>
              </div>
              {result.storage_path && (
                <p className="text-xs text-slate-400">Stored to: {result.storage_path}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Write `SiteInspectionTab.tsx`**

```tsx
import { useState } from 'react';
import { Upload, Image, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface SiteInspectionTabProps {
  color: string;
}

export function SiteInspectionTab({ color }: SiteInspectionTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleInspect = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', 'estate-ops');

    try {
      const response = await fetch('/api/departments/estate-ops/dashboard/inspect-site', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to assess image' });
    } finally {
      setLoading(false);
    }
  };

  const ratingColor = (rating?: string) => {
    if (!rating) return '';
    if (rating.includes('good')) return 'text-green-600';
    if (rating.includes('acceptable')) return 'text-yellow-600';
    if (rating.includes('needs')) return 'text-orange-600';
    if (rating.includes('uninhabitable')) return 'text-red-600';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <Image className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">Upload a photo or video of staff quarters</p>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {preview && (
            <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
          )}
          <button
            onClick={handleInspect}
            disabled={!file || loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Assessing...
              </span>
            ) : (
              'Inspect Site'
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              {/* Overall rating */}
              <div className={`flex items-center gap-2 text-lg font-semibold ${ratingColor(result.overall_rating)}`}>
                {result.overall_rating?.includes('good') ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
                {result.overall_rating}
              </div>

              {/* Furniture */}
              {result.furniture && (
                <div>
                  <h3 className="mb-2 font-semibold">Furniture</h3>
                  <div className="space-y-1">
                    {result.furniture.map((f: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{f.quantity}× {f.item}</span>
                        <span className="text-slate-500">{f.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cleanliness */}
              {result.cleanliness && (
                <div>
                  <h3 className="mb-2 font-semibold">Cleanliness</h3>
                  <div className="text-sm space-y-1">
                    <div>Floor: {result.cleanliness.floor}</div>
                    <div>Walls: {result.cleanliness.walls}</div>
                    <div>Bedding: {result.cleanliness.bedding}</div>
                    <div className="font-medium">Overall: {result.cleanliness.overall}</div>
                  </div>
                </div>
              )}

              {/* Safety */}
              {result.safety_hazards && (
                <div>
                  <h3 className="mb-2 font-semibold">Safety</h3>
                  <ul className="text-sm list-disc pl-5">
                    {result.safety_hazards.map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Priority actions */}
              {result.priority_actions && (
                <div>
                  <h3 className="mb-2 font-semibold">Priority Actions</h3>
                  <ol className="text-sm list-decimal pl-5">
                    {result.priority_actions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.storage_path && (
                <p className="text-xs text-slate-400">Stored to: {result.storage_path}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 5: Write `StoredDocumentsTab.tsx`**

```tsx
import { useState } from 'react';
import { Search, FileText } from 'lucide-react';

interface StoredDocumentsTabProps {
  color: string;
}

export function StoredDocumentsTab({ color }: StoredDocumentsTabProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch(
        `/api/departments/estate-ops/dashboard/search-documents?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by vendor, type, date... (e.g. 'XYZ invoice')"
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading && <p className="text-sm text-slate-500">Searching...</p>}
      {!loading && results.length === 0 && query && (
        <p className="text-sm text-slate-500">No documents found. Try a different keyword.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((doc, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h4 className="text-sm font-medium">{doc.title}</h4>
              </div>
              <p className="mt-1 text-xs text-slate-500">{doc.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 6: Add backend endpoints for the dashboard**

> **Critical:** The function `_call_department_agent` does NOT exist. The real function is `_generate_department_response_async` in `gateway.py` (line 292). Import it — do not invent a new helper.

In `shogun-web/server/dashboard.py`, add:

```python
from gateway import _generate_department_response_async
from fastapi import UploadFile, File, Query
import pathlib

@router.post("/scan-document")
async def scan_document(
    name: str = Path(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document, send to Hermes agent for OCR + interpretation + storage."""
    # Save uploaded file
    upload_dir = pathlib.Path(cfg.db_path).parent / "dashboard_uploads"
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Send to Hermes agent via the EXISTING gateway function
    # The agent will: document-ocr → document-interpretation → document-storage
    prompt = (
        f"Scan the document at {file_path}: "
        f"OCR it (use document-ocr skill), classify the type (use document-interpretation), "
        f"extract key fields, generate a summary, and store to gbrain (use document-storage). "
        f"Return JSON with: document_type, fields, summary, storage_path."
    )
    response_text = await _generate_department_response_async(
        name, prompt, soul_content="", attachments=None
    )

    # Parse the agent's text response into JSON for the frontend
    # The agent may return markdown-wrapped JSON or plain text
    import json as _json
    try:
        # Try to extract JSON from the response
        import re as _re
        json_match = _re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = _json.loads(json_match.group())
        else:
            result = {"raw_response": response_text}
    except _json.JSONDecodeError:
        result = {"raw_response": response_text}

    return result


@router.post("/inspect-site")
async def inspect_site(
    name: str = Path(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a photo/video, send to Hermes agent for site assessment + storage."""
    upload_dir = pathlib.Path(cfg.db_path).parent / "dashboard_uploads"
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Send to Hermes agent via the EXISTING gateway function
    # The agent will: site-condition-assessment → site-inspection-storage
    prompt = (
        f"Inspect this site image at {file_path}: "
        f"assess furniture count, cleanliness, site condition, and safety (use site-condition-assessment skill). "
        f"Store the report to gbrain (use site-inspection-storage skill). "
        f"Return JSON with: furniture, cleanliness, site_condition, safety_hazards, "
        f"overall_rating, priority_actions, storage_path."
    )
    response_text = await _generate_department_response_async(
        name, prompt, soul_content="", attachments=None
    )

    # Parse the agent's text response into JSON for the frontend
    import json as _json
    try:
        import re as _re
        json_match = _re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = _json.loads(json_match.group())
        else:
            result = {"raw_response": response_text}
    except _json.JSONDecodeError:
        result = {"raw_response": response_text}

    return result


@router.get("/search-documents")
async def search_documents(
    name: str = Path(...),
    q: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search stored documents via Hermes agent."""
    prompt = (
        f"Search for documents matching '{q}' (use document-retrieval skill). "
        f"Return JSON array with: title, summary, and key fields for each match. "
        f"If no results, return empty array."
    )
    response_text = await _generate_department_response_async(
        name, prompt, soul_content="", attachments=None
    )

    import json as _json
    try:
        import re as _re
        json_match = _re.search(r'\[[\s\S]*\]', response_text)
        if json_match:
            results = _json.loads(json_match.group())
        else:
            results = []
    except _json.JSONDecodeError:
        results = []

    return {"results": results}
```

**Step 7: Register PlantationDashboard in DashboardViewer**

In `shogun-web/ui/src/components/dashboards/DashboardViewer.tsx`:

```typescript
import { PlantationDashboard } from './plantation/PlantationDashboard';

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType<{ department: string; color: string }>> = {
  crm: CrmDashboard,
  finance: FinanceDashboard,
  procurement: ProcurementDashboard,
  'estate-ops': PlantationDashboard,  // ← NEW
};
```

**Step 8: Build and verify**

```bash
cd D:/Github/shogun-os/shogun-web/ui
npx vite build 2>&1 | tail -5
```

Expected: build succeeds.

**Step 9: Commit**

```bash
cd D:/Github/shogun-os
git add shogun-web/ui/src/components/dashboards/plantation/ shogun-web/ui/src/components/dashboards/DashboardViewer.tsx shogun-web/server/dashboard.py
git commit -m "feat: add PlantationDashboard with 3 tabs (scan, inspect, search)"
```

---

## Phase 3 — Prepare Demo Data (Day 3-4)

### Task 13: Prepare demo documents and images

**Objective:** Have sample documents + staff quarter photos/videos ready for the demo.

**Step 1: Create demo data directory**

```bash
mkdir -p D:/Github/shogun-os/demo-data/{docs,site-images,videos}
```

**Step 2: Prepare demo documents**

| # | Type | Filename | What to show |
|---|------|----------|--------------|
| 1 | Invoice | `sample-invoice.pdf` | Vendor extraction, total, tax, payment terms |
| 2 | Quotation | `sample-quotation.pdf` | Line items, validity, total |
| 3 | Legal doc | `sample-contract.pdf` | Parties, effective date, key clauses |
| 4 | Scanned PDF | `sample-scanned-invoice.pdf` | Show OCR fallback on image-based PDF |

Best option: boss/sales provides real documents (redacted). If not, generate samples using a template.

**Step 3: Prepare demo images (staff quarters)**

| # | Condition | Filename | Source |
|---|-----------|----------|--------|
| 1 | Clean, furnished | `quarter-clean.jpg` | Unsplash/Pexels — "bedroom" |
| 2 | Bare/unfurnished | `quarter-bare.jpg` | Unsplash/Pexels — "empty room" |
| 3 | Dirty/cluttered | `quarter-dirty.jpg` | Unsplash/Pexels — "messy room" |
| 4 | Damaged | `quarter-damaged.jpg` | Unsplash/Pexels — "damaged wall" |

Download using web_search or direct Unsplash URLs.

**Step 4: Prepare demo video**

| # | Content | Filename | Source |
|---|---------|----------|--------|
| 1 | Room walkthrough (10-15 sec) | `quarter-tour.mp4` | Record on phone or download from Pexels |

**Step 5: Upload documents to Google Drive**

```bash
GAPI="python ~/.hermes/skills/productivity/google-workspace/scripts/google_api.py"
FOLDER=$($GAPI drive create-folder "Plantation Demo Docs" | python -c "import json,sys; print(json.load(sys.stdin)['id'])")
$GAPI drive upload /path/to/sample-invoice.pdf --parent $FOLDER
$GAPI drive upload /path/to/sample-quotation.pdf --parent $FOLDER
$GAPI drive upload /path/to/sample-contract.pdf --parent $FOLDER
```

**Step 6: Test vision on one image**

```bash
hermes -p estate-ops-manager -z "analyze this image: D:/Github/shogun-os/demo-data/site-images/quarter-clean.jpg — list all furniture you see"
```

Expected: bot loads image via `vision_analyze`, lists furniture items.

---

### Task 14: Write the demo script

**Objective:** A step-by-step script the sales team follows during the demo.

**Files:**
- Create: `D:/Github/shogun-os/demo-data/demo-script.md`

**Write:**

```markdown
# Plantation Demo Script — Tuesday

## Setup (15 min before demo)

1. Confirm `@gozen_sam_bot` is online:
   - Send "hello" to @gozen_sam_bot on Telegram
   - If no response: run `hermes -p estate-ops-manager gateway run --replace &`

2. Confirm demo documents are in gdrive:
   - Folder: "Plantation Demo Docs"
   - Should contain: sample-invoice.pdf, sample-quotation.pdf, sample-contract.pdf

3. Confirm demo images are on this machine:
   - D:/Github/shogun-os/demo-data/site-images/quarter-clean.jpg
   - quarter-bare.jpg, quarter-dirty.jpg, quarter-damaged.jpg
   - D:/Github/shogun-os/demo-data/videos/quarter-tour.mp4

4. Confirm portal is running:
   - Open https://localhost:8787 in browser
   - Login → navigate to Estate Operations department
   - Verify 3 dashboard tabs appear

---

## Demo Flow (25 min total)

### Part 1: Document Scanning via Telegram (8 min)

**Step 1 — Scan from Telegram (3 min)**

> "Let's say a vendor sends an invoice to our Telegram bot."

1. Attach `sample-invoice.pdf` to a Telegram message to @gozen_sam_bot
2. Send with the text: "scan this invoice"
3. Bot chains: document-ocr → document-interpretation → document-storage
4. Bot responds with:
   - Document type: Invoice
   - Vendor: [extracted name]
   - Total: RM [amount]
   - Due date: [date]
   - "Stored to brain — search '[vendor] invoice' to retrieve"

**Step 2 — Scan from gdrive (3 min)**

> "We can also scan documents straight from Google Drive."

1. Send to bot: "scan my gdrive folder 'Plantation Demo Docs'"
2. Bot lists the folder contents, then for each file chains:
   - download → document-ocr → document-interpretation → document-storage
3. All stored to brain with summaries

**Step 3 — Retrieve (2 min)**

> "Now let's find that invoice again."

1. Send to bot: "show me the [vendor] invoice"
2. Bot calls: document-retrieval
3. Bot returns the stored summary with all key fields

### Part 2: Site Inspection via Telegram (8 min)

**Step 4 — Clean quarter (2 min)**

> "Now let's assess staff quarters."

1. Attach `quarter-clean.jpg` to @gozen_sam_bot
2. Send with text: "inspect this quarter"
3. Bot chains: site-condition-assessment → site-inspection-storage
4. Bot responds with structured report

**Step 5 — Dirty quarter (2 min)**

1. Attach `quarter-dirty.jpg`
2. "inspect this quarter"
3. Bot reports: cleanliness poor, priority actions listed

**Step 6 — Damaged quarter (2 min)**

1. Attach `quarter-damaged.jpg`
2. "inspect this quarter"
3. Bot reports: structural issues, uninhabitable, safety hazards

**Step 7 — Video walkthrough (2 min)**

> "We can also assess video tours."

1. Attach `quarter-tour.mp4` to @gozen_sam_bot
2. "inspect this video"
3. Bot uses qwen3.5-plus video capability
4. Bot describes each room visible, furniture, and condition

### Part 3: Portal Dashboard (9 min)

**Step 8 — Document Scanning tab (3 min)**

> "Everything we did via Telegram, we can also do via the web portal."

1. Open portal → Estate Operations department → Document Scanning tab
2. Upload `sample-quotation.pdf`
3. Click "Scan Document"
4. Show the extracted fields + summary appearing in the UI
5. Show it's stored to brain

**Step 9 — Site Inspection tab (3 min)**

1. Navigate to Site Inspection tab
2. Upload `quarter-bare.jpg`
3. Click "Inspect Site"
4. Show the structured assessment in the UI — furniture, cleanliness, condition, safety

**Step 10 — Stored Documents tab (3 min)**

1. Navigate to Stored Documents tab
2. Search for "invoice"
3. Show all previously scanned documents listed
4. Click one to see full details

---

## Q&A Prep

**"Can it handle multiple photos of the same room?"**
→ Yes, send 2-3 photos and the bot merges the assessment.

**"Can it do video?"**
→ Yes, qwen3.5-plus supports video input. We just showed a video walkthrough.

**"Where are documents stored?"**
→ In the brain (gbrain), searchable by keyword. Persistent across sessions.

**"Can it read handwritten documents?"**
→ Depends on handwriting legibility — OCR handles printed text reliably, handwriting is hit-or-miss.

**"Does it work with other languages?"**
→ Yes, liteparse supports 100+ languages including Malay and Chinese.

**"How does this scale?"**
→ Each department gets its own bot + profile. Document scanning is a shared skill (all industries). Site inspection is plantation-specific.

**"What about CCTV?"**
→ CCTV is a future phase — real-time monitoring with automatic alerts. Today we demo photo + video upload.

**"Can other departments use document scanning?"**
→ Yes — it's a shared skill. Finance scans invoices, Procurement scans POs, Compliance scans legal docs. All use the same 4 document skills.
```

---

## Phase 4 — Final Verification (Day 4, before demo)

### Task 15: End-to-end test run

**Objective:** Run the entire demo flow once, end-to-end, to catch failures.

**Test 1: Document scan via Telegram (full chain)**

```bash
hermes -p estate-ops-manager -z "scan the document at D:/Github/shogun-os/demo-data/docs/sample-invoice.pdf"
```

Expected chain: `document-ocr` (extracts text) → `document-interpretation` (classifies + extracts fields) → `document-storage` (stores to gbrain).

✅ Pass if: bot returns vendor, total, date, and "stored to brain"
❌ Fail if: "OCR returned no text" → recheck Task 4 (libraries) + Task 6 (document-ocr)
❌ Fail if: "can't classify" → recheck Task 7 (document-interpretation)
❌ Fail if: "can't store" → recheck Task 8 (document-storage) + gbrain MCP

**Test 2: Document retrieval**

```bash
hermes -p estate-ops-manager -z "find the invoice from [vendor name in test 1]"
```

Expected: `document-retrieval` returns the stored summary from Test 1.

✅ Pass if: correct document returned
❌ Fail if: "no results" → gbrain storage failed in Test 1, or `document-retrieval` not filtering correctly

**Test 3: Site inspection (full chain)**

```bash
hermes -p estate-ops-manager -z "inspect this quarter: D:/Github/shogun-os/demo-data/site-images/quarter-clean.jpg"
```

Expected chain: `site-condition-assessment` (vision analysis) → `site-inspection-storage` (persist to gbrain).

✅ Pass if: structured report with furniture count, cleanliness, condition
❌ Fail if: bot can't load image → recheck Task 3 (vision model not configured)
❌ Fail if: report is unstructured → recheck Task 10 (site-condition-assessment)

**Test 4: Video inspection**

```bash
hermes -p estate-ops-manager -z "inspect this video: D:/Github/shogun-os/demo-data/videos/quarter-tour.mp4"
```

✅ Pass if: bot describes rooms visible in the video
❌ Fail if: bot can't process video → recheck model supports video (qwen3.5-plus does)

**Test 5: gdrive scan**

```bash
hermes -p estate-ops-manager -z "scan all documents in my gdrive folder 'Plantation Demo Docs'"
```

✅ Pass if: all 3 documents scanned and stored
❌ Fail if: auth error → recheck Task 5 (gdrive OAuth)
❌ Fail if: folder not found → recheck folder name

**Test 6: Portal dashboard**

1. Open portal → Estate Operations → Document Scanning tab
2. Upload `sample-invoice.pdf` → click Scan → verify result appears
3. Navigate to Site Inspection tab
4. Upload `quarter-clean.jpg` → click Inspect → verify result appears
5. Navigate to Stored Documents tab
6. Search "invoice" → verify results

✅ Pass if: all 3 tabs work and show results
❌ Fail if: upload fails → recheck backend endpoints (Task 12)
❌ Fail if: dashboard not found → recheck DashboardViewer registration (Task 1)

**Test 7: Telegram bot responsiveness**

Send these to `@gozen_sam_bot`:
1. "hello" → bot responds
2. Attach `quarter-clean.jpg` with "inspect this" → bot responds with report
3. Attach `sample-invoice.pdf` with "scan this" → bot responds with summary

✅ Pass if: all 3 respond within 30 seconds
❌ Fail if: bot silent → gateway not running, recheck Task 3

---

### Task 16: Fallback preparation

**Fallback 1: Vision model is down**

```bash
# Emergency model switch
sed -i 's/qwen3.5-plus/qwen-vl-max/' ~/.hermes/profiles/estate-ops-manager/config.yaml
hermes -p estate-ops-manager gateway run --replace &
```

**Fallback 2: gdrive auth fails**

- Pre-download all demo documents to `D:/Github/shogun-os/demo-data/docs/`
- Demo "scan from Telegram" only — skip the gdrive flow

**Fallback 3: Bot goes offline**

```bash
cat ~/.hermes/profiles/estate-ops-manager/gateway_state.json
hermes -p estate-ops-manager gateway run --replace &
```

**Fallback 4: OCR libraries fail**

- Use the vision model directly: send the document as an image and let the vision model read it (bypass `document-ocr` entirely, feed image to `document-interpretation` via vision)

**Fallback 5: Portal dashboard fails**

- Fall back to Telegram-only demo — skip Part 3 of the demo script

---

## Quick Reference: Commands Cheat Sheet

```bash
# Start the demo bot (if not running)
hermes -p estate-ops-manager gateway run --replace &

# Check bot status
cat ~/.hermes/profiles/estate-ops-manager/gateway_state.json

# Check model config
grep "default:" ~/.hermes/profiles/estate-ops-manager/config.yaml

# Test bot from CLI (no Telegram needed)
hermes -p estate-ops-manager -z "hello"

# Reload skills (after editing)
# Skills load fresh per message — no reload needed

# Check gdrive auth
cd ~/.hermes/skills/productivity/google-workspace
python scripts/setup.py --check

# Test OCR
~/.hermes/hermes-agent/venv/Scripts/python.exe -c "import pymupdf; print('ok')"

# Emergency model switch
sed -i 's/qwen3.5-plus/qwen-vl-max/' ~/.hermes/profiles/estate-ops-manager/config.yaml

# View stored documents in gbrain
hermes -p estate-ops-manager -z "search gbrain for documents"

# Build portal after dashboard changes
cd D:/Github/shogun-os/shogun-web/ui && npx vite build
```

---

## Skill Dependency Graph

```
DOCUMENT PIPELINE (SHARED — all industries)
============================================

File (Telegram/gdrive/portal upload)
  │
  ▼
document-ocr          ← extracts raw text (pymupdf → liteparse → vision fallback)
  │
  ▼
document-interpretation  ← classifies type + extracts fields + summarizes
  │
  ▼
document-storage      ← persists to gbrain at references/documents/<type>/
  │
  ▼
[stored]

Query ("find invoice from XYZ")
  │
  ▼
document-retrieval    ← searches gbrain, returns matching summaries


SITE INSPECTION PIPELINE (PLANTATION ONLY)
==========================================

Photo/Video (Telegram/portal upload)
  │
  ▼
site-condition-assessment  ← vision model analyzes (furniture, cleanliness, condition, safety)
  │
  ▼
site-inspection-storage    ← persists to gbrain at references/inspections/
  │
  ▼
[stored]
```

---

## Industry/Department Structure

```
shogun-os/
├── skills/
│   ├── shared/                          ← NEW: shared skills (all industries)
│   │   ├── document-ocr/                ← Task 6
│   │   ├── document-interpretation/     ← Task 7
│   │   ├── document-storage/            ← Task 8
│   │   └── document-retrieval/          ← Task 9
│   ├── finance/                         (existing)
│   ├── procurement/                     (existing)
│   ├── retail/                          (existing)
│   ├── manufacturing/                   (existing)
│   └── ...
├── industries/
│   ├── general/                        (existing)
│   ├── manufacturing/                  (existing)
│   ├── retail/                         (existing)
│   └── plantation/                     ← NEW: Plantation industry
│       └── skills/
│           ├── site-condition-assessment/   ← Task 10
│           └── site-inspection-storage/     ← Task 11
└── shogun-web/
    ├── ui/src/components/dashboards/
    │   └── plantation/                 ← NEW: Plantation dashboard
    │       ├── PlantationDashboard.tsx      ← Task 12
    │       ├── DocumentScanningTab.tsx
    │       ├── SiteInspectionTab.tsx
    │       └── StoredDocumentsTab.tsx
    └── server/
        ├── config.py                   ← Task 1: industry catalog
        ├── onboarding.py               ← Prerequisite plan
        └── dashboard.py                ← Task 12: backend endpoints
```

---

## Timeline Summary

| Day | Tasks | Goal |
|-----|-------|------|
| **Day 1 (Sat)** | Tasks 1-2 | Industry config + profile created |
| **Day 1 (Sat)** | Task 3 | Bot wired (needs boss token) |
| **Day 1 (Sat)** | Task 4 | OCR libraries installed |
| **Day 1-2 (Sat-Sun)** | Task 5 | gdrive OAuth done (needs boss) |
| **Day 2 (Sun)** | Tasks 6-11 | All 6 atomic skills built |
| **Day 2 (Sun)** | Task 12 | Dashboard built (3 tabs + backend) |
| **Day 3 (Mon)** | Tasks 13-14 | Demo data ready + script written |
| **Day 4 (Tue)** | Tasks 15-16 | Final test + fallbacks ready |
| **Tuesday** | DEMO | Run the demo |

**Prerequisite:** Complete `docs/plans/2026-08-15-onboarding-industry-flow.md` first (adds industry selection to onboarding wizard).

---

## Blockers Requiring Boss Action

1. **`@gozen_sam_bot` token**: Boss must provide the BotFather token. **Blocks Task 3.** (If building on tapway server instead, need SSH access.)

2. **Google Cloud OAuth**: Boss or sales creates OAuth credentials in Google Cloud Console (5-10 min). **Blocks Task 5.**

3. **Demo documents**: Boss/sales to provide 3-4 real (redacted) plantation documents. **Blocks Task 13** (can use samples if not provided).

---

## Pitfalls

- ❌ Putting all 6 skills under `skills/plantation/` — the 4 document skills are SHARED (all industries need them). Only 2 go under `industries/plantation/skills/`.
- ❌ Inventing `_call_department_agent` — this function does NOT exist. Use `_generate_department_response_async` from `gateway.py` (line 292). Import it, don't recreate it.
- ❌ Forgetting to add `estate-ops` to `catalog_personas` in `gateway.py` — the fallback gives "Assistant" persona instead of "Gozen". Task 11.5 fixes this.
- ❌ Forgetting to register `PlantationDashboard` in `DashboardViewer.tsx` — the dashboard won't appear in the portal.
- ❌ Not testing video upload — qwen3.5-plus supports video but it's a different input type; verify before demo.
- ❌ Forgetting to add backend endpoints in `dashboard.py` — the dashboard UI will show errors when uploading.
- ❌ Not completing the onboarding plan first — the Plantation industry must exist in the catalog before the dashboard can find it.
- ❌ Hardcoding bot token in config instead of `.env` — tokens go in `.env`, never in config.yaml or the repo.
- ❌ Using `support`/`engineering` as department keys in frontend code — use the backend names `customer-support`/`coding` per TO-DO-ON.md D3 fix.
- ❌ Not parsing the agent's text response into JSON for the frontend — the agent returns text, not structured JSON. Use regex to extract JSON from the response.
