"""Validate a quarters inspection pack.

Usage:
    from validate_pack import load_pack, validate_pack, PackValidationError
    pack = load_pack("path/to/pack.json")
    validate_pack(pack)

Stdlib-only — no external dependencies (no jsonschema package required).
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Union


class PackValidationError(ValueError):
    """Raised when a pack fails validation."""


def load_pack(path_or_dict: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Load a pack from a file path (JSON) or pass through a dict."""
    if isinstance(path_or_dict, dict):
        pack = path_or_dict
    elif isinstance(path_or_dict, str) and os.path.isfile(path_or_dict):
        with open(path_or_dict, encoding="utf-8") as f:
            pack = json.load(f)
    else:
        raise PackValidationError(f"Cannot load pack from: {path_or_dict}")
    validate_pack(pack)
    return pack


def validate_pack(pack: Dict[str, Any]) -> None:
    """Validate a pack dict. Raises PackValidationError on failure."""
    if not isinstance(pack, dict):
        raise PackValidationError("Pack must be a JSON object")

    # Required top-level keys
    required_keys = ["id", "room_type", "title", "version", "inventory", "checklist"]
    for key in required_keys:
        if key not in pack:
            raise PackValidationError(f"Missing required key: '{key}'")

    # id: non-empty string
    if not isinstance(pack["id"], str) or not pack["id"].strip():
        raise PackValidationError("'id' must be a non-empty string")

    # room_type: non-empty string
    if not isinstance(pack["room_type"], str) or not pack["room_type"].strip():
        raise PackValidationError("'room_type' must be a non-empty string")

    # title: non-empty string
    if not isinstance(pack["title"], str) or not pack["title"].strip():
        raise PackValidationError("'title' must be a non-empty string")

    # version: integer >= 1
    if not isinstance(pack["version"], int) or pack["version"] < 1:
        raise PackValidationError("'version' must be an integer >= 1")

    # inventory: non-empty array
    inventory = pack["inventory"]
    if not isinstance(inventory, list) or len(inventory) == 0:
        raise PackValidationError("'inventory' must be a non-empty array")

    seen_inv_ids: set[str] = set()
    for i, item in enumerate(inventory):
        if not isinstance(item, dict):
            raise PackValidationError(f"inventory[{i}] must be an object")
        for key in ("id", "label", "expected_count"):
            if key not in item:
                raise PackValidationError(f"inventory[{i}] missing key: '{key}'")
        if not isinstance(item["id"], str) or not item["id"].strip():
            raise PackValidationError(f"inventory[{i}].id must be a non-empty string")
        if item["id"] in seen_inv_ids:
            raise PackValidationError(f"Duplicate inventory id: '{item['id']}'")
        seen_inv_ids.add(item["id"])
        if not isinstance(item["label"], str) or not item["label"].strip():
            raise PackValidationError(f"inventory[{i}].label must be a non-empty string")
        if not isinstance(item["expected_count"], int) or item["expected_count"] < 0:
            raise PackValidationError(f"inventory[{i}].expected_count must be an integer >= 0")
        if "required" in item and not isinstance(item["required"], bool):
            raise PackValidationError(f"inventory[{i}].required must be a boolean")

    # checklist: non-empty array
    checklist = pack["checklist"]
    if not isinstance(checklist, list) or len(checklist) == 0:
        raise PackValidationError("'checklist' must be a non-empty array")

    valid_categories = {"cleanliness", "site_condition", "furniture", "safety"}
    valid_severities = {"critical", "major", "minor"}
    seen_cl_ids: set[str] = set()
    for i, item in enumerate(checklist):
        if not isinstance(item, dict):
            raise PackValidationError(f"checklist[{i}] must be an object")
        for key in ("id", "label", "category", "severity"):
            if key not in item:
                raise PackValidationError(f"checklist[{i}] missing key: '{key}'")
        if not isinstance(item["id"], str) or not item["id"].strip():
            raise PackValidationError(f"checklist[{i}].id must be a non-empty string")
        if item["id"] in seen_cl_ids:
            raise PackValidationError(f"Duplicate checklist id: '{item['id']}'")
        seen_cl_ids.add(item["id"])
        if not isinstance(item["label"], str) or not item["label"].strip():
            raise PackValidationError(f"checklist[{i}].label must be a non-empty string")
        if item["category"] not in valid_categories:
            raise PackValidationError(
                f"checklist[{i}].category must be one of {valid_categories}, got '{item['category']}'"
            )
        if item["severity"] not in valid_severities:
            raise PackValidationError(
                f"checklist[{i}].severity must be one of {valid_severities}, got '{item['severity']}'"
            )
