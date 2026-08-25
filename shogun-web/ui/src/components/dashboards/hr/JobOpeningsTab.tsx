import { useMemo, useState } from "react";
import { X, ExternalLink, Users } from "lucide-react";
import type { HrCandidate, HrDashboardStats, HrJobOpening } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
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
  if (s.includes("ongoing") || s.includes("active")) return "warn";
  if (s.includes("closed") || s.includes("cancelled")) return "muted";
  return "muted";
}

/** Match candidates to a job opening by role name similarity. */
function findCandidatesForJob(job: HrJobOpening, allCandidates: HrCandidate[]): HrCandidate[] {
  const jobTitle = (job.job_title || "").toLowerCase().trim();
  if (!jobTitle) return [];
  // Extract key words from job title (skip generic words)
  const skipWords = new Set(["jr", "sr", "senior", "junior", "lead", "head", "of", "the", "and", "&", "executive", "manager", "engineer", "specialist", "officer"]);
  const jobWords = jobTitle
    .split(/[\s/()-]+/)
    .filter((w) => w.length > 2 && !skipWords.has(w));

  return allCandidates.filter((c) => {
    const candidateRole = (c.role || "").toLowerCase().trim();
    if (!candidateRole) return false;
    // Direct substring match (most reliable)
    if (candidateRole.includes(jobTitle) || jobTitle.includes(candidateRole)) return true;
    // Word overlap: at least one significant word matches
    const candidateWords = candidateRole.split(/[\s/()-]+/).filter((w) => w.length > 2);
    return jobWords.some((jw) => candidateWords.some((cw) => cw.includes(jw) || jw.includes(cw)));
  });
}

export function JobOpeningsTab({ stats }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<HrJobOpening | null>(null);

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
    const map: Record<number, HrCandidate[]> = {};
    for (const job of jobOpenings) {
      map[job.id] = findCandidatesForJob(job, allCandidates);
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  const isOverdue = j.overdue === "Overdue";
                  const jobCandidates = candidatesPerJob[j.id] || [];
                  return (
                    <tr
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
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
                            background: jobCandidates.length > 0 ? SURFACE_2 : "transparent",
                            color: jobCandidates.length > 0 ? LIME : MUTED,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          <Users size={12} />
                          {jobCandidates.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Detail + Candidates Modal */}
      {selectedJob && (
        <JobCandidatesModal
          job={selectedJob}
          candidates={candidatesPerJob[selectedJob.id] || []}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function JobCandidatesModal({ job, candidates, onClose }: { job: HrJobOpening; candidates: HrCandidate[]; onClose: () => void }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const types = useMemo(() => Array.from(new Set(candidates.map((c) => c.candidate_type).filter(Boolean))).sort(), [candidates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (typeFilter !== "all" && c.candidate_type !== typeFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.role || "").toLowerCase().includes(q);
    });
  }, [candidates, typeFilter, search]);

  // Group by status for pipeline view
  const byStatus = useMemo(() => {
    const map: Record<string, HrCandidate[]> = {};
    for (const c of filtered) {
      const s = c.status || "Unknown";
      if (!map[s]) map[s] = [];
      map[s].push(c);
    }
    return map;
  }, [filtered]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE,
          borderRadius: "0.75rem",
          border: `1px solid ${BORDER}`,
          padding: "1.5rem",
          maxWidth: "900px",
          width: "95%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, color: TEXT, fontSize: "1.1rem" }}>{job.job_title}</h3>
            <div style={{ fontSize: "0.8rem", color: MUTED, marginTop: "0.25rem" }}>
              {job.department} · {job.employment_type} · {job.experience} · Budget {fmtMyr(job.budget_max)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: "1.2rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Job formulas */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <FormulaChip label="Status" value={job.job_status} />
          <FormulaChip label="Deadline" value={fmtDate(job.deadline)} danger={job.overdue === "Overdue"} />
          <FormulaChip label="Days Left" value={job.days_left != null ? `${job.days_left}d` : "—"} danger={job.overdue === "Overdue"} />
          <FormulaChip label="Overdue" value={job.overdue || "No"} danger={job.overdue === "Overdue"} />
        </div>

        {/* Candidates section */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h4 style={{ margin: 0, color: TEXT, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={16} /> {candidates.length} Candidates for this role
            </h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "0.35rem 0.6rem",
                  borderRadius: "0.4rem",
                  border: `1px solid ${BORDER}`,
                  background: SURFACE_2,
                  color: TEXT,
                  fontSize: "0.8rem",
                  width: "160px",
                }}
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: "0.35rem 0.6rem",
                  borderRadius: "0.4rem",
                  border: `1px solid ${BORDER}`,
                  background: SURFACE_2,
                  color: TEXT,
                  fontSize: "0.8rem",
                }}
              >
                <option value="all">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: MUTED, padding: "2rem 0", fontSize: "0.85rem" }}>
              No candidates found matching this job title.
              <br />
              <span style={{ fontSize: "0.75rem" }}>(Job title: "{job.job_title}" — candidates are matched by role name similarity)</span>
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Source</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: TEXT }}>{c.name}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "0.3rem", background: SURFACE_2, color: MUTED }}>
                          {c.candidate_type}
                        </span>
                      </td>
                      <td style={tdStyle}>{c.role || "—"}</td>
                      <td style={tdStyle}>
                        <span className={`sd-chip ${candidateStatusChip(c.status)}`}>{c.status}</span>
                      </td>
                      <td style={tdStyle}>{c.source || "—"}</td>
                      <td style={tdStyle}>{c.email || "—"}</td>
                      <td style={tdStyle}>{c.phone_no || "—"}</td>
                      <td style={tdStyle}>
                        {c.resume_url ? (
                          <a href={c.resume_url} target="_blank" rel="noreferrer" style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                            <ExternalLink size={12} /> View
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function candidateStatusChip(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("hired") || s.includes("offer") || s.includes("accepted")) return "ok";
  if (s.includes("rejected") || s.includes("no response") || s.includes("no")) return "bad";
  if (s.includes("screening") || s.includes("pending") || s.includes("review")) return "muted";
  return "warn";
}

function FormulaChip({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{
      padding: "0.4rem 0.75rem",
      borderRadius: "0.4rem",
      background: SURFACE_2,
      border: `1px solid ${BORDER}`,
    }}>
      <div style={{ fontSize: "0.65rem", color: MUTED, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: danger ? DANGER : TEXT }}>{value}</div>
    </div>
  );
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
  color: TEXT,
};

const tdBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
};
