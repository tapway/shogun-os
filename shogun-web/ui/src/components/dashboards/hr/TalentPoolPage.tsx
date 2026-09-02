import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Pencil,
  Search,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { hrApi } from "../../../lib/api";
import type {
  HrCandidate,
  HrDashboardStats,
  HrJobOpening,
} from "../../../lib/types";
import { CandidateReviewsPanel, reviewEvents } from "./CandidateReviewsPanel";
import { findCandidatesForJob } from "./hrCandidateMatch";
import { JourneyStepperModal } from "./JourneyStepperModal";

interface Props {
  jobId: number;
  fallbackJob: HrJobOpening;
  stats: HrDashboardStats;
  color: string;
  department: string;
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
const WARNING = "var(--samurai-warning)";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMyr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusChipClass(
  status: string | null | undefined,
): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("hired")) return "ok";
  if (s.includes("ongoing") || s.includes("active") || s.includes("test"))
    return "warn";
  return "muted";
}

function candidateStatusChip(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("done") || s.includes("hired")) return "ok";
  if (s.includes("shortlisted")) return "ok";
  if (s.includes("rejected") || s.includes("no response")) return "bad";
  if (s.includes("resume received")) return "muted";
  if (s.includes("screening") || s.includes("pending") || s.includes("review"))
    return "muted";
  return "warn";
}

