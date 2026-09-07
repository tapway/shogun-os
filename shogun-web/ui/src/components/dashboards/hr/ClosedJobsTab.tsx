import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, ChevronDown, ChevronRight, Users, X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrDashboardStats, HrJobOpening } from "../../../lib/types";
import { CandidateReviewsPanel, reviewEvents } from "./CandidateReviewsPanel";
import { findCandidatesForJob } from "./hrCandidateMatch";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
  onOpenTalentPool: (job: HrJobOpening) => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const DANGER = "var(--samurai-danger)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const OK = "var(--samurai-ok)";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMyr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.6rem",
  fontWeight: 700,
  fontSize: "0.78rem",
  color: MUTED,
  borderBottom: `2px solid ${BORDER}`,
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.6rem",
  fontSize: "0.85rem",
  verticalAlign: "middle",
};

const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 600, color: TEXT };

export function ClosedJobsTab({ stats, color, department, onOpenTalentPool }: Props) {
  const queryClient = useQueryClient();
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const jobOpenings = stats.job_openings || [];
  const allCandidates = stats.candidates || [];
  const allEvents = stats.candidate_events || [];

  // Filter to show only closed jobs
  const closedJobs = useMemo(
    () => jobOpenings.filter((j) => (j.job_status || "").startsWith("Closed")),
    [jobOpenings],
  );

  // Pre-compute candidate counts per job
  const candidatesPerJob = useMemo(() => {
    const map: Record<number, number> = {};
    for (const job of closedJobs) {
      map[job.id] = findCandidatesForJob(job, allCandidates).length;
    }
    return map;
  }, [closedJobs, allCandidates]);

  const totalClosed = closedJobs.length;
  const totalCandidates = closedJobs.reduce((sum, j) => sum + (candidatesPerJob[j.id] || 0), 0);
  const avgTimeToClose = useMemo(() => {
    const closedWithDays = closedJobs.filter((j) => j.days_left != null && j.days_left <= 0);
    if (closedWithDays.length === 0) return 0;
    const avgDays = closedWithDays.reduce((sum, j) => sum + Math.abs(j.days_left!), 0) / closedWithDays.length;
    return avgDays;
  }, [closedJobs]);

  const KPIs = [
    { label: "Closed Jobs", value: `${totalClosed}` },
    { label: "Total Candidates", value: `${totalCandidates}`, sub: "across closed jobs" },
    { label: "Avg Time to Close", value: `${avgTimeToClose.toFixed(0)}d`, sub: "from deadline" },
    { label: "Status", value: "Archive", sub: "historical record" },
  ];

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const statuses = useMemo(
    () => Array.from(new Set(closedJobs.map((j) => j.job_status).filter(Boolean))).sort(),
    [closedJobs],
  );

  const filtered = useMemo(
    () => closedJobs.filter((j) => statusFilter === "all" || j.job_status === statusFilter),
    [closedJobs, statusFilter],
  );

  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value" style={{ color: TEXT }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>
            <Briefcase size={16} style={{ marginRight: "0.4rem", verticalAlign: "text-bottom" }} />
            Closed Jobs Archive
          </h3>
          {statuses.length > 0 && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: "0.5rem",
                border: `1px solid ${BORDER}`,
                background: SURFACE,
                color: TEXT,
                padding: "0.375rem 0.5rem",
                fontSize: "0.85rem",
              }}
            >
              <option value="all">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No closed jobs found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={{ ...thStyle, width: "1.6rem" }} />
                  <th style={thStyle}>Job Title</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Experience</th>
                  <th style={thStyle}>Budget</th>
                  <th style={thStyle}>Hiring Manager</th>
                  <th style={thStyle}>Application Start</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Closed Date</th>
                  <th style={thStyle}>Candidates</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  const count = candidatesPerJob[j.id] || 0;
                  const isExpanded = expandedJobId === j.id;
                  const jobCandidates = findCandidatesForJob(j, allCandidates);
                  return (
                    <Fragment key={j.id}>
                      <tr
                        onClick={() => onOpenTalentPool(j)}
                        style={{
                          borderBottom: `1px solid ${BORDER}`,
                          cursor: "pointer",
                          background: "color-mix(in srgb, var(--samurai-muted) 5%, transparent)",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_2)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--samurai-muted) 5%, transparent)")}
                      >
                        <td style={tdStyle} onClick={(e) => { e.stopPropagation(); setExpandedJobId(isExpanded ? null : j.id); }}>
                          <span style={{ display: "inline-flex", alignItems: "center", color: MUTED, cursor: "pointer" }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        </td>
                        <td style={tdBold}>{j.job_title || "—"}</td>
                        <td style={tdStyle}>{j.department || "—"}</td>
                        <td style={tdStyle}>{j.employment_type || "—"}</td>
                        <td style={tdStyle}>{j.experience || "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMyr(j.budget_max)}</td>
                        <td style={tdStyle}>{j.hiring_manager || "—"}</td>
                        <td style={{ ...tdStyle, fontSize: "0.78rem" }}>{fmtDate(j.application_start)}</td>
                        <td style={tdStyle}>
                          <span className="sd-chip muted" style={{ border: `1px solid ${BORDER}`, padding: "0.15rem 0.5rem", fontSize: "0.72rem" }}>
                            {j.job_status || "—"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: "0.78rem", color: MUTED }}>{fmtDate(j.closed_at)}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.1rem 0.5rem",
                              borderRadius: "0.4rem",
                              background: count > 0 ? SURFACE_2 : "transparent",
                              color: count > 0 ? MUTED : MUTED,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Users size={12} />
                            {count}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} style={{ padding: "0.75rem 1rem", borderBottom: `1px solid ${BORDER}`, background: "color-mix(in srgb, var(--samurai-surface) 55%, transparent)" }}>
                            <div style={{ marginBottom: "0.75rem" }}>
                              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700, color: TEXT }}>
                                📄 Job Details — {j.job_title}
                              </h4>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", fontSize: "0.8rem" }}>
                                <div><strong style={{ color: MUTED }}>Department:</strong> <span style={{ color: TEXT }}>{j.department || "—"}</span></div>
                                <div><strong style={{ color: MUTED }}>Type:</strong> <span style={{ color: TEXT }}>{j.employment_type || "—"}</span></div>
                                <div><strong style={{ color: MUTED }}>Experience:</strong> <span style={{ color: TEXT }}>{j.experience || "—"}</span></div>
                                <div><strong style={{ color: MUTED }}>Budget:</strong> <span style={{ color: TEXT }}>{fmtMyr(j.budget_max)}</span></div>
                                <div><strong style={{ color: MUTED }}>Hiring Manager:</strong> <span style={{ color: TEXT }}>{j.hiring_manager || "—"}</span></div>
                                <div><strong style={{ color: MUTED }}>Status:</strong> <span className="sd-chip muted" style={{ display: "inline-block", padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>{j.job_status || "—"}</span></div>
                                <div><strong style={{ color: MUTED }}>Application Start:</strong> <span style={{ color: TEXT }}>{fmtDate(j.application_start)}</span></div>
                                <div><strong style={{ color: MUTED }}>Closed Date:</strong> <span style={{ color: TEXT }}>{fmtDate(j.closed_at)}</span></div>
                              </div>
                              {j.jd_link || j.jd_file_url ? (
                                <div style={{ marginTop: "0.6rem", fontSize: "0.78rem" }}>
                                  <strong style={{ color: MUTED }}>Job Description:</strong>{" "}
                                  {j.jd_link && (
                                    <a href={j.jd_link} target="_blank" rel="noopener noreferrer" style={{ color: LIME, marginRight: "0.75rem" }}>View JD Link ↗</a>
                                  )}
                                  {j.jd_file_url && (
                                    <a href={j.jd_file_url} target="_blank" rel="noopener noreferrer" style={{ color: LIME }}>Download JD Document ↗</a>
                                  )}
                                </div>
                              ) : null}
                              <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: MUTED }}>
                                📊 {jobCandidates.length} candidate{jobCandidates.length === 1 ? "" : "s"} were linked to this job
                                {jobCandidates.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onOpenTalentPool(j); }}
                                    style={{ marginLeft: "0.75rem", borderRadius: "0.4rem", border: `1px solid ${LIME}`, background: "transparent", color: LIME, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.6rem", cursor: "pointer" }}
                                  >
                                    View All Candidates →
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
