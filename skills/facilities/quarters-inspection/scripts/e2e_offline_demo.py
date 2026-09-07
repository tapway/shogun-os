"""End-to-end offline demo for quarters inspection.

Runs the full pipeline WITHOUT a live VLM:
1. Load sample pack
2. Use canned observations (simulated VLM output)
3. Build report (deterministic)
4. Validate report
5. Print markdown report

Usage:
    python e2e_offline_demo.py --pack ../../examples/quarters-inspection/plantation-pack.sample.json --unit Block-A-12
    python e2e_offline_demo.py  # uses defaults
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# Add scripts to path
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS_DIR)

from validate_pack import load_pack
from validate_report import validate_report
from build_report import build_report, render_report_markdown


# Canned observations — simulates what the VLM would return
CANNED_OBSERVATIONS = {
    "inventory": [
        {"id": "bed", "observed": 2, "notes": "Two single beds, good condition"},
        {"id": "mattress", "observed": 2, "notes": "Both mattresses present"},
        {"id": "cupboard", "observed": 0, "notes": "No cupboard visible"},  # FAIL
        {"id": "fan", "observed": 1, "notes": "Ceiling fan present"},
        {"id": "table", "observed": 1, "notes": "Small study table"},
        {"id": "chair", "observed": 1, "notes": "Plastic chair"},
    ],
    "checklist": [
        {"id": "floors_clean", "status": "pass", "notes": "Floor swept and clean"},
        {"id": "no_mold", "status": "fail", "notes": "Black spots near window"},  # FAIL
        {"id": "furniture_undamaged", "status": "pass", "notes": "All furniture intact"},
        {"id": "bedding_clean", "status": "pass", "notes": "Bedding fresh"},
        {"id": "walls_intact", "status": "pass", "notes": "Walls in good condition"},
        {"id": "lighting_functional", "status": "pass", "notes": "Light working"},
        {"id": "ventilation_adequate", "status": "pass", "notes": "Window provides ventilation"},
        {"id": "no_safety_hazards", "status": "pass", "notes": "No hazards visible"},
    ],
    "cleanliness_summary": "Generally clean except for mold near window.",
    "site_condition_summary": "Structurally sound, mold issue near window needs attention.",
    "confidence": "high",
}


def main():
    parser = argparse.ArgumentParser(description="Quarters inspection offline demo")
    parser.add_argument(
        "--pack",
        default=os.path.join(os.path.dirname(SCRIPTS_DIR), "..", "..", "examples", "quarters-inspection", "plantation-pack.sample.json"),
        help="Path to pack JSON file",
    )
    parser.add_argument("--unit", default="Block-A-12", help="Unit identifier")
    parser.add_argument("--submitter", default="demo:offline", help="Submitter identifier")
    args = parser.parse_args()

    # Step 1: Load + validate pack
    print("=== Step 1: Load Pack ===")
    pack = load_pack(args.pack)
    print(f"  Pack: {pack['title']} (v{pack['version']})")
    print(f"  Inventory: {len(pack['inventory'])} items")
    print(f"  Checklist: {len(pack['checklist'])} items")
    print()

    # Step 2: Use canned observations (simulated VLM)
    print("=== Step 2: Canned Observations (simulated VLM) ===")
    print(f"  Inventory observations: {len(CANNED_OBSERVATIONS['inventory'])}")
    print(f"  Checklist observations: {len(CANNED_OBSERVATIONS['checklist'])}")
    print()

    # Step 3: Build report (deterministic)
    print("=== Step 3: Build Report ===")
    meta = {
        "unit_id": args.unit,
        "submitter": args.submitter,
        "media_count": 4,
    }
    report = build_report(pack, CANNED_OBSERVATIONS, meta)
    print(f"  Overall status: {report['overall_status'].upper()}")
    print(f"  Failed items: {report['failed_items'] or 'none'}")
    print()

    # Step 4: Validate report
    print("=== Step 4: Validate Report ===")
    validate_report(report)
    print("  ✅ Report validated successfully")
    print()

    # Step 5: Print markdown report
    print("=== Step 5: Markdown Report ===")
    print()
    md = render_report_markdown(report)
    print(md)
    print()

    # Exit code: 0 if pass, 1 if fail
    if report["overall_status"] == "fail":
        print(f"\n⚠ Inspection FAILED — {len(report['failed_items'])} item(s) need attention")
        sys.exit(0)  # exit 0 — the demo itself succeeded
    else:
        print("\n✅ Inspection PASSED — all items OK")
        sys.exit(0)


if __name__ == "__main__":
    main()
