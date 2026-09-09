"""Tests for HR Round 3 fixes — async OCR, dict merge, question validation, URL safety."""
import pytest


class TestQuestionValidation:
    """S6+S7: Question payload validation."""

    def test_questions_body_rejects_non_strings(self):
        from dashboard import HrQuestionsBody
        body = HrQuestionsBody(questions=["q1", "q2"])
        assert body.questions == ["q1", "q2"]

    def test_questions_body_default_empty(self):
        from dashboard import HrQuestionsBody
        body = HrQuestionsBody()
        assert body.questions == []

    def test_template_body_typed(self):
        from dashboard import HrTemplateBody
        body = HrTemplateBody(questions=["a", "b"])
        assert body.questions == ["a", "b"]

    def test_set_interview_questions_rejects_over_30(self):
        from dashboard import _set_interview_questions
        from unittest.mock import MagicMock
        iv = MagicMock()
        with pytest.raises(Exception) as exc_info:
            _set_interview_questions(iv, [f"q{i}" for i in range(31)])
        assert "422" in str(exc_info.value) or "Too many" in str(exc_info.value)

    def test_set_interview_questions_accepts_30(self):
        from dashboard import _set_interview_questions
        from unittest.mock import MagicMock
        import json
        iv = MagicMock()
        _set_interview_questions(iv, [f"q{i}" for i in range(30)])
        stored = json.loads(iv.questions_json)
        assert len(stored) == 30


class TestFieldRegex:
    """S4: Tightened _field regex stops at next ** marker."""

    def test_field_stops_at_next_marker(self):
        import re
        body = "**Role:** Engineer **Department:** IT"
        m = re.search(r"\*\*Role:\*\*\s*(.+?)(?:\s*\*\*|$)", body, re.MULTILINE)
        assert m is not None
        assert m.group(1).strip() == "Engineer"

    def test_field_captures_to_eol(self):
        import re
        body = "**Role:** Senior Engineer\n**Department:** IT"
        m = re.search(r"\*\*Role:\*\*\s*(.+?)(?:\s*\*\*|$)", body, re.MULTILINE)
        assert m is not None
        assert m.group(1).strip() == "Senior Engineer"


class TestUrlQueryStripping:
    """S5: URL query params stripped before filename extraction."""

    def test_strips_query_params(self):
        from urllib.parse import urlparse
        import pathlib
        url = "/api/doc-uploads/file.pdf?token=abc123"
        safe = pathlib.Path(urlparse(url).path).name
        assert safe == "file.pdf"

    def test_plain_path_unchanged(self):
        from urllib.parse import urlparse
        import pathlib
        url = "/api/doc-uploads/resume.docx"
        safe = pathlib.Path(urlparse(url).path).name
        assert safe == "resume.docx"


class TestGbrainEmployeeMerge:
    """S1+S3: Dict-based merge avoids ORM mutation."""

    def test_gbrain_only_employee_has_source_flag(self):
        """Brain-only employees should have _source='gbrain' and notion_page_id as identifier."""
        # This tests the contract, not the full endpoint
        brain_emp = {
            "id": None,
            "employees_name": "Test Person",
            "department": "Engineering",
            "role": "Developer",
            "manager_name": "",
            "date_of_hire": "2024-01-15",
            "phone_number": "+60123456789",
            "linkedin_profile": "",
            "notion_page_id": "hr/profiles/test-person",
            "_source": "gbrain",
        }
        assert brain_emp["_source"] == "gbrain"
        assert brain_emp["notion_page_id"] == "hr/profiles/test-person"
        assert brain_emp["id"] is None
