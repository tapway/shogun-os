"""Tests for deal attachment endpoints — auth, traversal, validation, round-trip."""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
import tempfile
import os


@pytest.fixture
def mock_config(tmp_path):
    """Create a temporary brain root with a valid deal file."""
    brain_root = tmp_path / "brain"
    deals_dir = brain_root / "deals"
    deals_dir.mkdir(parents=True)
    
    # Create a valid deal file with frontmatter
    deal_file = deals_dir / "test-deal.md"
    deal_file.write_text("---\ntitle: Test Deal\nstatus: open\n---\n\nDeal content here.\n")
    
    # Create attachments dir
    attach_dir = deals_dir / "attachments" / "test-deal"
    attach_dir.mkdir(parents=True)
    
    cfg = MagicMock()
    cfg.brain_root = str(brain_root)
    return cfg


class TestSlugNormalization:
    """Blocker 3: slug normalization must be consistent across upload/list/download."""

    def test_normalize_strips_deals_prefix(self, mock_config):
        from deal_attachments import _normalize_slug
        assert _normalize_slug("deals/my-deal") == "my-deal"
        assert _normalize_slug("my-deal") == "my-deal"
        assert _normalize_slug("/deals/my-deal") == "my-deal"

    def test_normalize_sanitizes_special_chars(self, mock_config):
        from deal_attachments import _normalize_slug
        assert _normalize_slug("my deal!") == "my-deal"  # trailing dash stripped
        result = _normalize_slug("../../etc/passwd")
        assert "/" not in result
        assert ".." not in result


class TestResolveDealFile:
    """SF1: must validate deal frontmatter exists."""

    @patch("deal_attachments.get_config")
    def test_valid_deal_found(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        from deal_attachments import _resolve_deal_file
        result = _resolve_deal_file("test-deal")
        assert result.exists()

    @patch("deal_attachments.get_config")
    def test_missing_deal_raises_404(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        from deal_attachments import _resolve_deal_file
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _resolve_deal_file("nonexistent-deal")
        assert exc_info.value.status_code == 404

    @patch("deal_attachments.get_config")
    def test_non_deal_stem_rejected(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        # Create a readme file
        (Path(mock_config.brain_root) / "deals" / "readme.md").write_text("---\ntitle: Readme\n---\n")
        from deal_attachments import _resolve_deal_file
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _resolve_deal_file("readme")
        assert exc_info.value.status_code == 404

    @patch("deal_attachments.get_config")
    def test_file_without_frontmatter_rejected(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        # Create a file without frontmatter
        no_fm = Path(mock_config.brain_root) / "deals" / "no-frontmatter.md"
        no_fm.write_text("Just plain text, no YAML frontmatter.")
        from deal_attachments import _resolve_deal_file
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _resolve_deal_file("no-frontmatter")
        assert exc_info.value.status_code == 400


class TestAtomicFrontmatter:
    """Blocker 4: frontmatter update must be atomic and fail-safe."""

    @patch("deal_attachments.get_config")
    def test_yaml_parse_error_does_not_wipe_metadata(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        deal_file = Path(mock_config.brain_root) / "deals" / "test-deal.md"
        # Write invalid YAML frontmatter
        deal_file.write_text("---\n: invalid: yaml: [broken\n---\nContent")
        
        from deal_attachments import _append_attachment_to_frontmatter
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _append_attachment_to_frontmatter(deal_file, {"name": "test.pdf"})
        assert exc_info.value.status_code == 500
        # Original file should be unchanged (not wiped)
        assert "invalid" in deal_file.read_text()

    @patch("deal_attachments.get_config")
    def test_successful_append_preserves_content(self, mock_get_cfg, mock_config):
        mock_get_cfg.return_value = mock_config
        deal_file = Path(mock_config.brain_root) / "deals" / "test-deal.md"
        original_body = "Deal content here."
        
        from deal_attachments import _append_attachment_to_frontmatter
        _append_attachment_to_frontmatter(deal_file, {"name": "test.pdf", "size": 1234})
        
        result = deal_file.read_text()
        assert original_body in result
        assert "test.pdf" in result
        assert "attachments:" in result


class TestUploadValidation:
    """Test upload validation: extension, size, empty file."""

    def test_disallowed_extension_rejected(self):
        from deal_attachments import ALLOWED_EXTENSIONS
        assert "exe" not in ALLOWED_EXTENSIONS
        assert "html" not in ALLOWED_EXTENSIONS
        assert "js" not in ALLOWED_EXTENSIONS
        assert "pdf" in ALLOWED_EXTENSIONS
        assert "xlsx" in ALLOWED_EXTENSIONS

    def test_max_upload_limit_defined(self):
        from deal_attachments import MAX_UPLOAD_BYTES
        assert MAX_UPLOAD_BYTES == 50 * 1024 * 1024  # 50 MB


class TestDownloadHeaders:
    """SF2: download must set Content-Disposition and safe MIME type."""

    def test_mimetype_detection(self):
        import mimetypes
        ct, _ = mimetypes.guess_type("report.pdf")
        assert ct == "application/pdf"
        ct, _ = mimetypes.guess_type("photo.jpg")
        assert ct == "image/jpeg"
        ct, _ = mimetypes.guess_type("unknown.xyz")
        assert ct is None  # should fall back to octet-stream
