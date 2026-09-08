import { useEffect, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrInterview, HrInterviewTemplate, HrJobOpening } from "../../../lib/types";

interface Props {
  interview: HrInterview;
  candidate: HrCandidate;
  job?: HrJobOpening;
  department: string;
  onChanged?: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";
const WARNING = "var(--samurai-warning)";

const ROUND_LABEL: Record<string, string> = {
  first: "HR",
  hr: "HR",
  manager: "Manager",
  ceo: "CEO",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.4rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE_2,
  color: TEXT,
  padding: "0.45rem 0.6rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  borderRadius: "0.45rem", border: "none", background: LIME, color: "#0a0a0a",
  fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.8rem", cursor: "pointer",
};
const btnOutline: React.CSSProperties = {
  borderRadius: "0.45rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: TEXT, fontSize: "0.78rem", fontWeight: 600, padding: "0.4rem 0.8rem", cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  borderRadius: "0.45rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: DANGER, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer",
};

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function InterviewQuestionsPanel({ interview, candidate, job, department, onChanged }: Props) {
  const [tab, setTab] = useState<"questions" | "templates" | "post">("questions");
  const [questions, setQuestions] = useState<string[]>(interview.questions || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [genSource, setGenSource] = useState("");

  const [templates, setTemplates] = useState<HrInterviewTemplate[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplBusy, setTplBusy] = useState(false);

  const [rating, setRating] = useState<number | null>(interview.rating ?? null);
  const [comment, setComment] = useState(interview.comment || "");
  const [postBusy, setPostBusy] = useState(false);

  const roundLabel = ROUND_LABEL[((interview.round || "").trim().toLowerCase())] || (interview.round || "Interview");

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const loadTemplates = async () => {
    try {
      const res = await hrApi.listInterviewTemplates(department);
      setTemplates(res.templates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    }
  };

  useEffect(() => {
    if (tab === "templates") loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const generate = async () => {
    setBusy(true);
    setError("");
    setGenSource("");
    try {
      const res = await hrApi.generateQuestions(department, interview.id);
      setQuestions(res.questions || []);
      setGenSource(res.source || "");
      flash(`Generated ${(res.questions || []).length} questions`);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setBusy(false);
    }
  };

  const saveQuestions = async () => {
    setBusy(true);
    setError("");
    try {
      await hrApi.saveQuestions(department, interview.id, questions);
      flash("Questions saved");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save questions");
    } finally {
      setBusy(false);
    }
  };

  const addQuestion = () => setQuestions((q) => [...q, ""]);
  const updateQuestion = (i: number, v: string) =>
    setQuestions((q) => q.map((x, idx) => (idx === i ? v : x)));
  const removeQuestion = (i: number) =>
    setQuestions((q) => q.filter((_, idx) => idx !== i));

  const saveTemplate = async () => {
    if (questions.filter((q) => q.trim()).length === 0) {
      setError("Add or generate questions before saving a template");
      return;
    }
    setTplBusy(true);
    setError("");
    try {
      const name = (tplName.trim() ||
        `${roundLabel} · ${job?.job_title || candidate.role || candidate.name || ""}`.trim()).slice(0, 256);
      await hrApi.saveInterviewTemplate(department, interview.id, {
        name,
        department: job?.department || "",
        role_pattern: candidate.role || "",
        round: interview.round || "first",
      });
      setTplName("");
      flash("Template saved");
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setTplBusy(false);
    }
  };

  const applyTemplate = async (t: HrInterviewTemplate) => {
    setTplBusy(true);
    setError("");
    try {
      const res = await hrApi.applyInterviewTemplate(department, interview.id, t.id);
      setQuestions(res.questions || []);
      setTab("questions");
      flash(`Applied "${t.name}" (${(res.questions || []).length} questions)`);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply template");
    } finally {
      setTplBusy(false);
    }
  };

  const deleteTemplate = async (t: HrInterviewTemplate) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    setTplBusy(true);
    setError("");
    try {
      await hrApi.deleteInterviewTemplate(department, t.id);
      await loadTemplates();
      flash("Template deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete template");
    } finally {
      setTplBusy(false);
    }
  };

  const savePost = async () => {
    setPostBusy(true);
    setError("");
    try {
      await hrApi.postInterviewReview(department, interview.id, {
        rating: rating ?? null,
        comment: comment.trim(),
      });
      flash("Assessment saved");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save assessment");
    } finally {
      setPostBusy(false);
    }
  };

  const tabs = [
    { id: "questions" as const, label: "📋 Questions" },
    { id: "templates" as const, label: "🗂️ Templates" },
    { id: "post" as const, label: "📝 Post-Interview" },
  ];

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: "0.6rem",
        padding: "0.9rem",
        marginTop: "0.75rem",
        background: SURFACE_2,
      }}
    >
      {/* Context-aware header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: TEXT }}>
          📋 {roundLabel} Interview Questions
        </span>
        <span style={{ fontSize: "0.72rem", color: MUTED }}>
          {candidate.name} · {job?.job_title || candidate.role || "—"}
          {interview.interviewer_name ? ` · Interviewer: ${interview.interviewer_name}` : ""}
          {interview.scheduled_at ? ` · ${fmtDate(interview.scheduled_at)}` : ""}
        </span>
        <span style={{ marginLeft: "auto" }}>
          {genSource && (
            <span style={{ fontSize: "0.68rem", color: genSource === "ai" ? LIME : WARNING, fontStyle: "italic" }}>
              {genSource === "ai" ? "AI-generated" : "template fallback"}
            </span>
          )}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.75rem" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.35rem 0.7rem",
              borderRadius: "0.45rem",
              border: `1px solid ${tab === t.id ? LIME : BORDER}`,
              background: tab === t.id ? "var(--samurai-surface)" : "transparent",
              color: tab === t.id ? LIME : TEXT,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${DANGER}`, color: DANGER, fontSize: "0.76rem", marginBottom: "0.6rem" }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${OK}`, color: OK, fontSize: "0.76rem", marginBottom: "0.6rem" }}>
          {notice}
        </div>
      )}

      {tab === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={generate} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Generating…" : "✨ Generate with AI"}
            </button>
            <button type="button" onClick={saveQuestions} disabled={busy} style={btnOutline}>
              💾 Save Questions
            </button>
            <button type="button" onClick={addQuestion} style={btnOutline}>
              + Add Question
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <input
                placeholder="Template name (optional)"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                style={{ ...inputStyle, width: "14rem", padding: "0.35rem 0.5rem" }}
              />
              <button type="button" onClick={saveTemplate} disabled={tplBusy} style={btnOutline}>
                Save as Template
              </button>
            </div>
          </div>
          {questions.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: MUTED, margin: 0 }}>
              No questions yet — click <strong>✨ Generate with AI</strong> to create 10 questions based on the candidate's resume and the job description.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {questions.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: MUTED, minWidth: "1.2rem", textAlign: "right" }}>
                    {i + 1}.
                  </span>
                  <input
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    style={inputStyle}
                    placeholder="Interview question…"
                  />
                  <button type="button" onClick={() => removeQuestion(i)} style={btnDanger} title="Remove">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {templates.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: MUTED, margin: 0 }}>
              No saved templates yet — save the current question set from the Questions tab to reuse it for future candidates.
            </p>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 0.7rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${BORDER}`,
                  background: "var(--samurai-surface)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: TEXT }}>
                    {t.name}{" "}
                    <span style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 400 }}>
                      · {ROUND_LABEL[t.round?.toLowerCase()] || t.round || "Interview"} round · {t.questions.length} questions
                    </span>
                  </div>
                  {(t.role_pattern || t.department) && (
                    <div style={{ fontSize: "0.7rem", color: MUTED }}>
                      {[t.role_pattern, t.department].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => applyTemplate(t)} disabled={tplBusy} style={btnOutline}>
                  Apply
                </button>
                <button type="button" onClick={() => deleteTemplate(t)} disabled={tplBusy} style={btnDanger}>
                  Delete
                </button>
              </div>
            ))
          )}
          <button type="button" onClick={loadTemplates} style={{ ...btnOutline, alignSelf: "flex-start" }}>
            ↻ Refresh
          </button>
        </div>
      )}

      {tab === "post" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem" }}>
              Candidate rating
            </div>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "1.4rem",
                    cursor: "pointer",
                    color: (rating ?? 0) >= n ? WARNING : MUTED,
                    padding: "0 0.15rem",
                  }}
                  title={`${n} star${n > 1 ? "s" : ""}`}
                >
                  {n <= (rating ?? 0) ? "★" : "☆"}
                </button>
              ))}
              {rating != null && (
                <span style={{ fontSize: "0.75rem", color: MUTED, alignSelf: "center", marginLeft: "0.3rem" }}>
                  {rating}/5
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem" }}>
              Overall assessment
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notes on the candidate's performance in this round…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div>
            <button type="button" onClick={savePost} disabled={postBusy} style={{ ...btnPrimary, opacity: postBusy ? 0.6 : 1 }}>
              {postBusy ? "Saving…" : "Save Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}