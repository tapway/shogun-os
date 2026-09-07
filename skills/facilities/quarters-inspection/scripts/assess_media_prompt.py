"""VLM prompt builder for quarters inspection.

Builds the prompt string sent to the vision model (Qwen-VL) from a pack's
inventory + checklist. Also parses the VLM's JSON response.

Pure functions — no network calls.

Usage:
    from assess_media_prompt import build_assessment_prompt, parse_observations_json
    prompt = build_assessment_prompt(pack, unit_id="Block-A-12")
    observations = parse_observations_json(vlm_response_text)
"""

from __future__ import annotations

import json
import re
import os
import sys
from typing import Any, Dict, Optional

sys.path.insert(0, os.path.dirname(__file__))
from validate_pack import validate_pack


def build_assessment_prompt(pack: Dict[str, Any], unit_id: str = "") -> str:
    """Build the VLM assessment prompt from a pack.

    The prompt includes every inventory label + expected_count and every
    checklist item, and asks the VLM to return JSON matching the observations
    shape consumed by build_report.
    """
    validate_pack(pack)

    lines: list[str] = []
    lines.append(f"You are inspecting staff quarters unit: {unit_id or '(unspecified)'}")
    lines.append(f"Pack: {pack['title']} (v{pack['version']})")
    lines.append("")

    # Inventory section
    lines.append("## Inventory to Check")
    lines.append("Count each item visible in the photo(s). Report observed count.")
    lines.append("")
    for item in pack["inventory"]:
        req = " (REQUIRED)" if item.get("required", True) else " (optional)"
        lines.append(f"- {item['label']}: expected_count={item['expected_count']}{req}")
    lines.append("")

    # Checklist section
    lines.append("## Checklist to Assess")
    lines.append("For each item, assess pass or fail based on what you see in the photo(s).")
    lines.append("")
    for item in pack["checklist"]:
        lines.append(f"- [{item['severity'].upper()}] {item['label']} (category: {item['category']})")
    lines.append("")

    # JSON output instructions
    lines.append("## Required JSON Output")
    lines.append("Return ONLY a JSON object with this exact shape:")
    lines.append("```json")
    lines.append("{")
    lines.append('  "inventory": [')
    for item in pack["inventory"]:
        lines.append(f'    {{"id": "{item["id"]}", "observed": <int>, "notes": "..."}}')
    lines.append("  ],")
    lines.append('  "checklist": [')
    for item in pack["checklist"]:
        lines.append(f'    {{"id": "{item["id"]}", "status": "pass|fail", "notes": "..."}}')
    lines.append("  ],")
    lines.append('  "cleanliness_summary": "1-2 sentences",')
    lines.append('  "site_condition_summary": "1-2 sentences",')
    lines.append('  "confidence": "low|medium|high"')
    lines.append("}")
    lines.append("```")
    lines.append("")
    lines.append("Return ONLY the JSON. No explanation outside the JSON block.")

    return "\n".join(lines)


def parse_observations_json(text: str) -> Dict[str, Any]:
    """Extract and parse JSON from a VLM response.

    Handles:
    - Raw JSON
    - JSON inside ```json ... ``` fences
    - JSON inside ``` ... ``` fences
    - Leading/trailing text

    Raises ValueError if no valid JSON found.
    """
    if not text or not text.strip():
        raise ValueError("Empty response from VLM")

    # Try raw JSON first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` or ``` ... ``` fences
    patterns = [
        r"```json\s*\n?(.*?)\n?\s*```",
        r"```\s*\n?(.*?)\n?\s*```",
        r"\{.*\}",  # bare JSON object
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            candidate = match.group(1) if match.lastindex else match.group(0)
            candidate = candidate.strip()
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    # Last resort: find first { and last }
    first = text.find("{")
    last = text.rfind("}")
    if first >= 0 and last > first:
        candidate = text[first:last + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from VLM response: {text[:200]}...")
