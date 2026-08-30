"""Configuration loader for the Shogun OS web portal backend.

Loads settings from ``~/.shogun-os/web.json`` and overlays environment variables.
"""

from __future__ import annotations

import json
import os
import secrets
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

SHOGUN_HOME = Path(os.environ.get("SHOGUN_HOME", Path.home() / ".shogun-os")).expanduser()
CONFIG_PATH = SHOGUN_HOME / "web.json"
DB_PATH = SHOGUN_HOME / "web.db"
SSO_PEERS_PATH = SHOGUN_HOME / "sso-peers.json"


@dataclass
class SSOPeer:
    """A trusted SSO peer site (one of the 6 'Website 1' instances)."""

    id: str = ""            # slug identifier (e.g. "portal", "crm", "erp")
    name: str = ""          # display name (e.g. "Main Portal")
    origin: str = ""        # website 1's base URL (e.g. "https://portal.company.com")
    secret: str = ""        # per-site HMAC secret (different for each peer)
    active: bool = True     # if False, tokens from this peer are rejected


@dataclass
class OAuthProviderConfig:
    """OAuth client credentials for a single IdP."""

    client_id: str = ""
    client_secret: str = ""
    redirect_uri: str = ""


def _env_int(name: str, default: int) -> int:
    """Parse an int env var — garbage values degrade to the default instead of a boot crash.

    Must live above WebConfig: the dataclass defaults are evaluated at class
    definition time, so the helper has to be defined by then.
    """
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    """Parse a float env var — garbage values degrade to the default instead of a boot crash.

    Same contract as _env_int (see its docstring). NaN and inf are rejected — they would
    silently defeat cache expiration semantics."""
    import math
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    try:
        val = float(raw)
        if not math.isfinite(val):
            return default
        return val
    except ValueError:
        return default


