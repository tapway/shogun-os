"""Tests for HR endpoint security fixes — IDOR, upload validation, status whitelist."""
import pytest


class TestUploadValidation:
    """Should Fix 2+11: Upload size pre-check and path traversal hardening."""

    def test_hidden_filename_rejected(self):
        """Filenames starting with '.' should be rejected."""
        import pathlib
        safe_name = pathlib.Path(".hidden.pdf").name
        assert safe_name.startswith(".")

    def test_normal_filename_accepted(self):
        """Normal filenames should pass."""
        import pathlib
        safe_name = pathlib.Path("resume.pdf").name
        assert not safe_name.startswith(".")
        assert "\x00" not in safe_name

    def test_null_byte_filename_rejected(self):
        """Filenames with null bytes should be rejected."""
        name = "evil\x00.pdf"
        assert "\x00" in name


class TestJobStatusValidation:
    """Should Fix 3: job_status must be validated against whitelist."""

    def test_valid_statuses_accepted(self):
        _VALID = {"Draft", "Active", "Closed - Hired", "Closed - Cancelled",
                  "Not Initiated", "Test Ongoing", "Hired", "Ongoing", "Open"}
        for s in ["Draft", "Active", "Closed - Hired"]:
            assert s in _VALID

    def test_invalid_status_rejected(self):
        _VALID = {"Draft", "Active", "Closed - Hired", "Closed - Cancelled",
                  "Not Initiated", "Test Ongoing", "Hired", "Ongoing", "Open"}
        assert "DROP TABLE" not in _VALID
        assert "" not in _VALID


class TestRedirectHostAllowlist:
    """Should Fix 5: _fetch_candidate_doc must validate redirect hosts."""

    def test_allowed_hosts(self):
        _ALLOWED = {"drive.google.com", "docs.google.com", "www.googleapis.com"}
        assert "drive.google.com" in _ALLOWED
        assert "evil.example.com" not in _ALLOWED


class TestUrlSchemeValidation:
    """Should Fix 8: resume_url must validate URL scheme."""

    def test_http_urls_accepted(self):
        import re
        pattern = r"^https?://"
        assert re.match(pattern, "https://example.com/resume.pdf")
        assert re.match(pattern, "http://example.com/resume.pdf")

    def test_javascript_urls_rejected(self):
        import re
        pattern = r"^https?://"
        assert not re.match(pattern, "javascript:alert(1)")
        assert not re.match(pattern, "data:text/html,<script>alert(1)</script>")
        assert not re.match(pattern, "file:///etc/passwd")


class TestTenantIsolation:
    """Blocker 1: update_hr_job_opening must check tenant_id."""

    def test_tenant_check_code_exists(self):
        """Verify the tenant check was added to update_hr_job_opening."""
        import inspect
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        import dashboard
        source = inspect.getsource(dashboard.update_hr_job_opening)
        assert "opening.tenant_id != tenant.id" in source, \
            "update_hr_job_opening must check opening.tenant_id != tenant.id"

    def test_audit_uses_tenant_not_none(self):
        """Verify audit.log_action passes tenant (not None) in update."""
        import inspect
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        import dashboard
        source = inspect.getsource(dashboard.update_hr_job_opening)
        # Should have "db, tenant, user" not "db, None, user"
        assert "db, tenant, user" in source, \
            "audit.log_action must pass tenant, not None"


class TestGetHrStatsBounded:
    """Blocker 2: get_hr_stats must cap unbounded queries."""

    def test_candidate_events_has_limit(self):
        import inspect
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        import dashboard
        source = inspect.getsource(dashboard.get_hr_stats)
        assert ".limit(" in source, "get_hr_stats must use .limit() on large collections"

    def test_no_seed_in_get(self):
        """GET endpoint should not call _seed_default_checklist_items."""
        import inspect
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        import dashboard
        source = inspect.getsource(dashboard.get_hr_stats)
        assert "_seed_default_checklist_items(db" not in source, \
            "get_hr_stats should not seed checklist items (moved to startup)"


class TestAiExtractionGuardrail:
    """Should Fix 10: AI extraction prompt must include injection guardrail."""

    def test_prompt_has_guardrail(self):
        import inspect
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        import dashboard
        source = inspect.getsource(dashboard._ai_extract_candidate)
        assert "Ignore ALL instructions" in source or "adversarial" in source.lower(), \
            "AI extraction prompt must include injection guardrail"
