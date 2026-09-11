import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, hrApi } from "../lib/api";
import type { HrInterviewTemplate, HrInterview, HrCandidate } from "../lib/types";

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const WARNING = "var(--samurai-warning)";
const OK = "var(--samurai-ok)";
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

type RoundKey = "hr" | "manager" | "ceo";

interface RoundData {
  questionAnswers: Array<{ q: string; a: string }>;
  rating: number | null;
  comment: string;
  notes: string;
  generatedQuestions: string[];
  editingQuestions: string[];
  isEditingGen: boolean;
  genSource: string;
  generating: boolean;
  submitted: boolean;
  draftSavedAt: string | null;
}

const EMPTY_ROUND: RoundData = {
  questionAnswers: [],
  rating: null,
  comment: "",
  notes: "",
  generatedQuestions: [],
  editingQuestions: [],
  isEditingGen: false,
  genSource: "",
  generating: false,
  submitted: false,
  draftSavedAt: null,
};

const ROUND_LABELS: Record<RoundKey, string> = { hr: "HR Interview", manager: "Manager Interview", ceo: "CEO Interview" };
const ROUND_FOCUS: Record<RoundKey, string> = {
  hr: "HR screening — assess cultural fit, motivation, communication skills, career goals, salary expectations, availability.",
  manager: "Manager/Technical interview — assess technical skills, problem-solving, domain expertise, team collaboration, past project experience, leadership potential.",
  ceo: "CEO/Final interview — assess strategic thinking, vision alignment, leadership qualities, long-term commitment, company values fit, growth mindset.",
};

interface ScorecardData {
  candidate: HrCandidate;
  interviews: HrInterview[];
  rounds: Record<string, any>;
  job_opening?: { id: number; job_title: string; department: string; description?: string; employment_type?: string; experience?: string; budget_max?: number | null } | null;
  scorecard: { id: number; status: string; expires_at: string };
}

