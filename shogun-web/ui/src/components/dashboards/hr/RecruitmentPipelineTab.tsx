import { useMemo, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import type { HrCandidate, HrDashboardStats } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

// Canonical pipeline stages (ordered) — folds variant spellings across the
// fulltime / internship / freelancer / virtual-bench trackers into one stage.
const STATUS_ORDER = [
  "Screening - Pending",
  "HR Review",
  "Hiring Manager Pending Review",
  "1st round of interview",
  "Manager Interview",
  "Assessment DONE",
  "Offer Sent",
  "Hired",
  "Virtual Bench",
  "KIV",
  "On Hold",
  "No Response",
  "Rejected",
];

const STATUS_ALIASES: Record<string, string> = {
  "1st Interview": "1st round of interview",
  "Hiring Manager Review": "Hiring Manager Pending Review",
  "Pending Review": "Hiring Manager Pending Review",
  "No response": "No Response",
  "Offer Accepted": "Offer Sent",
  "Assessment Sent": "Assessment DONE",
};

const NO_STATUS = "(No status)";

const STATUS_CHIP: Record<string, string> = {
  "Screening - Pending": "muted",
  "HR Review": "warn",
  "Hiring Manager Pending Review": "warn",
  "1st round of interview": "warn",
  "Manager Interview": "warn",
  "Assessment DONE": "ok",
  "Offer Sent": "ok",
  "Hired": "ok",
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

export function RecruitmentPipelineTab({ stats }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [trackerFilter, setTrackerFilter] = useState("");
  const [selected, setSelected] = useState<HrCandidate | null>(null);

  const candidates = stats.candidates || [];
  const jobOpenings = stats.job_openings || [];

  const roles = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach((c) => c.role && s.add(c.role));
    return Array.from(s).sort();
  }, [candidates]);

  // Job titles from the Job Openings database.
  const jobTitles = useMemo(() => {
    const s = new Set<string>();
    jobOpenings.forEach((j) => j.job_title && s.add(j.job_title.trim()));
    return Array.from(s).sort();
  }, [jobOpenings]);

  // Tracker types (fulltime / internship / freelancer / virtual_bench)
  const trackers = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach((c) => c.candidate_type && s.add(c.candidate_type));
    return Array.from(s).sort();
  }, [candidates]);

  // Pipeline stages (canonical, ordered) present across ALL candidates
  const stages = useMemo(() => {
    const present = new Set(candidates.map((c) => canonicalStatus(c.status)));
    const ordered: string[] = [];
    STATUS_ORDER.forEach((s) => {
      if (present.has(s)) ordered.push(s);
    });
    const unlisted = Array.from(present)
      .filter((s) => !STATUS_ORDER.includes(s))
      .sort();
    return [...ordered, ...unlisted];
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (trackerFilter && c.candidate_type !== trackerFilter) return false;
      if (stageFilter && canonicalStatus(c.status) !== stageFilter) return false;
      if (roleFilter && c.role !== roleFilter) return false;
      if (jobTitleFilter && !roleMatchesJobTitle(c.role, jobTitleFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.role || "").toLowerCase().includes(q)
      );
    });
  }, [candidates, search, roleFilter, jobTitleFilter, stageFilter, trackerFilter]);

  // Group candidates by canonical stage (kanban columns)
  const byStage = useMemo(() => {
    const map: Record<string, HrCandidate[]> = {};
    for (const c of filtered) {
      const st = canonicalStatus(c.status);
      if (!map[st]) map[st] = [];
      map[st].push(c);
    }
    return map;
  }, [filtered]);

  // Kanban columns ordered by STATUS_ORDER, then any extras
  const columns = useMemo(() => {
    const present = new Set(filtered.map((c) => canonicalStatus(c.status)));
    const ordered: string[] = [];
    STATUS_ORDER.forEach((s) => {
      if (present.has(s)) ordered.push(s);
    });
    const unlisted = Array.from(present)
      .filter((s) => !STATUS_ORDER.includes(s))
      .sort();
    return [...ordered, ...unlisted];
  }, [filtered]);

  // KPI metrics (canonical)
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter((c) => canonicalStatus(c.status) === "Hired").length;
  const rejectedCount = candidates.filter((c) => canonicalStatus(c.status) === "Rejected").length;
  const activeCount = totalCandidates - hiredCount - rejectedCount;

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
        <FilterSelect label="All Roles" value={roleFilter} onChange={setRoleFilter} options={roles} />
        <FilterSelect label="All Stages" value={stageFilter} onChange={setStageFilter} options={stages} />
        <FilterSelect
          label="All Trackers"
          value={trackerFilter}
          onChange={setTrackerFilter}
          options={trackers}
          capitalize
        />
      </div>

      {/* Kanban Board — horizontal scroll */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          overflowX: "auto",
          paddingBottom: "1rem",
        }}
      >
        {columns.length === 0 && (
          <div style={{ padding: "2rem", width: "100%", textAlign: "center", color: "var(--samurai-muted)", fontSize: "0.85rem" }}>
            No candidates match the current filters.
          </div>
        )}
        {columns.map((stage) => {
          const items = byStage[stage] || [];
          const chipCls = STATUS_CHIP[stage] || "muted";
          return (
            <div
              key={stage}
              style={{
                minWidth: "240px",
                maxWidth: "280px",
                flex: "0 0 240px",
                background: "var(--samurai-surface)",
                borderRadius: "0.75rem",
                border: "1px solid var(--samurai-border)",
                display: "flex",
                flexDirection: "column",
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
              <div style={{ padding: "0.5rem", overflowY: "auto", maxHeight: "500px" }}>
                {items.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{
                      padding: "0.6rem",
                      marginBottom: "0.5rem",
                      borderRadius: "0.5rem",
                      background: "var(--samurai-surface-2)",
                      border: "1px solid var(--samurai-border)",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--samurai-lime)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--samurai-border)")}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--samurai-text)" }}>
                      {c.name}
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

      {/* Candidate Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--samurai-surface)",
              borderRadius: "0.75rem",
              border: "1px solid var(--samurai-border)",
              padding: "1.5rem",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "var(--samurai-text)" }}>{selected.name}</h3>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--samurai-muted)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.85rem" }}>
              <Row label="Role" value={selected.role} />
              <Row label="Stage" value={canonicalStatus(selected.status)} />
              <Row label="Tracker" value={selected.candidate_type} />
              <Row label="Source" value={selected.source} />
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone_no} />
              <Row label="Date Entry" value={selected.date_entry} />
              {selected.resume_url && (
                <a href={selected.resume_url} target="_blank" rel="noreferrer" style={{ color: "var(--samurai-lime)", textDecoration: "none" }}>
                  View Resume →
                </a>
              )}
              {selected.screening_answers_url && (
                <a href={selected.screening_answers_url} target="_blank" rel="noreferrer" style={{ color: "var(--samurai-lime)", textDecoration: "none" }}>
                  Screening Answers →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
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