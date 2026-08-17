# Quarters Inspection Fixtures

This directory contains test fixtures for the quarters-inspection skill.

## Files

- `plantation-pack.sample.json` — sample inspection pack with 6 inventory items + 8 checklist items
- `canned-observations.json` — canned VLM observations for offline testing (no live VLM needed)

## Usage

The sample pack is used by:
- `tests/test_quarters_inspection_pack.py` — pack validation tests
- `tests/test_quarters_inspection_report.py` — report validation tests
- `tests/test_quarters_inspection_build_report.py` — report builder tests
- `tests/test_quarters_inspection_assess_prompt.py` — prompt builder tests
- `skills/quarters-inspection/scripts/e2e_offline_demo.py` — end-to-end demo

## Adding New Fixtures

1. Create a new pack JSON following `schema/quarters-inspection/pack.schema.json`
2. Create matching canned observations (what the VLM would return)
3. Add a test case in the relevant test file