@dataclass
class WebConfig:
    """Typed configuration for the per-tenant web portal."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8787
    debug: bool = False
    secret_key: str = ""
    session_max_age_seconds: int = 60 * 60 * 24 * 7  # 7 days

    # Tenant identity
    subdomain: str = "local"
    company_name: str = "Shogun OS"
    logo_url: str = ""
    timezone: str = "UTC"
    tenant_status: str = "active"

    # Paths
    db_path: str = str(DB_PATH)
    static_dir: str = ""
    gbrain_base_url: str = "http://127.0.0.1:7432"
    gbrain_api_key: str = os.environ.get("GBRAIN_API_KEY", "")
    brain_root: str = str(Path.home() / "brain")
    gbrain_read_preference: str = os.environ.get("GBRAIN_READ_PREFERENCE", "filesystem")
    # MCP-only sources: cap per-fetch enrichment of metadata-only list_pages rows.
    # Raise above the source size for large remote brains (each enrich = 1 get_page).
    gbrain_mcp_enrich_cap: int = _env_int("GBRAIN_MCP_ENRICH_CAP", 0)
    gbrain_mcp_enrich_concurrency: int = _env_int("GBRAIN_MCP_ENRICH_CONCURRENCY", 16)
    gbrain_page_cache_ttl: float = _env_float("GBRAIN_PAGE_CACHE_TTL", 300.0)
    # Filesystem mirror staleness guard (minutes, default 60 = ON). When the
    # newest markdown is older than this the mirror defers to MCP (guards
    # against a failed put_page sync mirror serving stale data indefinitely).
    # Set 0 to disable.
    gbrain_fs_max_age_minutes: int = _env_int("GBRAIN_FS_MAX_AGE_MINUTES", 60)
    seed_demo_brain: bool = os.environ.get("SEED_DEMO_BRAIN", "false").lower() == "true"

    # CORS
    cors_origins: List[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8787",
            "http://127.0.0.1:8787",
        ]
    )

    # Central registry (defaults = seamless public cloud)
    registry_url: str = "https://registry.shogun-os.ai"
    registry_api_key: str = ""
    auto_register: bool = False  # claim URL via onboarding Go Live, not silently on boot
    tenant_id: str = ""

    # OAuth
    public_base_url: str = "http://localhost:8787"
    google_oauth: OAuthProviderConfig = field(default_factory=OAuthProviderConfig)
    microsoft_oauth: OAuthProviderConfig = field(default_factory=OAuthProviderConfig)

    # Cross-domain SSO (Website 1 redirects → Shogun = Website 2)
    # A shared HMAC secret between trusted sites. If empty, SSO endpoints return 503.
    sso_secret: str = ""
    # Allowed origins of Website 1 (for browser redirect + CORS + Referer check)
    sso_trusted_origins: List[str] = field(default_factory=list)
    # Max age (seconds) of a SSO identity token before it's rejected. Default 2 minutes.
    sso_token_max_age_seconds: int = 120
    # If True, a SSO token for an unknown email auto-creates a 'user' (staff) account.
    # If False (default), unknown emails are rejected — user must already exist in Shogun.
    sso_auto_provision: bool = False

    # Default department gateway port base (profile N uses base + N)
    gateway_port_base: int = 18789

    def ensure_secret(self) -> None:
        """Generate a durable secret key if missing."""
        if not self.secret_key:
            self.secret_key = secrets.token_urlsafe(48)


_config: Optional[WebConfig] = None


def _as_dict(obj: Any) -> Dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    return {}


def _oauth_from_dict(data: Dict[str, Any]) -> OAuthProviderConfig:
    return OAuthProviderConfig(
        client_id=str(data.get("client_id", "") or ""),
        client_secret=str(data.get("client_secret", "") or ""),
        redirect_uri=str(data.get("redirect_uri", "") or ""),
    )


def _load_json_file(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        with path.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
        return raw if isinstance(raw, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _apply_env(cfg: WebConfig) -> WebConfig:
    """Overlay environment variables on top of file config."""
    env = os.environ

    if env.get("SHOGUN_WEB_HOST"):
        cfg.host = env["SHOGUN_WEB_HOST"]
    if env.get("SHOGUN_WEB_PORT"):
        cfg.port = int(env["SHOGUN_WEB_PORT"])
    if env.get("SHOGUN_WEB_DEBUG"):
        cfg.debug = env["SHOGUN_WEB_DEBUG"].lower() in {"1", "true", "yes", "on"}
    if env.get("SHOGUN_WEB_SECRET_KEY"):
        cfg.secret_key = env["SHOGUN_WEB_SECRET_KEY"]
    if env.get("SHOGUN_WEB_SUBDOMAIN"):
        cfg.subdomain = env["SHOGUN_WEB_SUBDOMAIN"]
    if env.get("SHOGUN_WEB_COMPANY_NAME"):
        cfg.company_name = env["SHOGUN_WEB_COMPANY_NAME"]
    if env.get("SHOGUN_WEB_TIMEZONE"):
        cfg.timezone = env["SHOGUN_WEB_TIMEZONE"]
    if env.get("SHOGUN_WEB_DB_PATH"):
        cfg.db_path = env["SHOGUN_WEB_DB_PATH"]
    if env.get("SHOGUN_WEB_STATIC_DIR"):
        cfg.static_dir = env["SHOGUN_WEB_STATIC_DIR"]
    if env.get("SHOGUN_GBRAIN_URL"):
        cfg.gbrain_base_url = env["SHOGUN_GBRAIN_URL"]
    if env.get("GBRAIN_API_KEY"):
        cfg.gbrain_api_key = env["GBRAIN_API_KEY"]
    if env.get("SHOGUN_BRAIN_ROOT"):
        cfg.brain_root = env["SHOGUN_BRAIN_ROOT"]
    if env.get("SHOGUN_REGISTRY_URL"):
        cfg.registry_url = env["SHOGUN_REGISTRY_URL"]
    if env.get("SHOGUN_REGISTRY_API_KEY"):
        cfg.registry_api_key = env["SHOGUN_REGISTRY_API_KEY"]
    if env.get("SHOGUN_PUBLIC_BASE_URL"):
        cfg.public_base_url = env["SHOGUN_PUBLIC_BASE_URL"]
    if env.get("SHOGUN_CORS_ORIGINS"):
        cfg.cors_origins = [o.strip() for o in env["SHOGUN_CORS_ORIGINS"].split(",") if o.strip()]

    # Google OAuth
    if env.get("GOOGLE_OAUTH_CLIENT_ID"):
        cfg.google_oauth.client_id = env["GOOGLE_OAUTH_CLIENT_ID"]
    if env.get("GOOGLE_OAUTH_CLIENT_SECRET"):
        cfg.google_oauth.client_secret = env["GOOGLE_OAUTH_CLIENT_SECRET"]
    if env.get("GOOGLE_OAUTH_REDIRECT_URI"):
        cfg.google_oauth.redirect_uri = env["GOOGLE_OAUTH_REDIRECT_URI"]

    # Microsoft OAuth
    if env.get("MICROSOFT_OAUTH_CLIENT_ID"):
        cfg.microsoft_oauth.client_id = env["MICROSOFT_OAUTH_CLIENT_ID"]
    if env.get("MICROSOFT_OAUTH_CLIENT_SECRET"):
        cfg.microsoft_oauth.client_secret = env["MICROSOFT_OAUTH_CLIENT_SECRET"]
    if env.get("MICROSOFT_OAUTH_REDIRECT_URI"):
        cfg.microsoft_oauth.redirect_uri = env["MICROSOFT_OAUTH_REDIRECT_URI"]

    # Cross-domain SSO
    if env.get("SHOGUN_SSO_SECRET"):
        cfg.sso_secret = env["SHOGUN_SSO_SECRET"]
    if env.get("SHOGUN_SSO_TRUSTED_ORIGINS"):
        cfg.sso_trusted_origins = [
            o.strip() for o in env["SHOGUN_SSO_TRUSTED_ORIGINS"].split(",") if o.strip()
        ]
    if env.get("SHOGUN_SSO_TOKEN_MAX_AGE"):
        try:
            cfg.sso_token_max_age_seconds = int(env["SHOGUN_SSO_TOKEN_MAX_AGE"])
        except ValueError:
            pass
    if env.get("SHOGUN_SSO_AUTO_PROVISION"):
        cfg.sso_auto_provision = env["SHOGUN_SSO_AUTO_PROVISION"].lower() in {
            "1", "true", "yes", "on"
        }

    return cfg


def load_config(force_reload: bool = False) -> WebConfig:
    """Load configuration from disk + environment."""
    global _config
    if _config is not None and not force_reload:
        return _config

    SHOGUN_HOME.mkdir(parents=True, exist_ok=True)
    data = _load_json_file(CONFIG_PATH)

    google = _oauth_from_dict(_as_dict(data.get("google_oauth")))
    microsoft = _oauth_from_dict(_as_dict(data.get("microsoft_oauth")))

    default_static = str(
        Path(__file__).resolve().parent.parent / "ui" / "dist"
    )

    cfg = WebConfig(
        host=str(data.get("host", "0.0.0.0")),
        port=int(data.get("port", 8787)),
        debug=bool(data.get("debug", False)),
        secret_key=str(data.get("secret_key", "") or ""),
        session_max_age_seconds=int(data.get("session_max_age_seconds", 60 * 60 * 24 * 7)),
        subdomain=str(data.get("subdomain", "local")),
        company_name=str(data.get("company_name", "Shogun OS")),
        logo_url=str(data.get("logo_url", "") or ""),
        timezone=str(data.get("timezone", "UTC")),
        tenant_status=str(data.get("tenant_status", "active")),
        db_path=str(data.get("db_path", str(DB_PATH))),
        static_dir=str(data.get("static_dir", default_static) or default_static),
        gbrain_base_url=str(data.get("gbrain_base_url", "http://127.0.0.1:7432")),
        brain_root=str(data.get("brain_root", str(Path.home() / "brain"))),
        cors_origins=list(data.get("cors_origins") or WebConfig().cors_origins),
        registry_url=str(data.get("registry_url", "https://registry.shogun-os.ai") or "https://registry.shogun-os.ai"),
        registry_api_key=str(data.get("registry_api_key", "") or ""),
        auto_register=bool(data.get("auto_register", False)),
        tenant_id=str(data.get("tenant_id", "") or ""),
        public_base_url=str(data.get("public_base_url", "http://localhost:8787")),
        google_oauth=google,
        microsoft_oauth=microsoft,
        sso_secret=str(data.get("sso_secret", "") or ""),
        sso_trusted_origins=list(data.get("sso_trusted_origins") or []),
        sso_token_max_age_seconds=int(data.get("sso_token_max_age_seconds", 120)),
        sso_auto_provision=bool(data.get("sso_auto_provision", False)),
        gateway_port_base=int(data.get("gateway_port_base", 18789)),
    )

    cfg = _apply_env(cfg)
    cfg.ensure_secret()

    # Fill default OAuth redirect URIs if unset
    if not cfg.google_oauth.redirect_uri:
        cfg.google_oauth.redirect_uri = f"{cfg.public_base_url.rstrip('/')}/auth/google/callback"
    if not cfg.microsoft_oauth.redirect_uri:
        cfg.microsoft_oauth.redirect_uri = (
            f"{cfg.public_base_url.rstrip('/')}/auth/microsoft/callback"
        )

    _config = cfg
    return cfg


def get_config() -> WebConfig:
    """Return the cached config, loading it on first call."""
    return load_config()


def save_config(cfg: Optional[WebConfig] = None) -> None:
    """Persist the current (or provided) config to ``web.json``."""
    global _config
    cfg = cfg or get_config()
    SHOGUN_HOME.mkdir(parents=True, exist_ok=True)

    payload = asdict(cfg)
    with CONFIG_PATH.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
        fh.write("\n")
    _config = cfg


# Known shared department profiles (name -> Hermes profile_name suffix / gbrain source)
DEFAULT_DEPARTMENTS: List[Dict[str, Any]] = [
    {"name": "hr", "profile_name": "hr-manager", "label": "HR", "port_offset": 1},
    {"name": "finance", "profile_name": "finance-manager", "label": "Finance", "port_offset": 2},
    {
        "name": "procurement",
        "profile_name": "procurement-manager",
        "label": "Procurement",
        "port_offset": 3,
    },
    {"name": "crm", "profile_name": "crm-manager", "label": "CRM", "port_offset": 4},
    {
        "name": "marketing",
        "profile_name": "marketing-manager",
        "label": "Marketing",
        "port_offset": 5,
    },
    {
        "name": "compliance",
        "profile_name": "compliance-manager",
        "label": "Compliance",
        "port_offset": 6,
    },
    {
        "name": "customer-support",
        "profile_name": "customer-support-manager",
        "label": "Customer Support",
        "port_offset": 7,
    },
    {
        "name": "coding",
        "profile_name": "coding-manager",
        "label": "Coding",
        "port_offset": 8,
    },
    {
        "name": "executive",
        "profile_name": "executive-manager",
        "label": "Executive",
        "port_offset": 9,
    },
    {
        "name": "projects",
        "profile_name": "projects-manager",
        "label": "Projects",
        "port_offset": 10,
    },
]


# ---------------------------------------------------------------------------
# Industry catalog — industry selection drives which departments are on the menu
# Shared departments (8) are always available regardless of industry.
# Industry-specific departments only appear when their industry is selected.
# ---------------------------------------------------------------------------

INDUSTRY_CATALOG: List[Dict[str, Any]] = [
    {
        "slug": "general",
        "label": "General / Services",
        "description": "Consulting, software, agencies",
        "icon": "🏢",
        "departments": ["projects", "product"],
    },
    {
        "slug": "manufacturing",
        "label": "Manufacturing",
        "description": "Factory, production, OEM",
        "icon": "🏭",
        "departments": ["production", "quality", "maintenance", "warehouse", "hse"],
    },
    {
        "slug": "retail",
        "label": "Retail",
        "description": "Stores, e-commerce, omnichannel",
        "icon": "🛒",
        "departments": [
            "stores", "merchandising", "e-commerce",
            "crm-loyalty", "supply-chain", "visual-merchandising",
        ],
    },
    {
        "slug": "plantation",
        "label": "Plantation",
        "description": "Estate, mill, agriculture",
        "icon": "🌴",
        "departments": ["facility"],
    },
]

# Shared departments — always available regardless of industry
SHARED_DEPARTMENTS: List[Dict[str, Any]] = [
    {"name": "hr", "profile_name": "hr-manager", "label": "HR", "port_offset": 1},
    {"name": "finance", "profile_name": "finance-manager", "label": "Finance", "port_offset": 2},
    {"name": "procurement", "profile_name": "procurement-manager", "label": "Procurement", "port_offset": 3},
    {"name": "crm", "profile_name": "crm-manager", "label": "CRM", "port_offset": 4},
    {"name": "marketing", "profile_name": "marketing-manager", "label": "Marketing", "port_offset": 5},
    {"name": "compliance", "profile_name": "compliance-manager", "label": "Compliance", "port_offset": 6},
    {"name": "customer-support", "profile_name": "customer-support-manager", "label": "Customer Support", "port_offset": 7},
    {"name": "coding", "profile_name": "coding-manager", "label": "Coding", "port_offset": 8},
]

# Industry-specific departments — only available when their industry is selected
INDUSTRY_DEPARTMENTS: Dict[str, List[Dict[str, Any]]] = {
    "general": [
        {"name": "projects", "profile_name": "projects-manager", "label": "Projects", "port_offset": 9},
        {"name": "product", "profile_name": "product-manager", "label": "Product", "port_offset": 10},
    ],
    "manufacturing": [
        {"name": "production", "profile_name": "production-manager", "label": "Production", "port_offset": 11},
        {"name": "quality", "profile_name": "quality-manager", "label": "Quality", "port_offset": 12},
        {"name": "maintenance", "profile_name": "maintenance-manager", "label": "Maintenance", "port_offset": 13},
        {"name": "warehouse", "profile_name": "warehouse-manager", "label": "Warehouse", "port_offset": 14},
        {"name": "hse", "profile_name": "hse-manager", "label": "HSE", "port_offset": 15},
    ],
    "retail": [
        {"name": "stores", "profile_name": "stores-manager", "label": "Stores", "port_offset": 11},
        {"name": "merchandising", "profile_name": "merchandising-manager", "label": "Merchandising", "port_offset": 12},
        {"name": "e-commerce", "profile_name": "ecommerce-manager", "label": "E-commerce", "port_offset": 13},
        {"name": "crm-loyalty", "profile_name": "crm-loyalty-manager", "label": "CRM/Loyalty", "port_offset": 14},
        {"name": "supply-chain", "profile_name": "supply-chain-manager", "label": "Supply Chain", "port_offset": 15},
        {"name": "visual-merchandising", "profile_name": "vm-manager", "label": "Visual Merchandising", "port_offset": 16},
    ],
    "plantation": [
        {"name": "facility", "profile_name": "facility-manager", "label": "Facility Management", "port_offset": 11},
    ],
}


def get_departments_for_industry(industry: str) -> List[Dict[str, Any]]:
    """Return shared + industry-specific departments for the given industry."""
    industry_depts = INDUSTRY_DEPARTMENTS.get(industry, [])
    return list(SHARED_DEPARTMENTS) + list(industry_depts)


# ---------------------------------------------------------------------------
# SSO peer site management (~/.shogun-os/sso-peers.json)
#
# Each peer = one of the 6 "Website 1" instances. Each gets its own secret so
# if one site is compromised, the others are unaffected. The file is a list of
# SSOPeer dicts. Loaded/saved here so the admin API and config share one source.
# ---------------------------------------------------------------------------


def _peer_from_dict(data: Dict[str, Any]) -> SSOPeer:
    return SSOPeer(
        id=str(data.get("id", "") or "").strip(),
        name=str(data.get("name", "") or "").strip(),
        origin=str(data.get("origin", "") or "").strip().rstrip("/"),
        secret=str(data.get("secret", "") or ""),
        active=bool(data.get("active", True)),
    )


def _peer_to_dict(peer: SSOPeer) -> Dict[str, Any]:
    return {
        "id": peer.id,
        "name": peer.name,
        "origin": peer.origin,
        "secret": peer.secret,
        "active": peer.active,
    }


def load_sso_peers() -> List[SSOPeer]:
    """Load all SSO peer sites from ``~/.shogun-os/sso-peers.json``."""
    if not SSO_PEERS_PATH.is_file():
        return []
    try:
        with SSO_PEERS_PATH.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
        if not isinstance(raw, list):
            return []
        peers = [_peer_from_dict(p) for p in raw if isinstance(p, dict)]
        # Filter out peers without id or secret (incomplete entries)
        return [p for p in peers if p.id and p.secret]
    except (OSError, json.JSONDecodeError):
        return []


def save_sso_peers(peers: List[SSOPeer]) -> None:
    """Persist the full peer list to ``~/.shogun-os/sso-peers.json``."""
    SHOGUN_HOME.mkdir(parents=True, exist_ok=True)
    payload = [_peer_to_dict(p) for p in peers]
    with SSO_PEERS_PATH.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
        fh.write("\n")


def get_sso_peer_by_id(peer_id: str) -> Optional[SSOPeer]:
    """Look up a single peer by its id slug."""
    for peer in load_sso_peers():
        if peer.id == peer_id:
            return peer
    return None


def get_sso_peer_by_origin(origin: str) -> Optional[SSOPeer]:
    """Look up a peer by its origin URL (for the Origin header check)."""
    origin_n = (origin or "").rstrip("/")
    for peer in load_sso_peers():
        if peer.origin == origin_n:
            return peer
    return None
