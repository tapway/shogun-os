import { useMemo, useState } from "react";
import { Search, ExternalLink, Briefcase } from "lucide-react";
import type { HrCandidate, HrDashboardStats, HrJobOpening } from "../../../lib/types";

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

function isOpenJob(j: HrJobOpening): boolean {
  const s = (j.job_status || "").toLowerCase();
  return !s.includes("hired") && !s.includes("closed");
}

/** Candidates stay visible in the pipeline only while they are still in the
 * recruitment process (not Hired/Rejected) AND have at least one matching job
 * opening that is not Hired/Closed. Manually curated in_pipeline candidates
 * always stay visible. */
const TERMINAL_STAGES = new Set(["Hired", "Rejected"]);

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
 * "Other". Returns null when the candidate must stay hidden. */
function classifyPipeline(c: HrCandidate, jobOpenings: HrJobOpening[]): string | null {
  if (TERMINAL_STAGES.has(canonicalStatus(c.status))) return null;
  const openMatches = jobOpenings.filter((j) => roleMatchesJobTitle(c.role, j.job_title) && isOpenJob(j));
  if (openMatches.length > 0) {
    // Prefer a canonical section type; fall back to the raw value.
    const t = (openMatches[0].employment_type || "").trim();
    const canonical = PIPELINE_SECTIONS.find((s) => s.key.toLowerCase() === t.toLowerCase());
    return canonical ? canonical.key : t || OTHER_KEY;
  }
  if (c.in_pipeline) return OTHER_KEY;
  return null;
}

export function RecruitmentPipelineTab({ stats }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [trackerFilter, setTrackerFilter] = useState("");
  const [pipelineOnly, setPipelineOnly] = useState(false);
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

  // Apply the global filters first; keep candidates regardless of section so
  // per-section KPIs stay honest.
  const globallyFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      if (pipelineOnly && !c.in_pipeline) return false;
      if (!c.in_pipeline && !isInActiveRecruitment(c, jobOpenings)) return false;
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
  }, [candidates, search, roleFilter, jobTitleFilter, stageFilter, trackerFilter, pipelineOnly, jobOpenings]);

  // Bucket candidates into the three position-based pipelines.
  const bySection = useMemo(() => {
    const map: Record<string, HrCandidate[]> = {};
    for (const c of globallyFiltered) {
      const key = classifyPipeline(c, jobOpenings);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [globallyFiltered, jobOpenings]);

  // Positions per employment type (section header chips) — open and closed,
  // so every process pipeline shows the positions it refers to.
  const positionsByType = useMemo(() => {
    const map: Record<string, { title: string; open: boolean }[]> = {};
    for (const j of jobOpenings) {
      if (!j.job_title) continue;
      const t = (j.employment_type || "").trim();
      const canonical = PIPELINE_SECTIONS.find((s) => s.key.toLowerCase() === t.toLowerCase());
      const key = canonical ? canonical.key : t || OTHER_KEY;
      if (!map[key]) map[key] = [];
      map[key].push({ title: j.job_title.trim(), open: isOpenJob(j) });
    }
    return map;
  }, [jobOpenings]);

  // KPI metrics (canonical)
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter((c) => canonicalStatus(c.status) === "Hired").length;
  const rejectedCount = candidates.filter((c) => canonicalStatus(c.status) === "Rejected").length;
  const activeCount = candidates.filter((c) => isInActiveRecruitment(c, jobOpenings)).length;

  const sections = PIPELINE_SECTIONS.map((s) => ({ ...s, candidates: bySection[s.key] || [], positions: positionsByType[s.key] || [] }));
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
        <FilterSelect label="All Roles" value={roleFilter} onChange={setRoleFilter} options={roles} />
        <FilterSelect label="All Stages" value={stageFilter} onChange={setStageFilter} options={stages} />
        <FilterSelect
          label="All Trackers"
          value={trackerFilter}
          onChange={setTrackerFilter}
          options={trackers}
          capitalize
        />
        <button
          type="button"
          onClick={() => setPipelineOnly((v) => !v)}
          style={{
            padding: "0.5rem 0.85rem",
            borderRadius: "0.5rem",
            border: `1px solid ${pipelineOnly ? "var(--samurai-lime)" : "var(--samurai-border)"}`,
            background: pipelineOnly ? "var(--samurai-surface-2)" : "var(--samurai-surface)",
            color: pipelineOnly ? "var(--samurai-lime)" : "var(--samurai-text)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✓ Pipeline Added ({candidates.filter((c) => c.in_pipeline).length})
        </button>
      </div>

      {/* One pipeline per recruitment process, referenced by position */}
      {sections.map((section) => {
        const openPositions = section.positions.filter((p) => p.open);
        return (
          <div key={section.key} className="sd-chart-card">
            <SectionHeader
              label={section.label}
              count={section.candidates.length}
              positions={section.positions}
            />
            {section.candidates.length === 0 ? (
              <p style={{ padding: "0.75rem 0", textAlign: "center", fontSize: "0.82rem", color: "var(--samurai-muted)" }}>
                {section.positions.length === 0
                  ? "No positions yet — add a job opening of this type to start the pipeline."
                  : openPositions.length === 0
                    ? "All positions in this pipeline are Hired/Closed — their candidates have moved out of the active pipeline."
                    : "No active candidates for these positions yet."}
              </p>
            ) : (
              <KanbanBoard candidates={section.candidates} onSelect={setSelected} />
            )}
          </div>
        );
      })}

      {otherCandidates.length > 0 && (
        <div className="sd-chart-card">
          <SectionHeader label="Other / Unassigned Positions" count={otherCandidates.length} positions={[]} />
          <KanbanBoard candidates={otherCandidates} onSelect={setSelected} />
        </div>
      )}

      {globallyFiltered.length === 0 && sections.every((s) => s.candidates.length === 0) && otherCandidates.length === 0 && (
        <div style={{ padding: "2rem", width: "100%", textAlign: "center", color: "var(--samurai-muted)", fontSize: "0.85rem" }}>
          No candidates match the current filters.
          <div style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
            Pipeline shows only candidates still in the recruitment process whose job opening is still open
            (Hired/Closed jobs and Hired/Rejected candidates stay hidden).
          </div>
        </div>
      )}

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

function SectionHeader({ label, count, positions }: { label: string; count: number; positions: { title: string; open: boolean }[] }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
      </div>
      {positions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
          {positions.map((p) => (
            <span
              key={p.title}
              title={p.open ? "Open position" : "Hired/Closed"}
              style={{
                fontSize: "0.72rem",
                color: p.open ? "var(--samurai-text)" : "var(--samurai-muted)",
                border: `1px solid ${p.open ? "var(--samurai-border)" : "transparent"}`,
                background: p.open ? "var(--samurai-surface-2)" : "transparent",
                padding: "0.15rem 0.55rem",
                borderRadius: "999px",
                textDecoration: p.open ? "none" : "line-through",
              }}
            >
              {p.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanBoard({ candidates, onSelect }: { candidates: HrCandidate[]; onSelect: (c: HrCandidate) => void }) {
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
    const ordered: string[] = [];
    STATUS_ORDER.forEach((s) => {
      if (present.has(s)) ordered.push(s);
    });
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
                  onClick={() => onSelect(c)}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--samurai-text)" }}>
                      {c.name}
                    </div>
                    {c.in_pipeline && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--samurai-lime)", border: "1px solid var(--samurai-lime)", padding: "0.05rem 0.35rem", borderRadius: "0.3rem" }}>
                        ✓ Pipeline
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