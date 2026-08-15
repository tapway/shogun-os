"""Database engine, session factory, and initialization for Shogun web portal."""

from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Iterator, Optional

from sqlalchemy import create_engine, event, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from config import DEFAULT_DEPARTMENTS, SHOGUN_HOME, get_config
from models import Base, CronJob, Department, OnboardingState, Tenant, User, utcnow

logger = logging.getLogger(__name__)


# Seed crons inserted once on init (id is the stable key — row is skipped if id already exists).
DEFAULT_CRONS_SEED: list[dict] = [
    {
        "id": "fin-burn-rate",
        "department": "finance",
        "name": "Daily Burn Rate Forecasting",
        "schedule": "0 8 * * *",
        "prompt": "Run daily burn rate forecasting and check cash runway status.",
        "skill_id": "cash-runway-forecasting",
        "enabled": True,
        "last_run": "2026-08-08T08:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
    {
        "id": "fin-invoice-aging",
        "department": "finance",
        "name": "Invoice Aging Watchdog",
        "schedule": "0 8 * * 1",
        "prompt": "Check overdue accounts receivable aging and draft polite collection reminders.",
        "skill_id": "ar-credit-control",
        "enabled": True,
        "last_run": "2026-08-03T08:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
    {
        "id": "proc-reorder-watchdog",
        "department": "procurement",
        "name": "Reorder Alert Watchdog",
        "schedule": "0 8 * * 1-5",
        "prompt": "Check SKU inventory thresholds and issue reorder alerts for low stock items.",
        "skill_id": "reorder-alert-watchdog",
        "enabled": True,
        "last_run": "2026-08-08T08:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
    {
        "id": "proc-inv-val",
        "department": "procurement",
        "name": "Weekly Inventory Valuation",
        "schedule": "0 17 * * 5",
        "prompt": "Calculate total stock asset value and record valuation report.",
        "skill_id": "weekly-inventory-valuation",
        "enabled": True,
        "last_run": "2026-08-07T17:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
    {
        "id": "crm-deal-sync",
        "department": "crm",
        "name": "Deal Activity Hourly Sync",
        "schedule": "0 9-18 * * 1-5",
        "prompt": "Sync CRM deal pipeline updates and highlight high-value stale leads.",
        "skill_id": "",
        "enabled": True,
        "last_run": "2026-08-08T18:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
    {
        "id": "hr-candidate-watchdog",
        "department": "hr",
        "name": "Candidate Pipeline Sync",
        "schedule": "0 10 * * 1",
        "prompt": "Sync recruitment candidate applications and stage updates.",
        "skill_id": "",
        "enabled": True,
        "last_run": "2026-08-03T10:00:00Z",
        "created_at": "2026-07-26T00:00:00Z",
    },
]

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def get_database_url() -> str:
    """Return the SQLAlchemy SQLite URL for this tenant."""
    cfg = get_config()
    db_path = Path(cfg.db_path).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path}"


def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:  # type: ignore[no-untyped-def]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def get_engine(echo: bool = False) -> Engine:
    """Return (and lazily create) the shared SQLAlchemy engine."""
    global _engine
    if _engine is None:
        url = get_database_url()
        _engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            echo=echo,
        )
        if url.startswith("sqlite"):
            event.listen(_engine, "connect", _set_sqlite_pragma)
        logger.info("Database engine created: %s", url)
    return _engine


def get_session_factory() -> sessionmaker:
    """Return the sessionmaker bound to the shared engine."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
            expire_on_commit=False,
        )
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Context manager for scripts / startup hooks."""
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _ensure_tenant(db: Session) -> Tenant:
    """Create the default tenant row from config if missing."""
    cfg = get_config()
    tenant = db.execute(
        select(Tenant).where(Tenant.subdomain == cfg.subdomain)
    ).scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(
            subdomain=cfg.subdomain,
            company_name=cfg.company_name,
            logo_url=cfg.logo_url or None,
            timezone=cfg.timezone,
            status=cfg.tenant_status,
        )
        db.add(tenant)
        db.flush()
        logger.info("Created tenant subdomain=%s id=%s", tenant.subdomain, tenant.id)
    else:
        # Keep config-driven fields in sync
        tenant.company_name = cfg.company_name
        tenant.logo_url = cfg.logo_url or None
        tenant.timezone = cfg.timezone
        tenant.status = cfg.tenant_status
    return tenant


DEFAULT_ACTIVE_NAMES = {"crm", "finance", "procurement"}


def _ensure_departments(db: Session, tenant: Tenant) -> None:
    """Seed catalog departments with CRM, Finance, Procurement active and others inactive."""
    cfg = get_config()
    existing = {
        d.name: d
        for d in db.execute(
            select(Department).where(Department.tenant_id == tenant.id)
        ).scalars()
    }
    for spec in DEFAULT_DEPARTMENTS:
        name = spec["name"]
        default_status = "active" if name in DEFAULT_ACTIVE_NAMES else "inactive"
        if name in existing:
            dept = existing[name]
            continue  # preserve admin-set status — don't clobber on re-init
        port = cfg.gateway_port_base + int(spec.get("port_offset", 0))
        dept = Department(
            tenant_id=tenant.id,
            name=name,
            profile_name=spec["profile_name"],
            status=default_status,
            provider_config={},
            gateway_port=port,
        )
        db.add(dept)
        logger.info("Seeded department %s (status %s, port %s)", name, default_status, port)


def _ensure_onboarding(db: Session, tenant: Tenant) -> None:
    state = db.execute(
        select(OnboardingState).where(OnboardingState.tenant_id == tenant.id)
    ).scalar_one_or_none()
    if state is None:
        db.add(
            OnboardingState(
                tenant_id=tenant.id,
                current_step="welcome",
                data={},
                completed_at=None,
            )
        )


def _ensure_default_user(db: Session, tenant: Tenant) -> None:
    """No-op. Default admin is no longer auto-seeded.

    First-run admin creation is handled by the CLI bootstrap helper
    ``auth.ensure_bootstrap_admin()`` which creates an admin with
    ``first_login=True`` (forces password change). Auto-seeding
    ``admin@localhost / admin123456`` was removed for security (PR #14 review).
    """
    return


def _ensure_default_crons(db: Session) -> None:
    """Seed built-in cron jobs once (skip rows whose id already exists)."""
    existing_ids = {
        row.id for row in db.execute(select(CronJob)).scalars()
    }
    for spec in DEFAULT_CRONS_SEED:
        if spec["id"] in existing_ids:
            continue
        db.add(CronJob(
            id=spec["id"],
            department=spec["department"],
            name=spec["name"],
            schedule=spec["schedule"],
            prompt=spec["prompt"],
            skill_id=spec.get("skill_id", ""),
            enabled=bool(spec.get("enabled", True)),
            deliver_channel_id="",
            deliver_channel_name="",
            last_run=spec.get("last_run"),
            created_at=utcnow(),
        ))
        logger.info("Seeded cron job %s", spec["id"])


def init_db() -> None:
    """Create tables and seed tenant / department catalog."""
    SHOGUN_HOME.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    # Ensure cron_jobs table exists on production DBs where create_all
    # doesn't ALTER existing tables. Raw SQL fallback (PR #16 review).
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cron_jobs (
                id VARCHAR(128) PRIMARY KEY,
                department VARCHAR(128) NOT NULL,
                name VARCHAR(256) NOT NULL,
                schedule VARCHAR(128) NOT NULL DEFAULT '0 9 * * 1-5',
                prompt TEXT NOT NULL DEFAULT '',
                skill_id VARCHAR(256) NOT NULL DEFAULT '',
                enabled BOOLEAN NOT NULL DEFAULT 1,
                deliver_channel_id VARCHAR(128) NOT NULL DEFAULT '',
                tenant_id VARCHAR(36),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
    with session_scope() as db:
        tenant = _ensure_tenant(db)
        _ensure_departments(db, tenant)
        _ensure_onboarding(db, tenant)
        _ensure_default_user(db, tenant)
        _ensure_default_crons(db)
    logger.info("Database initialized at %s", get_config().db_path)


def get_primary_tenant(db: Session) -> Tenant:
    """Return the primary (config subdomain) tenant or raise."""
    cfg = get_config()
    tenant = db.execute(
        select(Tenant).where(Tenant.subdomain == cfg.subdomain)
    ).scalar_one_or_none()
    if tenant is None:
        tenant = _ensure_tenant(db)
        db.flush()
    return tenant
