"""Regression tests for safe env-var parsing in config.py.

MoA round-11 should-fix: gbrain_page_cache_ttl was coerced with a raw
float() at class-definition time — a malformed GBRAIN_PAGE_CACHE_TTL
crashed the whole portal at boot. _env_float now degrades to the
default, matching _env_int's contract.
"""

import sys
from pathlib import Path

import pytest

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import config  # noqa: E402


def test_env_float_garbage_degrades_to_default(monkeypatch):
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "abc")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0


def test_env_float_valid_value_parsed(monkeypatch):
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "45.5")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 45.5


def test_env_float_empty_degrades_to_default(monkeypatch):
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0


def test_env_float_unset_degrades_to_default(monkeypatch):
    monkeypatch.delenv("GBRAIN_PAGE_CACHE_TTL", raising=False)
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0


def test_env_float_rejects_nan_and_inf(monkeypatch):
    """NaN and inf should degrade to default — they would defeat cache expiration."""
    import math
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "nan")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "inf")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "-inf")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 300.0
    # Verify finite values still work
    monkeypatch.setenv("GBRAIN_PAGE_CACHE_TTL", "600")
    assert config._env_float("GBRAIN_PAGE_CACHE_TTL", 300.0) == 600.0


def test_webconfig_ttl_uses_safe_parser():
    """The WebConfig field must go through _env_float, not raw float()."""
    import inspect

    src = inspect.getsource(config)
    assert 'gbrain_page_cache_ttl: float = _env_float("GBRAIN_PAGE_CACHE_TTL"' in src
    assert "float(os.environ.get" not in src
