import React, { useState, useMemo } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import type {
  ExecutiveApprovalRow,
  ProcurementDashboardStats,
  DemoPurchaseRequisition,
} from "../../../lib/types";

interface LocalPO {
  po_number: string;
  parent_pr: string;
  supplier_name: string;
  total_amount: number;
  status: 'Draft' | 'Pending Boss Approval' | 'Boss Approved' | 'Sent to Vendor' | 'Partially Received' | 'Fully Received';
  created_at: string;
  items: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
}

interface Props {
  stats: ProcurementDashboardStats;
  color: string;
  onAction?: (actionType: string, entity: unknown) => void;
}

const fmtMyr = (n: number) =>
  n >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(2)}M`
    : `RM ${(n / 1_000).toFixed(0)}K`;

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

const PIPELINE_COLORS = [
  "var(--samurai-muted)",
  "var(--samurai-warning)",
  "var(--samurai-blue)",
  "#6366f1",
  "var(--samurai-ok)",
];

export function PurchaseOrdersVendorTab({ stats, color, onAction }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Create PO modal state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<string>("");
  const [generatedPO, setGeneratedPO] = useState<LocalPO | null>(null);
  
  // Track which POs are expanded to show items
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  
  // POs come from stats or default empty
  const initialPOs: LocalPO[] = (stats.activePurchaseOrders ?? []).map(po => ({
    po_number: po.po_number,
    parent_pr: po.vendor ?? "",
    supplier_name: po.vendor ?? "",
    total_amount: po.total_amount ?? 0,
    status: (po.approval_status === "Approved" ? "Boss Approved" :
            po.approval_status === "Draft" ? "Draft" :
            po.approval_status === "Issued" ? "Sent to Vendor" :
            po.approval_status === "Pending Approval" ? "Pending Boss Approval" :
            "Pending Boss Approval") as LocalPO['status'],
    created_at: po.order_date ?? new Date().toISOString(),
    items: [],
  }));

  const [pos, setPos] = useState<LocalPO[]>(initialPOs);

  // PRs for PO creation — use demo PRs if available, else fall back to basic PRs
  const approvedPRs: DemoPurchaseRequisition[] = (stats.demoPurchaseRequisitions ?? [])
    .filter(pr => pr.status === "Approved" || pr.status === "Converted to PO");

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
    
    return stages.filter(s => s.count > 0);
  }, [pos]);

  return (
    <div className="sd-stack">
      {/* PO Lifecycle Pipeline (Funnel) */}
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

      {/* Unified PO List */}
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
            No purchase orders created yet. Use "Create PO" above to get started.
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
                          background: isExpanded ? SURFACE_2 : "transparent"
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
                            "muted"
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <select
                              value={po.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newStatus = e.target.value as typeof po.status;
                                setPos(prev => prev.map(p => 
                                  p.po_number === po.po_number 
                                    ? { ...p, status: newStatus }
                                    : p
                                ));
                              }}
                              className="sd-input"
                              style={{ 
                                padding: "0.3rem 0.6rem", 
                                fontSize: "0.72rem",
                                minWidth: "140px",
                                cursor: "pointer"
                              }}
                            >
                              <option value="Pending Boss Approval">Pending Boss Approval</option>
                              <option value="Boss Approved">Boss Approved</option>
                              <option value="Sent to Vendor">Sent to Vendor</option>
                              <option value="Partially Received">Partially Received</option>
                              <option value="Fully Received">Fully Received</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Items Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                            <div style={{ padding: "1rem", marginLeft: "2rem" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: TEXT, marginBottom: "0.5rem" }}>
                                Items in this PO ({po.items.length}):
                              </div>
                              {po.items.length > 0 ? (
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
                              ) : (
                                <p style={{ fontSize: "0.72rem", color: MUTED }}>No item details available.</p>
                              )}
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
                      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: SURFACE_2, borderRadius: "0.5rem" }}>
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

                        const poNumber = `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`;
                        const newPO: LocalPO = {
                          po_number: poNumber,
                          parent_pr: pr.pr_number,
                          supplier_name: pr.items[0]?.selected_supplier?.supplier_name || "Multiple Suppliers",
                          total_amount: pr.total_amount,
                          status: "Draft",
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
                    {generatedPO.items.map((item, idx) => (
                      <div key={idx} style={{ padding: "0.5rem", marginBottom: "0.5rem", background: SURFACE_2, borderRadius: "0.25rem" }}>
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
                        setPos(prev => [...prev, { ...generatedPO, status: "Pending Boss Approval" }]);
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
