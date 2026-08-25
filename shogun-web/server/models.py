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
    # Generic per-platform user IDs for channels without a dedicated column
    # (discord, whatsapp, signal, teams, etc.). Keyed by CommsChannelConfig.key.
    # Telegram and Slack still use their dedicated columns above for backward compat.
    platform_user_ids: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
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
            "platform_user_ids": self.platform_user_ids or {},
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


# =============================================================================
# Project Dashboard Models
# =============================================================================

class Project(Base):
    """Project from the external project dashboard."""
    
    __tablename__ = "projects"
    
    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # PRJ-001
    notion_page_id: Mapped[Optional[str]] = mapped_column(String(256), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    client: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    pm: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    product: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    value_rm: Mapped[Optional[float]] = mapped_column(nullable=True)
    gate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gate_status: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    target_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Gate documents
    charter_link: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    sow_link: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    racl_link: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    handover_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Reports-relevant fields (project health, budget, scope, decisions)
    overall_health: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    budget_status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fde: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    dir: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    charter_status: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    source_last_updated: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decisions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    org_chart: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    
    # Relationships
    goals: Mapped[List["Goal"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[List["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    risks: Mapped[List["Risk"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    team_members: Mapped[List["TeamMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    dod_items: Mapped[List["DefinitionOfDone"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "notionPageId": self.notion_page_id,
            "name": self.name,
            "client": self.client,
            "pm": self.pm,
            "status": self.status,
            "product": self.product,
            "valueRm": self.value_rm,
            "gate": self.gate,
            "gateStatus": self.gate_status,
            "startDate": self.start_date.isoformat() if self.start_date else None,
            "targetEnd": self.target_end.isoformat() if self.target_end else None,
            "actualEnd": self.actual_end.isoformat() if self.actual_end else None,
            "charterLink": self.charter_link,
            "sowLink": self.sow_link,
            "raclLink": self.racl_link,
            "handoverStatus": self.handover_status,
            "overallHealth": self.overall_health,
            "budgetStatus": self.budget_status,
            "scope": self.scope,
            "fde": self.fde,
            "dir": self.dir,
            "charterStatus": self.charter_status,
            "sourceLastUpdated": self.source_last_updated.isoformat() if self.source_last_updated else None,
            "decisions": self.decisions or [],
            "orgChart": self.org_chart or [],
            "goals": [g.to_dict() for g in self.goals],
            "tasks": [t.to_dict() for t in self.tasks],
            "risks": [r.to_dict() for r in self.risks],
            "teamMembers": [tm.to_dict() for tm in self.team_members],
            "dodItems": [d.to_dict() for d in self.dod_items],
        }


class Goal(Base):
    """Project goal."""
    
    __tablename__ = "goals"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    goal_ref: Mapped[str] = mapped_column(String(64), nullable=False)  # G1, G2, etc. (original ID)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    kpi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    measure: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    project: Mapped["Project"] = relationship(back_populates="goals")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": f"{self.project_id}-{self.goal_ref}",  # Return original composite ID
            "goalRef": self.goal_ref,
            "projectId": self.project_id,
            "description": self.description,
            "kpi": self.kpi,
            "measure": self.measure,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "status": self.status,
        }


class Task(Base):
    """Project task.

    Source task refs (TASK-001, T-001, …) are only unique *within* a project,
    so the primary key is synthetic and uniqueness is on (project_id, task_ref)
    — same pattern as Goal.
    """
    
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("project_id", "task_ref", name="uq_tasks_project_ref"),)
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_ref: Mapped[str] = mapped_column(String(64), nullable=False)  # original ref: TASK-001 / T-001
    notion_page_id: Mapped[Optional[str]] = mapped_column(String(256), unique=True, nullable=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    project_name: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    created: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    depends_on: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    
    project: Mapped["Project"] = relationship(back_populates="tasks")
    
    def to_dict(self) -> Dict[str, Any]:
        # Computed fields
        days_left = None
        is_overdue = False
        if self.deadline:
            days_left = (self.deadline.replace(tzinfo=None) - datetime.now()).days
            is_overdue = days_left < 0 and self.status != "done"
        
        return {
            "id": f"{self.project_id}-{self.task_ref}",  # globally unique composite id
            "taskRef": self.task_ref,
            "notionPageId": self.notion_page_id,
            "projectId": self.project_id,
            "projectName": self.project_name,
            "title": self.title,
            "owner": self.owner,
            "created": self.created.isoformat() if self.created else None,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "priority": self.priority,
            "status": self.status,
            "notes": self.notes,
            "completed": self.completed.isoformat() if self.completed else None,
            "dependsOn": self.depends_on or [],
            # Computed
            "daysLeft": days_left,
            "isOverdue": is_overdue,
        }


class Risk(Base):
    """Project risk."""
    
    __tablename__ = "risks"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    impact: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    mitigation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    project: Mapped["Project"] = relationship(back_populates="risks")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "projectId": self.project_id,
            "description": self.description,
            "impact": self.impact,
            "mitigation": self.mitigation,
        }


class TeamMember(Base):
    """Project team member."""
    
    __tablename__ = "team_members"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    
    project: Mapped["Project"] = relationship(back_populates="team_members")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "projectId": self.project_id,
            "name": self.name,
            "role": self.role,
        }


class DefinitionOfDone(Base):
    """Project definition of done item."""
    
    __tablename__ = "definition_of_done"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), nullable=False)
    criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acceptance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uat_test_case_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    
    project: Mapped["Project"] = relationship(back_populates="dod_items")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "projectId": self.project_id,
            "criteria": self.criteria,
            "acceptance": self.acceptance,
            "uatTestCaseId": self.uat_test_case_id,
            "passed": self.passed,
        }

class SupportTicket(Base):
    """Support ticket from the external tracker (/api/support/tickets)."""

    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # TS-2026-001
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    customer_slug: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    linked_project: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    reporter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    opened: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    target_resolve: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    priority_label: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    tier: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_updated: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timeline: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    ticket_tasks: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    resolved_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preventive: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_reply: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "customer": self.customer,
            "customerSlug": self.customer_slug,
            "linkedProject": self.linked_project,
            "reporter": self.reporter,
            "opened": self.opened.isoformat() if self.opened else None,
            "targetResolve": self.target_resolve.isoformat() if self.target_resolve else None,
            "priority": self.priority,
            "priorityLabel": self.priority_label,
            "category": self.category,
            "tier": self.tier,
            "assignedTo": self.assigned_to,
            "status": self.status,
            "lastUpdated": self.last_updated.isoformat() if self.last_updated else None,
            "source": self.source,
            "description": self.description,
            "context": self.context,
            "timeline": self.timeline or [],
            "ticketTasks": self.ticket_tasks or [],
            "resolutionNotes": self.resolution_notes,
            "resolvedBy": self.resolved_by,
            "resolvedDate": self.resolved_date.isoformat() if self.resolved_date else None,
            "rootCause": self.root_cause,
            "preventive": self.preventive,
            "newReply": self.new_reply,
        }
