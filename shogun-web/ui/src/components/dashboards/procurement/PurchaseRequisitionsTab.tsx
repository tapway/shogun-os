import { useState } from "react";
import { Upload, FileText, CheckCircle, X, Plus, Trash2, Eye, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { PurchaseRequisition, SupplierQuote, PurchaseRequisitionItem } from "../../../lib/procurement-mock-data";
import { MOCK_PRS, MOCK_TEMPLATE_VERSIONS } from "../../../lib/procurement-mock-data";

interface Props {
  stats: any;
  onAction?: (actionType: string, entity: any) => void;
}

const PRIORITY_STYLE: Record<string, string> = {
  Low: "muted",
  Medium: "muted",
  High: "warn",
  Urgent: "bad",
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "muted",
  "Pending Finance Approval": "warn",
  Approved: "ok",
  Rejected: "bad",
  "Clarification Requested": "warn",
  "Converted to PO": "muted",
};

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";

export function PurchaseRequisitionsTab({ stats, onAction }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingPR, setViewingPR] = useState<PurchaseRequisition | null>(null);
  const [filter, setFilter] = useState<string>("All");
  
  // Local state for PRs so we can mutate status in demo mode
  const [prs, setPrs] = useState<PurchaseRequisition[]>(MOCK_PRS);

  // Mock form state for demo
  const [formData, setFormData] = useState({
    projectName: "",
    requester: "",
    department: "",
    priority: "Medium" as const,
    justification: "",
    items: [] as Array<{
      name: string;
      quantity: number;
      unit: string;
      estimatedPrice: number;
      quotations: Array<{ file: File; supplierName: string; amount: number; leadTimeDays: number; selected: boolean }>;
    }>,
  });

  const filteredPRs = prs.filter((pr) => (filter === "All" ? true : pr.status === filter));

  const handleApprovePR = (prNumber: string) => {
    setPrs(prevPrs => prevPrs.map(pr => 
      pr.pr_number === prNumber 
        ? { 
            ...pr, 
            status: "Approved" as const,
            finance_approved_by: "Demo User",
            finance_approved_at: new Date().toISOString(),
            finance_notes: "Manually approved via dashboard (demo mode)"
          } 
        : pr
    ));
    alert(`PR ${prNumber} approved successfully!`);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { name: "", quantity: 1, unit: "units", estimatedPrice: 0, quotations: [] },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleQuotationUpload = (itemIndex: number, files: FileList) => {
    // In real implementation, this would trigger OCR/VLM
    // For demo, we'll just add mock extracted data
    const newQuotations = Array.from(files).map((file) => ({
      file,
      supplierName: "Extracted from OCR",
      amount: Math.floor(Math.random() * 5000) + 1000,
      leadTimeDays: Math.floor(Math.random() * 20) + 5,
      selected: false,
    }));

    const updatedItems = [...formData.items];
    updatedItems[itemIndex].quotations.push(...newQuotations);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSelectSupplier = (itemIndex: number, quoteIndex: number) => {
    const updatedItems = [...formData.items];
    updatedItems[itemIndex].quotations.forEach((q, i) => {
      q.selected = i === quoteIndex;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  const handleGeneratePR = () => {
    // In real implementation, this would call backend API
    alert("PR generated successfully! (Demo mode - no actual PR created)");
    setShowCreateModal(false);
    setFormData({
      projectName: "",
      requester: "",
      department: "",
      priority: "Medium",
      justification: "",
      items: [],
    });
  };

  return (
    <div className="sd-stack">
      {/* Template Info Card */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h3 className="sd-chart-title">PR Template: v1.2 (Active)</h3>
            <p className="sd-chart-sub">Last updated: Oct 1, 2025 by admin</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="sd-btn sd-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus className="h-4 w-4" />
            Create New PR
          </button>
        </div>

        {/* Version History */}
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--samurai-surface-2)", borderRadius: "0.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>Version History:</div>
          {MOCK_TEMPLATE_VERSIONS.pr.map((version) => (
            <div key={version.version} style={{ fontSize: "0.65rem", color: MUTED, marginBottom: "0.25rem" }}>
              <span style={{ fontWeight: 600, color: version.active ? "var(--samurai-ok)" : TEXT }}>
                {version.version}
              </span>
              {" "}({new Date(version.created_at).toLocaleDateString("en-MY")}) - {version.changelog}
            </div>
          ))}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="sd-chart-card">
        <div className="sd-theme-seg" style={{ padding: "0.25rem", flexWrap: "wrap", gap: "0.35rem" }}>
          {["All", "Pending Finance Approval", "Approved", "Rejected", "Clarification Requested"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={filter === f ? "active" : ""}
              style={{ fontSize: "0.72rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", whiteSpace: "nowrap", width: "auto" }}
            >
              {f} ({f === "All" ? MOCK_PRS.length : MOCK_PRS.filter((p) => p.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* PR List Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Purchase Requisitions</h3>
        {filteredPRs.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No purchase requisitions matching filter "{filter}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>PR ID</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Project</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Requester</th>
                  <th className="px-3 py-2.5 text-right" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Amount</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Priority</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Status</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: "0.72rem", fontWeight: 500, color: MUTED }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPRs.map((pr) => (
                  <tr key={pr.pr_number} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", fontWeight: 600, color: TEXT }}>
                      {pr.pr_number}
                    </td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontWeight: 500, color: TEXT }}>{pr.project_name}</div>
                      <div style={{ fontSize: "0.72rem", color: MUTED }}>{pr.items.length} items</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontWeight: 500, color: TEXT }}>{pr.requester}</div>
                      <div style={{ fontSize: "0.72rem", color: MUTED }}>{pr.department}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ fontWeight: 600, color: TEXT }}>
                      RM {pr.total_amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${PRIORITY_STYLE[pr.priority] ?? "muted"}`}>{pr.priority}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${STATUS_STYLE[pr.status] ?? "muted"}`}>{pr.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem" }}>
                        {pr.status === "Pending Finance Approval" && (
                          <button
                            type="button"
                            onClick={() => handleApprovePR(pr.pr_number)}
                            className="sd-btn sd-btn-primary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingPR(pr)}
                          className="sd-btn sd-btn-secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create PR Modal */}
      {showCreateModal && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)", border: "none", cursor: "default" }}
            onClick={() => setShowCreateModal(false)}
            aria-label="Close"
          />
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="sd-card"
              style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "50rem", maxHeight: "90vh", overflow: "auto", padding: "1.5rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                  Create Purchase Requisition
                </h2>
                <button type="button" className="sd-icon-btn" onClick={() => setShowCreateModal(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Basic Info */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: "0.75rem" }}>Basic Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.25rem" }}>Project Name</label>
                    <input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      className="sd-input"
                      placeholder="e.g., Office Renovation"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.25rem" }}>Requester</label>
                    <input
                      type="text"
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                      className="sd-input"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.25rem" }}>Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="sd-input"
                      placeholder="e.g., Sales"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.25rem" }}>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="sd-input"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.25rem" }}>Justification</label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    className="sd-input"
                    rows={2}
                    placeholder="Why is this purchase needed?"
                  />
                </div>
              </div>

              {/* Hardware Items */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, margin: 0 }}>Hardware Items ({formData.items.length})</h3>
                  <button type="button" onClick={handleAddItem} className="sd-btn sd-btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}>
                    <Plus className="inline h-3 w-3 mr-1" /> Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: MUTED, fontSize: "0.85rem", border: `1px dashed ${BORDER}`, borderRadius: "0.5rem" }}>
                    No items added yet. Click "Add Item" to start.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {formData.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="sd-card" style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...formData.items];
                                  updated[itemIndex].name = e.target.value;
                                  setFormData({ ...formData, items: updated });
                                }}
                                className="sd-input"
                                placeholder="Item name"
                              />
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...formData.items];
                                  updated[itemIndex].quantity = parseInt(e.target.value) || 0;
                                  setFormData({ ...formData, items: updated });
                                }}
                                className="sd-input"
                                placeholder="Qty"
                              />
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => {
                                  const updated = [...formData.items];
                                  updated[itemIndex].unit = e.target.value;
                                  setFormData({ ...formData, items: updated });
                                }}
                                className="sd-input"
                                placeholder="Unit"
                              />
                              <input
                                type="number"
                                value={item.estimatedPrice}
                                onChange={(e) => {
                                  const updated = [...formData.items];
                                  updated[itemIndex].estimatedPrice = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, items: updated });
                                }}
                                className="sd-input"
                                placeholder="Est. Price"
                              />
                            </div>
                          </div>
                          <button type="button" onClick={() => handleRemoveItem(itemIndex)} className="sd-icon-btn" style={{ marginLeft: "0.5rem" }}>
                            <Trash2 className="h-4 w-4" style={{ color: "var(--samurai-danger)" }} />
                          </button>
                        </div>

                        {/* Quotation Upload */}
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${BORDER}` }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>
                            Upload Quotations ({item.quotations.length})
                          </div>
                          
                          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <label className="sd-btn sd-btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <Upload className="h-3 w-3" />
                              Upload PDF/Image
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg"
                                style={{ display: "none" }}
                                onChange={(e) => e.target.files && handleQuotationUpload(itemIndex, e.target.files)}
                              />
                            </label>
                            <span style={{ fontSize: "0.65rem", color: MUTED, alignSelf: "center" }}>
                              OCR + VLM will extract supplier, amount, lead time
                            </span>
                          </div>

                          {item.quotations.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {item.quotations.map((quote, quoteIndex) => (
                                <div
                                  key={quoteIndex}
                                  onClick={() => handleSelectSupplier(itemIndex, quoteIndex)}
                                  style={{
                                    padding: "0.5rem",
                                    border: `1px solid ${quote.selected ? "var(--samurai-ok)" : BORDER}`,
                                    borderRadius: "0.25rem",
                                    background: quote.selected ? "rgba(34, 197, 94, 0.1)" : "transparent",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {quote.selected && <CheckCircle className="h-4 w-4" style={{ color: "var(--samurai-ok)" }} />}
                                    <div>
                                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT }}>
                                        {quote.supplierName}
                                      </div>
                                      <div style={{ fontSize: "0.65rem", color: MUTED }}>
                                        RM {quote.amount.toLocaleString()} • {quote.leadTimeDays} days lead time
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.25rem" }}>
                                    <button type="button" className="sd-icon-btn" title="Preview">
                                      <Eye className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      className="sd-icon-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = [...formData.items];
                                        updated[itemIndex].quotations.splice(quoteIndex, 1);
                                        setFormData({ ...formData, items: updated });
                                      }}
                                      title="Remove"
                                    >
                                      <Trash2 className="h-3 w-3" style={{ color: "var(--samurai-danger)" }} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "1rem", borderTop: `1px solid ${BORDER}` }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="sd-btn sd-btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePR}
                  className="sd-btn sd-btn-primary"
                  disabled={!formData.projectName || !formData.requester || formData.items.length === 0}
                >
                  Generate PR
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View PR Details Modal */}
      {viewingPR && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)", border: "none", cursor: "default" }}
            onClick={() => setViewingPR(null)}
            aria-label="Close"
          />
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => setViewingPR(null)}
          >
            <div
              className="sd-card"
              style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "50rem", maxHeight: "90vh", overflow: "auto", padding: "1.5rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                    {viewingPR.pr_number}
                  </h2>
                  <p style={{ fontSize: "0.72rem", color: MUTED, margin: 0 }}>{viewingPR.project_name}</p>
                </div>
                <button type="button" className="sd-icon-btn" onClick={() => setViewingPR(null)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>Requester</div>
                  <div style={{ fontWeight: 500, color: TEXT }}>{viewingPR.requester} ({viewingPR.department})</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>Priority</div>
                  <span className={`sd-chip ${PRIORITY_STYLE[viewingPR.priority] ?? "muted"}`}>{viewingPR.priority}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>Status</div>
                  <span className={`sd-chip ${STATUS_STYLE[viewingPR.status] ?? "muted"}`}>{viewingPR.status}</span>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>Total Amount</div>
                  <div style={{ fontWeight: 600, color: TEXT }}>RM {viewingPR.total_amount.toLocaleString()}</div>
                </div>
              </div>

              {viewingPR.justification && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "var(--samurai-surface-2)", borderRadius: "0.5rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.25rem" }}>Justification</div>
                  <div style={{ fontSize: "0.72rem", color: MUTED, fontStyle: "italic" }}>"{viewingPR.justification}"</div>
                </div>
              )}

              {viewingPR.finance_notes && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(59, 130, 246, 0.1)", borderLeft: "3px solid var(--samurai-blue)", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.25rem" }}>Finance Notes</div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>{viewingPR.finance_notes}</div>
                </div>
              )}

              {viewingPR.finance_rejection_reason && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", borderLeft: "3px solid var(--samurai-danger)", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.25rem" }}>Rejection Reason</div>
                  <div style={{ fontSize: "0.72rem", color: MUTED }}>{viewingPR.finance_rejection_reason}</div>
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: "0.75rem" }}>Items ({viewingPR.items.length})</h3>
                {viewingPR.items.map((item, idx) => (
                  <div key={idx} className="sd-card" style={{ padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>{item.name}</div>
                        <div style={{ fontSize: "0.72rem", color: MUTED }}>{item.quantity} {item.unit} • Est. RM {item.estimated_price.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--samurai-ok)" }}>
                          Selected: {item.selected_supplier.supplier_name}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: MUTED }}>
                          RM {item.selected_supplier.amount.toLocaleString()} • {item.selected_supplier.lead_time_days} days
                        </div>
                      </div>
                    </div>

                    {item.alternative_quotes.length > 0 && (
                      <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: `1px solid ${BORDER}` }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Alternative Quotes:</div>
                        {item.alternative_quotes.map((alt, altIdx) => (
                          <div key={altIdx} style={{ fontSize: "0.65rem", color: MUTED, marginBottom: "0.125rem" }}>
                            • {alt.supplier_name}: RM {alt.amount.toLocaleString()} ({alt.lead_time_days} days)
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: MUTED, fontStyle: "italic" }}>
                      Selection reason: {item.selection_reason}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "1rem", borderTop: `1px solid ${BORDER}` }}>
                <button type="button" onClick={() => setViewingPR(null)} className="sd-btn sd-btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
