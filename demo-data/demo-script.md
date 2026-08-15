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
