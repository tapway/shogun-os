"""SQLAlchemy ORM models for the Shogun OS web portal."""



from __future__ import annotations



from datetime import datetime, date, timezone, timedelta

from typing import Any, Dict, List, Optional



from sqlalchemy import (

    JSON,

    Boolean,

    Float,

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





def date_today():

    """Local date today — used by HR formula fields."""

    from datetime import date

    return date.today()





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

# ──────────────────────────────────────────────────────────────────────────

# HR Dashboard — synced from Notion via scripts/sync-notion-hr.py

# ──────────────────────────────────────────────────────────────────────────



def _iso(d: Any) -> Optional[str]:

    return d.isoformat() if d else None





class HrEmployee(Base):

    """Employee Directory row (synced from Notion)."""



    __tablename__ = "hr_employees"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    employees_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    department: Mapped[str] = mapped_column(String(128), nullable=False, default="")

    role: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    manager_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    date_of_hire: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    phone_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    linkedin_profile: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    profile_picture_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    employee_file_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    employee_file_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    q1: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    q2: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    q3: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    q4: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    leave_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def no_of_years(self) -> Optional[float]:

        """Real tenure in years from date_of_hire (fixes Notion's No. of Years bug)."""

        if not self.date_of_hire:

            return None

        try:

            start = datetime.strptime(self.date_of_hire[:10], "%Y-%m-%d").date()

        except ValueError:

            return None

        return round((date_today() - start).days / 365.25, 1)



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "employees_name": self.employees_name,

            "department": self.department,

            "role": self.role,

            "manager_name": self.manager_name,

            "date_of_hire": self.date_of_hire,

            "phone_number": self.phone_number,

            "linkedin_profile": self.linkedin_profile,

            "profile_picture_path": self.profile_picture_path,
            "profile_picture_url": self.profile_picture_url,

            "employee_file_path": self.employee_file_path,
            "employee_file_url": self.employee_file_url,

            "q1": self.q1,

            "q2": self.q2,

            "q3": self.q3,

            "q4": self.q4,

            "leave_taken": self.leave_taken,

            "no_of_years": self.no_of_years(),

        }





class HrJobOpening(Base):

    """Job Openings + Job Secured row (synced from Notion)."""



    __tablename__ = "hr_job_openings"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    job_title: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    job_status: Mapped[str] = mapped_column(String(64), nullable=False, default="Not Initiated")

    department: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    employment_type: Mapped[str] = mapped_column(String(64), nullable=False, default="")

    experience: Mapped[str] = mapped_column(String(64), nullable=False, default="")

    budget_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    hiring_manager: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    application_start: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    job_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def deadline(self) -> Optional[str]:

        """Application Start + 90 days (Notion formula)."""

        if not self.application_start:

            return None

        try:

            start = datetime.strptime(self.application_start[:10], "%Y-%m-%d").date()

        except ValueError:

            return None

        return (start + timedelta(days=90)).isoformat()



    def days_left(self) -> Optional[int]:

        d = self.deadline()

        if not d:

            return None

        return (datetime.strptime(d, "%Y-%m-%d").date() - date_today()).days



    def to_dict(self) -> Dict[str, Any]:

        dl = self.days_left()

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "job_title": self.job_title,

            "job_status": self.job_status,

            "department": self.department,

            "employment_type": self.employment_type,

            "experience": self.experience,

            "budget_max": self.budget_max,

            "hiring_manager": self.hiring_manager,

            "application_start": self.application_start,

            "job_description": self.job_description,

            "deadline": self.deadline(),

            "days_left": dl,

            "overdue": "Overdue" if (dl is not None and dl < 0) else "",

        }





class HrCandidate(Base):

    """Hiring board candidate row — fulltime / internship / freelancer / virtual bench."""



    __tablename__ = "hr_candidates"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)

    phone_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    role: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    status: Mapped[str] = mapped_column(String(128), nullable=False, default="Screening - Pending")

    source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    resume_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    screening_answers_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    date_entry: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    last_edited: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    candidate_type: Mapped[str] = mapped_column(String(32), nullable=False, default="fulltime")

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "name": self.name,

            "email": self.email,

            "phone_no": self.phone_no,

            "role": self.role,

            "status": self.status,

            "source": self.source,

            "resume_url": self.resume_url,

            "screening_answers_url": self.screening_answers_url,

            "candidate_type": self.candidate_type,

            "date_entry": self.date_entry,

            "last_edited": self.last_edited,

        }





class HrOnboardingTask(Base):

    """New-hire onboarding task row (synced from Notion)."""



    __tablename__ = "hr_onboarding_tasks"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    staff_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    department: Mapped[str] = mapped_column(String(128), nullable=False, default="")

    start_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    end_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    status: Mapped[str] = mapped_column(String(64), nullable=False, default="Not started")

    days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    assigned_to: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def task_status(self) -> str:

        """Notion formula: In progress → 🟡 Task Ongoing, Done → ✅ Task Completed."""

        s = (self.status or "").strip().lower()

        if s == "in progress":

            return "🟡 Task Ongoing"

        if s == "done":

            return "✅ Task Completed"

        return self.status or ""



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "staff_name": self.staff_name,

            "department": self.department,

            "start_date": self.start_date,

            "end_date": self.end_date,

            "status": self.status,

            "task_status": self.task_status(),

            "days": self.days,

            "assigned_to": self.assigned_to,

        }





