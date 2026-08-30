import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Users, X } from "lucide-react";
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

function statusChipClass(status: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("hired")) return "ok";
  if (s.includes("ongoing") || s.includes("active") || s.includes("test")) return "warn";
  if (s.includes("closed") || s.includes("cancelled")) return "muted";
  return "muted";
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  color: MUTED,
  fontWeight: 600,
  fontSize: "0.72rem",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

const tdBold: React.CSSProperties = { ...tdStyle, fontWeight: 600, color: TEXT };

export function JobOpeningsTab({ stats, color, department, onOpenTalentPool }: Props) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [closingJob, setClosingJob] = useState<HrJobOpening | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const allEvents = stats.candidate_events || [];

  const jobOpenings = stats.job_openings || [];
  const allCandidates = stats.candidates || [];

  // Split into Draft and Active sections
  const draftJobs = useMemo(() => {
    return jobOpenings.filter((j) => j.job_status === "Draft");
  }, [jobOpenings]);

  const activeJobs = useMemo(() => {
    return jobOpenings.filter((j) => j.job_status === "Active");
  }, [jobOpenings]);

  const statuses = useMemo(
    () => Array.from(new Set(jobOpenings.map((j) => j.job_status).filter(Boolean))).sort(),
    [jobOpenings],
  );

  const filtered = useMemo(() => {
    // Show both Draft and Active jobs (exclude Closed only)
    return jobOpenings
      .filter((j) => !(j.job_status || "").startsWith("Closed"))
      .filter((j) => statusFilter === "all" || j.job_status === statusFilter);
  }, [jobOpenings, statusFilter]);

  // Pre-compute candidate counts per job
  const candidatesPerJob = useMemo(() => {
    const map: Record<number, number> = {};
    for (const job of jobOpenings) {
      map[job.id] = findCandidatesForJob(job, allCandidates).length;
    }
    return map;
  }, [jobOpenings, allCandidates]);

  const draftCount = draftJobs.length;
  const activeCount = activeJobs.length;
  const overdueCount = jobOpenings.filter((j) => j.overdue === "Overdue").length;
  const avgBudget = useMemo(() => {
    const budgets = jobOpenings.map((j) => j.budget_max).filter((b): b is number => b != null && !isNaN(b));
    return budgets.length === 0 ? 0 : budgets.reduce((s, b) => s + b, 0) / budgets.length;
  }, [jobOpenings]);

  const KPIs = [
    { label: "Draft", value: `${draftCount}`, sub: "not yet active" },
    { label: "Active", value: `${activeCount}`, sub: "accepting applications" },
    { label: "Overdue", value: `${overdueCount}`, warn: overdueCount > 0 },
    { label: "Avg Budget", value: fmtMyr(avgBudget) },
  ];

  function renderJobRow(j: HrJobOpening) {
    const isOverdue = j.overdue === "Overdue";
    const count = candidatesPerJob[j.id] || 0;
    const jobCandidates = findCandidatesForJob(j, allCandidates);
    const isExpanded = expandedJobId === j.id;

    return (
      <Fragment key={j.id}>
        <tr
          onClick={() => onOpenTalentPool(j)}
          style={{
            borderBottom: `1px solid ${BORDER}`,
            cursor: "pointer",
            background: isOverdue ? "color-mix(in srgb, var(--samurai-danger) 8%, transparent)" : undefined,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { if (!isOverdue) e.currentTarget.style.background = SURFACE_2; }}
          onMouseLeave={(e) => { if (!isOverdue) e.currentTarget.style.background = "transparent"; }}
        >
          <td style={tdStyle} onClick={(e) => { e.stopPropagation(); setExpandedJobId(expandedJobId === j.id ? null : j.id); }}>
            <span style={{ display: "inline-flex", alignItems: "center", color: LIME, cursor: "pointer" }}>
              {expandedJobId === j.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </td>
          <td
            style={{ ...tdBold, color: LIME, cursor: "pointer", textDecoration: "underline" }}
            onClick={(e) => { e.stopPropagation(); onOpenTalentPool(j); }}
            title="Click to view full job details and candidates"
          >
            {j.job_title || "—"}
          </td>
          <td style={tdStyle}>{j.department || "—"}</td>
          <td style={tdStyle}>{j.employment_type || "—"}</td>
          <td style={tdStyle}>{j.experience || "—"}</td>
          <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMyr(j.budget_max)}</td>
          <td style={tdStyle}>{j.hiring_manager || "—"}</td>
          <td style={{ ...tdStyle, fontSize: "0.78rem" }}>{fmtDate(j.application_start)}</td>
          <td style={tdStyle}>
            <span className={`sd-chip ${statusChipClass(j.job_status)}`}>{j.job_status || "—"}</span>
          </td>
          <td style={tdStyle}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.1rem 0.5rem",
                borderRadius: "0.4rem",
                background: count > 0 ? SURFACE_2 : "transparent",
                color: count > 0 ? LIME : MUTED,
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              <Users size={12} />
              {count}
            </span>
          </td>
          <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
            {!(j.job_status || "").startsWith("Closed") ? (
              <button
                type="button"
                onClick={() => setClosingJob(j)}
                style={{
                  borderRadius: "0.4rem", border: `1px solid ${BORDER}`,
                  background: "transparent", color: DANGER,
                  fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.6rem",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Close Job
              </button>
            ) : (
              <span style={{ color: MUTED, fontSize: "0.72rem" }}>{fmtDate(j.closed_at)}</span>
            )}
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={11} style={{ padding: "0.75rem 1rem", borderBottom: `1px solid ${BORDER}`, background: "color-mix(in srgb, var(--samurai-surface) 55%, transparent)" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700, color: TEXT }}>
                  📄 Job Details — {j.job_title}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem 1rem", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Department:</strong>
                    <span style={{ color: TEXT }}>{j.department || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Type:</strong>
                    <span style={{ color: TEXT }}>{j.employment_type || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Experience:</strong>
                    <span style={{ color: TEXT }}>{j.experience || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Budget:</strong>
                    <span style={{ color: TEXT, fontWeight: 600 }}>{fmtMyr(j.budget_max)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Hiring Manager:</strong>
                    <span style={{ color: TEXT }}>{j.hiring_manager || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Status:</strong>
                    <span className={`sd-chip ${statusChipClass(j.job_status)}`} style={{ display: "inline-block", padding: "0.1rem 0.4rem", fontSize: "0.7rem", marginTop: "2px" }}>{j.job_status || "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>App Start:</strong>
                    <span style={{ color: TEXT }}>{fmtDate(j.application_start)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Deadline:</strong>
                    <span style={{ color: isOverdue ? DANGER : TEXT }}>{fmtDate(j.deadline)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <strong style={{ color: MUTED, minWidth: "90px" }}>Days Left:</strong>
                    <span style={{ color: isOverdue ? DANGER : TEXT, fontWeight: 600 }}>{j.days_left != null ? `${j.days_left} days` : "—"}</span>
                  </div>
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
                  📊 {jobCandidates.length} candidate{jobCandidates.length === 1 ? "" : "s"} linked to this job
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
  }

  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value" style={{ color: k.warn ? DANGER : TEXT }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>
            Job Openings
          </h3>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.8rem",
              borderRadius: "0.5rem",
              border: "none",
              background: LIME,
              color: "#0a0a0a",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add Job Opening
          </button>
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
        </div>

        {/* Draft Jobs Section */}
        {draftJobs.length > 0 && (
          <div className="sd-section" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: TEXT }}>
              📝 Draft Positions — {draftJobs.length} job{draftJobs.length === 1 ? "" : "s"}
            </h3>
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
                    <th style={thStyle}>App Start</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Candidates</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftJobs.map(renderJobRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Jobs Section */}
        {activeJobs.length > 0 && (
          <div className="sd-section">
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: TEXT }}>
              ✅ Active Recruitment — {activeJobs.length} job{activeJobs.length === 1 ? "" : "s"}
            </h3>
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
                    <th style={thStyle}>App Start</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Candidates</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeJobs.map(renderJobRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length === 0 && draftJobs.length === 0 && activeJobs.length === 0 && (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No job openings match the current filters.
          </p>
        )}
      </div>

      {showCreate && (
        <CreateJobOpeningModal
          stats={stats}
          department={department}
          onClose={() => setShowCreate(false)}
          onCreated={(job) => {
            setShowCreate(false);
            onOpenTalentPool(job);
          }}
        />
      )}

      {closingJob && (
        <CloseJobModal
          job={closingJob}
          department={department}
          busy={closeBusy}
          onBusy={setCloseBusy}
          onClose={() => setClosingJob(null)}
          onClosed={(rejectedCount) => {
            setClosingJob(null);
            queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
            if (rejectedCount > 0) {
              window.alert(`Job closed. ${rejectedCount} remaining candidate(s) were soft-rejected and kept in the Talent Pool.`);
            }
          }}
        />
      )}
    </div>
  );
}

/** Modal form to create a new job opening (details + JD upload/link). */
function CreateJobOpeningModal({
  stats,
  department,
  onClose,
  onCreated,
}: {
  stats: HrDashboardStats;
  department: string;
  onClose: () => void;
  onCreated: (job: HrJobOpening) => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    job_title: "",
    department: "",
    employment_type: "Full Time",
    experience: "",
    budget_max: "",
    hiring_manager: "",
    application_start: "",
    job_description: "",
    jd_link: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const typeOptions = useMemo(() => {
    const s = new Set((stats.job_openings || []).map((j) => j.employment_type).filter(Boolean));
    ["Full Time", "Contract", "Internship"].forEach((x) => s.add(x));
    return Array.from(s);
  }, [stats.job_openings]);

  const deptOptions = useMemo(
    () => Array.from(new Set((stats.job_openings || []).map((j) => j.department).filter(Boolean))),
    [stats.job_openings],
  );

  async function doSubmit(isDraft: boolean) {
    if (!form.job_title.trim()) {
      setError("Job title is required.");
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("job_title", form.job_title.trim());
    if (form.department.trim()) fd.append("department", form.department.trim());
    if (form.employment_type.trim()) fd.append("employment_type", form.employment_type);
    if (form.experience.trim()) fd.append("experience", form.experience.trim());
    if (form.budget_max.trim()) fd.append("budget_max", form.budget_max.trim());
    if (form.hiring_manager.trim()) fd.append("hiring_manager", form.hiring_manager.trim());
    if (form.application_start) fd.append("application_start", form.application_start);
    fd.append("job_status", isDraft ? "Draft" : "Active");
    if (form.job_description.trim()) fd.append("job_description", form.job_description);
    if (form.jd_link.trim()) fd.append("jd_link", form.jd_link.trim());
    if (jdFile) fd.append("file", jdFile);
    try {
      const res = await hrApi.createJobOpening(department, fd);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats"] });
      onCreated(res.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job opening.");
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSubmit(false);
  }

  return (
    <>
      <button
        type="button"
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)", border: "none", cursor: "default" }}
        onClick={onClose}
        aria-label="Close"
      />
      <div
        style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={onClose}
      >
        <form
          className="sd-chart-card"
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "40rem", maxHeight: "88vh", overflowY: "auto", padding: "1.25rem" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                Add Job Opening
              </h2>
              <p style={{ fontSize: "0.72rem", color: MUTED, margin: 0 }}>
                Deadline is computed automatically as App Start + 90 days.
              </p>
            </div>
            <button type="button" className="sd-icon-btn" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            <Field label="Job Title *" span={2}>
              <input value={form.job_title} onChange={set("job_title")} placeholder="e.g. Senior DevOps Engineer" style={inputStyle} />
            </Field>
            <Field label="Department" span={1}>
              <input value={form.department} onChange={set("department")} list="jo-depts" placeholder="e.g. Project" style={inputStyle} />
              <datalist id="jo-depts">
                {deptOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field label="Employment Type" span={1}>
              <select value={form.employment_type} onChange={set("employment_type")} style={inputStyle}>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Experience" span={1}>
              <input value={form.experience} onChange={set("experience")} placeholder="e.g. 3+ years" style={inputStyle} />
            </Field>
            <Field label="Budget Max (RM)" span={1}>
              <input value={form.budget_max} onChange={set("budget_max")} placeholder="e.g. 9000" inputMode="decimal" style={inputStyle} />
            </Field>
            <Field label="Hiring Manager" span={1}>
              <input value={form.hiring_manager} onChange={set("hiring_manager")} placeholder="Name" style={inputStyle} />
            </Field>
            <Field label="Application Start" span={1}>
              <input type="date" value={form.application_start} onChange={set("application_start")} style={inputStyle} />
            </Field>
            <Field label="Job Description" span={2}>
              <textarea value={form.job_description} onChange={set("job_description")} rows={4} placeholder="Responsibilities, requirements…" style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="Job Description Link (optional)" span={2}>
              <input value={form.jd_link} onChange={set("jd_link")} placeholder="https://…" style={inputStyle} />
            </Field>
            <Field label="Upload Job Description (optional, max 10 MB)" span={2}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                onChange={(e) => setJdFile(e.target.files?.[0] ?? null)}
                style={{ ...inputStyle, padding: "0.4rem", fontSize: "0.78rem" }}
              />
            </Field>
          </div>

          {error && (
            <p style={{ color: DANGER, fontSize: "0.8rem", margin: "0.6rem 0 0" }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                borderRadius: "0.5rem",
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: TEXT,
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "0.4rem 0.8rem",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => doSubmit(true)}
              disabled={busy}
              style={{
                borderRadius: "0.5rem",
                border: `1px solid ${BORDER}`,
                background: SURFACE,
                color: TEXT,
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "0.4rem 0.8rem",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => doSubmit(false)}
              disabled={busy}
              style={{
                borderRadius: "0.5rem",
                border: "none",
                background: LIME,
                color: "#0a0a0a",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "0.4rem 0.8rem",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Creating..." : "Create Job Opening"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ label, span, children }: { label: string; span?: 1 | 2; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: span === 2 ? "span 2" : "span 1" }}>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: TEXT,
  padding: "0.45rem 0.5rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

/** Confirm + close a job opening. Remaining candidates are soft-rejected (kept in Talent Pool). */
function CloseJobModal({
  job, department, busy, onBusy, onClose, onClosed,
}: {
  job: HrJobOpening;
  department: string;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onClose: () => void;
  onClosed: (rejectedCount: number) => void;
}) {
  const [reason, setReason] = useState<"Filled" | "Cancelled">("Filled");

  const confirmClose = async () => {
    onBusy(true);
    try {
      const res = await hrApi.jobClose(department, job.id, {
        reason,
        remaining_action: "reject",
      });
      onClosed(res.rejected_candidates);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to close job");
      onBusy(false);
    }
  };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }} />
      <div
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(460px, 94vw)", background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", padding: "1.25rem", zIndex: 51 }}
      >
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", color: TEXT }}>
          Close Job — {job.job_title}
        </h3>
        <p style={{ fontSize: "0.82rem", color: MUTED, margin: "0 0 0.75rem" }}>
          This will mark the job as closed. Remaining candidates will be soft-rejected (kept in Talent Pool).
        </p>
        <fieldset style={{ border: `1px solid ${BORDER}`, borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "1rem" }}>
          <legend style={{ fontSize: "0.72rem", color: MUTED, padding: "0 0.25rem" }}>Reason</legend>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT, marginBottom: "0.4rem" }}>
            <input type="radio" name="close-reason" checked={reason === "Filled"} onChange={() => setReason("Filled")} />
            Position Filled
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT }}>
            <input type="radio" name="close-reason" checked={reason === "Cancelled"} onChange={() => setReason("Cancelled")} />
            Position Cancelled
          </label>
        </fieldset>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: TEXT,
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "0.4rem 0.8rem",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmClose}
            disabled={busy}
            style={{
              borderRadius: "0.5rem",
              border: "none",
              background: DANGER,
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "0.4rem 0.8rem",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Closing..." : "Close Job"}
          </button>
        </div>
      </div>
    </>
  );
}
