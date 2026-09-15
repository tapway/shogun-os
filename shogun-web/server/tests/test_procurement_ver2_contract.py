"""Contract tests for the procurement-ver2 dashboard fields (PR #35 review).

The Progress Tracker, Supplier & Item History, PR-to-PO creation and barcode
label tabs read five stats keys that did not exist on the backend when the UI
landed, so those tabs rendered permanently empty with no error. These tests pin
the contract in both directions:

- every key is present in the payload and empty (never mock) when no snapshot
  exists;
- each key is populated from its own dedicated snapshot slug when one does;
- rows from the vendor/inventory snapshots (a different shape) never leak in.
"""

import sys
from pathlib import Path

_SERVER = Path(__file__).resolve().parents[1]
if str(_SERVER) not in sys.path:
    sys.path.insert(0, str(_SERVER))

import dashboard  # noqa: E402


VER2_KEYS = (
    "progressTrackerProjects",
    "supplierDirectory",
    "supplierHistory",
    "demoPurchaseRequisitions",
    "barcodeBatchRecords",
)


def _page(slug: str, frontmatter: dict) -> dict:
    return {"slug": slug, "frontmatter": frontmatter}


def test_ver2_keys_present_when_no_snapshots() -> None:
    """Absent key ⇒ the consuming tab renders empty forever with no error."""
    result = dashboard._run_procurement_aggregation([])
    for key in VER2_KEYS:
        assert key in result, f"{key} missing from the procurement payload"
        assert isinstance(result[key], list)


def test_ver2_keys_are_empty_not_mock_when_no_snapshots() -> None:
    """Mock mode must not fabricate ver2 data — those keys have no mock source."""
    result = dashboard._run_procurement_aggregation([])
    # Original tabs still fall back to examples/procurement-mock.json.
    assert result["mock"] is True
    for key in VER2_KEYS:
        assert result[key] == [], f"{key} was populated in mock mode"


def test_ver2_progress_tracker_reads_its_snapshot() -> None:
    rows = [{"project_id": "P-1", "project_name": "Line 4 retrofit", "hardware_items": []}]
    result = dashboard._run_procurement_aggregation(
        [_page("snapshots/progress-tracker", {"progress_tracker_projects": rows})]
    )
    assert result["progressTrackerProjects"] == rows


def test_ver2_supplier_snapshot_feeds_directory_and_history() -> None:
    directory = [{"id": "S-1", "companyName": "Acme Fasteners"}]
    history = [{"id": "H-1", "item_name": "M8 bolt", "supplier_name": "Acme Fasteners"}]
    result = dashboard._run_procurement_aggregation(
        [
            _page(
                "snapshots/suppliers",
                {"supplier_directory": directory, "supplier_history": history},
            )
        ]
    )
    assert result["supplierDirectory"] == directory
    assert result["supplierHistory"] == history


def test_ver2_purchase_requisition_and_barcode_snapshots() -> None:
    prs = [{"pr_number": "PR-0001", "items": [], "total_amount": 1200}]
    batches = [{"batch_id": "B-1", "po_number": "PO-9", "items": []}]
    result = dashboard._run_procurement_aggregation(
        [
            _page("snapshots/purchase-requisitions", {"purchase_requisitions": prs}),
            _page("snapshots/barcode-batches", {"barcode_batches": batches}),
        ]
    )
    assert result["demoPurchaseRequisitions"] == prs
    assert result["barcodeBatchRecords"] == batches


def test_ver2_slugs_accept_the_procurement_prefixed_alias() -> None:
    """The dual-slug convention (snapshots/x or procurement/snapshots/x) applies here too."""
    rows = [{"project_id": "P-2"}]
    result = dashboard._run_procurement_aggregation(
        [_page("procurement/snapshots/progress-tracker", {"progress_tracker_projects": rows})]
    )
    assert result["progressTrackerProjects"] == rows


def test_ver2_keys_do_not_borrow_other_snapshot_shapes() -> None:
    """Vendor/inventory rows are a different shape than the frontend contracts —
    borrowing them would render undefined fields inside the tabs."""
    result = dashboard._run_procurement_aggregation(
        [
            _page("snapshots/vendors", {"vendors": [{"name": "Acme"}]}),
            _page(
                "snapshots/inventory",
                {
                    "total_active_skus": 10,
                    "purchase_requisitions": [{"pr": "legacy-shape"}],
                    "barcode_batches": [{"legacy": True}],
                },
            ),
        ]
    )
    assert result["supplierDirectory"] == []
    assert result["supplierHistory"] == []
    assert result["demoPurchaseRequisitions"] == []
    assert result["barcodeBatchRecords"] == []