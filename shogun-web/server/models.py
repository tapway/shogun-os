"""SQLAlchemy ORM models for the Shogun OS web portal."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    """Timezone-aware UTC now."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Declarative base for all models."""


class Tenant(Base):
    """Per-installation tenant (usually one row on a customer machine)."""

    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subdomain: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(256), nullable=False, default="Shogun OS")
    logo_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    users: Mapped[List["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    departments: Mapped[List["Department"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    onboarding_states: Mapped[List["OnboardingState"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    site_inspection_units: Mapped[List["SiteInspectionUnit"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "subdomain": self.subdomain,
            "company_name": self.company_name,
            "logo_url": self.logo_url,
            "timezone": self.timezone,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class User(Base):
    """Portal user belonging to a tenant."""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    password_hash: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    oauth_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    role: Mapped[str] = mapped_column(String(64), nullable=False, default="admin")
    first_login: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_temporary_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    invited_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    slack_user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    telegram_user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    employee_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    manager_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    manager: Mapped[Optional["User"]] = relationship(
        remote_side="User.id", foreign_keys=[manager_id], back_populates="direct_reports"
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    sessions: Mapped[List["Session"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    department_assignments: Mapped[List["UserDepartment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    direct_reports: Mapped[List["User"]] = relationship(
        back_populates="manager", foreign_keys=[manager_id]
    )

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "email": self.email,
            "name": self.name,
            "oauth_provider": self.oauth_provider,
            "role": self.role,
            "first_login": self.first_login,
            "is_temporary_password": self.is_temporary_password,
            "must_change_password": bool(self.is_temporary_password),

            "avatar_url": self.avatar_url,
            "phone": self.phone,
            "slack_user_id": self.slack_user_id,
            "telegram_user_id": self.telegram_user_id,
            "employee_id": self.employee_id,
            "source": self.source,
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_sensitive:
            data["oauth_id"] = self.oauth_id
            data["has_password"] = bool(self.password_hash)
        return data


class UserDepartment(Base):
    """Many-to-many: users assigned to departments with a title."""

    __tablename__ = "user_departments"
    __table_args__ = (UniqueConstraint("user_id", "department_id", name="uq_user_dept"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="department_assignments")
    department: Mapped["Department"] = relationship()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else "",
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Department(Base):
    """Department profile activation + provider configuration."""

    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_departments_tenant_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    profile_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="inactive")
    provider_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    gateway_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="departments")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "profile_name": self.profile_name,
            "status": self.status,
            "provider_config": self.provider_config or {},
            "gateway_port": self.gateway_port,
            "industry": self.industry,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OnboardingState(Base):
    """Wizard progress for a tenant."""

    __tablename__ = "onboarding_states"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_onboarding_tenant"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    current_step: Mapped[str] = mapped_column(String(64), nullable=False, default="welcome")
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="onboarding_states")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "current_step": self.current_step,
            "data": self.data or {},
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "completed": self.completed_at is not None,
        }


class Session(Base):
    """Optional durable session audit trail (auth tokens themselves are HMAC-signed)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    user: Mapped["User"] = relationship(back_populates="sessions")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CronJob(Base):
    """Department-scoped scheduled cron job (persisted)."""

    __tablename__ = "cron_jobs"
    __table_args__ = (UniqueConstraint("department", "name", name="uq_cron_dept_name"),)

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    department: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    schedule: Mapped[str] = mapped_column(String(128), nullable=False, default="0 9 * * 1-5")
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    skill_id: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deliver_channel_id: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    deliver_channel_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    last_run: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "department": self.department,
            "name": self.name,
            "schedule": self.schedule,
            "prompt": self.prompt,
            "skill_id": self.skill_id or "",
            "enabled": self.enabled,
            "deliver_channel_id": self.deliver_channel_id or "",
            "deliver_channel_name": self.deliver_channel_name or "",
            "last_run": self.last_run,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SiteInspectionUnit(Base):
    """A staff quarter unit that can be inspected."""
    __tablename__ = "site_inspection_units"
    __table_args__ = (UniqueConstraint("tenant_id", "site_name", "block_name", "unit_number", name="uq_site_unit"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    site_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    block_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    unit_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_type: Mapped[str] = mapped_column(String(64), nullable=False, default="single")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="site_inspection_units")
    inspections: Mapped[List["SiteInspection"]] = relationship(
        back_populates="unit", cascade="all, delete-orphan"
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "site_name": self.site_name,
            "block_name": self.block_name,
            "unit_number": self.unit_number,
            "capacity": self.capacity,
            "unit_type": self.unit_type,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SiteInspection(Base):
    """A single inspection record for a unit, with one or more photos."""
    __tablename__ = "site_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("site_inspection_units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    inspected_by: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    inspection_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    photos: Mapped[List] = mapped_column(JSON, nullable=False, default=list)  # [{path, room, assessment}]
    merged_assessment: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    furniture_count: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    cleanliness: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    site_condition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    safety_hazards: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overall_rating: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    priority_actions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    unit: Mapped["SiteInspectionUnit"] = relationship(back_populates="inspections")

    def to_dict(self) -> Dict[str, Any]:
        # Synthesize web-accessible URL for photos that only have a disk path
        # (old records stored {path, filename, room} without a url field).
        photos_out: List[Dict[str, Any]] = []
        for p in (self.photos or []):
            if isinstance(p, dict):
                url = p.get("url")
                if not url and p.get("path"):
                    import os as _os
                    url = f"/api/site-photos/{_os.path.basename(p['path'])}"
                photos_out.append({**p, "url": url or ""})
            else:
                photos_out.append({"url": "", "filename": str(p), "assessment": ""})
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "unit_id": self.unit_id,
            "inspected_by": self.inspected_by,
            "inspection_date": self.inspection_date.isoformat() if self.inspection_date else None,
            "photos": photos_out,
            "merged_assessment": self.merged_assessment,
            "furniture_count": self.furniture_count,
            "cleanliness": self.cleanliness,
            "site_condition": self.site_condition,
            "safety_hazards": self.safety_hazards,
            "overall_rating": self.overall_rating,
            "priority_actions": self.priority_actions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ScannedDocument(Base):
    """A scanned document record with OCR summary + interpretation."""
    __tablename__ = "scanned_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    scanned_by: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    filename: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    file_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    # OCR summary (short text)
    ocr_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Interpretation: fields, validation, risks, etc. (full JSON)
    interpretation: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    scan_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    tenant: Mapped["Tenant"] = relationship()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "department": self.department,
            "scanned_by": self.scanned_by,
            "filename": self.filename,
            "file_url": self.file_url or "",
            "document_type": self.document_type,
            "ocr_summary": self.ocr_summary,
            "interpretation": self.interpretation,
            "scan_date": self.scan_date.isoformat() if self.scan_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
