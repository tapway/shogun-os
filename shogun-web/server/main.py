"""Shogun OS web portal — FastAPI application entry point."""

from __future__ import annotations

import logging
import os
import re as _re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from auth import get_current_user
from config import get_config, save_config
from database import get_db, init_db, session_scope
from models import ScannedDocument, SiteInspection, Tenant, User
from sqlalchemy import select
from sqlalchemy.orm import Session
from registry import register_with_central
import comms
import email_templates

import auth
import dashboard
import departments
import gateway
import onboarding
import registry
import staff

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("shogun.web")


def _primary_tenant_id(db: Session) -> int:
    """Resolve the primary tenant id (fallback for legacy/single-tenant users)."""
    from database import get_primary_tenant
    return get_primary_tenant(db).id


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup: init DB + optional registry. Shutdown: placeholder for cleanup."""
    cfg = get_config()
    # Persist secret key so restarts keep session signatures valid
    try:
        save_config(cfg)
    except OSError as exc:
        logger.warning("Could not persist web.json: %s", exc)

    logger.info(
        "Starting Shogun web portal (subdomain=%s company=%s)",
        cfg.subdomain,
        cfg.company_name,
    )
    init_db()

    if cfg.auto_register and cfg.registry_url:
        try:
            with session_scope() as db:
                result = await register_with_central(db)
            if result.get("ok"):
                logger.info("Registered with central registry")
            else:
                logger.warning("Central registry registration: %s", result)
        except Exception as exc:
            logger.warning("Registry registration error (non-fatal): %s", exc)
    else:
        logger.info("Skipping central registry (auto_register=%s url=%r)", cfg.auto_register, cfg.registry_url)

    yield

    logger.info("Shutting down Shogun web portal")


def create_app() -> FastAPI:
    """Application factory."""
    cfg = get_config()

    app = FastAPI(
        title="Shogun OS Web Portal",
        description="Per-tenant control plane for Shogun OS department agents",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if cfg.debug else None,
        redoc_url="/api/redoc" if cfg.debug else None,
        openapi_url="/api/openapi.json" if cfg.debug else None,
    )

    # CORS — always include React Vite dev server in development
    origins = list(cfg.cors_origins)
    if cfg.debug or os.environ.get("SHOGUN_WEB_DEBUG"):
        for o in ("http://localhost:5173", "http://127.0.0.1:5173"):
            if o not in origins:
                origins.append(o)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Signed cookie sessions (used for OAuth intermediate state / flash); auth
    # itself uses the HMAC ``shogun_session`` cookie from auth.py.
    app.add_middleware(
        SessionMiddleware,
        secret_key=cfg.secret_key,
        session_cookie="shogun_starlette_session",
        max_age=cfg.session_max_age_seconds,
        same_site="lax",
        https_only=cfg.public_base_url.startswith("https://"),
    )

    # API routers (SPA expects /api/*)
    app.include_router(auth.router, prefix="/api")
    app.include_router(onboarding.router, prefix="/api")
    app.include_router(departments.router, prefix="/api")
    app.include_router(departments.skills_router, prefix="/api")
    app.include_router(gateway.router, prefix="/api")
    app.include_router(registry.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")
    app.include_router(staff.router, prefix="/api")
    app.include_router(comms.router, prefix="/api")
    app.include_router(email_templates.router, prefix="/api")

    # Static mount for chat uploads
    uploads_dir = Path(cfg.db_path).parent / "chat_uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/chat/uploads", StaticFiles(directory=str(uploads_dir)), name="chat_uploads")

    # Authenticated file serving for site inspection photos
    inspections_dir = Path(cfg.db_path).parent / "site_inspections"
    inspections_dir.mkdir(parents=True, exist_ok=True)

    @app.get("/api/site-photos/{filename:path}")
    async def serve_site_photo(
        filename: str,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Serve inspection photos — auth required, tenant-scoped."""
        safe = Path(filename).name  # prevent path traversal
        file_path = inspections_dir / safe
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Photo not found")

        # Tenant-ownership check: the file must be referenced by at least one
        # inspection record belonging to this user's tenant.
        tid = user.tenant_id
        tenant_id = tid if tid else _primary_tenant_id(db)
        photos = db.execute(
            select(SiteInspection.photos).where(SiteInspection.tenant_id == tenant_id)
        ).scalars().all()
        url = f"/api/site-photos/{safe}"
        owned = any(
            isinstance(p, dict) and p.get("url", "").endswith(f"/{safe}")
            for photos_list in photos
            for p in (photos_list or [])
        )
        if not owned:
            raise HTTPException(status_code=403, detail="Not allowed to access this photo")
        return FileResponse(file_path)

    # Authenticated file serving for scanned document uploads
    scans_dir = Path(cfg.db_path).parent / "dashboard_uploads"
    scans_dir.mkdir(parents=True, exist_ok=True)

    # Serve doc-scan files (new multi-source scanning — auth required, no DB check)
    # MUST be registered BEFORE the catch-all {filename:path} route below
    @app.get("/api/doc-uploads/scans/{dept}/{source_id}/{filename}")
    async def serve_doc_scan_file(
        dept: str,
        source_id: str,
        filename: str,
        user: User = Depends(get_current_user),
    ):
        """Serve files from the new doc-scan pipeline. Auth required."""
        # Sanitize path components to prevent traversal
        if not _re.match(r'^[A-Za-z0-9_-]+$', dept) or not _re.match(r'^[A-Za-z0-9_-]+$', source_id):
            raise HTTPException(status_code=400, detail="Invalid path component")
        safe_name = Path(filename).name  # prevent path traversal
        file_path = scans_dir / "scans" / dept / source_id / safe_name
        # Verify resolved path stays inside scans_dir
        try:
            file_path.resolve().relative_to(scans_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(file_path)

    # Serve output Excel files from doc-scan pipeline
    @app.get("/api/doc-uploads/scans/{dept}/{source_id}/output/{filename}")
    async def serve_doc_scan_output(
        dept: str,
        source_id: str,
        filename: str,
        user: User = Depends(get_current_user),
    ):
        """Serve filled Excel output files. Auth required."""
        # Sanitize path components to prevent traversal
        if not _re.match(r'^[A-Za-z0-9_-]+$', dept) or not _re.match(r'^[A-Za-z0-9_-]+$', source_id):
            raise HTTPException(status_code=400, detail="Invalid path component")
        safe_name = Path(filename).name
        file_path = scans_dir / "scans" / dept / source_id / "output" / safe_name
        # Verify resolved path stays inside scans_dir
        try:
            file_path.resolve().relative_to(scans_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Output file not found")
        return FileResponse(file_path, filename=safe_name)

    @app.get("/api/doc-uploads/{filename:path}")
    async def serve_doc_upload(
        filename: str,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Serve scanned documents — auth required, tenant-scoped."""
        safe = Path(filename).name  # prevent path traversal
        file_path = scans_dir / safe
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Document not found")

        # Tenant-ownership check: the file must be tied to a ScannedDocument
        # record in this user's tenant.
        tid = user.tenant_id
        tenant_id = tid if tid else _primary_tenant_id(db)
        owned = db.execute(
            select(ScannedDocument.id).where(
                ScannedDocument.tenant_id == tenant_id,
                ScannedDocument.file_url == f"/api/doc-uploads/{safe}",
            )
        ).first()
        if not owned:
            raise HTTPException(status_code=403, detail="Not allowed to access this document")
        return FileResponse(file_path)

    @app.get("/api/health")
    async def api_health() -> dict:
        cfg_local = get_config()
        return {
            "ok": True,
            "service": "shogun-web",
            "subdomain": cfg_local.subdomain,
            "company_name": cfg_local.company_name,
        }

    @app.get("/api/config/public")
    async def public_config() -> dict:
        """Non-sensitive config for the SPA bootstrap."""
        c = get_config()
        return {
            "company_name": c.company_name,
            "logo_url": c.logo_url,
            "subdomain": c.subdomain,
            "timezone": c.timezone,
            "google_oauth_enabled": bool(c.google_oauth.client_id),
            "microsoft_oauth_enabled": bool(c.microsoft_oauth.client_id),
            "public_base_url": c.public_base_url,
            "registry_url": c.registry_url or "https://registry.shogun-os.ai",
            "is_public": bool(
                c.public_base_url.startswith("https://") and "localhost" not in c.public_base_url
            ),
        }

    # Static SPA (React build)
    static_dir = Path(cfg.static_dir).expanduser() if cfg.static_dir else None
    if static_dir and static_dir.is_dir():
        assets_dir = static_dir / "assets"
        if assets_dir.is_dir():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}")
        async def spa_fallback(request: Request, full_path: str) -> Response:
            """Serve static files or index.html for client-side routes."""
            # Never intercept API/WS
            if full_path.startswith(
                ("api/", "auth/", "onboarding/", "departments/", "gateway/", "registry/")
            ):
                return JSONResponse({"detail": "Not found"}, status_code=404)

            candidate = (static_dir / full_path).resolve()
            try:
                candidate.relative_to(static_dir.resolve())
            except ValueError:
                return JSONResponse({"detail": "Invalid path"}, status_code=400)

            if full_path and candidate.is_file():
                return FileResponse(candidate)

            index = static_dir / "index.html"
            if index.is_file():
                return FileResponse(index)
            return JSONResponse(
                {"detail": "SPA not built", "static_dir": str(static_dir)},
                status_code=404,
            )
    else:
        logger.warning("Static directory missing (%s) — SPA routes disabled", static_dir)

        @app.get("/")
        async def root_no_spa() -> dict:
            return {
                "service": "shogun-web",
                "message": "API only — React build not found",
                "static_dir": str(static_dir) if static_dir else None,
                "docs": "/api/docs" if cfg.debug else None,
            }

    return app


app = create_app()


def main() -> None:
    """CLI entry: ``python -m main`` or ``python main.py``."""
    import uvicorn

    cfg = get_config()
    uvicorn.run(
        "main:app",
        host=cfg.host,
        port=cfg.port,
        reload=cfg.debug,
        ws="websockets",
        log_level="debug" if cfg.debug else "info",
    )


if __name__ == "__main__":
    main()
