import React, { useState, useMemo } from "react";
import { AlertTriangle, X, Plus, FileText, Mail, ChevronDown } from "lucide-react";
import { PieChart } from "../charts";
import { chartColors } from "../../../lib/palette";
import type {
  ExecutiveApprovalRow,
  ProcurementDashboardStats,
  PurchaseOrderRow,
} from "../../../lib/types";
import { MOCK_PRS, MOCK_POS } from "../../../lib/procurement-mock-data";

interface Props {
  stats: ProcurementDashboardStats;
  color: string;
  onAction?: (actionType: string, entity: unknown) => void;
}

const fmtMyr = (n: number) =>
  n >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(2)}M`
    : `RM ${(n / 1_000).toFixed(0)}K`;

const FULFILLMENT_STYLE: Record<string, string> = {
  Draft: "muted",
  "Pending Approval": "warn",
  "Issued to Vendor": "muted",
  "Partially Received": "muted",
  "Fully Received & Billed": "ok",
};

const APPROVAL_STYLE: Record<string, string> = {
  Draft: "muted",
  "Pending Approval": "warn",
  Approved: "ok",
  Issued: "muted",
  Cancelled: "bad",
};

const SLA_STYLE: Record<string, string> = {
  "Top Tier": "ok",
  Satisfactory: "muted",
  "Under Review": "warn",
};

const APPROVAL_QUEUE_STYLE: Record<string, string> = {
  "Pending Executive Approval": "warn",
  Approved: "ok",
  "Clarification Requested": "muted",
  Rejected: "bad",
};

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";

const th = { fontSize: "0.72rem", fontWeight: 500, color: MUTED } as const;

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "right" | "center";
}) {
  return (
    <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>
      {children}
    </th>
  );
}

// PO pipeline funnel stages use a token-based gradient (muted → warning → blue → indigo → ok).
const PIPELINE_COLORS = [
  "var(--samurai-muted)",
  "var(--samurai-warning)",
  "var(--samurai-blue)",
  "#6366f1",
  "var(--samurai-ok)",
];

export function PurchaseOrdersVendorTab({ stats, color, onAction }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [activePoApprovalFilter, setActivePoApprovalFilter] = useState<string>("All");
  const [poActionTarget, setPoActionTarget] = useState<PurchaseOrderRow | null>(null);
  const [execActionTarget, setExecActionTarget] = useState<ExecutiveApprovalRow | null>(null);
  
  // Create PO modal state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<string>("");
  const [generatedPO, setGeneratedPO] = useState<any>(null); // Store generated PO for preview
  
  // Track which POs are expanded to show items
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  
  // Local state for POs so we can manage status in demo mode
  const [pos, setPos] = useState<Array<{
    po_number: string;
    parent_pr: string;
    supplier_name: string;
    total_amount: number;
    status: 'Draft' | 'Pending Boss Approval' | 'Boss Approved' | 'Sent to Vendor' | 'Partially Received' | 'Fully Received';
    created_at: string;
    items: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
  }>>([
    // Initial mock POs with varied statuses
    {
      po_number: "PO-2025-0042",
      parent_pr: "PR-2025-001",
      supplier_name: "TechWorld Sdn Bhd",
      total_amount: 12500,
      status: "Fully Received",
      created_at: "2025-10-03T09:20:00Z",
      items: [{ name: "Dell XPS 15 Laptop", quantity: 5, unit_price: 2500, total: 12500 }],
    },
    {
      po_number: "PO-2025-0043",
      parent_pr: "PR-2025-001",
      supplier_name: "OfficePro Malaysia",
      total_amount: 8400,
      status: "Partially Received",
      created_at: "2025-10-03T09:25:00Z",
      items: [{ name: "Ergonomic Office Chair", quantity: 20, unit_price: 420, total: 8400 }],
    },
    {
      po_number: "PO-2025-0044",
      parent_pr: "PR-2025-004",
      supplier_name: "Toyota Material Handling",
      total_amount: 9000,
      status: "Sent to Vendor",
      created_at: "2025-09-22T10:00:00Z",
      items: [{ name: "Electric Pallet Jack", quantity: 3, unit_price: 3000, total: 9000 }],
    },
    {
      po_number: "PO-2025-0045",
      parent_pr: "PR-2025-004",
      supplier_name: "Storage Solutions MY",
      total_amount: 4500,
      status: "Boss Approved",
      created_at: "2025-09-22T10:05:00Z",
      items: [{ name: "Heavy Duty Shelving Unit", quantity: 10, unit_price: 450, total: 4500 }],
    },
    {
      po_number: "PO-2025-0046",
      parent_pr: "PR-2025-002",
      supplier_name: "Dell Technologies Malaysia",
      total_amount: 45000,
      status: "Pending Boss Approval",
      created_at: "2025-10-06T17:00:00Z",
      items: [{ name: "Dell PowerEdge R750 Server", quantity: 2, unit_price: 22500, total: 45000 }],
    },
  ]);

  const approvedPRs = MOCK_PRS.filter(pr => pr.status === "Approved" || pr.status === "Converted to PO");

  // Calculate PO Pipeline from local pos state
  const poPipelineData = useMemo(() => {
    const stages = [
      { stage: "Pending Boss Approval", count: 0, value: 0 },
      { stage: "Boss Approved", count: 0, value: 0 },
      { stage: "Sent to Vendor", count: 0, value: 0 },
      { stage: "Partially Received", count: 0, value: 0 },
      { stage: "Fully Received", count: 0, value: 0 },
    ];
    
    pos.forEach(po => {
      const stageIndex = stages.findIndex(s => s.stage === po.status);
      if (stageIndex >= 0) {
        stages[stageIndex].count++;
        stages[stageIndex].value += po.total_amount;
      }
    });
    
    return stages.filter(s => s.count > 0); // Only show stages with POs
  }, [pos]);

  const approvalQueue = stats.executiveApprovalQueue ?? [];
  const filteredQueue = approvalQueue.filter((item) => {
    if (statusFilter === "All") return true;
    return item.approval_status === statusFilter;
  });

  const countPending = approvalQueue.filter(
    (i) => i.approval_status === "Pending Executive Approval",
  ).length;
  const countClarification = approvalQueue.filter(
    (i) => i.approval_status === "Clarification Requested",
  ).length;

  const activePos = stats.activePurchaseOrders ?? [];
  const filteredActivePos = activePos.filter((po) => {
    if (activePoApprovalFilter === "All") return true;
    return po.approval_status === activePoApprovalFilter;
  });

  const countActiveAll = activePos.length;
  const countActiveDraft = activePos.filter(
    (p) => p.approval_status === "Draft",
  ).length;
  const countActiveApproved = activePos.filter(
    (p) => p.approval_status === "Approved",
  ).length;
  const countActiveIssued = activePos.filter(
    (p) => p.approval_status === "Issued",
  ).length;
  const countActivePending = activePos.filter(
    (p) => p.approval_status === "Pending Approval",
  ).length;
  const countActiveCancelled = activePos.filter(
    (p) => p.approval_status === "Cancelled",
  ).length;

  const concentrationAlert = stats.vendorSpendConcentration.find(
    (v) => v.spend_pct > 25,
  );

  return (
    <div className="sd-stack">
      {/* PO Lifecycle Pipeline (Funnel) - Moved to Top */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">PO Lifecycle Pipeline (Funnel)</h3>
        {poPipelineData.length === 0 ? (
          <p style={{ color: MUTED, fontSize: "0.85rem" }}>
            No POs created yet. Use "Create PO" button below to get started.
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                height: "2rem",
                borderRadius: "0.5rem",
                overflow: "hidden",
                background: SURFACE_2,
                marginBottom: "0.5rem",
              }}
            >
              {poPipelineData.map((stage, i) => {
                const totalCount = poPipelineData.reduce(
                  (sum, s) => sum + s.count,
                  0,
                );
                const widthPct =
                  totalCount > 0 ? (stage.count / totalCount) * 100 : 0;
                return (
                  <div
                    key={stage.stage}
                    style={{
                      width: `${widthPct}%`,
                      background: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "#fff",
                    }}
                    title={`${stage.stage}: ${stage.count} POs (${fmtMyr(stage.value)})`}
                  >
                    <span>{stage.count}</span>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                paddingBottom: "0.25rem",
                fontSize: "0.72rem",
              }}
            >
              {poPipelineData.map((stage, i) => {
                const totalCount = poPipelineData.reduce(
                  (sum, s) => sum + s.count,
                  0,
                );
                const widthPct =
                  totalCount > 0 ? (stage.count / totalCount) * 100 : 0;
                return (
                  <div
                    key={stage.stage}
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "5rem",
                      padding: "0 0.25rem",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          height: "0.625rem",
                          width: "0.625rem",
                          borderRadius: "0.125rem",
                          background:
                            PIPELINE_COLORS[i % PIPELINE_COLORS.length],
                        }}
                      />
                      <span style={{ fontWeight: 600, color: TEXT }}>
                        {stage.stage}
                      </span>
                    </div>
                    <div style={{ color: MUTED }}>{fmtMyr(stage.value)}</div>
                  </div>
                );
              })}
            </div>
            <p
              style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: MUTED }}
            >
              Pipeline flow: Pending Boss Approval → Boss Approved → Sent to Vendor → Partially Received → Fully Received
            </p>
          </>
        )}
      </div>

      {/* Unified PO List - All POs with Boss Approval */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div>
            <h3 className="sd-chart-title" style={{ margin: 0 }}>Purchase Orders</h3>
            <p className="sd-chart-sub" style={{ margin: 0 }}>Track PO status from creation to vendor delivery</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="sd-theme-seg" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className={statusFilter === "All" ? "active" : ""}
                style={{ fontSize: "0.72rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", whiteSpace: "nowrap", width: "auto" }}
              >
                All ({pos.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Pending Boss Approval")}
                className={statusFilter === "Pending Boss Approval" ? "active" : ""}
                style={{ fontSize: "0.72rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", whiteSpace: "nowrap", width: "auto" }}
              >
                Pending Boss Approval ({pos.filter(p => p.status === "Pending Boss Approval").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Boss Approved")}
                className={statusFilter === "Boss Approved" ? "active" : ""}
                style={{ fontSize: "0.72rem", padding: "0.35rem 0.7rem", borderRadius: "0.4rem", whiteSpace: "nowrap", width: "auto" }}
              >
                Boss Approved ({pos.filter(p => p.status === "Boss Approved").length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePOModal(true)}
              className="sd-btn sd-btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.8rem", fontSize: "0.72rem" }}
            >
              <Plus className="h-4 w-4" />
              Create PO
            </button>
          </div>
        </div>

        {pos.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No purchase orders created yet. Use "Create PO from PR" above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">PO Number</Th>
                  <Th align="left">Parent PR</Th>
                  <Th align="left">Supplier</Th>
                  <Th align="right">Amount</Th>
                  <Th align="left">Created</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pos.filter(po => statusFilter === "All" || po.status === statusFilter).map((po) => {
                  const isExpanded = expandedPOs.has(po.po_number);
                  
                  return (
                    <React.Fragment key={po.po_number}>
                      {/* Main PO Row */}
                      <tr 
                        onClick={() => {
                          const newSet = new Set(expandedPOs);
                          if (newSet.has(po.po_number)) {
                            newSet.delete(po.po_number);
                          } else {
                            newSet.add(po.po_number);
                          }
                          setExpandedPOs(newSet);
                        }}
                        style={{ 
                          borderBottom: isExpanded ? "none" : `1px solid ${BORDER}`,
                          cursor: "pointer",
                          background: isExpanded ? "var(--samurai-surface-2)" : "transparent"
                        }}
                      >
                        <td className="px-3 py-2.5" style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", fontWeight: 600, color: TEXT }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" style={{ transform: "rotate(-90deg)" }} />}
                            {po.po_number}
                          </div>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: MUTED }}>{po.parent_pr}</td>
                        <td className="px-3 py-2.5" style={{ fontWeight: 500, color: TEXT }}>{po.supplier_name}</td>
                        <td className="px-3 py-2.5 text-right" style={{ fontWeight: 600, color: TEXT }}>
                          RM {po.total_amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5" style={{ fontSize: "0.72rem", color: MUTED }}>
                          {new Date(po.created_at).toLocaleDateString("en-MY")}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`sd-chip ${
                            po.status === "Pending Boss Approval" ? "warn" :
                            po.status === "Boss Approved" ? "ok" :
                            po.status === "Sent to Vendor" ? "muted" :
                            "muted"
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem" }}>
                            {po.status === "Pending Boss Approval" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPos(prev => prev.map(p => 
                                    p.po_number === po.po_number 
                                      ? { ...p, status: "Boss Approved" as const }
                                      : p
                                  ));
                                  alert(`PO ${po.po_number} approved by boss!\n\nNext step: Email PO to vendor.`);
                                }}
                                className="sd-btn sd-btn-primary"
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                              >
                                Approve
                              </button>
                            )}
                            {po.status === "Boss Approved" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPos(prev => prev.map(p => 
                                    p.po_number === po.po_number 
                                      ? { ...p, status: "Sent to Vendor" as const }
                                      : p
                                  ));
                                  alert(`PO ${po.po_number} emailed to vendor!\n\nVendor: ${po.supplier_name}`);
                                }}
                                className="sd-btn sd-btn-secondary"
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                              >
                                <Mail className="h-3 w-3" />
                                Email to Vendor
                              </button>
                            )}
                            {po.status !== "Pending Boss Approval" && po.status !== "Boss Approved" && (
                              <span style={{ fontSize: "0.72rem", color: MUTED, fontStyle: "italic" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Items Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${BORDER}`, background: "var(--samurai-surface-2)" }}>
                            <div style={{ padding: "1rem", marginLeft: "2rem" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>
                                Items in this PO ({po.items.length}):
                              </div>
                              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                                    <th className="px-3 py-1.5 text-left" style={{ fontSize: "0.65rem", fontWeight: 500, color: MUTED }}>Item Name</th>
                                    <th className="px-3 py-1.5 text-right" style={{ fontSize: "0.65rem", fontWeight: 500, color: MUTED }}>Quantity</th>
                                    <th className="px-3 py-1.5 text-right" style={{ fontSize: "0.65rem", fontWeight: 500, color: MUTED }}>Unit Price</th>
                                    <th className="px-3 py-1.5 text-right" style={{ fontSize: "0.65rem", fontWeight: 500, color: MUTED }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                      <td className="px-3 py-1.5" style={{ fontWeight: 500, color: TEXT }}>{item.name}</td>
                                      <td className="px-3 py-1.5 text-right" style={{ color: TEXT }}>{item.quantity}</td>
                                      <td className="px-3 py-1.5 text-right" style={{ color: MUTED }}>RM {item.unit_price.toLocaleString()}</td>
                                      <td className="px-3 py-1.5 text-right" style={{ fontWeight: 600, color: TEXT }}>RM {item.total.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {showCreatePOModal && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)", border: "none", cursor: "default" }}
            onClick={() => {
              setShowCreatePOModal(false);
              setGeneratedPO(null);
              setSelectedPR("");
            }}
            aria-label="Close"
          />
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => {
              setShowCreatePOModal(false);
              setGeneratedPO(null);
              setSelectedPR("");
            }}
          >
            <div
              className="sd-card"
              style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "45rem", maxHeight: "90vh", overflow: "auto", padding: "1.5rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                  {generatedPO ? "Review Purchase Order" : "Create Purchase Order from PR"}
                </h2>
                <button type="button" className="sd-icon-btn" onClick={() => {
                  setShowCreatePOModal(false);
                  setGeneratedPO(null);
                  setSelectedPR("");
                }} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!generatedPO ? (
                // Step 1: Select PR
                <>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: MUTED, marginBottom: "0.5rem" }}>
                      Select Approved PR
                    </label>
                    <select
                      value={selectedPR}
                      onChange={(e) => setSelectedPR(e.target.value)}
                      className="sd-input"
                      style={{ width: "100%" }}
                    >
                      <option value="">-- Select a Purchase Requisition --</option>
                      {approvedPRs.map((pr) => (
                        <option key={pr.pr_number} value={pr.pr_number}>
                          {pr.pr_number} - {pr.project_name} (RM {pr.total_amount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPR && (() => {
                    const pr = approvedPRs.find(p => p.pr_number === selectedPR);
                    if (!pr) return null;
                    
                    return (
                      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--samurai-surface-2)", borderRadius: "0.5rem" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: "0.75rem" }}>
                          PR Details: {pr.pr_number}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.72rem", marginBottom: "0.75rem" }}>
                          <div><span style={{ color: MUTED }}>Project:</span> <span style={{ color: TEXT }}>{pr.project_name}</span></div>
                          <div><span style={{ color: MUTED }}>Requester:</span> <span style={{ color: TEXT }}>{pr.requester}</span></div>
                          <div><span style={{ color: MUTED }}>Department:</span> <span style={{ color: TEXT }}>{pr.department}</span></div>
                          <div><span style={{ color: MUTED }}>Total Amount:</span> <span style={{ color: TEXT, fontWeight: 600 }}>RM {pr.total_amount.toLocaleString()}</span></div>
                        </div>
                        
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>Items to be ordered:</div>
                        {pr.items.map((item, idx) => (
                          <div key={idx} style={{ padding: "0.5rem", marginBottom: "0.5rem", background: "var(--samurai-surface)", borderRadius: "0.25rem", borderLeft: "3px solid var(--samurai-ok)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.75rem", color: TEXT }}>{item.name}</div>
                                <div style={{ fontSize: "0.65rem", color: MUTED }}>{item.quantity} {item.unit}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--samurai-ok)" }}>{item.selected_supplier.supplier_name}</div>
                                <div style={{ fontSize: "0.65rem", color: MUTED }}>RM {item.selected_supplier.amount.toLocaleString()} • {item.selected_supplier.lead_time_days} days</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "1rem", borderTop: `1px solid ${BORDER}` }}>
                    <button type="button" onClick={() => setShowCreatePOModal(false)} className="sd-btn sd-btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPR) return;
                        const pr = approvedPRs.find(p => p.pr_number === selectedPR);
                        if (!pr) return;

                        // Generate PO preview data
                        const poNumber = `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`;
                        const newPO = {
                          po_number: poNumber,
                          parent_pr: pr.pr_number,
                          supplier_name: pr.items[0]?.selected_supplier?.supplier_name || "Multiple Suppliers",
                          total_amount: pr.total_amount,
                          status: "Draft" as const,
                          created_at: new Date().toISOString(),
                          items: pr.items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            unit_price: item.selected_supplier.amount / item.quantity,
                            total: item.selected_supplier.amount,
                          })),
                        };
                        setGeneratedPO(newPO);
                      }}
                      className="sd-btn sd-btn-primary"
                      disabled={!selectedPR}
                    >
                      Create PO
                    </button>
                  </div>
                </>
              ) : (
                // Step 2: Review and Confirm PO
                <>
                  <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(34, 197, 94, 0.1)", borderLeft: "3px solid var(--samurai-ok)", borderRadius: "0.25rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>
                      Purchase Order Preview
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.72rem" }}>
                      <div><span style={{ color: MUTED }}>PO Number:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{generatedPO.po_number}</span></div>
                      <div><span style={{ color: MUTED }}>Parent PR:</span> <span style={{ color: TEXT }}>{generatedPO.parent_pr}</span></div>
                      <div><span style={{ color: MUTED }}>Supplier:</span> <span style={{ color: TEXT }}>{generatedPO.supplier_name}</span></div>
                      <div><span style={{ color: MUTED }}>Total Amount:</span> <span style={{ color: TEXT, fontWeight: 600 }}>RM {generatedPO.total_amount.toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>Items:</div>
                    {generatedPO.items.map((item: any, idx: number) => (
                      <div key={idx} style={{ padding: "0.5rem", marginBottom: "0.5rem", background: "var(--samurai-surface-2)", borderRadius: "0.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 500, fontSize: "0.75rem", color: TEXT }}>{item.name}</div>
                          <div style={{ fontSize: "0.72rem", color: TEXT }}>RM {item.total.toLocaleString()}</div>
                        </div>
                        <div style={{ fontSize: "0.65rem", color: MUTED }}>{item.quantity} units @ RM {item.unit_price.toLocaleString()}/unit</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(251, 191, 36, 0.1)", borderLeft: "3px solid var(--samurai-warning)", borderRadius: "0.25rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.25rem" }}>Next Steps After Confirmation:</div>
                    <div style={{ fontSize: "0.65rem", color: MUTED }}>
                      • PO will be added to list with status "Pending Boss Approval"<br/>
                      • Boss must approve before PO can be emailed to vendor<br/>
                      • You can track approval status in the PO list below
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "1rem", borderTop: `1px solid ${BORDER}` }}>
                    <button 
                      type="button" 
                      onClick={() => setGeneratedPO(null)} 
                      className="sd-btn sd-btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Add PO to list with Pending Boss Approval status
                        setPos(prev => [...prev, { ...generatedPO, status: "Pending Boss Approval" }]);
                        alert(`PO ${generatedPO.po_number} created successfully!\n\nStatus: Pending Boss Approval\nNext: Boss must approve before emailing to vendor.`);
                        setShowCreatePOModal(false);
                        setGeneratedPO(null);
                        setSelectedPR("");
                      }}
                      className="sd-btn sd-btn-primary"
                    >
                      Confirm & Submit for Approval
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
