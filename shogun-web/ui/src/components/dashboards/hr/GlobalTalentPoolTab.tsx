import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrDashboardStats } from "../../../lib/types";
import { JourneyStepperModal } from "./JourneyStepperModal";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const DANGER = "var(--samurai-danger)";
const OK = "var(--samurai-ok)";

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
  fontSize: "0.8rem",
};

function statusChipClass(status: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("done")) return "ok";
  if (s.includes("shortlisted")) return "ok";
  if (s.includes("rejected") || s.includes("no response")) return "bad";
  if (s.includes("resume received") || s.includes("screening") || s.includes("pending") || s.includes("review")) return "muted";
  return "warn";
}

export function GlobalTalentPoolTab({ stats, department }: Props) {
  const queryClient = useQueryClient();
  const allCandidates = stats.candidates || [];
  const jobs = stats.job_openings || [];
  const openJobs = jobs.filter((j) => !(j.job_status || "").startsWith("Closed"));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [journeyCandidate, setJourneyCandidate] = useState<HrCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const statuses = useMemo(
    () => Array.from(new Set(allCandidates.map((c) => (c.status || "").trim()).filter(Boolean))).sort(),
    [allCandidates],
  );
  const types = useMemo(
    () => Array.from(new Set(allCandidates.map((c) => c.candidate_type).filter(Boolean))).sort(),
    [allCandidates],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCandidates.filter((c) => {
      if (statusFilter !== "all" && (c.status || "").trim() !== statusFilter) return false;
      if (typeFilter !== "all" && c.candidate_type !== typeFilter) return false;
      if (!q) return true;
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone_no || "").toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q) ||
        (c.source || "").toLowerCase().includes(q)
      );
    });
  }, [allCandidates, search, statusFilter, typeFilter]);

  const hiredCount = allCandidates.filter((c) => (c.status || "").toLowerCase().includes("done")).length;
  const rejectedCount = allCandidates.filter((c) => (c.status || "").toLowerCase().includes("rejected")).length;
  const activeCount = allCandidates.length - hiredCount - rejectedCount;

  const KPIs = [
    { label: "Total Candidates", value: `${allCandidates.length}`, sub: "all saved — nothing deleted" },
    { label: "Active in Pipeline", value: `${activeCount}`, warn: false },
    { label: "Done (Hired)", value: `${hiredCount}` },
    { label: "Rejected / Keep", value: `${rejectedCount}` },
  ];

  const reInvite = async (candidate: HrCandidate) => {
    if (openJobs.length === 0) {
      setError("No open jobs — create a Job Opening first");
      return;
    }
    const options = openJobs.map((j) => j.job_title).join("\n");
    const choice = window.prompt(`Re-invite ${candidate.name} to which open job?\n\n${options}\n\nType the job title exactly:`, openJobs[0].job_title);
    if (!choice) return;
    const job = openJobs.find((j) => j.job_title.trim().toLowerCase() === choice.trim().toLowerCase());
    if (!job) {
      setError(`Job "${choice}" not found among open jobs`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await hrApi.candidateAttachJob(department, candidate.id, job.id);
      queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-invite failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value" style={{ color: TEXT }}>{k.value}</div>
            {"sub" in k && k.sub && <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>
            Talent Pool — every candidate, searchable
          </h3>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.6rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
            <Search size={13} style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, role, source…"
              style={{ border: "none", background: "transparent", color: TEXT, fontSize: "0.8rem", outline: "none", width: "16rem" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
          >
            <option value="all">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
          >
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.5rem" }}>{error}</p>}

        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: MUTED, padding: "2rem 0", fontSize: "0.85rem" }}>
            No candidates match your search.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <p style={{ fontSize: "0.72rem", color: MUTED, margin: "0 0 0.4rem" }}>
              Showing {filtered.length} of {allCandidates.length} candidates
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Role Applied</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Date Entry</th>
                  <th style={thStyle}>Resume</th>
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
                      <span className={`sd-chip ${statusChipClass(c.status)}`}>{c.status || "—"}</span>
                    </td>
                    <td style={tdStyle}>{c.source || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem" }}>
                      {c.email || "—"}{c.phone_no ? ` · ${c.phone_no}` : ""}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.75rem" }}>{c.date_entry || "—"}</td>
                    <td style={tdStyle}>
                      {c.resume_url ? (
                        <a href={c.resume_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: LIME, display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                          <ExternalLink size={12} /> View
                        </a>
                      ) : "—"}
                    </td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      {(c.status || "").toLowerCase().includes("rejected") && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reInvite(c)}
                          title="Attach this candidate to an open job and restart their journey"
                          style={{ borderRadius: "0.4rem", border: "none", background: LIME, color: "#0a0a0a", fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.55rem", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap" }}
                        >
                          ↻ Re-invite to Job
                        </button>
                      )}
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