export function TalentPoolPage({
  jobId,
  fallbackJob,
  stats,
  color,
  department,
  onBack,
  onOpenCandidate,
}: Props) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [showScreeningSetup, setShowScreeningSetup] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [journeyCandidate, setJourneyCandidate] = useState<HrCandidate | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const allEvents = stats.candidate_events || [];
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const job =
    (stats.job_openings || []).find((j) => j.id === jobId) ?? fallbackJob;
  const allCandidates = stats.candidates || [];

  const candidates = useMemo(
    () => findCandidatesForJob(job, allCandidates),
    [job, allCandidates],
  );

  const trackerTypes = useMemo(
    () =>
      Array.from(
        new Set(candidates.map((c) => c.candidate_type).filter(Boolean)),
      ).sort(),
    [candidates],
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(candidates.map((c) => (c.status || "").trim()).filter(Boolean)),
      ).sort(),
    [candidates],
  );

  const sources = useMemo(
    () =>
      Array.from(
        new Set(candidates.map((c) => (c.source || "").trim()).filter(Boolean)),
      ).sort(),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (statusFilter !== "all" && (c.status || "").trim() !== statusFilter)
        return false;
      if (sourceFilter !== "all" && (c.source || "").trim() !== sourceFilter)
        return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, statusFilter, sourceFilter, search]);

  const hiredCount = candidates.filter(
    (c) => candidateStatusChip(c.status) === "ok",
  ).length;

  const toggleSelect = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const allSelected =
    filtered.length > 0 && filtered.every((c) => selected.includes(c.id));
  const toggleSelectAll = () =>
    setSelected(allSelected ? [] : filtered.map((c) => c.id));

  const runBulk = async (ids: number[], action: "shortlist" | "reject") => {
    if (ids.length === 0) return;
    let reason: string | undefined;
    if (action === "reject") {
      reason =
        window.prompt(
          "Rejection reason (kept in talent pool):",
          "Not suitable",
        ) ?? "";
    }
    setBusy(true);
    setActionError("");
    try {
      await hrApi.candidateBulkAction(department, job.id, {
        candidate_ids: ids,
        action,
        reason,
      });
      setSelected((s) => s.filter((x) => !ids.includes(x)));
      queryClient.invalidateQueries({
        queryKey: ["dashboard-hr-stats", department],
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };
  const bulkAction = (action: "shortlist" | "reject") =>
    runBulk(selected, action);
  const shortlistOne = (id: number) => runBulk([id], "shortlist");

  const composeScreeningEmail = (c: HrCandidate) => {
    const subj = (
      job.screening_email_subject || "Screening Questions — {job_title}"
    )
      .replaceAll("{candidate_name}", c.name || "")
      .replaceAll("{job_title}", job.job_title || "");
    const formLink =
      job.screening_form_link ||
      "(screening form link not set — add it in Screening Setup)";
    const defaultBody =
      `Dear ${c.name || "Candidate"},\n\n` +
      `Thank you for applying for the ${job.job_title || "position"} role. As the next step, please fill in our screening questions here:\n\n` +
      `${formLink}\n\n` +
      `Kindly complete it within 3 working days.\n\nBest regards,\nHR Team`;
    const body = (job.screening_email_body || defaultBody)
      .replaceAll("{candidate_name}", c.name || "")
      .replaceAll("{job_title}", job.job_title || "")
      .replaceAll("{screening_link}", formLink)
      .replaceAll("{hiring_manager}", job.hiring_manager || "");
    window.location.href = `mailto:${c.email || ""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="sd-stack">
      {/* Header */}
      <div className="sd-chart-card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: TEXT,
              margin: 0,
            }}
          >
            {job.job_title || "Untitled Role"}{" "}
            <span style={{ color: MUTED, fontWeight: 500 }}>Talent Pool</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowAddApplicant(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "0.5rem",
              border: "none",
              background: LIME,
              color: "#0a0a0a",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <UserPlus size={14} /> Add Applicant
          </button>
          <button
            type="button"
            onClick={() => setShowScreeningSetup(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: TEXT,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileText size={14} /> Screening Setup
          </button>
          <button
            type="button"
            onClick={() => setShowEditJob(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: TEXT,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Pencil size={14} /> Edit Job
          </button>
          <span className={`sd-chip ${statusChipClass(job.job_status)}`}>
            {job.job_status || "—"}
          </span>
          {job.overdue === "Overdue" && (
            <span className="sd-chip bad">Overdue</span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem 1.25rem",
            marginTop: "0.75rem",
            fontSize: "0.82rem",
            color: MUTED,
          }}
        >
          <span>
            Department{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {job.department || "—"}
            </strong>
          </span>
          <span>
            Type{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {job.employment_type || "—"}
            </strong>
          </span>
          <span>
            Experience{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {job.experience || "—"}
            </strong>
          </span>
          <span>
            Budget{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {fmtMyr(job.budget_max)}
            </strong>
          </span>
          <span>
            Hiring Manager{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {job.hiring_manager || "—"}
            </strong>
          </span>
          <span>
            App Start{" "}
            <strong style={{ color: TEXT, fontWeight: 600 }}>
              {fmtDate(job.application_start)}
            </strong>
          </span>

        </div>
      </div>

      {/* KPIs */}
      <div
        className="sd-kpi-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Candidates</div>
          <div className="sd-kpi-value" style={{ color: TEXT }}>
            {candidates.length}
          </div>
          <div
            style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}
          >
            matched to this role
          </div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Hired / Offer</div>
          <div
            className="sd-kpi-value"
            style={{ color: hiredCount > 0 ? LIME : TEXT }}
          >
            {hiredCount}
          </div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Trackers</div>
          <div className="sd-kpi-value" style={{ color: TEXT }}>
            {trackerTypes.length}
          </div>
          <div
            style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.25rem" }}
          >
            {trackerTypes.join(", ") || "—"}
          </div>
        </div>
      </div>

      {/* Job description */}
      <div className="sd-chart-card">
        <h3
          className="sd-chart-title"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <FileText size={15} /> Job Description
        </h3>
        {(() => {
          const raw = job.job_description || "";
          // Extract @url:`...` links AND bare http(s) URLs from description body
          const extractedUrls: string[] = [];
          // 1. @url:`...` pattern (Notion-style)
          const notionUrlRegex = /@url:`([^`]+)`/g;
          let m: RegExpExecArray | null;
          while ((m = notionUrlRegex.exec(raw)) !== null) {
            extractedUrls.push(m[1]);
          }
          // 2. Bare URLs (https://... or http://...)
          const bareUrlRegex = /https?:\/\/[^\s<>"')\]]+/g;
          while ((m = bareUrlRegex.exec(raw)) !== null) {
            // Avoid duplicates with @url: extracted ones
            if (!extractedUrls.includes(m[0])) {
              extractedUrls.push(m[0]);
            }
          }
          // Strip both patterns from displayed text
          const cleanDesc = raw
            .replace(/@url:`[^`]+`\s*/g, "")
            .replace(/https?:\/\/[^\s<>"')\]]+\s*/g, "")
            .trim();
          return (
            <>
              {cleanDesc && (
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.85rem",
                    color: TEXT,
                    margin: "0.5rem 0",
                  }}
                >
                  {cleanDesc}
                </p>
              )}
              {!cleanDesc && !job.jd_file_url && !job.jd_link && extractedUrls.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: MUTED, margin: "0.5rem 0" }}>
                  No description provided.
                </p>
              )}
              {(extractedUrls.length > 0 || job.jd_file_url || job.jd_link) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.5rem" }}>
                  {job.jd_file_url && (
                    <a
                      href={job.jd_file_url}
                      target="_blank"
                      rel="noreferrer"
                      title="View job description file"
                      style={jdBtnStyle}
                    >
                      <FileText size={14} /> JD Document
                    </a>
                  )}
                  {job.jd_link && (
                    <a
                      href={job.jd_link}
                      target="_blank"
                      rel="noreferrer"
                      title="View job description link"
                      style={jdBtnStyle}
                    >
                      <ExternalLink size={14} /> JD Link
                    </a>
                  )}
                  {extractedUrls.map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      title="Open linked document"
                      style={jdBtnStyle}
                    >
                      <ExternalLink size={14} /> View Document{i > 0 ? ` ${i + 1}` : ""}
                    </a>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Candidates */}
      <div className="sd-chart-card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <h3
            className="sd-chart-title"
            style={{
              margin: 0,
              marginRight: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
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
              <option key={s} value={s}>
                {s}
              </option>
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {selected.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.6rem",
              padding: "0.5rem 0.75rem",
              border: `1px solid ${BORDER}`,
              borderRadius: "0.5rem",
              background: SURFACE_2,
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: TEXT }}>
              {selected.length} selected
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkAction("shortlist")}
              style={{
                borderRadius: "0.4rem",
                border: "none",
                background: LIME,
                color: "#0a0a0a",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.3rem 0.7rem",
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              ✓ Shortlist Selected
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkAction("reject")}
              style={{
                borderRadius: "0.4rem",
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: DANGER,
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.3rem 0.7rem",
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              ✗ Reject Selected
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              style={{
                marginLeft: "auto",
                borderRadius: "0.4rem",
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: MUTED,
                fontSize: "0.75rem",
                padding: "0.3rem 0.7rem",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        )}
        {actionError && (
          <p
            style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.5rem" }}
          >
            {actionError}
          </p>
        )}

        {filtered.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: MUTED,
              padding: "2rem 0",
              fontSize: "0.85rem",
            }}
          >
            No candidates found matching this role.
            <br />
            <span style={{ fontSize: "0.75rem" }}>
              (Candidates are matched by role name similarity — ask the hiring
              board to add candidates with this role.)
            </span>
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.82rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={{ ...thStyle, width: "1.6rem" }} />
                  <th style={{ ...thStyle, width: "2rem" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: "var(--samurai-lime)" }}
                    />
                  </th>
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
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => onOpenCandidate(c)}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(ev) =>
                        (ev.currentTarget.style.background = SURFACE_2)
                      }
                      onMouseLeave={(ev) =>
                        (ev.currentTarget.style.background = "")
                      }
                    >
                      <td
                        style={tdStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(expandedId === c.id ? null : c.id);
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            color: LIME,
                            cursor: "pointer",
                          }}
                        >
                          {expandedId === c.id ? (
                            <ChevronDown size={13} />
                          ) : (
                            <ChevronRight size={13} />
                          )}
                        </span>
                      </td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          style={{ accentColor: "var(--samurai-lime)" }}
                        />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: TEXT }}>
                        {c.name || "—"}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT }}>
                        {c.candidate_type || "—"}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT }}>
                        {c.role || "—"}
                      </td>
                      <td style={{ ...tdStyle, color: TEXT }}>
                        {c.status || "—"}
                      </td>
                      <td style={tdStyle}>{c.source || "—"}</td>
                      <td style={tdStyle}>{c.email || "—"}</td>
                      <td style={tdStyle}>{c.phone_no || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: "0.75rem" }}>
                        {c.date_entry || "—"}
                      </td>
                      <td style={tdStyle}>
                        {c.resume_url ? (
                          <a
                            href={c.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: LIME,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={tdStyle}>
                        {c.screening_answers_url ? (
                          <a
                            href={c.screening_answers_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: LIME,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.3rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(c.status || "") === "Resume Received" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => shortlistOne(c.id)}
                                style={{
                                  borderRadius: "0.4rem",
                                  border: "none",
                                  background: LIME,
                                  color: "#0a0a0a",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  padding: "0.2rem 0.55rem",
                                  cursor: busy ? "wait" : "pointer",
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                ✓ Shortlist
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => runBulk([c.id], "reject")}
                                style={{
                                  borderRadius: "0.4rem",
                                  border: `1px solid ${BORDER}`,
                                  background: "transparent",
                                  color: DANGER,
                                  fontSize: "0.72rem",
                                  padding: "0.2rem 0.5rem",
                                  cursor: busy ? "wait" : "pointer",
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                ✗
                              </button>
                            </>
                          )}
                          {(c.status || "") === "Shortlisted" && c.email && (
                            <button
                              type="button"
                              onClick={() => composeScreeningEmail(c)}
                              style={{
                                borderRadius: "0.4rem",
                                border: "none",
                                background: LIME,
                                color: "#0a0a0a",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "0.2rem 0.55rem",
                                cursor: "pointer",
                              }}
                            >
                              📧 Screening Email
                            </button>
                          )}
                          {[
                            "Shortlisted",
                            "Interview Email Sent - Waiting Reply",
                            "1st Interview Scheduled",
                            "HR Interview Done",
                            "Waiting Manager Interview Confirm",
                            "Manager Interview Scheduled",
                            "Waiting Interview Result",
                            "Waiting Offer Confirmation",
                            "Offer Sent - Waiting Reply",
                          ].includes(c.status || "") && (
                            <button
                              type="button"
                              onClick={() => setJourneyCandidate(c)}
                              style={{
                                borderRadius: "0.4rem",
                                border: `1px solid ${BORDER}`,
                                background: "transparent",
                                color: TEXT,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "0.2rem 0.5rem",
                                cursor: "pointer",
                              }}
                            >
                              ▶ Journey
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr>
                        <td
                          colSpan={13}
                          style={{
                            padding: "0.75rem 1rem",
                            borderBottom: `1px solid ${BORDER}`,
                            background:
                              "color-mix(in srgb, var(--samurai-surface) 55%, transparent)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color: TEXT,
                              marginBottom: "0.5rem",
                            }}
                          >
                            📋 Reviews & Feedback — {c.name || "candidate"}
                          </div>
                          <CandidateReviewsPanel
                            events={allEvents}
                            candidateId={c.id}
                            compact
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddApplicant && (
        <AddApplicantModal
          job={job}
          department={department}
          onClose={() => setShowAddApplicant(false)}
        />
      )}

      {showScreeningSetup && (
        <ScreeningSetupModal
          job={job}
          department={department}
          onClose={() => setShowScreeningSetup(false)}
        />
      )}

      {showEditJob && (
        <EditJobOpeningModal
          job={job}
          stats={stats}
          department={department}
          onClose={() => setShowEditJob(false)}
        />
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

const APPLICANT_SOURCES = [
  "Email",
  "LinkedIn",
  "JobStreet",
  "Indeed",
  "WhatsApp",
  "Walk-in",
  "Referral",
  "Other",
];

/* ── Edit Job Opening Modal ─────────────────────────────────────────────── */

const _editInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: TEXT,
  padding: "0.45rem 0.5rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

function _EditField({ label, span, children }: { label: string; span?: 1 | 2; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: span === 2 ? "span 2" : "span 1" }}>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EditJobOpeningModal({
  job,
  stats,
  department,
  onClose,
}: {
  job: HrJobOpening;
  stats: HrDashboardStats;
  department: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    job_title: job.job_title || "",
    department: job.department || "",
    employment_type: job.employment_type || "Full Time",
    experience: job.experience || "",
    budget_max: job.budget_max != null ? String(job.budget_max) : "",
    hiring_manager: job.hiring_manager || "",
    application_start: job.application_start || "",
    job_status: job.job_status || "Active",
    job_description: job.job_description || "",
    jd_link: job.jd_link || "",
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

  async function doSave() {
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
      await hrApi.updateJobOpening(department, job.id, fd);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job opening.");
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
        <div
          className="sd-chart-card"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "40rem", maxHeight: "88vh", overflowY: "auto", padding: "1.25rem" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                Edit Job Opening
              </h2>
              <p style={{ fontSize: "0.72rem", color: MUTED, margin: 0 }}>
                Update any field below. Deadline is auto-computed from App Start + 90 days.
              </p>
            </div>
            <button type="button" className="sd-icon-btn" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            <_EditField label="Job Title *" span={2}>
              <input value={form.job_title} onChange={set("job_title")} style={_editInputStyle} />
            </_EditField>
            <_EditField label="Department" span={1}>
              <input value={form.department} onChange={set("department")} list="ej-depts" style={_editInputStyle} />
              <datalist id="ej-depts">
                {deptOptions.map((d) => (<option key={d} value={d} />))}
              </datalist>
            </_EditField>
            <_EditField label="Employment Type" span={1}>
              <select value={form.employment_type} onChange={set("employment_type")} style={_editInputStyle}>
                {typeOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </_EditField>
            <_EditField label="Experience" span={1}>
              <input value={form.experience} onChange={set("experience")} placeholder="e.g. 3+ years" style={_editInputStyle} />
            </_EditField>
            <_EditField label="Budget Max (RM)" span={1}>
              <input value={form.budget_max} onChange={set("budget_max")} placeholder="e.g. 9000" inputMode="decimal" style={_editInputStyle} />
            </_EditField>
            <_EditField label="Hiring Manager" span={1}>
              <input value={form.hiring_manager} onChange={set("hiring_manager")} style={_editInputStyle} />
            </_EditField>
            <_EditField label="Application Start" span={1}>
              <input type="date" value={form.application_start} onChange={set("application_start")} style={_editInputStyle} />
            </_EditField>
            <_EditField label="Status" span={1}>
              <select value={form.job_status} onChange={set("job_status")} style={_editInputStyle}>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Closed - Hired">Closed — Hired</option>
                <option value="Closed - Cancelled">Closed — Cancelled</option>
              </select>
            </_EditField>
            <_EditField label="Job Description" span={2}>
              <textarea value={form.job_description} onChange={set("job_description")} rows={4} style={{ ..._editInputStyle, resize: "vertical" }} />
            </_EditField>
            <_EditField label="Job Description Link" span={2}>
              <input value={form.jd_link} onChange={set("jd_link")} placeholder="https://…" style={_editInputStyle} />
            </_EditField>
            <_EditField label="Upload New JD File (optional, replaces existing)" span={2}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                onChange={(e) => setJdFile(e.target.files?.[0] ?? null)}
                style={{ ..._editInputStyle, padding: "0.4rem", fontSize: "0.78rem" }}
              />
            </_EditField>
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
              onClick={doSave}
              disabled={busy}
              style={{
                borderRadius: "0.5rem",
                border: "none",
                background: LIME,
                color: "#0a0a0a",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "0.4rem 1rem",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Add Applicant — HR only picks the source; all other info is extracted from
 * the resume. HR then reviews the raw resume content next to the extracted
 * details, corrects anything, and clicks Confirm.
 */
function AddApplicantModal({
  job,
  department,
  onClose,
}: {
  job: HrJobOpening;
  department: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<string>("Email");
  const [resume, setResume] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [summary, setSummary] = useState("");

  async function pickFile(f: File) {
    setResume(f);
    setError("");
    setExtracting(true);
    setExtracted(false);
    try {
      const res = await hrApi.extractResume(department, f);
      const ex = res.extract;
      setForm({
        name: ex.name || "",
        email: ex.email || "",
        phone: ex.phone || "",
      });
      setSummary(ex.summary || "");
      setResumeText(ex.resume_text || "");
      setExtracted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Extraction failed — fill the fields manually after choosing the file.",
      );
      setResumeText("");
      setExtracted(true); // allow manual entry + confirm anyway
    } finally {
      setExtracting(false);
    }
  }

  function resetFile() {
    setResume(null);
    setExtracted(false);
    setResumeText("");
    setSummary("");
    setForm({ name: "", email: "", phone: "" });
    setError("");
  }

  async function submit() {
    if (!resume) {
      setError("Upload the resume first.");
      return;
    }
    if (!form.name.trim()) {
      setError(
        "Applicant name is required — check the extraction and correct it.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("applicant_name", form.name.trim());
    if (form.email.trim()) fd.append("email", form.email.trim());
    if (form.phone.trim()) fd.append("phone_no", form.phone.trim());
    fd.append("source", source);
    fd.append("file", resume);
    try {
      await hrApi.addApplicant(department, job.id, fd);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add applicant.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.4)",
          border: "none",
          cursor: "default",
        }}
      />
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="sd-chart-card"
          style={{
            position: "relative",
            zIndex: 50,
            width: "100%",
            maxWidth: extracted ? "64rem" : "28rem",
            padding: "1.25rem",
            maxHeight: "92vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: `1px solid ${BORDER}`,
              paddingBottom: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: TEXT,
                  margin: 0,
                }}
              >
                Add Applicant — {job.job_title}
              </h2>
              <p style={{ fontSize: "0.72rem", color: MUTED, margin: 0 }}>
                {extracted
                  ? "Step 2 — Compare the resume content with the extracted details. Correct anything wrong, then Confirm."
                  : "Step 1 — Pick where this resume came from and upload it. Everything else is extracted automatically."}
              </p>
            </div>
            <button
              type="button"
              className="sd-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Source */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: "0.25rem",
              }}
            >
              Source * (where did this resume come from?)
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={{ ...appInputStyle, maxWidth: "14rem" }}
            >
              {APPLICANT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Resume upload */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: extracted ? "0.9rem" : "0",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "0.5rem",
                border: `1px dashed ${LIME}`,
                color: LIME,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Upload size={14} />{" "}
              {extracting
                ? "Extracting details…"
                : resume
                  ? resume.name
                  : "Choose resume file"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg,.webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {extracted && (
              <button
                type="button"
                onClick={resetFile}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${BORDER}`,
                  background: "transparent",
                  color: MUTED,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Choose a different file
              </button>
            )}
            {extracting && (
              <span style={{ fontSize: "0.75rem", color: WARNING }}>
                Reading resume…
              </span>
            )}
          </div>

          {/* Review: extracted details vs raw resume content */}
          {extracted && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr",
                gap: "0.9rem",
              }}
            >
              {/* Extracted — editable */}
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: "0.6rem",
                  padding: "0.9rem",
                  background: SURFACE_2,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.6rem",
                    fontSize: "0.85rem",
                    color: TEXT,
                  }}
                >
                  Extracted details {summary ? "" : ""}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 400,
                      color: MUTED,
                    }}
                  >
                    (correct anything wrong)
                  </span>
                </h3>
                <div style={{ display: "grid", gap: "0.55rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: MUTED,
                        marginBottom: "0.2rem",
                      }}
                    >
                      Full name *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Full name *"
                      style={appInputStyle}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: MUTED,
                        marginBottom: "0.2rem",
                      }}
                    >
                      Email
                    </label>
                    <input
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="Email"
                      style={appInputStyle}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: MUTED,
                        marginBottom: "0.2rem",
                      }}
                    >
                      Phone
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="Phone"
                      style={appInputStyle}
                    />
                  </div>
                </div>
                {summary && (
                  <div
                    style={{
                      marginTop: "0.6rem",
                      padding: "0.5rem 0.6rem",
                      borderRadius: "0.4rem",
                      border: `1px solid ${BORDER}`,
                      background: "var(--samurai-bg)",
                      fontSize: "0.75rem",
                      color: TEXT,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: MUTED }}>
                      AI summary:{" "}
                    </span>
                    {summary}
                  </div>
                )}
                {resumeText.trim() === "" && (
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: WARNING,
                      margin: "0.5rem 0 0",
                    }}
                  >
                    No readable text in this file — fill the details manually.
                  </p>
                )}
              </div>

              {/* Raw resume content — read only */}
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: "0.6rem",
                  padding: "0.9rem",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <h3
                  style={{
                    margin: "0 0 0.6rem",
                    fontSize: "0.85rem",
                    color: TEXT,
                  }}
                >
                  Resume content{" "}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 400,
                      color: MUTED,
                    }}
                  >
                    (raw text — for verification)
                  </span>
                </h3>
                <pre
                  style={{
                    flex: 1,
                    margin: 0,
                    overflowY: "auto",
                    maxHeight: "18rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "0.72rem",
                    lineHeight: 1.5,
                    color: TEXT,
                    padding: "0.5rem 0.6rem",
                    borderRadius: "0.4rem",
                    border: `1px solid ${BORDER}`,
                    background: "var(--samurai-bg)",
                  }}
                >
                  {resumeText.trim() ||
                    "(No readable text extracted — the file may be a scanned image.)"}
                </pre>
              </div>
            </div>
          )}

          {error && (
            <p
              style={{
                color: DANGER,
                fontSize: "0.78rem",
                margin: "0.6rem 0 0",
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "0.9rem",
            }}
          >
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
              type="button"
              onClick={submit}
              disabled={busy || extracting}
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
                cursor: busy || extracting ? "default" : "pointer",
                opacity: busy || extracting ? 0.6 : 1,
              }}
            >
              <UserPlus size={14} />{" "}
              {busy ? "Adding…" : "Confirm & Add Applicant"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ScreeningSetupModal({
  job,
  department,
  onClose,
}: {
  job: HrJobOpening;
  department: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formLink, setFormLink] = useState(job.screening_form_link || "");
  const [subject, setSubject] = useState(
    job.screening_email_subject || "Screening Questions — {job_title}",
  );
  const [body, setBody] = useState(
    job.screening_email_body ||
      "Dear {candidate_name},\n\n" +
        "Thank you for applying for the {job_title} role. As the next step, please fill in our screening questions here:\n\n" +
        "{screening_link}\n\n" +
        "Kindly complete it within 3 working days.\n\nBest regards,\nHR Team",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await hrApi.jobScreeningSetup(department, job.id, {
        screening_form_link: formLink.trim() || undefined,
        screening_email_subject: subject,
        screening_email_body: body,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-hr-stats", department],
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save screening setup",
      );
      setBusy(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: "1rem",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(620px, 94vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--samurai-bg)",
          border: `1px solid ${BORDER}`,
          borderRadius: "0.75rem",
          padding: "1.25rem",
          zIndex: 51,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              color: TEXT,
              marginRight: "auto",
            }}
          >
            Screening Setup — {job.job_title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: MUTED,
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <p
            style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.6rem" }}
          >
            {error}
          </p>
        )}

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: "0.25rem",
              }}
            >
              Google Form link (candidates fill this)
            </label>
            <input
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
              placeholder="https://forms.gle/…"
              style={appInputStyle}
            />
            <p
              style={{
                fontSize: "0.72rem",
                color: MUTED,
                margin: "0.3rem 0 0",
              }}
            >
              Paste the public link to your screening Google Form. Set the form
              to "Anyone with the link can view". Edit the questions in Google
              Forms anytime — this link never changes.
            </p>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: "0.25rem",
              }}
            >
              Email subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={appInputStyle}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: "0.25rem",
              }}
            >
              Email body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              style={{
                ...appInputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <p
              style={{
                fontSize: "0.72rem",
                color: MUTED,
                margin: "0.3rem 0 0",
              }}
            >
              Placeholders: <code>{"{candidate_name}"}</code>{" "}
              <code>{"{job_title}"}</code> <code>{"{screening_link}"}</code>{" "}
              <code>{"{hiring_manager}"}</code>
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "0.9rem",
          }}
        >
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
            type="button"
            onClick={save}
            disabled={busy}
            style={{
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
            {busy ? "Saving…" : "Save Screening Setup"}
          </button>
        </div>
      </div>
    </>
  );
}

const appInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.4rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE_2,
  color: TEXT,
  padding: "0.45rem 0.6rem",
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
