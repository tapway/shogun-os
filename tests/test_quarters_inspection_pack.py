"""Tests for quarters inspection pack validation."""
import json
import os
import sys
import pytest

SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills", "quarters-inspection", "scripts")
sys.path.insert(0, SCRIPTS_DIR)
from validate_pack import load_pack, validate_pack, PackValidationError

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "examples", "quarters-inspection", "plantation-pack.sample.json")


def load_sample():
    with open(SAMPLE_PATH, encoding="utf-8") as f:
        return json.load(f)


class TestValidPack:
    def test_valid_sample_loads(self):
        pack = load_sample()
        validate_pack(pack)  # should not raise

    def test_load_pack_from_file(self):
        pack = load_pack(SAMPLE_PATH)
        assert pack["id"] == "plantation-type-a-v1"
        assert len(pack["inventory"]) == 6
        assert len(pack["checklist"]) == 8

    def test_load_pack_from_dict(self):
        pack = load_pack(load_sample())
        assert pack["room_type"] == "type_a"


class TestMissingKeys:
    def test_missing_id(self):
        pack = load_sample()
        del pack["id"]
        with pytest.raises(PackValidationError, match="Missing required key: 'id'"):
            validate_pack(pack)

    def test_missing_inventory(self):
        pack = load_sample()
        del pack["inventory"]
        with pytest.raises(PackValidationError, match="Missing required key: 'inventory'"):
            validate_pack(pack)

    def test_missing_checklist(self):
        pack = load_sample()
        del pack["checklist"]
        with pytest.raises(PackValidationError, match="Missing required key: 'checklist'"):
            validate_pack(pack)


class TestInventoryValidation:
    def test_empty_inventory(self):
        pack = load_sample()
        pack["inventory"] = []
        with pytest.raises(PackValidationError, match="non-empty array"):
            validate_pack(pack)

    def test_duplicate_inventory_ids(self):
        pack = load_sample()
        pack["inventory"][1]["id"] = pack["inventory"][0]["id"]
        with pytest.raises(PackValidationError, match="Duplicate inventory id"):
            validate_pack(pack)

    def test_negative_expected_count(self):
        pack = load_sample()
        pack["inventory"][0]["expected_count"] = -1
        with pytest.raises(PackValidationError, match="integer >= 0"):
            validate_pack(pack)

    def test_missing_expected_count(self):
        pack = load_sample()
        del pack["inventory"][0]["expected_count"]
        with pytest.raises(PackValidationError, match="missing key: 'expected_count'"):
            validate_pack(pack)


class TestChecklistValidation:
    def test_empty_checklist(self):
        pack = load_sample()
        pack["checklist"] = []
        with pytest.raises(PackValidationError, match="non-empty array"):
            validate_pack(pack)

    def test_duplicate_checklist_ids(self):
        pack = load_sample()
        pack["checklist"][1]["id"] = pack["checklist"][0]["id"]
        with pytest.raises(PackValidationError, match="Duplicate checklist id"):
            validate_pack(pack)

    def test_invalid_category(self):
        pack = load_sample()
        pack["checklist"][0]["category"] = "nonexistent"
        with pytest.raises(PackValidationError, match="category"):
            validate_pack(pack)

    def test_invalid_severity(self):
        pack = load_sample()
        pack["checklist"][0]["severity"] = "nonexistent"
        with pytest.raises(PackValidationError, match="severity"):
            validate_pack(pack)


class TestTypeValidation:
    def test_version_must_be_integer(self):
        pack = load_sample()
        pack["version"] = "1"
        with pytest.raises(PackValidationError, match="integer"):
            validate_pack(pack)

    def test_id_must_be_string(self):
        pack = load_sample()
        pack["id"] = 123
        with pytest.raises(PackValidationError, match="non-empty string"):
            validate_pack(pack)
