---
name: estate-legal-scan
description: "Use when scanning legal documents, contracts, and estate-related docs. Input: document file. Output: summary (few sentences) + interpretation (parties, clauses, risks). Does NOT scan invoices/receipts."
version: 1.0.0
author: Shogun OS
category: plantation
tags: [plantation, estate-ops, legal, contract, document-scan, ocr, deepseek]
---

# Estate Legal Document Scan

OCR a legal document (contract, agreement, lease, NDA) and produce a summary + interpretation. One function: legal document analysis.

Does NOT scan invoices/receipts (that's `finance-doc-scan`). Does NOT store to gbrain (that's the dashboard endpoint's job).

## When to Load

- User uploads a contract, legal document, or agreement in the Estate Ops dashboard
- Estate Ops dashboard scan endpoint calls this skill after OCR

## Input

Document file (PDF, PNG, JPG) — OCR text is extracted first by the backend, then passed to DeepSeek with this skill's prompt.

## Output

JSON object with **summary (few sentences)** + **interpretation**:
```json
{
  "document_type": "employment_contract | service_agreement | lease | nda | other",
  "summary": "This is a 2-year employment contract between Estate Operations Sdn Bhd and worker John Doe, effective 1 January 2026. The contract covers general estate duties with a monthly salary of RM 2,500 and includes standard termination clauses.",
  "interpretation": {
    "parties": ["Estate Operations Sdn Bhd", "John Doe"],
    "duration": "2 years (1 Jan 2026 - 31 Dec 2027)",
    "value": "RM 2,500/month",
    "key_obligations": ["General estate duties", "Maintain equipment", "Report safety hazards"],
    "termination_clause": "30 days written notice required",
    "penalty_clause": "Breach results in 1 month salary compensation"
  },
  "risks": ["Auto-renewal clause present", "Short notice period for termination"],
  "recommendations": ["Review auto-renewal clause", "Negotiate longer notice period"]
}
```

## DeepSeek Prompt

```
You are a legal document analyst. Below is the OCR text from a legal document, contract, or agreement.

=== DOCUMENT TEXT ===
{ocr_text}
=== END DOCUMENT TEXT ===

Analyse this legal document. Return ONLY a JSON object:
{
  "document_type": "employment_contract | service_agreement | lease | nda | other",
  "summary": "3-4 sentences summarising what this document is about, who the parties are, and the key terms",
  "interpretation": {
    "parties": ["list all parties"],
    "duration": "contract duration if applicable",
    "value": "contract value or salary if applicable",
    "key_obligations": ["list key obligations of each party"],
    "termination_clause": "termination conditions",
    "penalty_clause": "penalty clauses if any"
  },
  "risks": ["list any risks: unlimited liability, auto-renewal, short notice, etc."],
  "recommendations": ["list actionable recommendations"]
}

Write a clear summary (3-4 sentences) AND a detailed interpretation. Both are required.
```

## Pitfalls

- ❌ Skipping the summary — a few-sentence summary is always required
- ❌ Listing fields without interpretation — this skill analyses, not just extracts
- ❌ Scanning invoices/receipts — that's `finance-doc-scan`'s job
- ❌ Missing risk flags — always check for auto-renewal, unlimited liability, short notice