export function InterviewScorecardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<RoundKey>("hr");

  // Per-round state
  const [rounds, setRounds] = useState<Record<RoundKey, RoundData>>({ hr: { ...EMPTY_ROUND }, manager: { ...EMPTY_ROUND }, ceo: { ...EMPTY_ROUND } });
  const [templates, setTemplates] = useState<HrInterviewTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Helper to update one round's state
  const updateRound = (round: RoundKey, patch: Partial<RoundData>) => {
    setRounds((prev) => ({ ...prev, [round]: { ...prev[round], ...patch } }));
  };

  const rd = rounds[activeTab];

  // Load scorecard data
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ScorecardData>(`/api/departments/hr/dashboard/interview-scorecard/${token}`)
      .then((res) => {
        setData(res);
        // Populate each round from server data
        const newRounds: Record<RoundKey, RoundData> = { hr: { ...EMPTY_ROUND }, manager: { ...EMPTY_ROUND }, ceo: { ...EMPTY_ROUND } };
        for (const [key, iv] of Object.entries(res.rounds || {})) {
          const rk = key as RoundKey;
          if (!(rk in newRounds)) continue;
          const draft = (iv as any).draft_data;
          if (draft && typeof draft === "object" && draft.question_answers) {
            newRounds[rk] = {
              ...EMPTY_ROUND,
              questionAnswers: draft.question_answers || [],
              notes: draft.notes || "",
              rating: draft.rating ?? null,
              comment: draft.comment || "",
            };
          } else if ((iv as any).question_answers?.length) {
            newRounds[rk] = {
              ...EMPTY_ROUND,
              questionAnswers: (iv as any).question_answers,
              rating: (iv as any).rating ?? null,
              comment: (iv as any).comment || "",
            };
          }
          // Check if already submitted
          if ((iv as any).status === "completed" || (iv as any).review_rating != null) {
            newRounds[rk].submitted = true;
          }
        }
        setRounds(newRounds);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load scorecard"))
      .finally(() => setLoading(false));
  }, [token]);

  // Load templates
  useEffect(() => {
    if (data && templates.length === 0) {
      setTemplatesLoading(true);
      hrApi.listInterviewTemplates("hr").then((res) => setTemplates(res.templates || [])).catch(() => {}).finally(() => setTemplatesLoading(false));
    }
  }, [data]);

  // Build auto-source for AI generation
  const buildAutoSource = (round: RoundKey) => {
    if (!data) return "";
    const parts: string[] = [];
    parts.push(`CANDIDATE: ${data.candidate.name}`);
    if (data.candidate.role) parts.push(`APPLIED FOR: ${data.candidate.role}`);

    // Job description (text field)
    if (data.job_opening) {
      if (data.job_opening.description) parts.push(`\nJOB DESCRIPTION:\n${data.job_opening.description}`);
      if (data.job_opening.employment_type) parts.push(`EMPLOYMENT TYPE: ${data.job_opening.employment_type}`);
      if (data.job_opening.experience) parts.push(`EXPERIENCE REQUIRED: ${data.job_opening.experience}`);
      if (data.job_opening.budget_max) parts.push(`SALARY BUDGET: RM ${data.job_opening.budget_max.toLocaleString()}`);
    }

    // Job description document (uploaded PDF/doc)
    const jdFileText = (data as any).jd_file_text;
    if (jdFileText) {
      parts.push(`\nJOB DESCRIPTION DOCUMENT:\n${jdFileText}`);
    }

    // Candidate resume (extracted text)
    const resumeText = (data as any).resume_text;
    if (resumeText) {
      parts.push(`\nCANDIDATE RESUME:\n${resumeText}`);
    }

    // Screening answers (structured JSON)
    if (data.candidate.screening_answers_json) {
      try {
        const answers = JSON.parse(data.candidate.screening_answers_json);
        if (Array.isArray(answers.questions)) {
          parts.push("\nSCREENING ANSWERS (STRUCTURED):");
          answers.questions.forEach((qa: any, i: number) => parts.push(`Q${i + 1}: ${qa.q}\nA: ${qa.a}`));
        }
      } catch {}
    }

    // Screening answers document (uploaded PDF/doc)
    const screeningText = (data as any).screening_text;
    if (screeningText) {
      parts.push(`\nSCREENING ANSWERS DOCUMENT:\n${screeningText}`);
    }

    parts.push(`\n\nFOCUS: ${ROUND_FOCUS[round]}`);
    return parts.join("\n");
  };

  const handleGenerateQuestions = async (round: RoundKey) => {
    const r = rounds[round];
    if (!data?.candidate) return;
    updateRound(round, { generating: true });
    setError("");
    try {
      const autoSource = buildAutoSource(round);
      const customSpec = r.genSource.trim();
      const combinedSource = customSpec ? `${autoSource}\n\nADDITIONAL SPECIFICATIONS:\n${customSpec}` : autoSource;
      // Find interview ID for this round
      const ivId = data.rounds?.[round]?.id || data.interviews?.find((i) => i.round === round || (round === "hr" && i.round === "first"))?.id;
      if (!ivId) throw new Error("No interview found for this round");
      const res = await apiFetch<{ questions: string[] }>(`/api/departments/hr/dashboard/hr/interviews/${ivId}/generate-questions`, {
        method: "POST",
        body: JSON.stringify({ source_text: combinedSource, count: 5 }),
      });
      updateRound(round, { generatedQuestions: res.questions || [], generating: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
      updateRound(round, { generating: false });
    }
  };

  const handleSaveDraft = async (round: RoundKey) => {
    if (!token) return;
    const r = rounds[round];
    updateRound(round, { draftSavedAt: null }); // clear old timestamp
    setError("");
    try {
      const res = await apiFetch<{ ok: boolean; saved_at: string }>(`/api/departments/hr/dashboard/interview-scorecard/${token}/save-draft?round=${round}`, {
        method: "POST",
        body: JSON.stringify({ rating: r.rating, comment: r.comment.trim(), notes: r.notes.trim(), question_answers: r.questionAnswers.filter((qa) => qa.q.trim()) }),
      });
      updateRound(round, { draftSavedAt: res.saved_at });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft");
    }
  };

  const handleSubmit = async (round: RoundKey) => {
    if (!token) return;
    const r = rounds[round];
    setError("");
    try {
      await apiFetch(`/api/departments/hr/dashboard/interview-scorecard/${token}/submit?round=${round}`, {
        method: "POST",
        body: JSON.stringify({ rating: r.rating, comment: r.comment.trim(), notes: r.notes.trim(), question_answers: r.questionAnswers.filter((qa) => qa.q.trim()) }),
      });
      updateRound(round, { submitted: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--samurai-bg)" }}><div style={{ textAlign: "center" }}><div className="h-8 w-8 animate-spin rounded-full" style={{ border: `3px solid ${LIME}`, borderTopColor: "transparent", margin: "0 auto 1rem" }} /><p style={{ color: MUTED }}>Loading scorecard…</p></div></div>;
  }

  if (error && !data) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--samurai-bg)", padding: "2rem" }}><div style={{ maxWidth: "500px", textAlign: "center" }}><h2 style={{ color: TEXT, marginBottom: "1rem" }}>⚠️ Unable to Load Scorecard</h2><p style={{ color: MUTED }}>{error}</p></div></div>;
  }

  if (!data) return null;

  const { candidate } = data;

  return (
    <div style={{ minHeight: "100vh", background: "var(--samurai-bg)", padding: "1.5rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1rem", padding: "1rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", fontWeight: 700, color: TEXT }}>📋 Interview Scorecard</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.4rem", fontSize: "0.82rem" }}>
            <div><span style={{ color: MUTED }}>Candidate:</span> <strong style={{ color: TEXT }}>{candidate.name}</strong></div>
            <div><span style={{ color: MUTED }}>Position:</span> <strong style={{ color: TEXT }}>{candidate.role || "—"}</strong></div>
            {data.job_opening && <div><span style={{ color: MUTED }}>Dept:</span> <strong style={{ color: TEXT }}>{data.job_opening.department}</strong></div>}
          </div>
        </div>

        {/* Round Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
          {(["hr", "manager", "ceo"] as RoundKey[]).map((rk) => (
            <button
              key={rk}
              onClick={() => setActiveTab(rk)}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "0.5rem",
                border: activeTab === rk ? `2px solid ${LIME}` : `1px solid ${BORDER}`,
                background: activeTab === rk ? LIME : SURFACE,
                color: activeTab === rk ? "#0a0a0a" : TEXT,
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {ROUND_LABELS[rk]}
              {rounds[rk].submitted && <span style={{ marginLeft: "0.3rem" }}>✅</span>}
              {rounds[rk].draftSavedAt && !rounds[rk].submitted && <span style={{ marginLeft: "0.3rem" }}>💾</span>}
            </button>
          ))}
        </div>

        {/* Resume & Screening (shared across tabs) */}
        <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>📄 Resume & Screening Answers</summary>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Resume PDF */}
              {candidate.resume_url && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT, marginBottom: "0.4rem" }}>📋 Resume</div>
                  <iframe src={candidate.resume_url} style={{ width: "100%", height: "600px", border: `1px solid ${BORDER}`, borderRadius: "0.5rem" }} title="Resume" />
                </div>
              )}
              {/* Screening Answer PDF (uploaded file) */}
              {candidate.screening_answers_url && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT, marginBottom: "0.4rem" }}>📝 Screening Answer (PDF)</div>
                  <iframe src={candidate.screening_answers_url} style={{ width: "100%", height: "600px", border: `1px solid ${BORDER}`, borderRadius: "0.5rem" }} title="Screening Answers" />
                </div>
              )}
              {/* Screening Answers JSON (structured data) */}
              {candidate.screening_answers_json && (
                <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: SURFACE_2, fontSize: "0.8rem", color: TEXT, whiteSpace: "pre-wrap" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT, marginBottom: "0.4rem" }}>📊 Screening Answers (Structured)</div>
                  {(() => { try { const a = JSON.parse(candidate.screening_answers_json!); if (Array.isArray(a.questions)) return a.questions.map((q: any, i: number) => <div key={i} style={{ marginBottom: "0.4rem", paddingBottom: "0.4rem", borderBottom: `1px solid ${BORDER}` }}><strong style={{ color: LIME }}>Q{i + 1}: {q.q}</strong><div style={{ marginTop: "0.2rem", color: TEXT }}>{q.a}</div></div>); return JSON.stringify(a, null, 2); } catch { return candidate.screening_answers_json; } })()}
                </div>
              )}
              {!candidate.resume_url && !candidate.screening_answers_url && !candidate.screening_answers_json && (
                <p style={{ color: MUTED, fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>No resume or screening answers uploaded yet.</p>
              )}
            </div>
          </details>
        </div>



        {/* Active Tab Content */}
        <div style={{ padding: "1rem", borderRadius: "0.75rem", border: rd.submitted ? `2px solid ${OK}` : `2px solid ${LIME}`, background: SURFACE }}>
            {/* Status Banner */}
            {rd.submitted && (
              <div style={{ marginBottom: "1rem", padding: "0.6rem 1rem", borderRadius: "0.5rem", background: OK, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>✅</span>
                <span style={{ fontWeight: 700, color: "#0a0a0a", fontSize: "0.9rem" }}>{ROUND_LABELS[activeTab]} — Submitted</span>
              </div>
            )}
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: TEXT }}>{rd.submitted ? "📋" : "✏️"} {ROUND_LABELS[activeTab]}</h2>

            {/* AI Questions - hidden when submitted */}
            {!rd.submitted && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>🤖 AI Questions</h3>
              <textarea value={rd.genSource} onChange={(e) => updateRound(activeTab, { genSource: e.target.value })} placeholder={`Custom focus for ${ROUND_LABELS[activeTab]} (optional)...`} rows={2} style={{ ...inputStyle, fontSize: "0.8rem", resize: "vertical", fontFamily: "inherit", marginBottom: "0.5rem" }} />
              <button onClick={() => handleGenerateQuestions(activeTab)} disabled={rd.generating} style={{ padding: "0.35rem 0.7rem", borderRadius: "0.4rem", border: "none", background: rd.generating ? MUTED : LIME, color: "#0a0a0a", fontWeight: 600, fontSize: "0.78rem", cursor: rd.generating ? "not-allowed" : "pointer" }}>
                {rd.generating ? "Generating..." : "🤖 Generate"}
              </button>
              <div style={{ marginTop: "0.3rem", fontSize: "0.68rem", color: MUTED }}>Auto: resume • screening • job desc • JD doc • {ROUND_FOCUS[activeTab].split("—")[0]}</div>

              {rd.generatedQuestions.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: TEXT }}>Generated:</span>
                    {!rd.isEditingGen ? (
                      <button onClick={() => updateRound(activeTab, { editingQuestions: [...rd.generatedQuestions], isEditingGen: true })} style={{ padding: "0.2rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontSize: "0.72rem", cursor: "pointer" }}>✏️ Edit</button>
                    ) : (
                      <button onClick={() => { updateRound(activeTab, { generatedQuestions: rd.editingQuestions.filter((q) => q.trim()), isEditingGen: false }); }} style={{ padding: "0.2rem 0.5rem", borderRadius: "0.3rem", border: "none", background: OK, color: "#0a0a0a", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>✓ Done</button>
                    )}
                  </div>
                  {!rd.isEditingGen ? (
                    <>
                      {rd.generatedQuestions.map((q, i) => (<div key={i} style={{ padding: "0.4rem", borderRadius: "0.3rem", border: `1px solid ${BORDER}`, background: SURFACE, fontSize: "0.78rem", color: TEXT, marginBottom: "0.3rem" }}><strong style={{ color: LIME }}>Q{i + 1}:</strong> {q}</div>))}
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        <button onClick={() => updateRound(activeTab, { questionAnswers: rd.generatedQuestions.map((q) => ({ q, a: "" })) })} style={{ padding: "0.3rem 0.6rem", borderRadius: "0.3rem", border: "none", background: OK, color: "#0a0a0a", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>✓ Use These</button>
                        <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name..." style={{ ...inputStyle, width: "150px", fontSize: "0.78rem", padding: "0.3rem 0.5rem" }} />
                        <button onClick={async () => { if (!templateName.trim() || !data?.rounds?.[activeTab]?.id) return; setSavingTemplate(true); try { await apiFetch(`/api/departments/hr/dashboard/hr/interviews/${data.rounds[activeTab].id}/save-template`, { method: "POST", body: JSON.stringify({ name: templateName.trim() }) }); setTemplateName(""); hrApi.listInterviewTemplates("hr").then((r) => setTemplates(r.templates || [])); } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); } finally { setSavingTemplate(false); } }} disabled={savingTemplate || !templateName.trim()} style={{ padding: "0.3rem 0.5rem", borderRadius: "0.3rem", border: "none", background: savingTemplate ? MUTED : WARNING, color: "#0a0a0a", fontWeight: 600, fontSize: "0.75rem", cursor: savingTemplate ? "not-allowed" : "pointer" }}>{savingTemplate ? "..." : "💾 Save"}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {rd.editingQuestions.map((q, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.3rem", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                          <span style={{ color: LIME, fontWeight: 600, fontSize: "0.75rem", minWidth: "1.5rem", paddingTop: "0.3rem" }}>Q{i + 1}</span>
                          <textarea value={q} onChange={(e) => { const u = [...rd.editingQuestions]; u[i] = e.target.value; updateRound(activeTab, { editingQuestions: u }); }} rows={1} style={{ ...inputStyle, flex: 1, fontSize: "0.78rem", resize: "vertical", fontFamily: "inherit" }} />
                          <button onClick={() => updateRound(activeTab, { editingQuestions: rd.editingQuestions.filter((_, idx) => idx !== i) })} style={{ padding: "0.2rem 0.4rem", borderRadius: "0.3rem", border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, fontSize: "0.7rem", cursor: "pointer" }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => updateRound(activeTab, { editingQuestions: [...rd.editingQuestions, ""] })} style={{ padding: "0.25rem", borderRadius: "0.3rem", border: `1px dashed ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.72rem", cursor: "pointer", width: "100%" }}>+ Add</button>
                    </>
                  )}
                </div>
              )}

              {/* Templates */}
              {templates.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: MUTED }}>📋 Templates:</span>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                    {templates.map((tpl) => (
                      <button key={tpl.id} onClick={() => updateRound(activeTab, { questionAnswers: tpl.questions.map((q) => ({ q, a: "" })) })} style={{ padding: "0.25rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: "0.72rem", cursor: "pointer" }}>{tpl.name} ({tpl.questions.length})</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Q&A Table */}
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>Question & Answer</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}><th style={{ textAlign: "left", padding: "0.4rem", color: MUTED, fontWeight: 600, width: "45%" }}>Question</th><th style={{ textAlign: "left", padding: "0.4rem", color: MUTED, fontWeight: 600 }}>Answer / Notes</th></tr></thead>
                <tbody>
                  {rd.questionAnswers.map((qa, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "0.4rem", verticalAlign: "top" }}><textarea value={qa.q} readOnly={rd.submitted} onChange={(e) => { if (rd.submitted) return; const u = [...rd.questionAnswers]; u[i] = { ...u[i], q: e.target.value }; updateRound(activeTab, { questionAnswers: u }); }} rows={2} style={{ ...inputStyle, fontSize: "0.78rem", resize: "vertical", fontFamily: "inherit", opacity: rd.submitted ? 0.8 : 1 }} /></td>
                      <td style={{ padding: "0.4rem", verticalAlign: "top" }}><textarea value={qa.a} readOnly={rd.submitted} onChange={(e) => { if (rd.submitted) return; const u = [...rd.questionAnswers]; u[i] = { ...u[i], a: e.target.value }; updateRound(activeTab, { questionAnswers: u }); }} placeholder="Candidate response…" rows={2} style={{ ...inputStyle, fontSize: "0.78rem", resize: "vertical", fontFamily: "inherit", opacity: rd.submitted ? 0.8 : 1 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rd.submitted && <button onClick={() => updateRound(activeTab, { questionAnswers: [...rd.questionAnswers, { q: "", a: "" }] })} style={{ marginTop: "0.4rem", padding: "0.3rem", borderRadius: "0.3rem", border: `1px dashed ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.75rem", cursor: "pointer", width: "100%" }}>+ Add Row</button>}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>📝 Notes (Focus / Preparation)</label>
              <textarea value={rd.notes} readOnly={rd.submitted} onChange={(e) => { if (!rd.submitted) updateRound(activeTab, { notes: e.target.value }); }} placeholder="Key points to focus on during interview…" rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", opacity: rd.submitted ? 0.8 : 1 }} />
            </div>

            {/* Rating */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Overall Rating</label>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                {[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" disabled={rd.submitted} onClick={() => updateRound(activeTab, { rating: rd.rating === n ? null : n })} style={{ border: "none", background: "transparent", fontSize: "1.4rem", cursor: rd.submitted ? "default" : "pointer", color: (rd.rating ?? 0) >= n ? WARNING : MUTED, padding: "0 0.1rem" }}>{n <= (rd.rating ?? 0) ? "★" : "☆"}</button>))}
                {rd.rating != null && <span style={{ fontSize: "0.8rem", color: MUTED, alignSelf: "center", marginLeft: "0.4rem" }}>{rd.rating}/5</span>}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Overall Comment</label>
              <textarea value={rd.comment} readOnly={rd.submitted} onChange={(e) => { if (!rd.submitted) updateRound(activeTab, { comment: e.target.value }); }} placeholder="Overall assessment…" rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", opacity: rd.submitted ? 0.8 : 1 }} />
            </div>

            {/* Error */}
            {error && <div style={{ marginBottom: "0.75rem", padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${DANGER}`, color: DANGER, fontSize: "0.8rem" }}>{error}</div>}

            {/* Actions - hidden when submitted */}
            {!rd.submitted && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => handleSaveDraft(activeTab)} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>💾 Save Draft</button>
              <button onClick={() => handleSubmit(activeTab)} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.4rem", border: "none", background: LIME, color: "#0a0a0a", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Submit {ROUND_LABELS[activeTab]}</button>
            </div>
            )}
            {!rd.submitted && rd.draftSavedAt && <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: OK }}>✓ Draft saved {new Date(rd.draftSavedAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</div>}
          </div>
      </div>
    </div>
  );
}
