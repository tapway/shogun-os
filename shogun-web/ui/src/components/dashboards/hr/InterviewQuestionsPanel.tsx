import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save, Star, Trash2, X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrInterview, HrQuestionTemplate } from "../../../lib/types";

interface Props {
  department: string;
  interview: HrInterview;
  onClose?: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const DANGER = "var(--samurai-danger)";

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
  borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a",
  fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.8rem", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "0.3rem",
};
const btnOutline: React.CSSProperties = {
  borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: TEXT, fontSize: "0.78rem", fontWeight: 600, padding: "0.4rem 0.8rem", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "0.3rem",
};

type Tab = "questions" | "templates" | "comment";

export function InterviewQuestionsPanel({ department, interview, onClose }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("questions");
  const [questions, setQuestions] = useState<string[]>(interview.questions || []);
  const [comment, setComment] = useState(interview.comment || "");
  const [rating, setRating] = useState(interview.rating || 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<HrQuestionTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [tmplDept, setTmplDept] = useState("");
  const [tmplRole, setTmplRole] = useState("");
  const [tmplRound, setTmplRound] = useState(interview.round || "first");

  useEffect(() => {
    setQuestions(interview.questions || []);
    setComment(interview.comment || "");
    setRating(interview.rating || 0);
  }, [interview.id]);

  useEffect(() => {
    if (tab === "templates") {
      hrApi.listTemplates(department).then((res) => setTemplates(res.templates || [])).catch(() => {});
    }
  }, [tab, department]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await hrApi.generateQuestions(department, interview.id);
      setQuestions(res.questions || []);
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestions() {
    setBusy(true);
    setError("");
    try {
      await hrApi.saveQuestions(department, interview.id, questions);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save questions");
    } finally {
      setBusy(false);
    }
  }

  async function saveComment() {
    setBusy(true);
    setError("");
    try {
      await hrApi.saveComment(department, interview.id, comment, rating || undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save comment");
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate(tmpl: HrQuestionTemplate) {
    setQuestions([...tmpl.questions]);
    setTab("questions");
    setSaved(false);
  }

  async function saveAsTemplate() {
    if (!tmplRole.trim()) {
      setError("Role pattern is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await hrApi.createTemplate(department, {
        department: tmplDept,
        role_pattern: tmplRole,
        round: tmplRound,
        questions,
      });
      setShowSaveTemplate(false);
      setTmplDept("");
      setTmplRole("");
      setTab("templates");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: number) {
    if (!confirm("Delete this template?")) return;
    try {
      await hrApi.deleteTemplate(department, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }

  const roundLabel = interview.round === "ceo" ? "CEO Interview" : interview.round === "manager" ? "Manager Interview" : "HR Interview";

  const tabs: { id: Tab; label: string }[] = [
    { id: "questions", label: `Questions (${questions.length})` },
    { id: "templates", label: "Templates" },
    { id: "comment", label: "Post-Interview" },
  ];

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: "0.6rem", background: "var(--samurai-bg)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.8rem", borderBottom: `1px solid ${BORDER}`, background: SURFACE_2 }}>
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>📋 {roundLabel} Questions</span>
          {interview.interviewer_name && (
            <span style={{ fontSize: "0.72rem", color: MUTED, marginLeft: "0.5rem" }}>· {interview.interviewer_name}</span>
          )}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer" }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "0.45rem 0.5rem", border: "none", borderBottom: tab === t.id ? `2px solid ${LIME}` : "2px solid transparent",
              background: "transparent", color: tab === t.id ? TEXT : MUTED, fontSize: "0.78rem", fontWeight: tab === t.id ? 700 : 500, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0.75rem 0.8rem" }}>
        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.5rem" }}>{error}</p>}
        {saved && <p style={{ color: "var(--samurai-ok)", fontSize: "0.78rem", margin: "0 0 0.5rem" }}>✓ Saved</p>}

        {/* QUESTIONS TAB */}
        {tab === "questions" && (
          <div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={generate} style={btnPrimary}>
                <Sparkles size={13} /> Generate with AI
              </button>
              <button type="button" disabled={busy} onClick={saveQuestions} style={btnOutline}>
                <Save size={13} /> Save Questions
              </button>
              <button type="button" onClick={() => setShowSaveTemplate(!showSaveTemplate)} style={btnOutline}>
                💾 Save as Template
              </button>
            </div>

            {showSaveTemplate && (
              <div style={{ padding: "0.5rem", marginBottom: "0.6rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 700, color: TEXT }}>Save as reusable template</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <input placeholder="Department" value={tmplDept} onChange={(e) => setTmplDept(e.target.value)} style={inputStyle} />
                  <input placeholder="Role pattern (e.g. Engineer)" value={tmplRole} onChange={(e) => setTmplRole(e.target.value)} style={inputStyle} />
                  <select value={tmplRound} onChange={(e) => setTmplRound(e.target.value)} style={inputStyle}>
                    <option value="first">HR Round</option>
                    <option value="manager">Manager Round</option>
                    <option value="ceo">CEO Round</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button type="button" disabled={busy} onClick={saveAsTemplate} style={{ ...btnPrimary, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>Save Template</button>
                  <button type="button" onClick={() => setShowSaveTemplate(false)} style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>Cancel</button>
                </div>
              </div>
            )}

            {questions.length === 0 ? (
              <p style={{ fontSize: "0.78rem", color: MUTED, textAlign: "center", padding: "1rem 0" }}>
                No questions yet. Click "Generate with AI" to create 10 questions based on the resume and job description.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {questions.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: MUTED, minWidth: "1.5rem", paddingTop: "0.45rem" }}>{i + 1}.</span>
                    <textarea
                      value={q}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[i] = e.target.value;
                        setQuestions(updated);
                        setSaved(false);
                      }}
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical", flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQuestions(questions.filter((_, j) => j !== i));
                        setSaved(false);
                      }}
                      style={{ border: "none", background: "transparent", color: DANGER, cursor: "pointer", padding: "0.3rem" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQuestions([...questions, ""])}
                  style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem", alignSelf: "flex-start", marginTop: "0.3rem" }}
                >
                  + Add question
                </button>
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {tab === "templates" && (
          <div>
            {templates.length === 0 ? (
              <p style={{ fontSize: "0.78rem", color: MUTED, textAlign: "center", padding: "1rem 0" }}>
                No templates yet. Save a question set as a template from the Questions tab.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {templates.map((tmpl) => (
                  <div key={tmpl.id} style={{ padding: "0.5rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT }}>
                          {tmpl.role_pattern || "General"} · {tmpl.round === "ceo" ? "CEO" : tmpl.round === "manager" ? "Manager" : "HR"}
                        </span>
                        {tmpl.department && <span style={{ fontSize: "0.7rem", color: MUTED, marginLeft: "0.4rem" }}>({tmpl.department})</span>}
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button type="button" onClick={() => applyTemplate(tmpl)} style={{ ...btnPrimary, fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>Apply</button>
                        <button type="button" onClick={() => deleteTemplate(tmpl.id)} style={{ border: "none", background: "transparent", color: DANGER, cursor: "pointer" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: MUTED }}>{tmpl.questions.length} questions</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMENT TAB */}
        {tab === "comment" && (
          <div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 700, color: TEXT }}>Post-Interview Assessment</p>
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Rating</label>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    style={{
                      border: "none", background: "transparent", cursor: "pointer", padding: "0.15rem",
                      color: n <= rating ? "#f59e0b" : MUTED,
                    }}
                  >
                    <Star size={18} fill={n <= rating ? "#f59e0b" : "none"} />
                  </button>
                ))}
                {rating > 0 && <span style={{ fontSize: "0.75rem", color: TEXT, marginLeft: "0.3rem", alignSelf: "center" }}>{rating}/5</span>}
              </div>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Overall Comment</label>
              <textarea
                value={comment}
                onChange={(e) => { setComment(e.target.value); setSaved(false); }}
                rows={5}
                placeholder="Write your overall assessment of the candidate's performance in this interview…"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <button type="button" disabled={busy} onClick={saveComment} style={btnPrimary}>
              <Save size={13} /> Save Comment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
