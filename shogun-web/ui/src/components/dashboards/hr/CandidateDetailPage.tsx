import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, MessageSquare, Sparkles, UserCheck } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrCandidateExtract, HrDashboardStats } from "../../../lib/types";
import { CandidateReviewsPanel, reviewEvents } from "./CandidateReviewsPanel";

interface Props {
  candidateId: number;
  fallbackCandidate: HrCandidate;
  stats: HrDashboardStats;
  color: string;
  department: string;
  onBack: () => void;
  onAddedToPipeline: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";

function parseExtract(s: string | undefined): HrCandidateExtract | null {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as HrCandidateExtract) : null;
  } catch {
    return null;
  }
}

export function CandidateDetailPage({ candidateId, fallbackCandidate, stats, color, department, onBack, onAddedToPipeline }: Props) {
  const queryClient = useQueryClient();
  const [extract, setExtract] = useState<HrCandidateExtract | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState<"" | "hr" | "manager">("");
  const [adding, setAdding] = useState(false);

  const cand: HrCandidate =
    (stats.candidates || []).find((c) => c.id === candidateId) ?? fallbackCandidate;

  // Auto-run AI extraction once when there is no cached result.
  useEffect(() => {
    const fresh = (stats.candidates || []).find((c) => c.id === candidateId);
    const parsed = parseExtract(fresh?.ai_extract_json);
    if (parsed) setExtract(parsed);
    if (fresh?.ai_summary || fresh?.ai_extract_json) return;
    let cancelled = false;
    setExtracting(true);
    setError("");
    hrApi
      .candidateExtract(department, candidateId)
      .then((res) => {
        if (cancelled) return;
        setExtract(res.extract);
        queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "AI extraction failed.");
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  async function review(kind: "hr" | "manager") {
    setReviewing(kind);
    setError("");
    try {
      await hrApi.candidateReview(department, candidateId, kind);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review update failed.");
    } finally {
      setReviewing("");
    }
  }

  async function addToPipeline() {
    setAdding(true);
    setError("");
    try {
      await hrApi.candidateAddToPipeline(department, candidateId);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
      onAddedToPipeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to pipeline.");
      setAdding(false);
    }
  }

  const exp = extract?.experience || [];
  const edu = extract?.education || [];
  const skills = extract?.skills || [];
  const qa = extract?.screening_answers || [];
  const kd = extract?.key_details || {};

  return (
    <div className="sd-stack">
      {/* Header */}
      <div className="sd-chart-card">
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
          <ArrowLeft size={14} /> Back to Candidate Pool
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: TEXT, margin: 0 }}>
            {cand.name || "Unknown Candidate"}
          </h2>
          {cand.role && (
            <span style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 600 }}>{cand.role}</span>
          )}
          {cand.candidate_type && (
            <span style={{ fontSize: "0.75rem", color: MUTED }}>{cand.candidate_type}</span>
          )}
          {cand.status && <span className="sd-chip warn">{cand.status}</span>}
          {cand.in_pipeline && (
            <span className="sd-chip ok" style={{ border: "1px solid var(--samurai-ok)" }}>
              <CheckCircle2 size={12} style={{ marginRight: "0.2rem" }} /> In Pipeline
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.35rem 1.25rem", marginTop: "0.75rem", fontSize: "0.82rem" }}>
          <Meta label="Email" value={cand.email} />
          <Meta label="Phone" value={cand.phone_no} />
          <Meta label="Source" value={cand.source} />
          <Meta label="Date Entry" value={cand.date_entry} />
          <Meta label="Last Edited" value={cand.last_edited} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {cand.resume_url && (
            <a href={cand.resume_url} target="_blank" rel="noreferrer" style={linkBtnStyle}>
              <FileText size={14} /> View Resume
            </a>
          )}
          {cand.screening_answers_url && (
            <a href={cand.screening_answers_url} target="_blank" rel="noreferrer" style={linkBtnStyle}>
              <ExternalLink size={14} /> View Screening Answers
            </a>
          )}
        </div>
      </div>

      {/* AI Extracted Details */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Sparkles size={15} /> AI Extracted Details
          {extract?.source === "fallback" && (
            <span style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>— from hiring-board record only</span>
          )}
        </h3>

        {extracting && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 0", color: MUTED, fontSize: "0.85rem" }}>
            <div className="h-4 w-4 animate-spin rounded-full" style={{ border: `2px solid ${LIME}`, borderTopColor: "transparent" }} />
            AI is reading the resume and screening questions…
          </div>
        )}

        {!extracting && !extract && !error && (
          <p style={{ color: MUTED, fontSize: "0.85rem" }}>No extraction available.</p>
        )}

        {error && <p style={{ color: DANGER, fontSize: "0.8rem", margin: "0.5rem 0" }}>{error}</p>}

        {!extracting && extract && (
          <div className="sd-stack" style={{ gap: "0.9rem" }}>
            {extract.summary && (
              <div>
                <div style={sectionLabel}>Summary</div>
                <p style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", color: TEXT, margin: "0.35rem 0 0" }}>{extract.summary}</p>
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <div style={sectionLabel}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {skills.map((s) => (
                    <span key={s} style={{ fontSize: "0.78rem", color: TEXT, border: `1px solid ${BORDER}`, background: SURFACE_2, padding: "0.15rem 0.55rem", borderRadius: "999px" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {exp.length > 0 && (
              <div>
                <div style={sectionLabel}>Experience</div>
                {exp.map((e, i) => (
                  <div key={i} style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
                    <div style={{ color: TEXT, fontWeight: 600 }}>{e.title || "—"}</div>
                    <div style={{ color: MUTED, fontSize: "0.78rem" }}>{[e.company, e.period].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </div>
            )}
            {edu.length > 0 && (
              <div>
                <div style={sectionLabel}>Education</div>
                <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem", fontSize: "0.85rem", color: TEXT }}>
                  {edu.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {qa.length > 0 && (
              <div>
                <div style={sectionLabel}>Screening Questions & Answers</div>
                {qa.map((q, i) => (
                  <div key={i} style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                    <div style={{ color: TEXT, fontWeight: 600 }}>{q.question}</div>
                    <div style={{ color: MUTED, fontSize: "0.82rem", whiteSpace: "pre-wrap", marginTop: "0.15rem" }}>{q.answer}</div>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(kd).length > 0 && (
              <div>
                <div style={sectionLabel}>Key Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "0.5rem", marginTop: "0.4rem" }}>
                  {Object.entries(kd).map(([k, v]) => (
                    <div key={k} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: "0.5rem", padding: "0.5rem 0.7rem" }}>
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.2rem" }}>
                        {k.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: TEXT, fontWeight: 600 }}>{v || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reviews + Pipeline actions */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <UserCheck size={15} /> Review & Pipeline
        </h3>
        <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0.25rem 0 0.75rem" }}>
          Track who has reviewed this candidate and add them to the recruitment pipeline.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
          {cand.hr_reviewed ? (
            <span className="sd-chip ok" style={{ border: "1px solid var(--samurai-ok)", padding: "0.4rem 0.8rem" }}>
              <CheckCircle2 size={13} style={{ marginRight: "0.2rem" }} /> HR done review
            </span>
          ) : (
            <button type="button" onClick={() => review("hr")} disabled={reviewing === "hr"} style={{ ...actionBtnStyle, opacity: reviewing === "hr" ? 0.6 : 1 }}>
              HR Review
            </button>
          )}
          {cand.manager_reviewed ? (
            <span className="sd-chip ok" style={{ border: "1px solid var(--samurai-ok)", padding: "0.4rem 0.8rem" }}>
              <CheckCircle2 size={13} style={{ marginRight: "0.2rem" }} /> Manager done review
            </span>
          ) : (
            <button type="button" onClick={() => review("manager")} disabled={reviewing === "manager"} style={{ ...actionBtnStyle, opacity: reviewing === "manager" ? 0.6 : 1 }}>
              Manager Review
            </button>
          )}
          <div style={{ flex: 1, minWidth: "2rem" }} />
          {cand.in_pipeline ? (
            <span className="sd-chip ok" style={{ border: "1px solid var(--samurai-ok)", padding: "0.4rem 0.8rem" }}>
              <CheckCircle2 size={13} style={{ marginRight: "0.2rem" }} /> ✓ In Recruitment Pipeline
            </span>
          ) : (
            <button type="button" onClick={addToPipeline} disabled={adding} style={{ ...primaryBtnStyle, opacity: adding ? 0.6 : 1 }}>
              Add to Recruitment Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Reviews & Feedback written during recruitment */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MessageSquare size={15} /> Reviews & Feedback
          <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 600, color: MUTED }}>
            {reviewEvents(stats.candidate_events || [], candidateId).length} entr{reviewEvents(stats.candidate_events || [], candidateId).length === 1 ? "y" : "ies"}
          </span>
        </h3>
        <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0.25rem 0 0.75rem" }}>
          Comments, interview feedback, decisions and notes written for this candidate in the Recruitment Pipeline.
        </p>
        <CandidateReviewsPanel events={stats.candidate_events || []} candidateId={candidateId} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.15rem" }}>{label}</div>
      <div style={{ color: TEXT, fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.66rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: MUTED,
};

const linkBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.4rem 0.85rem",
  borderRadius: "0.5rem",
  border: `1px solid ${LIME}`,
  color: LIME,
  background: "transparent",
  fontSize: "0.78rem",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.45rem 1rem",
  borderRadius: "0.5rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE_2,
  color: TEXT,
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.45rem 1.1rem",
  borderRadius: "0.5rem",
  border: "none",
  background: LIME,
  color: "#0a0a0a",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
};