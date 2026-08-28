import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Users, X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrDashboardStats, HrJobOpening } from "../../../lib/types";
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

export function JobOpeningsTab({ stats, color, department, onOpenTalentPool }: Props) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [closingJob, setClosingJob] = useState<HrJobOpening | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);

  const jobOpenings = stats.job_openings || [];
  const allCandidates = stats.candidates || [];

  const statuses = useMemo(
    () => Array.from(new Set(jobOpenings.map((j) => j.job_status).filter(Boolean))).sort(),
    [jobOpenings],
  );

  const filtered = useMemo(() => {
    return jobOpenings.filter((j) => statusFilter === "all" || j.job_status === statusFilter);
  }, [jobOpenings, statusFilter]);

  // Pre-compute candidate counts per job
  const candidatesPerJob = useMemo(() => {
    const map: Record<number, number> = {};
    for (const job of jobOpenings) {
      map[job.id] = findCandidatesForJob(job, allCandidates).length;
    }
    return map;
  }, [jobOpenings, allCandidates]);

  const totalOpenings = jobOpenings.length;
  const overdueCount = jobOpenings.filter((j) => j.overdue === "Overdue").length;
  const avgBudget = useMemo(() => {
    const budgets = jobOpenings.map((j) => j.budget_max).filter((b): b is number => b != null && !isNaN(b));
    return budgets.length === 0 ? 0 : budgets.reduce((s, b) => s + b, 0) / budgets.length;
  }, [jobOpenings]);

  const KPIs = [
    { label: "Total Openings", value: `${totalOpenings}` },
    { label: "Overdue", value: `${overdueCount}`, warn: overdueCount > 0 },
    { label: "Avg Budget", value: fmtMyr(avgBudget) },
    { label: "Total Candidates", value: `${allCandidates.length}`, sub: "across all trackers" },
  ];

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

        {filtered.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No job openings match the current filters.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={thStyle}>Job Title</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Experience</th>
                  <th style={thStyle}>Budget</th>
                  <th style={thStyle}>Hiring Manager</th>
                  <th style={thStyle}>App Start</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Deadline</th>
                  <th style={thStyle}>Days Left</th>
                  <th style={thStyle}>Candidates</th>
                  <th style={thStyle}>Talent Pool</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  const isOverdue = j.overdue === "Overdue";
                  const count = candidatesPerJob[j.id] || 0;
                  return (
                    <tr
                      key={j.id}
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
                      <td style={tdBold}>{j.job_title || "—"}</td>
                      <td style={tdStyle}>{j.department || "—"}</td>
                      <td style={tdStyle}>{j.employment_type || "—"}</td>
                      <td style={tdStyle}>{j.experience || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMyr(j.budget_max)}</td>
                      <td style={tdStyle}>{j.hiring_manager || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: "0.78rem" }}>{fmtDate(j.application_start)}</td>
                      <td style={tdStyle}>
                        <span className={`sd-chip ${statusChipClass(j.job_status)}`}>{j.job_status || "—"}</span>
                      </td>
                      <td style={{ ...tdStyle, color: isOverdue ? DANGER : MUTED, fontSize: "0.78rem" }}>
                        {fmtDate(j.deadline)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: isOverdue ? DANGER : TEXT }}>
                        {j.days_left != null ? `${j.days_left}d` : "—"}
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
                      <td style={tdStyle}>
                        <span style={{ color: LIME, fontSize: "0.75rem", fontWeight: 600 }}>Open →</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
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
    job_status: "Not Initiated",
    job_description: "",
    jd_link: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const statusOptions = useMemo(() => {
    const s = new Set((stats.job_openings || []).map((j) => j.job_status).filter(Boolean));
    ["Not Initiated", "Hired"].forEach((x) => s.add(x));
    return Array.from(s);
  }, [stats.job_openings]);

  const typeOptions = useMemo(() => {
    const s = new Set((stats.job_openings || []).map((j) => j.employment_type).filter(Boolean));
    ["Full Time", "Contract", "Internship"].forEach((x) => s.add(x));
    return Array.from(s);
  }, [stats.job_openings]);

  const deptOptions = useMemo(
    () => Array.from(new Set((stats.job_openings || []).map((j) => j.department).filter(Boolean))),
    [stats.job_openings],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    if (form.job_status.trim()) fd.append("job_status", form.job_status.trim());
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
          onSubmit={submit}
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
            <Field label="Status" span={2}>
              <select value={form.job_status} onChange={set("job_status")} style={inputStyle}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "0.5rem",
                border: `1px solid ${BORDER}`,
                background: SURFACE_2,
                color: TEXT,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.45rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: LIME,
                color: "#0a0a0a",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Plus size={14} /> {busy ? "Creating…" : "Create Job Opening"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ label, span, children }: { label: string; span: 1 | 2; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", gridColumn: span === 2 ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.3rem" }}>
        {label}
      </div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.4rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE_2,
  color: TEXT,
  padding: "0.4rem 0.55rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  color: MUTED,
  fontWeight: 600,
  fontSize: "0.72rem",
  textTransform: "uppercase",
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
          Any remaining candidates who are not yet Hired or Rejected will be
          <strong> soft-rejected</strong> (reason: job closed) and kept in the Talent Pool for future search. Nothing is deleted.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
          {(["Filled", "Cancelled"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: reason === r ? `2px solid ${LIME}` : `1px solid ${BORDER}`,
                background: reason === r ? SURFACE_2 : "transparent",
                color: TEXT,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {r === "Filled" ? "✅ Position Filled" : "✗ Cancelled"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "0.45rem 0.9rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={confirmClose} disabled={busy}
            style={{ padding: "0.45rem 1rem", borderRadius: "0.5rem", border: "none", background: DANGER, color: "#fff", fontSize: "0.8rem", fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Closing…" : "Close Job"}
          </button>
        </div>
      </div>
    </>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  color: TEXT,
};

const tdBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
};