class HrPerformanceReview(Base):

    """Performance review row (synced from Notion)."""



    __tablename__ = "hr_performance_reviews"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    quarterly_performance: Mapped[str] = mapped_column(String(128), nullable=False, default="")

    employee_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    department: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    performance_rating: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    performance_level: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    manager_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    review_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    areas_of_improvement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    action_items: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    attachments_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "quarterly_performance": self.quarterly_performance,

            "employee_name": self.employee_name,

            "department": self.department,

            "performance_rating": self.performance_rating,

            "performance_level": self.performance_level,

            "manager_name": self.manager_name,

            "review_date": self.review_date,

            "areas_of_improvement": self.areas_of_improvement,

            "action_items": self.action_items,

            "attachments_path": self.attachments_path,

        }





class HrEquipment(Base):

    """Equipment tracker row (synced from Notion)."""



    __tablename__ = "hr_equipment"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    equipment_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    category: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    condition: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    assigned_to: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    purchase_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    return_due_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    loan_document_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def is_overdue(self) -> bool:

        if not self.return_due_date:

            return False

        try:

            due = datetime.strptime(self.return_due_date[:10], "%Y-%m-%d").date()

        except ValueError:

            return False

        return due < date_today()



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "equipment_name": self.equipment_name,

            "category": self.category,

            "condition": self.condition,

            "assigned_to": self.assigned_to,

            "purchase_date": self.purchase_date,

            "return_due_date": self.return_due_date,

            "loan_document_path": self.loan_document_path,

            "is_overdue": self.is_overdue(),

        }





class HrTraining(Base):

    """Training & development row (synced from Notion)."""



    __tablename__ = "hr_training"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    training_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    staff_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    trainer_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    training_format: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    start_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    end_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    training_charges: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    exam_included: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    bond_agreement: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    feedback_form_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "training_name": self.training_name,

            "staff_name": self.staff_name,

            "trainer_name": self.trainer_name,

            "training_format": self.training_format,

            "start_date": self.start_date,

            "end_date": self.end_date,

            "training_charges": self.training_charges,

            "exam_included": self.exam_included,

            "bond_agreement": self.bond_agreement,

            "feedback_form_url": self.feedback_form_url,

        }





class HrTrainer(Base):

    """Trainer details row (synced from Notion)."""



    __tablename__ = "hr_trainers"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    specialization: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    contact_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)

    phone_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    trainer_pic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    trainer_quotation_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "name": self.name,

            "specialization": self.specialization,

            "contact_email": self.contact_email,

            "phone_number": self.phone_number,

            "trainer_pic": self.trainer_pic,

            "trainer_quotation_path": self.trainer_quotation_path,

        }





class HrMeeting(Base):

    """Meeting minutes row (synced from Notion)."""



    __tablename__ = "hr_meetings"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    meeting_title: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    meeting_organizer: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    meeting_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    meeting_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    follow_up_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    meeting_status: Mapped[str] = mapped_column(String(64), nullable=False, default="Scheduled")

    meeting_type: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "meeting_title": self.meeting_title,

            "meeting_organizer": self.meeting_organizer,

            "meeting_duration": self.meeting_duration,

            "meeting_date": self.meeting_date,

            "follow_up_date": self.follow_up_date,

            "meeting_status": self.meeting_status,

            "meeting_type": self.meeting_type,

        }





class HrMeetingActionItem(Base):

    """Meeting action item row (synced from Notion)."""



    __tablename__ = "hr_meeting_action_items"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    action_description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    action_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    action_owner: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    due_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    status: Mapped[str] = mapped_column(String(64), nullable=False, default="Open")

    action_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "action_description": self.action_description,

            "action_id": self.action_id,

            "action_owner": self.action_owner,

            "due_date": self.due_date,

            "status": self.status,

            "action_feedback": self.action_feedback,

        }





class HrMeetingAttendee(Base):

    """Meeting attendee / absentee row (synced from Notion)."""



    __tablename__ = "hr_meeting_attendees"



    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    tenant_id: Mapped[int] = mapped_column(Integer, nullable=False)

    notion_page_id: Mapped[str] = mapped_column(String(64), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)

    department: Mapped[str] = mapped_column(String(256), nullable=False, default="")

    status: Mapped[str] = mapped_column(String(64), nullable=False, default="")

    created_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow

    )

    updated_at: Mapped[datetime] = mapped_column(

        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow

    )



    def to_dict(self) -> Dict[str, Any]:

        return {

            "id": self.id,

            "notion_page_id": self.notion_page_id,

            "name": self.name,

            "email": self.email,

            "department": self.department,

            "status": self.status,

        }

