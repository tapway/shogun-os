import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ExternalLink, Briefcase } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrDashboardStats, HrJobOpening, HrInterview } from "../../../lib/types";
import { CandidateWorkflowModal } from "./CandidateWorkflowModal";
import { JourneyStepperModal, journeyIndex, journeyLength } from "./JourneyStepperModal";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
}

// Canonical pipeline stages (ordered) — folds variant spellings across the
// fulltime / internship / freelancer / virtual-bench trackers into one stage.
const STATUS_ORDER = [
  "Resume Received",
  "Shortlisted",
  "Interview Email Sent - Waiting Reply",
  "1st Interview Scheduled",
  "HR Interview Done",
  "Waiting Manager Interview Confirm",
  "Manager Interview Scheduled",
  "Manager Interview Done",
  "Waiting CEO Interview Confirm",
  "CEO Interview Scheduled",
  "Waiting Interview Result",
  "Waiting Offer Confirmation",
  "Offer Sent - Waiting Reply",
  "Done",
  "Virtual Bench",
  "KIV",
  "On Hold",
  "No Response",
  "Rejected",
];

const STATUS_ALIASES: Record<string, string> = {
  // legacy / Notion-era spellings fold into the new pipeline stages
  "Screening - Pending": "Interview Email Sent - Waiting Reply",
  "Screening": "Interview Email Sent - Waiting Reply",
  "Schedule 1st Round of Interview": "Interview Email Sent - Waiting Reply",
  "1st round of interview": "1st Interview Scheduled",
  "1st Interview": "1st Interview Scheduled",
  "Schedule Manager Interview": "Waiting Manager Interview Confirm",
  "Manager Interview": "Manager Interview Scheduled",
  "Schedule CEO Interview": "Waiting CEO Interview Confirm",
  "CEO Interview": "CEO Interview Scheduled",
  "Assessment DONE": "Waiting Offer Confirmation",
  "Assessment Sent": "Waiting Offer Confirmation",
  "Offer Sent": "Offer Sent - Waiting Reply",
  "Offer Accepted": "Done",
  "Hired": "Done",
  // pre-interview review stages in the old Notion order
  "HR Review": "Interview Email Sent - Waiting Reply",
  "Hiring Manager Pending Review": "Interview Email Sent - Waiting Reply",
  "Hiring Manager Review": "Interview Email Sent - Waiting Reply",
  "Pending Review": "Interview Email Sent - Waiting Reply",
  "No response": "No Response",
};

const NO_STATUS = "(No status)";

const STATUS_CHIP: Record<string, string> = {
  "Resume Received": "muted",
  "Shortlisted": "ok",
  "Interview Email Sent - Waiting Reply": "warn",
  "1st Interview Scheduled": "warn",
  "HR Interview Done": "warn",
  "Waiting Manager Interview Confirm": "warn",
  "Manager Interview Scheduled": "warn",
  "Waiting CEO Interview Confirm": "warn",
  "CEO Interview Scheduled": "warn",
  "Waiting Interview Result": "warn",
  "Waiting Offer Confirmation": "warn",
  "Offer Sent - Waiting Reply": "warn",
  "Done": "ok",
  "Virtual Bench": "muted",
  "KIV": "muted",
  "On Hold": "muted",
  "No Response": "bad",
  "Rejected": "bad",
};

const CHIP_CLS: Record<string, string> = {
  ok: "var(--samurai-ok)",
  warn: "var(--samurai-warning)",
  bad: "var(--samurai-danger)",
  muted: "var(--samurai-muted)",
};

function canonicalStatus(raw: string | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return NO_STATUS;
  return STATUS_ALIASES[trimmed] || trimmed;
}

