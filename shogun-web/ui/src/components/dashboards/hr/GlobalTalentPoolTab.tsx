import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search, X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrDashboardStats, HrJobOpening } from "../../../lib/types";
import { JourneyStepperModal } from "./JourneyStepperModal";

interface Props {
  stats: HrDashboardStats;
  department: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const DANGER = "var(--samurai-danger)";
const WARNING = "var(--samurai-warning)";

const thStyle = { textAlign: "left" as const, padding: "0.5rem", color: MUTED, fontWeight: 600, fontSize: "0.78rem" };
const tdStyle = { padding: "0.5rem", color: TEXT, fontSize: "0.8rem" };

/** Talent Pool statuses */
const POOL_STATUSES = ["Rejected", "No Response", "Job Close"] as const;

function fmtDateEntry(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "long", year: "numeric" });
}

export function GlobalTalentPoolTab({ stats, department }: Props) {
  const queryClient = useQueryClient();
  const allCandidates = stats.candidates || [];
  const jobs = stats.job_openings || [];
  const openJobs = jobs.filter((j) => !(j.job_status || "").startsWith("Closed"));
  const closedJobs = jobs.filter((j) => (j.job_status || "").startsWith("Closed"));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [journeyCandidate, setJourneyCandidate] = useState<HrCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addToJobCandidate, setAddToJobCandidate] = useState<HrCandidate | null>(null);

  // Only candidates linked to a closed job
  const poolCandidates = useMemo(() => {
    const closedJobIds = new Set(closedJobs.map((j) => j.id));
    return allCandidates.filter((c) => c.job_opening_id && closedJobIds.has(c.job_opening_id));
  }, [allCandidates, closedJobs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return poolCandidates.filter((c) => {
      if (statusFilter !== "all" && (c.status || "").trim() !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone_no || "").toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q)
      );
    });
  }, [poolCandidates, search, statusFilter]);

  const handleAddToJob = async (candidate: HrCandidate, jobId: number) => {
    setBusy(true);
    setError("");
    try {
      await hrApi.candidateAttachJob(department, candidate.id, jobId);
      queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
      setAddToJobCandidate(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add candidate to job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sd-stack">
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>
            Talent Pool — candidates from closed jobs
          </h3>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.6rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
            <Search size={13} style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, role…"
              style={{ border: "none", background: "transparent", color: TEXT, fontSize: "0.8rem", outline: "none", width: "14rem" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
          >
            <option value="all">All Status</option>
            {POOL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.5rem" }}>{error}</p>}

        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: MUTED, padding: "2rem 0", fontSize: "0.85rem" }}>
            No candidates in talent pool.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <p style={{ fontSize: "0.72rem", color: MUTED, margin: "0 0 0.4rem" }}>
              Showing {filtered.length} of {poolCandidates.length} candidates
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role Applied</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Date Entry</th>
                  <th style={thStyle}>Resume</th>
                  <th style={thStyle}>Screening Answer</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setJourneyCandidate(c)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = SURFACE_2)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name || "—"}</td>
                    <td style={tdStyle}>{c.role || "—"}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.3rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#0a0a0a",
                        background: (c.status || "").includes("Rejected") ? DANGER
                          : (c.status || "").includes("No Response") ? WARNING
                          : MUTED,
                      }}>
                        {c.status || "—"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem" }}>
                      {c.email || "—"}{c.phone_no ? ` · ${c.phone_no}` : ""}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem" }}>{fmtDateEntry(c.date_entry)}</td>
                    <td style={tdStyle}>
                      {c.resume_url ? (
                        <a href={c.resume_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, fontSize: "0.75rem" }}>
                          <ExternalLink size={12} /> View
                        </a>
                      ) : "—"}
                    </td>
                    <td style={tdStyle}>
                      {c.screening_answers_url ? (
                        <a href={c.screening_answers_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, fontSize: "0.75rem" }}>
                          <ExternalLink size={12} /> View
                        </a>
                      ) : "—"}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAddToJobCandidate(c)}
                        style={{
                          borderRadius: "0.4rem", border: "none", background: LIME, color: "#0a0a0a",
                          fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.6rem",
                          cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        + Add to Opening Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p style={{ fontSize: "0.72rem", color: MUTED, margin: "0.5rem 0 0" }}>
                Showing first 200 — refine your search to see more.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add to Job Modal */}
      {addToJobCandidate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "var(--samurai-surface)", borderRadius: "0.75rem", border: "1px solid var(--samurai-border)", width: "min(450px, 90vw)", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--samurai-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: TEXT }}>Add {addToJobCandidate.name} to Job</h3>
              <button onClick={() => setAddToJobCandidate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: "1.2rem" }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
              {openJobs.length === 0 ? (
                <p style={{ textAlign: "center", color: MUTED, padding: "2rem", fontSize: "0.85rem" }}>No open job openings available.</p>
              ) : (
                openJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleAddToJob(addToJobCandidate, job.id)}
                    style={{
                      padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`,
                      cursor: busy ? "wait" : "pointer", marginBottom: "0.4rem",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_2; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>{job.job_title}</div>
                    <div style={{ fontSize: "0.75rem", color: MUTED }}>
                      {job.department || "—"} · {job.employment_type || "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {journeyCandidate && (
        <JourneyStepperModal
          candidate={journeyCandidate}
          stats={stats}
          department={department}
          onClose={() => setJourneyCandidate(null)}
        />
      )}
    </div>
  );
}
