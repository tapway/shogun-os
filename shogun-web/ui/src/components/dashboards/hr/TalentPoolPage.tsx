import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Search, Users } from "lucide-react";
import type { HrCandidate, HrDashboardStats, HrJobOpening } from "../../../lib/types";
import { findCandidatesForJob } from "./hrCandidateMatch";

interface Props {
  jobId: number;
  fallbackJob: HrJobOpening;
  stats: HrDashboardStats;
  color: string;
  onBack: () => void;
  onOpenCandidate: (candidate: HrCandidate) => void;
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
  return "muted";
}

function candidateStatusChip(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("hired") || s.includes("offer") || s.includes("accepted")) return "ok";
  if (s.includes("rejected") || s.includes("no response") || s.includes("no")) return "bad";
  if (s.includes("screening") || s.includes("pending") || s.includes("review")) return "muted";
  return "warn";
}

export function TalentPoolPage({ jobId, fallbackJob, stats, color, onBack, onOpenCandidate }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const job = (stats.job_openings || []).find((j) => j.id === jobId) ?? fallbackJob;
  const allCandidates = stats.candidates || [];

  const candidates = useMemo(() => findCandidatesForJob(job, allCandidates), [job, allCandidates]);

  const trackerTypes = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.candidate_type).filter(Boolean))).sort(),
    [candidates],
  );

  const statuses = useMemo(
    () => Array.from(new Set(candidates.map((c) => (c.status || "").trim()).filter(Boolean))).sort(),
    [candidates],
  );

  const sources = useMemo(
    () => Array.from(new Set(candidates.map((c) => (c.source || "").trim()).filter(Boolean))).sort(),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (statusFilter !== "all" && (c.status || "").trim() !== statusFilter) return false;
      if (sourceFilter !== "all" && (c.source || "").trim() !== sourceFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, statusFilter, sourceFilter, search]);

  const hiredCount = candidates.filter((c) => candidateStatusChip(c.status) === "ok").length;

  return (
    <div className="sd-stack">
      {/* Header */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: LIME,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem 0",
            }}
          >
            <ArrowLeft size={14} /> Job Openings
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: TEXT, margin: 0 }}>
            {job.job_title || "Untitled Role"} <span style={{ color: MUTED, fontWeight: 500 }}>Talent Pool</span>
          </h2>
          <span className={`sd-chip ${statusChipClass(job.job_status)}`}>{job.job_status || "—"}</span>
          {job.overdue === "Overdue" && <span className="sd-chip bad">Overdue</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.25rem", marginTop: "0.75rem", fontSize: "0.82rem", color: MUTED }}>
          <span><strong style={{ color: TEXT, fontWeight: 600 }}>{job.department || "—"}</strong> department</span>
          <span>Type <strong style={{ color: TEXT, fontWeight: 600 }}>{job.employment_type || "—"}</strong></span>
          <span>Experience <strong style={{ color: TEXT, fontWeight: 600 }}>{job.experience || "—"}</strong></span>
          <span>Budget <strong style={{ color: TEXT, fontWeight: 600 }}>{fmtMyr(job.budget_max)}</strong></span>
          <span>Hiring Manager <strong style={{ color: TEXT, fontWeight: 600 }}>{job.hiring_manager || "—"}</strong></span>
          <span>App Start <strong style={{ color: TEXT, fontWeight: 600 }}>{fmtDate(job.application_start)}</strong></span>
          <span>Deadline <strong style={{ color: job.overdue === "Overdue" ? DANGER : TEXT, fontWeight: 600 }}>{fmtDate(job.deadline)}</strong></span>
          {job.days_left != null && (
            <span>Days Left <strong style={{ color: job.overdue === "Overdue" ? DANGER : TEXT, fontWeight: 600 }}>{job.days_left}d</strong></span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Candidates</div>
          <div className="sd-kpi-value" style={{ color: TEXT }}>{candidates.length}</div>
          <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}>matched to this role</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Hired / Offer</div>
          <div className="sd-kpi-value" style={{ color: hiredCount > 0 ? LIME : TEXT }}>{hiredCount}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Trackers</div>
          <div className="sd-kpi-value" style={{ color: TEXT }}>{trackerTypes.length}</div>
          <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}>{trackerTypes.join(", ") || "—"}</div>
        </div>
      </div>

      {/* Job description */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <FileText size={15} /> Job Description
        </h3>
        <p style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", color: job.job_description ? TEXT : MUTED, margin: "0.5rem 0" }}>
          {job.job_description || "No description provided."}
        </p>
        {(job.jd_file_url || job.jd_link) && (
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            {job.jd_file_url && (
              <a href={job.jd_file_url} target="_blank" rel="noreferrer" title="View job description file" style={jdBtnStyle}>
                <FileText size={14} /> Job Description{job.jd_link ? " (File)" : ""}
              </a>
            )}
            {job.jd_link && (
              <a href={job.jd_link} target="_blank" rel="noreferrer" title="View job description" style={jdBtnStyle}>
                <FileText size={14} /> Job Description{job.jd_file_url ? " (Link)" : ""}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Candidates */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Users size={15} /> Candidate Pool ({candidates.length})
          </h3>
          <input
            type="text"
            placeholder="Search name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.35rem 0.6rem",
              borderRadius: "0.4rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE_2,
              color: TEXT,
              fontSize: "0.8rem",
              width: "200px",
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.6rem",
              borderRadius: "0.4rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE_2,
              color: TEXT,
              fontSize: "0.8rem",
            }}
          >
            <option value="all">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.6rem",
              borderRadius: "0.4rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE_2,
              color: TEXT,
              fontSize: "0.8rem",
            }}
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: MUTED, padding: "2rem 0", fontSize: "0.85rem" }}>
            No candidates found matching this role.
            <br />
            <span style={{ fontSize: "0.75rem" }}>
              (Candidates are matched by role name similarity — ask the hiring board to add candidates with this role.)
            </span>
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Tracker</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Date Entry</th>
                  <th style={thStyle}>Resume</th>
                  <th style={thStyle}>Screening</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCandidate(c)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = SURFACE_2)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: TEXT }}>{c.name || "—"}</td>
                    <td style={{ ...tdStyle, color: TEXT }}>{c.candidate_type || "—"}</td>
                    <td style={{ ...tdStyle, color: TEXT }}>{c.role || "—"}</td>
<td style={{ ...tdStyle, color: TEXT }}>{c.status || "—"}</td>
                    <td style={tdStyle}>{c.source || "—"}</td>
                    <td style={tdStyle}>{c.email || "—"}</td>
                    <td style={tdStyle}>{c.phone_no || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem" }}>{c.date_entry || "—"}</td>
                    <td style={tdStyle}>
                      {c.resume_url ? (
                        <a href={c.resume_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                          <ExternalLink size={12} /> View
                        </a>
                      ) : "—"}
                    </td>
                    <td style={tdStyle}>
                      {c.screening_answers_url ? (
                        <a href={c.screening_answers_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
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

const jdBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.4rem 0.85rem",
  borderRadius: "0.5rem",
  border: `1px solid ${LIME}`,
  color: LIME,
  background: "transparent",
  fontSize: "0.8rem",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};