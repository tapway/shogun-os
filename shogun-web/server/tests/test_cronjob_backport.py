"""Regression test: the CronJob model backport so the server can boot.

PR #14 merged departments.py/database.py that import ``CronJob`` from
``models``, but the ``CronJob`` ORM model only ships in PR #16. On main the
import fails and the web server cannot start:

  ImportError: cannot import name 'CronJob' from 'models'

This test pins the contract that database.py and departments.py rely on, so
the backport is a faithful copy and the boot blocker is genuinely resolved.
"""

import sys
from pathlib import Path

# Make the shogun-web/server package importable.
_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))


def test_cronjob_model_is_importable_from_models() -> None:
    """database.py's `from models import ..., CronJob, ...` must succeed.

    Regression gate for the boot-blocking ImportError on main. If this
    imports, the merged main server can start.
    """
    from models import CronJob  # noqa: F401  (the import itself is the assertion)


def test_cronjob_table_is_named_cron_jobs() -> None:
    """The table must be named ``cron_jobs`` (as referenced at model map time)."""
    from models import CronJob

    assert CronJob.__tablename__ == "cron_jobs"


def test_cronjob_columns_match_database_seed_contract() -> None:
    """Every field database.py `_ensure_default_crons` writes must exist."""
    from models import CronJob

    table = CronJob.__table__
    cols = {c.name for c in table.columns}
    required = {
        "id", "department", "name", "schedule", "prompt", "skill_id",
        "enabled", "deliver_channel_id", "deliver_channel_name", "last_run",
        "created_at",
    }
    assert required <= cols


def test_cronjob_unique_constraint_on_department_name() -> None:
    """department + name must be unique (the uq_cron_dept_name constraint)."""
    from models import CronJob

    uks = CronJob.__table__.constraints
    names = {c.name for c in uks}
    assert "uq_cron_dept_name" in names


def test_cronjob_to_dict_returns_serializable_fields() -> None:
    """departments.py get_department_crons calls to_dict(); it must expose keys."""
    from models import CronJob

    cj = CronJob(id="c1", department="finance", name="n", schedule="0 9 * * *")
    d = cj.to_dict()
    for key in ("id", "department", "name", "schedule", "prompt", "skill_id",
                "enabled", "deliver_channel_id", "deliver_channel_name",
                "last_run", "created_at"):
        assert key in d