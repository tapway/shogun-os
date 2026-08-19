"""E2E-style tests for registry.py — status, health, register, go-live."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import registry  # noqa: E402
from models import Tenant  # noqa: E402


def _make_tenant():
    return Tenant(id=1, subdomain="acme", company_name="Acme Corp",
                  timezone="UTC", status="active", logo_url=None)


def _make_cfg(subdomain="acme", public_url="https://acme.shogun-os.ai", port=8000):
    cfg = MagicMock()
    cfg.subdomain = subdomain
    cfg.public_base_url = public_url
    cfg.port = port
    return cfg


# ─── Status ───────────────────────────────────────────────────────────────


def test_registry_status_returns_subdomain_and_company():
    tenant = _make_tenant()
    db = MagicMock()
    with patch.object(registry, "get_primary_tenant", return_value=tenant):
        with patch.object(registry, "get_config", return_value=_make_cfg()):
            with patch.object(registry, "_registry_base", return_value="https://reg.example.com"):
                with patch.object(registry, "TUNNEL_TOKEN_PATH", Path("/nonexistent")):
                    result = asyncio.run(registry.registry_status(db=db))
    assert result["subdomain"] == "acme"
    assert result["company_name"] == "Acme Corp"
    assert "live" in result
    assert "local_url" in result


def test_registry_status_live_when_https_subdomain():
    tenant = _make_tenant()
    tenant.subdomain = "acme"
    db = MagicMock()
    with patch.object(registry, "get_primary_tenant", return_value=tenant):
        with patch.object(registry, "get_config", return_value=_make_cfg(subdomain="acme", public_url="https://acme.shogun-os.ai")):
            with patch.object(registry, "_registry_base", return_value="https://reg.example.com"):
                with patch.object(registry, "TUNNEL_TOKEN_PATH", Path("/nonexistent")):
                    result = asyncio.run(registry.registry_status(db=db))
    assert result["live"] is True


def test_registry_status_not_live_when_local_subdomain():
    tenant = _make_tenant()
    tenant.subdomain = "local"
    db = MagicMock()
    with patch.object(registry, "get_primary_tenant", return_value=tenant):
        with patch.object(registry, "get_config", return_value=_make_cfg(subdomain="local", public_url="http://localhost:8000")):
            with patch.object(registry, "_registry_base", return_value="https://reg.example.com"):
                with patch.object(registry, "TUNNEL_TOKEN_PATH", Path("/nonexistent")):
                    result = asyncio.run(registry.registry_status(db=db))
    assert result["live"] is False


# ─── Health ──────────────────────────────────────────────────────────────


def test_registry_health_local_ok():
    tenant = _make_tenant()
    db = MagicMock()
    # Build a proper async context manager mock for httpx.AsyncClient
    mock_resp = MagicMock()
    mock_resp.status_code = 200

    class _AsyncClientMock:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return mock_resp

    with patch.object(registry, "get_primary_tenant", return_value=tenant):
        with patch.object(registry, "get_config", return_value=_make_cfg()):
            with patch.object(registry, "_registry_base", return_value="https://reg.example.com"):
                with patch("httpx.AsyncClient", _AsyncClientMock):
                    result = asyncio.run(registry.registry_health(db=db))
    assert result["local"]["ok"] is True
    assert result["local"]["service"] == "shogun-web"


# ─── Register route ──────────────────────────────────────────────────────


class _RegisterRequest:
    def __init__(self, force=False, metadata=None, create_tunnel=True):
        self.force = force
        self.metadata = metadata or {}
        self.create_tunnel = create_tunnel


def test_register_route_returns_result():
    user = MagicMock()
    db = MagicMock()
    expected = {"ok": True, "subdomain": "acme"}
    with patch("registry.register_with_central", return_value=expected):
        result = asyncio.run(registry.register_route(
            _RegisterRequest(), user=user, db=db,
        ))
    assert result["ok"] is True


def test_register_route_skipped_when_not_configured_raises_503():
    user = MagicMock()
    db = MagicMock()
    skipped = {"skipped": True, "reason": "registry_url not configured"}
    with patch("registry.register_with_central", return_value=skipped):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(registry.register_route(
                _RegisterRequest(), user=user, db=db,
            ))
    assert exc_info.value.status_code == 503


# ─── Go-live route ────────────────────────────────────────────────────────


class _GoLiveRequest:
    def __init__(self, create_tunnel=True, force=False):
        self.create_tunnel = create_tunnel
        self.force = force


def test_go_live_success_returns_ok():
    user = MagicMock()
    db = MagicMock()
    with patch("registry.go_live", return_value={"ok": True, "public_url": "https://acme.shogun-os.ai"}):
        result = asyncio.run(registry.go_live_route(
            _GoLiveRequest(), user=user, db=db,
        ))
    assert result["ok"] is True


def test_go_live_failure_raises_502():
    user = MagicMock()
    db = MagicMock()
    with patch("registry.go_live", return_value={"ok": False, "error": "Tunnel failed"}):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(registry.go_live_route(
                _GoLiveRequest(), user=user, db=db,
            ))
    assert exc_info.value.status_code == 502


def test_go_live_skipped_does_not_raise():
    user = MagicMock()
    db = MagicMock()
    with patch("registry.go_live", return_value={"skipped": True, "reason": "already live"}):
        result = asyncio.run(registry.go_live_route(
            _GoLiveRequest(), user=user, db=db,
        ))
    assert result["skipped"] is True
