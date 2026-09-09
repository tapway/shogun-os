import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Package, User, Building2, Calendar, DollarSign } from "lucide-react";
import type { ProgressTrackerProject, ProgressTrackerHardwareItem, ProgressStep } from "../../../lib/procurement-mock-data";
import { MOCK_PROGRESS_TRACKER } from "../../../lib/procurement-mock-data";

interface Props {
  color: string;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  completed: { bg: "var(--samurai-ok)", text: "#fff", icon: CheckCircle },
  in_progress: { bg: "var(--samurai-blue)", text: "#fff", icon: Clock },
  blocked: { bg: "var(--samurai-warning)", text: "#0a0a0a", icon: AlertTriangle },
  pending: { bg: "var(--samurai-muted)", text: "#fff", icon: Clock },
};

const STEP_TYPE_STYLE = {
  internal: { bg: "rgba(34, 197, 94, 0.1)", border: "var(--samurai-ok)" },
  vendor: { bg: "rgba(59, 130, 246, 0.1)", border: "var(--samurai-blue)" },
};

export function ProgressTrackerTab({ color }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const toggleItem = (itemId: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setExpandedItems(newSet);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "var(--samurai-ok)";
    if (progress >= 50) return "var(--samurai-blue)";
    if (progress >= 30) return "var(--samurai-warning)";
    return "var(--samurai-muted)";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-MY", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="sd-stack">
      {/* Summary Cards */}
      <div className="sd-kpi-grid">
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Active Projects</div>
          <div className="sd-kpi-value">{MOCK_PROGRESS_TRACKER.length}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Blocked</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-warning)" }}>
            {MOCK_PROGRESS_TRACKER.filter(p => p.status === "blocked").length}
          </div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">On Track</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-ok)" }}>
            {MOCK_PROGRESS_TRACKER.filter(p => p.status === "in_progress").length}
          </div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Avg Lead Time</div>
          <div className="sd-kpi-value">14.2 days</div>
        </div>
      </div>

      {/* Project List */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Project Progress Overview</h3>
        <p className="sd-chart-sub">Track procurement lifecycle from PR creation to final payment</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          {MOCK_PROGRESS_TRACKER.map((project) => {
            const isExpanded = expandedProjects.has(project.project_id);
            const statusStyle = STATUS_STYLE[project.status] || STATUS_STYLE.pending;
            const StatusIcon = statusStyle.icon;

            return (
              <div key={project.project_id} className="sd-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Project Header */}
                <div
                  onClick={() => toggleProject(project.project_id)}
                  style={{
                    padding: "1rem",
                    cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid var(--samurai-border)" : "none",
                    background: "var(--samurai-surface-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <StatusIcon className="h-5 w-5" style={{ color: statusStyle.bg }} />
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem", color: "var(--samurai-text)" }}>
                          {project.project_name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--samurai-muted)", display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
                          <span><User className="inline h-3 w-3 mr-1" />{project.requester}</span>
                          <span><Building2 className="inline h-3 w-3 mr-1" />{project.department}</span>
                          <span><Package className="inline h-3 w-3 mr-1" />{project.pr_number}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className={`sd-chip ${project.status === "blocked" ? "warn" : project.status === "completed" ? "ok" : "muted"}`}>
                        {project.status === "in_progress" ? "In Progress" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.25rem" }}>
                      <span style={{ color: "var(--samurai-muted)" }}>Overall Progress</span>
                      <span style={{ fontWeight: 600, color: "var(--samurai-text)" }}>{project.overall_progress}%</span>
                    </div>
                    <div style={{ height: "0.5rem", background: "var(--samurai-surface-2)", borderRadius: "0.25rem", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${project.overall_progress}%`,
                          height: "100%",
                          background: getProgressColor(project.overall_progress),
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--samurai-muted)", marginTop: "0.25rem" }}>
                      {project.completed_steps}/{project.total_steps} steps completed • Created {formatDate(project.created_at)}
                    </div>
                  </div>

                  {/* Blocked Reason */}
                  {project.status === "blocked" && project.blocked_reason && (
                    <div style={{
                      marginTop: "0.75rem",
                      padding: "0.5rem",
                      background: "rgba(251, 191, 36, 0.1)",
                      borderLeft: "3px solid var(--samurai-warning)",
                      borderRadius: "0.25rem",
                      fontSize: "0.72rem",
                      color: "var(--samurai-text)",
                    }}>
                      <AlertTriangle className="inline h-3 w-3 mr-1" style={{ color: "var(--samurai-warning)" }} />
                      <strong>Blocked:</strong> {project.blocked_reason}
                      {project.blocked_since && (
                        <span style={{ marginLeft: "0.5rem", color: "var(--samurai-muted)" }}>
                          (since {formatDate(project.blocked_since)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: "1rem" }}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--samurai-text)" }}>
                      Hardware Items ({project.hardware_items.length})
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {project.hardware_items.map((item) => {
                        const isItemExpanded = expandedItems.has(item.item_id);
                        const currentStep = item.steps[item.current_step_index];

                        return (
                          <div key={item.item_id} className="sd-card" style={{ padding: "0.75rem" }}>
                            {/* Item Header */}
                            <div
                              onClick={() => toggleItem(item.item_id)}
                              style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "start" }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--samurai-text)" }}>
                                  {item.name} ({item.quantity} {item.unit})
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--samurai-muted)", marginTop: "0.25rem" }}>
                                  Supplier: {item.selected_supplier.name} • RM {item.selected_supplier.quotation_amount.toLocaleString()} • {item.selected_supplier.lead_time_days} days lead time
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {currentStep && (
                                  <span className={`sd-chip ${currentStep.status === "completed" ? "ok" : currentStep.status === "in_progress" ? "muted" : "warn"}`}>
                                    {currentStep.name}
                                  </span>
                                )}
                                {isItemExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            {/* Expanded Timeline */}
                            {isItemExpanded && (
                              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--samurai-border)" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                  {item.steps.map((step, idx) => {
                                    const stepStyle = STEP_TYPE_STYLE[step.type];
                                    const isCurrent = idx === item.current_step_index;
                                    const statusStyle = STATUS_STYLE[step.status] || STATUS_STYLE.pending;
                                    const StepIcon = statusStyle.icon;

                                    return (
                                      <div
                                        key={step.id}
                                        style={{
                                          display: "flex",
                                          gap: "0.75rem",
                                          padding: "0.5rem",
                                          background: isCurrent ? stepStyle.bg : "transparent",
                                          borderLeft: `3px solid ${isCurrent ? stepStyle.border : "transparent"}`,
                                          borderRadius: "0.25rem",
                                        }}
                                      >
                                        <div style={{ minWidth: "1.5rem", display: "flex", justifyContent: "center" }}>
                                          <StepIcon className="h-4 w-4" style={{ color: statusStyle.bg }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                            <div>
                                              <div style={{ fontWeight: 500, fontSize: "0.75rem", color: "var(--samurai-text)" }}>
                                                {step.name}
                                                {step.type === "vendor" && (
                                                  <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "var(--samurai-blue)" }}>
                                                    (Vendor: {step.vendor_name})
                                                  </span>
                                                )}
                                                {step.department && (
                                                  <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "var(--samurai-muted)" }}>
                                                    [{step.department}]
                                                  </span>
                                                )}
                                              </div>
                                              {step.notes && (
                                                <div style={{ fontSize: "0.65rem", color: "var(--samurai-muted)", marginTop: "0.125rem", fontStyle: "italic" }}>
                                                  {step.notes}
                                                </div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: "right", fontSize: "0.65rem", color: "var(--samurai-muted)" }}>
                                              {step.sla_days && <div>SLA: {step.sla_days}d</div>}
                                              {step.estimated_days && <div>Est: {step.estimated_days}d</div>}
                                              {step.actual_days && <div>Actual: {step.actual_days}d</div>}
                                            </div>
                                          </div>
                                          {(step.started_at || step.completed_at) && (
                                            <div style={{ fontSize: "0.65rem", color: "var(--samurai-muted)", marginTop: "0.25rem", display: "flex", gap: "1rem" }}>
                                              {step.started_at && <span><Calendar className="inline h-3 w-3 mr-1" />Started: {formatDate(step.started_at)} {formatTime(step.started_at)}</span>}
                                              {step.completed_at && <span><CheckCircle className="inline h-3 w-3 mr-1" />Completed: {formatDate(step.completed_at)} {formatTime(step.completed_at)}</span>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