function daysWaiting(since: string | undefined): number {
  if (!since) return 0;
  const d = new Date(since);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// Generic words stripped before fuzzy job-title matching.
const GENERIC_WORDS = new Set([
  "jr", "sr", "senior", "junior", "lead", "head", "of", "the", "and", "&",
  "executive", "manager", "engineer", "specialist", "officer", "and",
]);

/** Fuzzy match a candidate's role against a job title (word overlap). */
function roleMatchesJobTitle(role: string | undefined, jobTitle: string): boolean {
  const r = (role || "").toLowerCase().trim();
  const j = jobTitle.toLowerCase().trim();
  if (!r || !j) return false;
  if (r === j) return true;
  if (r.includes(j) || j.includes(r)) return true;
  const jw = j.split(/[\s/()-]+/).filter((w) => w.length > 2 && !GENERIC_WORDS.has(w));
  if (jw.length === 0) return false;
  const rw = r.split(/[\s/()-]+/).filter((w) => w.length > 2);
  return jw.some((a) => rw.some((b) => b.includes(a) || a.includes(b)));
}

function isOpenJob(j: HrJobOpening): boolean {
  const s = (j.job_status || "").toLowerCase();
  // "Not Initiated" positions are treated as closed — recruitment has not
  // started, so their candidates stay out of the active pipelines.
  return !s.includes("hired") && !s.includes("closed") && !s.includes("not initiated");
}

/** Candidates stay visible in the pipeline only while they are still in the
 * recruitment process (not Hired/Rejected) AND have at least one matching job
 * opening that is not Hired/Closed. Manually curated in_pipeline candidates
 * always stay visible. */
const TERMINAL_STAGES = new Set(["Done", "Rejected"]);

function isInActiveRecruitment(c: HrCandidate, jobOpenings: HrJobOpening[]): boolean {
  if (TERMINAL_STAGES.has(canonicalStatus(c.status))) return false;
  const matching = jobOpenings.filter((j) => roleMatchesJobTitle(c.role, j.job_title));
  if (matching.length === 0) return false;
  return matching.some((j) => isOpenJob(j));
}

// Three recruitment processes — each gets its own pipeline, referenced by the
// positions (job openings) of that employment type.
const PIPELINE_SECTIONS = [
  { key: "Full Time", label: "Full Time Pipeline" },
  { key: "Internship", label: "Internship Pipeline" },
  { key: "Contract", label: "Contract Pipeline" },
] as const;

const OTHER_KEY = "Other";

/** Classify a candidate by the employment type of their matching OPEN job
 * opening (position-based). in_pipeline candidates with no open match go to
 * "Other". Returns null when the candidate must stay hidden.
 * "Resume Received" candidates are excluded from pipeline — they start at Shortlisted. */
function classifyPipeline(c: HrCandidate, jobOpenings: HrJobOpening[]): string | null {
  if (TERMINAL_STAGES.has(canonicalStatus(c.status))) return null;
  if (canonicalStatus(c.status) === "Resume Received") return null;
  const openMatches = jobOpenings.filter((j) => roleMatchesJobTitle(c.role, j.job_title) && isOpenJob(j));
  if (openMatches.length > 0) {
    const t = (openMatches[0].employment_type || "").trim();
    const canonical = PIPELINE_SECTIONS.find((s) => s.key.toLowerCase() === t.toLowerCase());
    return canonical ? canonical.key : t || OTHER_KEY;
  }
  if (c.in_pipeline) return OTHER_KEY;
  return null;
}

export function RecruitmentPipelineTab({ stats, department }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selected, setSelected] = useState<HrCandidate | null>(null);
  const [detailsCandidate, setDetailsCandidate] = useState<HrCandidate | null>(null);
  const [view, setView] = useState<"pipeline" | "schedule" | "calendar">("pipeline");
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  // Local stage overrides applied immediately on drop (optimistic) until the
  // stats query refetch lands with the persisted status.
  const [moves, setMoves] = useState<Record<number, string>>({});

  // Sync selected/detailsCandidate when stats refetch (e.g., after candidate move)
  useEffect(() => {
    if (selected) {
      const updated = (stats.candidates || []).find((c) => c.id === selected.id);
      if (updated && updated.status !== selected.status) setSelected(updated);
    }
    if (detailsCandidate) {
      const updated = (stats.candidates || []).find((c) => c.id === detailsCandidate.id);
      if (updated && updated.status !== detailsCandidate.status) setDetailsCandidate(updated);
    }
  }, [stats.candidates]);
  const [moveError, setMoveError] = useState("");

  const candidates = stats.candidates || [];
  const jobOpenings = stats.job_openings || [];

  const applyMoves = (list: HrCandidate[]): HrCandidate[] =>
    list.map((c) => (moves[c.id] && moves[c.id] !== c.status ? { ...c, status: moves[c.id] } : c));

  async function moveCandidate(id: number, newStage: string) {
    const cand = candidates.find((c) => c.id === id);
    if (!cand || canonicalStatus(cand.status) === newStage) return;
    setMoveError("");
    setMoves((m) => ({ ...m, [id]: newStage }));
    try {
      await hrApi.candidateMove(department, id, newStage);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Failed to move candidate.");
      setMoves((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
    }
  }

  // Job titles from the Job Openings database.
  const jobTitles = useMemo(() => {
    const s = new Set<string>();
    jobOpenings.forEach((j) => j.job_title && s.add(j.job_title.trim()));
    return Array.from(s).sort();
  }, [jobOpenings]);

  // Pipeline stages — always show all active stages so users can drag to any column
  const stages = useMemo(() => {
    const present = new Set(candidates.map((c) => canonicalStatus(c.status)));
    // Show all STATUS_ORDER stages except terminal/special ones, plus any unlisted present stages
    const ACTIVE_STAGES = STATUS_ORDER.filter(
      (s) => s !== "Resume Received" && s !== "Done" && s !== "Rejected" &&
             s !== "Virtual Bench" && s !== "KIV" && s !== "On Hold" && s !== "No Response",
    );
    const ordered: string[] = [];
    ACTIVE_STAGES.forEach((s) => ordered.push(s));
    const unlisted = Array.from(present)
      .filter((s) => !STATUS_ORDER.includes(s))
      .sort();
    return [...ordered, ...unlisted];
  }, [candidates]);

  // Apply the global filters first; keep candidates regardless of section so
  // per-section KPIs stay honest.
  const globallyFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (!c.in_pipeline && !isInActiveRecruitment(c, jobOpenings)) return false;
      if (stageFilter && canonicalStatus(c.status) !== stageFilter) return false;
      if (jobTitleFilter && !roleMatchesJobTitle(c.role, jobTitleFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, search, jobTitleFilter, stageFilter, jobOpenings]);

  // Bucket candidates into the three position-based pipelines (with local
  // drag overrides applied).
  const bySection = useMemo(() => {
    const map: Record<string, HrCandidate[]> = {};
    for (const c of applyMoves(globallyFiltered)) {
      const key = classifyPipeline(c, jobOpenings);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globallyFiltered, jobOpenings, moves]);

  // KPI metrics (canonical)
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter((c) => canonicalStatus(c.status) === "Done").length;
  const rejectedCount = candidates.filter((c) => canonicalStatus(c.status) === "Rejected").length;
  const activeCount = candidates.filter((c) => isInActiveRecruitment(c, jobOpenings)).length;

  // Waiting candidates (visible in pipelines), oldest first
  const waitingList = useMemo(() => {
    return applyMoves(globallyFiltered)
      .filter((c) => c.waiting_since)
      .sort((a, b) => (a.waiting_since || "").localeCompare(b.waiting_since || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globallyFiltered, moves]);

  const interviews = useMemo(
    () => (stats.interviews || []).slice().sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || "")),
    [stats.interviews],
  );

  const sections = PIPELINE_SECTIONS.map((s) => ({ ...s, candidates: bySection[s.key] || [] }));
  const otherCandidates = bySection[OTHER_KEY] || [];

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Total Candidates</div>
          <div className="sd-kpi-value">{totalCandidates}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Active (In Pipeline)</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-warning)" }}>{activeCount}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Hired</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-ok)" }}>{hiredCount}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Rejected</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-danger)" }}>{rejectedCount}</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--samurai-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--samurai-border)",
              background: "var(--samurai-surface)",
              color: "var(--samurai-text)",
              fontSize: "0.85rem",
            }}
          />
        </div>
        <FilterSelect label="All Job Titles" value={jobTitleFilter} onChange={setJobTitleFilter} options={jobTitles} />
        <FilterSelect label="All Stages" value={stageFilter} onChange={setStageFilter} options={stages} />
      </div>

      {/* View toggle: pipeline vs interview schedule */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {([
          { id: "pipeline", label: "Pipeline Board" },
          { id: "schedule", label: `Interview Schedule (${interviews.filter((i) => i.status === "scheduled").length})` },
          { id: "calendar", label: "Calendar View" },
        ] as const).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "0.5rem",
              border: `1px solid ${view === v.id ? "var(--samurai-lime)" : "var(--samurai-border)"}`,
              background: view === v.id ? "var(--samurai-surface-2)" : "var(--samurai-surface)",
              color: view === v.id ? "var(--samurai-lime)" : "var(--samurai-text)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {moveError && (
        <div style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--samurai-danger)", color: "var(--samurai-danger)", fontSize: "0.8rem" }}>
          {moveError}
        </div>
      )}

      {view === "schedule" && (
        <div className="sd-chart-card">
          <h3 className="sd-chart-title" style={{ marginBottom: "0.75rem" }}>Interview Schedule</h3>
          {interviews.length === 0 ? (
            <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.82rem", color: "var(--samurai-muted)" }}>
              No interviews scheduled yet — confirm a date/time from a Schedule stage card.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--samurai-border)" }}>
                    {["When", "Candidate", "Role", "Round", "Interviewer", "Location", "Status", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "var(--samurai-muted)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => {
                    const cand = candidates.find((c) => c.id === iv.candidate_id);
                    const upcoming = iv.status === "scheduled";
                    return (
                      <tr key={iv.id} style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-text)", fontWeight: 600 }}>
                          {new Date(iv.scheduled_at).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-text)" }}>{cand?.name || `#${iv.candidate_id}`}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-muted)" }}>{cand?.role || "—"}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-text)" }}>{iv.round === "manager" ? "Manager" : "1st Round"}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-text)" }}>{iv.interviewer_name || "—"}</td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "var(--samurai-muted)" }}>{iv.location || "—"}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span className={`sd-chip ${upcoming ? "warn" : iv.status === "completed" ? "ok" : "muted"}`}>{iv.status}</span>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {upcoming && (
                            <button
                              type="button"
                              onClick={() => hrApi.interviewStatus(department, iv.id, "completed").then(() => queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] }))}
                              style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--samurai-lime)", background: "transparent", border: "1px solid var(--samurai-lime)", borderRadius: "0.4rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}
                            >
                              Mark completed
                            </button>
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
      )}

      {/* Calendar View */}
      {view === "calendar" && (() => {
        const now = new Date();
        const [calMonth, setCalMonth] = useState(now.getMonth());
        const [calYear, setCalYear] = useState(now.getFullYear());

        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
        const monthName = new Date(calYear, calMonth).toLocaleString("en-MY", { month: "long", year: "numeric" });

        // Group interviews by date
        const interviewsByDate: Record<string, typeof interviews> = {};
        interviews.forEach((iv) => {
          if (!iv.scheduled_at) return;
          const d = new Date(iv.scheduled_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (!interviewsByDate[key]) interviewsByDate[key] = [];
          interviewsByDate[key].push(iv);
        });

        const prevMonth = () => {
          if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
          else setCalMonth(calMonth - 1);
        };
        const nextMonth = () => {
          if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
          else setCalMonth(calMonth + 1);
        };

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);

        const roundColor = (r: string) => r === "ceo" ? "var(--samurai-warning)" : r === "manager" ? "var(--samurai-lime)" : "var(--samurai-info, #60a5fa)";
        const roundLabel = (r: string) => r === "ceo" ? "CEO" : r === "manager" ? "Mgr" : "HR";

        return (
          <div className="sd-chart-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h3 className="sd-chart-title" style={{ margin: 0 }}>📅 Interview Calendar</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button type="button" onClick={prevMonth} style={{ border: `1px solid var(--samurai-border)`, background: "var(--samurai-surface-2)", color: "var(--samurai-text)", borderRadius: "0.3rem", padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "0.8rem" }}>←</button>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--samurai-text)", minWidth: "8rem", textAlign: "center" }}>{monthName}</span>
                <button type="button" onClick={nextMonth} style={{ border: `1px solid var(--samurai-border)`, background: "var(--samurai-surface-2)", color: "var(--samurai-text)", borderRadius: "0.3rem", padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "0.8rem" }}>→</button>
              </div>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
              {dayNames.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--samurai-muted)", padding: "0.3rem 0", textTransform: "uppercase" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--samurai-border)", border: "1px solid var(--samurai-border)", borderRadius: "0.4rem", overflow: "hidden" }}>
              {cells.map((day, i) => {
                const dateKey = day ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                const dayInterviews = dateKey ? (interviewsByDate[dateKey] || []) : [];
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();

                return (
                  <div key={i} style={{
                    background: "var(--samurai-bg)", minHeight: "5.5rem", padding: "0.3rem",
                    borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--samurai-border)" : "none",
                    borderBottom: i < cells.length - 7 ? "1px solid var(--samurai-border)" : "none",
                  }}>
                    {day && (
                      <>
                        <div style={{
                          fontSize: "0.75rem", fontWeight: isToday ? 800 : 600, marginBottom: "0.25rem",
                          color: isToday ? "var(--samurai-lime)" : "var(--samurai-text)",
                          display: "flex", alignItems: "center", gap: "0.2rem",
                        }}>
                          {isToday && <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "var(--samurai-lime)", display: "inline-block" }} />}
                          {day}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {dayInterviews.map((iv) => {
                            const cand = candidates.find((c) => c.id === iv.candidate_id);
                            const time = new Date(iv.scheduled_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
                            const completed = iv.status === "completed";
                            return (
                              <div key={iv.id} style={{
                                fontSize: "0.65rem", padding: "0.15rem 0.3rem", borderRadius: "0.25rem",
                                background: completed ? "color-mix(in srgb, var(--samurai-ok) 15%, transparent)" : `color-mix(in srgb, ${roundColor(iv.round)} 15%, transparent)`,
                                borderLeft: `2px solid ${completed ? "var(--samurai-ok)" : roundColor(iv.round)}`,
                                color: "var(--samurai-text)", lineHeight: 1.2,
                                opacity: completed ? 0.6 : 1,
                              }}>
                                <span style={{ fontWeight: 700 }}>{time}</span>{" "}
                                <span>{cand?.name || `#${iv.candidate_id}`}</span>
                                <span style={{
                                  display: "inline-block", marginLeft: "0.15rem", fontSize: "0.55rem", fontWeight: 700,
                                  padding: "0 0.2rem", borderRadius: "0.15rem",
                                  background: roundColor(iv.round), color: "#0a0a0a",
                                }}>{roundLabel(iv.round)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "HR Round", color: "var(--samurai-info, #60a5fa)" },
                { label: "Manager Round", color: "var(--samurai-lime)" },
                { label: "CEO Round", color: "var(--samurai-warning)" },
                { label: "Completed", color: "var(--samurai-ok)" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.68rem", color: "var(--samurai-muted)" }}>
                  <span style={{ width: "0.6rem", height: "0.6rem", borderRadius: "0.15rem", background: l.color, display: "inline-block" }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Waiting panel */}
      {view === "pipeline" && waitingList.length > 0 && (
        <div className="sd-chart-card" style={{ borderColor: "var(--samurai-warning)" }}>
          <h3 className="sd-chart-title" style={{ marginBottom: "0.5rem" }}>
            ⏳ Waiting ({waitingList.length}) — awaiting replies / approvals
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {waitingList.map((c) => {
              const days = daysWaiting(c.waiting_since);
              const stale = days >= 14;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.4rem 0.7rem", borderRadius: "0.5rem",
                    border: `1px solid ${stale ? "var(--samurai-danger)" : "var(--samurai-border)"}`,
                    background: "var(--samurai-surface-2)", cursor: "pointer",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--samurai-text)" }}>{c.name}</span>
                  <span style={{ fontSize: "0.72rem", color: stale ? "var(--samurai-danger)" : "var(--samurai-warning)", fontWeight: 600 }}>
                    {days}d{c.waiting_reason ? ` · ${c.waiting_reason}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: "0.7rem", color: "var(--samurai-muted)", margin: "0.5rem 0 0" }}>
            Waiting ≥ 14 days shows red — open the card and use Remove (soft-reject, kept for audit) if there is no reply.
          </p>
        </div>
      )}

      {/* One pipeline per recruitment process */}
      {view === "pipeline" && sections.map((section) => {
        return (
          <div key={section.key} className="sd-chart-card">
            <SectionHeader label={section.label} count={section.candidates.length} />
            {section.candidates.length === 0 ? (
              <p style={{ padding: "0.75rem 0", textAlign: "center", fontSize: "0.82rem", color: "var(--samurai-muted)" }}>
                No active candidates in this pipeline yet.
              </p>
            ) : (
              <KanbanBoard
                candidates={section.candidates}
                onSelect={setSelected}
                dragId={dragId}
                dragOver={dragOver}
                setDragId={setDragId}
                setDragOver={setDragOver}
                onDropStage={moveCandidate}
              />
            )}
          </div>
        );
      })}

      {view === "pipeline" && otherCandidates.length > 0 && (
        <div className="sd-chart-card">
          <SectionHeader label="Other / Unassigned Positions" count={otherCandidates.length} />
          <KanbanBoard
            candidates={otherCandidates}
            onSelect={setSelected}
            dragId={dragId}
            dragOver={dragOver}
            setDragId={setDragId}
            setDragOver={setDragOver}
            onDropStage={moveCandidate}
          />
        </div>
      )}

      {view === "pipeline" && globallyFiltered.length === 0 && sections.every((s) => s.candidates.length === 0) && otherCandidates.length === 0 && (
        <div style={{ padding: "2rem", width: "100%", textAlign: "center", color: "var(--samurai-muted)", fontSize: "0.85rem" }}>
          No candidates match the current filters.
          <div style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
            Pipeline shows only candidates still in the recruitment process whose job opening is still open
            (Hired/Closed/Not Initiated jobs and Hired/Rejected candidates stay hidden).
          </div>
        </div>
      )}

      {/* Journey Stepper — the step-by-step recruitment guide */}
      {selected && !detailsCandidate && (
        <JourneyStepperModal
          candidate={selected}
          stats={stats}
          department={department}
          onClose={() => setSelected(null)}
          onOpenDetails={(c) => setDetailsCandidate(c)}
        />
      )}

      {/* Candidate Workflow Modal (full details) */}
      {detailsCandidate && (
        <CandidateWorkflowModal
          candidate={detailsCandidate}
          stats={stats}
          department={department}
          onClose={() => setDetailsCandidate(null)}
          onCandidateChanged={() => setDetailsCandidate(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <Briefcase size={14} style={{ color: "var(--samurai-text)" }} />
      <h3 className="sd-chart-title" style={{ margin: 0 }}>{label}</h3>
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "var(--samurai-lime)",
          background: "var(--samurai-surface-2)",
          padding: "0.1rem 0.5rem",
          borderRadius: "0.4rem",
        }}
      >
        {count} candidates
      </span>
      <span style={{ fontSize: "0.7rem", color: "var(--samurai-muted)", marginLeft: "auto" }}>
        Drag cards between columns to change status
      </span>
    </div>
  );
}

function KanbanBoard({
  candidates,
  onSelect,
  dragId,
  dragOver,
  setDragId,
  setDragOver,
  onDropStage,
}: {
  candidates: HrCandidate[];
  onSelect: (c: HrCandidate) => void;
  dragId: number | null;
  dragOver: string | null;
  setDragId: (v: number | null) => void;
  setDragOver: (v: string | null) => void;
  onDropStage: (id: number, stage: string) => void;
}) {
  const byStage = useMemo(() => {
    const map: Record<string, HrCandidate[]> = {};
    for (const c of candidates) {
      const st = canonicalStatus(c.status);
      if (!map[st]) map[st] = [];
      map[st].push(c);
    }
    return map;
  }, [candidates]);

  const columns = useMemo(() => {
    const present = new Set(candidates.map((c) => canonicalStatus(c.status)));
    // Always show all active pipeline stages so users can drag to empty columns
    const ACTIVE_STAGES = STATUS_ORDER.filter(
      (s) => s !== "Resume Received" && s !== "Done" && s !== "Rejected" &&
             s !== "Virtual Bench" && s !== "KIV" && s !== "On Hold" && s !== "No Response",
    );
    const ordered: string[] = [];
    ACTIVE_STAGES.forEach((s) => ordered.push(s));
    const unlisted = Array.from(present)
      .filter((s) => !STATUS_ORDER.includes(s))
      .sort();
    return [...ordered, ...unlisted];
  }, [candidates]);

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
      }}
    >
      {columns.map((stage) => {
        const items = byStage[stage] || [];
        const chipCls = STATUS_CHIP[stage] || "muted";
        const isDropTarget = dragOver === stage && dragId != null;
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOver !== stage) setDragOver(stage);
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) && dragOver === stage) {
                setDragOver(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              const id = raw ? Number(raw) : dragId;
              setDragId(null);
              setDragOver(null);
              if (id != null && !Number.isNaN(id)) onDropStage(id, stage);
            }}
            style={{
              minWidth: "240px",
              maxWidth: "280px",
              flex: "0 0 240px",
              background: "var(--samurai-surface)",
              borderRadius: "0.75rem",
              border: `1px solid ${isDropTarget ? "var(--samurai-lime)" : "var(--samurai-border)"}`,
              boxShadow: isDropTarget ? "0 0 0 2px var(--samurai-lime)" : "none",
              display: "flex",
              flexDirection: "column",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            {/* Column header */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--samurai-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--samurai-text)" }}>
                {stage}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: CHIP_CLS[chipCls],
                  background: "var(--samurai-surface-2)",
                  padding: "0.1rem 0.5rem",
                  borderRadius: "0.4rem",
                }}
              >
                {items.length}
              </span>
            </div>
            {/* Cards */}
            <div style={{ padding: "0.5rem", overflowY: "auto", maxHeight: "500px", minHeight: "3rem" }}>
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(c.id));
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(c.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOver(null);
                  }}
                  onClick={() => onSelect(c)}
                  style={{
                    padding: "0.6rem",
                    marginBottom: "0.5rem",
                    borderRadius: "0.5rem",
                    background: "var(--samurai-surface-2)",
                    border: "1px solid var(--samurai-border)",
                    cursor: "grab",
                    opacity: dragId === c.id ? 0.4 : 1,
                    transition: "border-color 0.2s, opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--samurai-lime)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--samurai-border)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--samurai-text)" }}>
                      {c.name}
                    </div>
                    {c.in_pipeline && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--samurai-lime)", border: "1px solid var(--samurai-lime)", padding: "0.05rem 0.35rem", borderRadius: "0.3rem" }}>
                        ✓ Pipeline
                      </span>
                    )}
                    {c.waiting_since && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: daysWaiting(c.waiting_since) >= 14 ? "var(--samurai-danger)" : "var(--samurai-warning)", border: `1px solid ${daysWaiting(c.waiting_since) >= 14 ? "var(--samurai-danger)" : "var(--samurai-warning)"}`, padding: "0.05rem 0.35rem", borderRadius: "0.3rem" }}>
                        ⏳ {daysWaiting(c.waiting_since)}d
                      </span>
                    )}
                  </div>
                  {c.role && (
                    <div style={{ fontSize: "0.75rem", color: "var(--samurai-muted)", marginTop: "0.15rem" }}>
                      {c.role}
                    </div>
                  )}
                  {c.candidate_type && c.candidate_type !== "fulltime" && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "0.25rem",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "0.3rem",
                        background: "var(--samurai-surface)",
                        color: "var(--samurai-lime)",
                        border: "1px solid var(--samurai-border)",
                      }}
                    >
                      {c.candidate_type}
                    </span>
                  )}
                  {(() => {
                    const idx = journeyIndex(c.status);
                    if (idx < 0 || c.status === "Done") return null;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem" }}>
                        <div style={{ height: "0.3rem", flex: 1, borderRadius: 999, overflow: "hidden", background: "var(--samurai-surface)" }}>
                          <div style={{ height: "100%", width: `${((idx + 1) / journeyLength) * 100}%`, background: "var(--samurai-lime)", borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--samurai-muted)" }}>{idx + 1}/{journeyLength}</span>
                      </div>
                    );
                  })()}
                  {c.source && (
                    <div style={{ fontSize: "0.7rem", color: "var(--samurai-muted)", marginTop: "0.25rem" }}>
                      Source: {c.source}
                    </div>
                  )}
                  {c.resume_url && (
                    <a
                      href={c.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.7rem",
                        color: "var(--samurai-lime)",
                        marginTop: "0.25rem",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={12} /> Resume
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  capitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  capitalize?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--samurai-border)",
        background: "var(--samurai-surface)",
        color: "var(--samurai-text)",
        fontSize: "0.85rem",
        maxWidth: "200px",
      }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {capitalize ? o.charAt(0).toUpperCase() + o.slice(1) : o}
        </option>
      ))}
    </select>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--samurai-muted)" }}>{label}</span>
      <span style={{ color: "var(--samurai-text)", textAlign: "right" }}>{value}</span>
    </div>
  );
}