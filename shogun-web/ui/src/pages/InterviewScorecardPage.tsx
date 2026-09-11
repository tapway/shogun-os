import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, hrApi } from "../lib/api";
import type { HrInterviewTemplate } from "../lib/types";
import type { HrInterview, HrCandidate } from "../lib/types";

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const WARNING = "var(--samurai-warning)";
const OK = "var(--samurai-ok)";

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

interface ScorecardData {
  candidate: HrCandidate;
  interviews: HrInterview[];
  current_interview: HrInterview | null;
  job_opening?: {
    id: number;
    job_title: string;
    department: string;
    description?: string;
    employment_type?: string;
    experience?: string;
    budget_max?: number | null;
  } | null;
  scorecard: {
    id: number;
    status: string;
    expires_at: string;
  };
}

export function InterviewScorecardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [questionAnswers, setQuestionAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Questions & Templates state
  const [qTab, setQTab] = useState<"questions" | "templates">("questions");
  const [genSource, setGenSource] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [templates, setTemplates] = useState<HrInterviewTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ScorecardData>(`/api/departments/hr/dashboard/interview-scorecard/${token}`)
      .then((res) => {
        setData(res);
        // Pre-populate answers if already submitted
        if (res.current_interview?.question_answers) {
          setQuestionAnswers(res.current_interview.question_answers);
        }
        if (res.current_interview?.rating) {
          setRating(res.current_interview.rating);
        }
        if (res.current_interview?.comment) {
          setComment(res.current_interview.comment);
        }
        if (res.scorecard.status === "completed") {
          setSubmitted(true);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load scorecard");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Load interview templates
  useEffect(() => {
    if (data?.current_interview && templates.length === 0) {
      setTemplatesLoading(true);
      hrApi.listInterviewTemplates("hr")
        .then((res) => setTemplates(res.templates || []))
        .catch(() => {})
        .finally(() => setTemplatesLoading(false));
    }
  }, [data?.current_interview]);

  // Build auto-source from candidate data + stage-specific focus
  const buildAutoSource = () => {
    if (!data) return "";
    const parts: string[] = [];
    
    // Candidate info
    parts.push(`CANDIDATE: ${data.candidate.name}`);
    if (data.candidate.role) parts.push(`APPLIED FOR: ${data.candidate.role}`);
    
    // Job description if available
    if (data.job_opening) {
      if (data.job_opening.description) parts.push(`\nJOB DESCRIPTION:\n${data.job_opening.description}`);
      if (data.job_opening.employment_type) parts.push(`EMPLOYMENT TYPE: ${data.job_opening.employment_type}`);
      if (data.job_opening.experience) parts.push(`EXPERIENCE REQUIRED: ${data.job_opening.experience}`);
      if (data.job_opening.budget_max) parts.push(`SALARY BUDGET: RM ${data.job_opening.budget_max.toLocaleString()}`);
    }
    
    // Screening answers
    if (data.candidate.screening_answers_json) {
      try {
        const answers = JSON.parse(data.candidate.screening_answers_json);
        if (Array.isArray(answers.questions)) {
          parts.push("\nSCREENING ANSWERS:");
          answers.questions.forEach((qa: any, i: number) => {
            parts.push(`Q${i+1}: ${qa.q}\nA: ${qa.a}`);
          });
        }
      } catch {}
    }
    
    // Stage-specific focus
    const round = (data.current_interview?.round || "").toLowerCase();
    if (round === "first" || round === "hr") {
      parts.push("\n\nFOCUS: HR screening — assess cultural fit, motivation, communication skills, career goals, salary expectations, availability.");
    } else if (round === "manager") {
      parts.push("\n\nFOCUS: Manager/Technical interview — assess technical skills, problem-solving, domain expertise, team collaboration, past project experience, leadership potential.");
    } else if (round === "ceo") {
      parts.push("\n\nFOCUS: CEO/Final interview — assess strategic thinking, vision alignment, leadership qualities, long-term commitment, company values fit, growth mindset.");
    }
    
    return parts.join("\n");
  };

  const handleGenerateQuestions = async () => {
    if (!data?.candidate || !data?.current_interview) return;
    setGenerating(true);
    setError("");
    try {
      // Combine auto-source with user's custom specifications
      const autoSource = buildAutoSource();
      const customSpec = genSource.trim();
      const combinedSource = customSpec 
        ? `${autoSource}\n\nADDITIONAL SPECIFICATIONS FROM INTERVIEWER:\n${customSpec}`
        : autoSource;
      
      const res = await apiFetch<{ questions: string[] }>(
        `/api/departments/hr/dashboard/hr/interviews/${data.current_interview.id}/generate-questions`,
        {
          method: "POST",
          body: JSON.stringify({ source_text: combinedSource, count: 5 }),
        }
      );
      setGeneratedQuestions(res.questions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !data?.current_interview) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/api/departments/hr/dashboard/interview-scorecard/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          question_answers: questionAnswers.filter((qa) => qa.a.trim()),
        }),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--samurai-bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="h-8 w-8 animate-spin rounded-full" style={{ border: `3px solid ${LIME}`, borderTopColor: "transparent", margin: "0 auto 1rem" }} />
          <p style={{ color: MUTED }}>Loading scorecard…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--samurai-bg)", padding: "2rem" }}>
        <div style={{ maxWidth: "500px", textAlign: "center" }}>
          <h2 style={{ color: TEXT, marginBottom: "1rem" }}>⚠️ Unable to Load Scorecard</h2>
          <p style={{ color: MUTED }}>{error}</p>
          <p style={{ color: MUTED, marginTop: "1rem", fontSize: "0.85rem" }}>
            This link may have expired, been revoked, or you may not have access. Please contact HR for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { candidate, interviews, current_interview, scorecard } = data;
  const previousInterviews = interviews.filter((i) => i.id !== current_interview?.id && (i.rating || i.comment || i.question_answers?.length));

  if (submitted) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--samurai-bg)", padding: "2rem" }}>
        <div style={{ maxWidth: "500px", textAlign: "center", padding: "2rem", borderRadius: "0.75rem", border: `1px solid ${OK}`, background: SURFACE }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ color: TEXT, marginBottom: "0.5rem" }}>Assessment Submitted</h2>
          <p style={{ color: MUTED }}>Thank you! Your interview assessment has been recorded.</p>
          <p style={{ color: MUTED, marginTop: "1rem", fontSize: "0.85rem" }}>
            You can close this page. HR will review your feedback.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--samurai-bg)", padding: "1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem", padding: "1.25rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.3rem", fontWeight: 700, color: TEXT }}>
            📋 Interview Scorecard
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "0.85rem" }}>
            <div><span style={{ color: MUTED }}>Candidate:</span> <strong style={{ color: TEXT }}>{candidate.name}</strong></div>
            <div><span style={{ color: MUTED }}>Position:</span> <strong style={{ color: TEXT }}>{candidate.role || "—"}</strong></div>
            <div><span style={{ color: MUTED }}>Round:</span> <strong style={{ color: TEXT }}>{current_interview?.round || "Interview"}</strong></div>
            {current_interview?.scheduled_at && (
              <div><span style={{ color: MUTED }}>Scheduled:</span> <strong style={{ color: TEXT }}>{new Date(current_interview.scheduled_at).toLocaleString("en-MY")}</strong></div>
            )}
          </div>
        </div>

        {/* Resume & Screening */}
        <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: TEXT }}>📄 Resume & Screening</h2>
          {candidate.resume_url ? (
            <iframe src={candidate.resume_url} style={{ width: "100%", height: "400px", border: `1px solid ${BORDER}`, borderRadius: "0.4rem" }} title="Resume" />
          ) : (
            <p style={{ color: MUTED, fontSize: "0.85rem" }}>No resume available</p>
          )}
          {candidate.screening_answers_json && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 600, color: TEXT }}>Screening Answers</h3>
              <div style={{ padding: "0.75rem", borderRadius: "0.4rem", background: SURFACE_2, fontSize: "0.85rem", color: TEXT, whiteSpace: "pre-wrap" }}>
                {(() => {
                  try {
                    const answers = JSON.parse(candidate.screening_answers_json);
                    if (Array.isArray(answers.questions)) {
                      return answers.questions.map((q: any, i: number) => (
                        <div key={i} style={{ marginBottom: "0.5rem" }}>
                          <strong style={{ color: LIME }}>Q{i + 1}: {q.q}</strong>
                          <div style={{ color: TEXT, marginTop: "0.2rem" }}>{q.a}</div>
                        </div>
                      ));
                    }
                    return JSON.stringify(answers, null, 2);
                  } catch {
                    return candidate.screening_answers_json;
                  }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Previous Interviews */}
        {previousInterviews.length > 0 && (
          <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: TEXT }}>📋 Previous Interviews (Read-Only)</h2>
            {previousInterviews.map((iv) => (
              <div key={iv.id} style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong style={{ color: TEXT, fontSize: "0.9rem" }}>
                    {iv.round === "first" ? "HR" : iv.round === "manager" ? "Manager" : iv.round === "ceo" ? "CEO" : iv.round} Interview
                  </strong>
                  {iv.rating && (
                    <span style={{ color: WARNING, fontSize: "0.9rem" }}>{"★".repeat(iv.rating)}{"☆".repeat(5 - iv.rating)}</span>
                  )}
                </div>
                {iv.question_answers && iv.question_answers.length > 0 && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    {iv.question_answers.slice(0, 3).map((qa, i) => (
                      <div key={i} style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                        <span style={{ color: LIME, fontWeight: 600 }}>Q{i + 1}:</span> <span style={{ color: MUTED }}>{qa.q}</span>
                        <div style={{ color: TEXT, marginLeft: "1.5rem" }}>{qa.a}</div>
                      </div>
                    ))}
                    {iv.question_answers.length > 3 && (
                      <p style={{ fontSize: "0.75rem", color: MUTED, fontStyle: "italic" }}>...and {iv.question_answers.length - 3} more questions</p>
                    )}
                  </div>
                )}
                {iv.comment && (
                  <div style={{ fontSize: "0.8rem", color: TEXT, fontStyle: "italic" }}>
                    <strong>Comment:</strong> {iv.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Questions & Templates */}
        {current_interview && (
          <div style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                onClick={() => setQTab("questions")}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.4rem",
                  border: qTab === "questions" ? `2px solid ${LIME}` : `1px solid ${BORDER}`,
                  background: qTab === "questions" ? LIME : "transparent",
                  color: qTab === "questions" ? "#0a0a0a" : TEXT,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                🤖 AI Questions
              </button>
              <button
                onClick={() => setQTab("templates")}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.4rem",
                  border: qTab === "templates" ? `2px solid ${LIME}` : `1px solid ${BORDER}`,
                  background: qTab === "templates" ? LIME : "transparent",
                  color: qTab === "templates" ? "#0a0a0a" : TEXT,
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                📋 Templates
              </button>
            </div>

            {qTab === "questions" && (
              <div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
                    Generate Questions From
                  </label>
                  <textarea
                    value={genSource}
                    onChange={(e) => setGenSource(e.target.value)}
                    placeholder="Add specific focus areas, skills to probe, or custom requirements (optional)...&#10;&#10;System will auto-include: resume, screening answers, job description, and stage-appropriate focus."
                    rows={3}
                    style={{ ...inputStyle, fontSize: "0.8rem", resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={generating}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "0.4rem",
                    border: "none",
                    background: generating ? MUTED : LIME,
                    color: "#0a0a0a",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: generating ? "not-allowed" : "pointer",
                  }}
                >
                  {generating ? "Generating..." : "🤖 Generate AI Questions"}
                </button>
                <div style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: MUTED }}>
                  Auto-includes: resume • screening answers • job description • {
                    (data?.current_interview?.round || "").toLowerCase() === "manager" ? "technical focus" :
                    (data?.current_interview?.round || "").toLowerCase() === "ceo" ? "strategic/leadership focus" :
                    "HR/cultural fit focus"
                  }
                </div>
                {generatedQuestions.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>Generated Questions:</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {generatedQuestions.map((q, i) => (
                        <div key={i} style={{ padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2, fontSize: "0.8rem", color: TEXT }}>
                          <strong style={{ color: LIME }}>Q{i + 1}:</strong> {q}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setQuestionAnswers(generatedQuestions.map((q) => ({ q, a: "" })));
                        setQTab("questions");
                      }}
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "0.4rem",
                        border: "none",
                        background: OK,
                        color: "#0a0a0a",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ✓ Use These Questions
                    </button>
                  </div>
                )}
              </div>
            )}

            {qTab === "templates" && (
              <div>
                {templatesLoading ? (
                  <p style={{ color: MUTED, fontSize: "0.85rem" }}>Loading templates...</p>
                ) : templates.length === 0 ? (
                  <p style={{ color: MUTED, fontSize: "0.85rem" }}>No templates available</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          try {
                            const qs = tpl.questions;
                            if (Array.isArray(qs)) {
                              setQuestionAnswers(qs.map((q: string) => ({ q, a: "" })));
                              setQTab("questions");
                            }
                          } catch {
                            // Ignore parse errors
                          }
                        }}
                        style={{
                          padding: "0.6rem",
                          borderRadius: "0.4rem",
                          border: `1px solid ${BORDER}`,
                          background: SURFACE_2,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = LIME)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
                      >
                        <strong style={{ color: TEXT }}>{tpl.name}</strong>
                        <div style={{ fontSize: "0.75rem", color: MUTED, marginTop: "0.2rem" }}>
                          {tpl.round} · {(() => { try { return tpl.questions.length; } catch { return 0; } })()} questions
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Current Assessment Form */}
        {current_interview && (
          <div style={{ padding: "1.25rem", borderRadius: "0.75rem", border: `2px solid ${LIME}`, background: SURFACE }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700, color: TEXT }}>✏️ Your Assessment</h2>

            {/* Questions */}
            {current_interview.questions && current_interview.questions.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 600, color: TEXT }}>Question Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {current_interview.questions.map((q, i) => (
                    <div key={i} style={{ padding: "0.75rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: LIME, marginBottom: "0.4rem" }}>
                        Q{i + 1}: {q}
                      </div>
                      <textarea
                        value={questionAnswers[i]?.a || ""}
                        onChange={(e) => {
                          const newAnswers = [...questionAnswers];
                          while (newAnswers.length <= i) newAnswers.push({ q: current_interview.questions![newAnswers.length], a: "" });
                          newAnswers[i] = { q, a: e.target.value };
                          setQuestionAnswers(newAnswers);
                        }}
                        placeholder="Candidate's answer / your notes…"
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", fontSize: "0.8rem" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rating */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem" }}>
                Overall Rating
              </label>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "1.6rem",
                      cursor: "pointer",
                      color: (rating ?? 0) >= n ? WARNING : MUTED,
                      padding: "0 0.15rem",
                    }}
                  >
                    {n <= (rating ?? 0) ? "★" : "☆"}
                  </button>
                ))}
                {rating != null && (
                  <span style={{ fontSize: "0.85rem", color: MUTED, alignSelf: "center", marginLeft: "0.5rem" }}>
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem" }}>
                Overall Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Overall assessment of the candidate…"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Submit */}
            {error && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.4rem", border: `1px solid var(--samurai-danger)`, background: `color-mix(in srgb, var(--samurai-danger) 8%, transparent)`, color: "var(--samurai-danger)", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: submitting ? MUTED : LIME,
                color: "#0a0a0a",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting…" : "Submit Assessment"}
            </button>
          </div>
        )}

        {!current_interview && (
          <div style={{ padding: "2rem", textAlign: "center", borderRadius: "0.75rem", border: `1px solid ${BORDER}`, background: SURFACE }}>
            <p style={{ color: MUTED }}>No active interview scheduled for this candidate.</p>
          </div>
        )}
      </div>
    </div>
  );
}
