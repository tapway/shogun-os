"""Regression test: the cron_jobs table created by the DB bootstrap must match
the ORM model's columns exactly (PR #16 review item #3).

Before the fix, the raw-SQL fallback in init_db() created cron_jobs with a
DIFFERENT schema than the CronJob model:
  - missing deliver_channel_name and last_run (model HAS them)
  - adding tenant_id (model does NOT have it)
  - DATETIME type + no timezone vs the model's DateTime(timezone=True)

This drift meant a fresh install that hit only create_all() or only the raw SQL
fallback could end up with a table missing columns the code reads → crash. The
helper must guarantee every ORM column exists regardless of which path created
the table.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sqlalchemy as sa
from sqlalchemy import create_engine, inspect

import database
from models import CronJob, Base


def _make_shogun_home(tmp: str) -> None:
    os.makedirs(tmp, exist_ok=True)


def test_ensure_cron_jobs_table_matches_orm_columns(tmp_path: Path) -> None:
    """cron_jobs table must expose every column the CronJob model declares."""
    engine = create_engine(f"sqlite:///{tmp_path}/test.db")
    # Bootstrap the ORM tables first (simulates create_all path on an existing DB)
    Base.metadata.create_all(bind=engine)

    # Run the review-fix helper over the SAME engine (simulates the fallback)
    database._ensure_cron_jobs_table(engine)

    insp = inspect(engine)
    actual = {c["name"] for c in insp.get_columns("cron_jobs")}

    model_columns = {c.name for c in CronJob.__table__.columns}
    missing = sorted(model_columns - actual)
    assert not missing, f"cron_jobs table is missing ORM columns: {missing}"

    # The ORM model does NOT declare tenant_id — the fallback must not add it.
    assert "tenant_id" not in actual, "fallback added tenant_id which the model does not have"


def test_ensure_cron_jobs_table_creates_when_absent(tmp_path: Path) -> None:
    """When cron_jobs doesn't exist at all, the helper creates it with all columns."""
    engine = create_engine(f"sqlite:///{tmp_path}/fresh.db")
    database._ensure_cron_jobs_table(engine)

    insp = inspect(engine)
    actual = {c["name"] for c in insp.get_columns("cron_jobs")}
    model_columns = {c.name for c in CronJob.__table__.columns}
    assert model_columns <= actual, f"created table missing: {sorted(model_columns - actual)}"


def test_ensure_cron_jobs_table_adds_missing_column_to_existing(tmp_path: Path) -> None:
    """The critical review case: an EXISTING cron_jobs table (old schema) missing a
    column must be ALTERed to add it — NOT silently ignored (IF NOT EXISTS)."""
    engine = create_engine(f"sqlite:///{tmp_path}/legacy.db")

    # Simulate a legacy production table missing last_run and deliver_channel_name
    with engine.begin() as conn:
        conn.execute(sa.text("""
            CREATE TABLE cron_jobs (
                id VARCHAR(128) PRIMARY KEY,
                department VARCHAR(128) NOT NULL,
                name VARCHAR(256) NOT NULL
            )
        """))

    database._ensure_cron_jobs_table(engine)

    insp = inspect(engine)
    actual = {c["name"] for c in insp.get_columns("cron_jobs")}
    for col in ("last_run", "deliver_channel_name", "schedule", "prompt"):
        assert col in actual, f"ALTER did not add missing column: {col}"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))