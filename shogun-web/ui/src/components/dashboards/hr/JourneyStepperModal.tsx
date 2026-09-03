import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrCandidateEvent, HrDashboardStats, HrInterview, HrJobOpening } from "../../../lib/types";

interface Props {
  candidate: HrCandidate;
  stats: HrDashboardStats;
  department: string;
  onClose: () => void;
  onOpenDetails?: (candidate: HrCandidate) => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";
const WARNING = "var(--samurai-warning)";

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

/** The guided recruitment journey, in order. Rejected is handled separately. */
const JOURNEY_STAGES = [
  { status: "Resume Received", label: "Resume Received" },
  { status: "Shortlisted", label: "Shortlisted" },
  { status: "Interview Email Sent - Waiting Reply", label: "Interview Email Sent" },
  { status: "1st Interview Scheduled", label: "1st Interview Scheduled" },
  { status: "HR Interview Done", label: "HR Interview Done" },
  { status: "Waiting Manager Interview Confirm", label: "Waiting Manager Confirm" },
  { status: "Manager Interview Scheduled", label: "Manager Interview Scheduled" },
  { status: "Manager Interview Done", label: "Manager Interview Done" },
  { status: "Waiting CEO Interview Confirm", label: "Waiting CEO Confirm" },
  { status: "CEO Interview Scheduled", label: "CEO Interview Scheduled" },
  { status: "Waiting Interview Result", label: "Waiting Result" },
  { status: "Waiting Offer Confirmation", label: "Waiting Offer Confirm" },
  { status: "Offer Sent - Waiting Reply", label: "Offer Sent" },
  { status: "Done", label: "Done 🎉" },
];

/** Journey position for a status: 0-based step index, or -1 when outside the guided journey. */
export function journeyIndex(status: string | null | undefined): number {
  const trimmed = (status || "").trim();
  return JOURNEY_STAGES.findIndex((s) => s.status === trimmed);
}

export const journeyLength = JOURNEY_STAGES.length;

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysWaiting(since: string | undefined): number {
  if (!since) return 0;
  const d = new Date(since);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

const btnPrimary: React.CSSProperties = {
  borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a",
  fontSize: "0.8rem", fontWeight: 700, padding: "0.45rem 0.9rem", cursor: "pointer",
};
const btnOutline: React.CSSProperties = {
  borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: TEXT, fontSize: "0.8rem", fontWeight: 600, padding: "0.45rem 0.9rem", cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: DANGER, fontSize: "0.8rem", fontWeight: 600, padding: "0.45rem 0.9rem", cursor: "pointer",
};

export function JourneyStepperModal({ candidate: initialCandidate, stats, department, onClose, onOpenDetails }: Props) {
  const queryClient = useQueryClient();
  const [candidate, setCandidate] = useState<HrCandidate>(initialCandidate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  // schedule form
  const [schedAt, setSchedAt] = useState("");
  const [schedInterviewer, setSchedInterviewer] = useState("");
  const [schedLocation, setSchedLocation] = useState("");

  // Sync candidate from stats when it changes (e.g., after refetch)
  useEffect(() => {
    const updated = (stats.candidates || []).find((c) => c.id === candidate.id);
    if (updated && updated.status !== candidate.status) {
      setCandidate(updated);
    }
  }, [stats.candidates, candidate.id]);

  const events: HrCandidateEvent[] = useMemo(
    () => (stats.candidate_events || []).filter((e) => e.candidate_id === candidate.id),
    [stats.candidate_events, candidate.id],
  );
  const interviews: HrInterview[] = useMemo(
    () => (stats.interviews || []).filter((i) => i.candidate_id === candidate.id),
    [stats.interviews, candidate.id],
  );
  const employees = stats.employees || [];
  const job: HrJobOpening | undefined = useMemo(() => {
    const jobs = stats.job_openings || [];
    if (candidate.job_opening_id != null) {
      const byId = jobs.find((j) => j.id === candidate.job_opening_id);
      if (byId) return byId;
    }
    return jobs.find((j) => (j.job_title || "").trim().toLowerCase() === (candidate.role || "").trim().toLowerCase());
  }, [stats.job_openings, candidate.job_opening_id, candidate.role]);

  const stage = (candidate.status || "").trim();
  const isRejected = stage === "Rejected";
  const stageIndex = JOURNEY_STAGES.findIndex((s) => s.status === stage);
  const untracked = stageIndex === -1 && !isRejected;
  const progress = stageIndex >= 0 ? stageIndex : 0;
  const isWaiting = Boolean(candidate.waiting_since);
  const waitingDays = daysWaiting(candidate.waiting_since);
  
  // CEO interview required only for Full Time and Contract positions
  const requiresCeoInterview = useMemo(() => {
    const ctype = (candidate.candidate_type || "").toLowerCase();
    return ctype === "fulltime" || ctype === "contract";
  }, [candidate.candidate_type]);

  async function refresh(updated?: HrCandidate) {
    if (updated) setCandidate({ ...candidate, ...updated });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats", department] });
  }

  async function run(fn: () => Promise<{ candidate?: HrCandidate } | void>, label: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (res && (res as { candidate?: HrCandidate }).candidate) {
        await refresh((res as { candidate: HrCandidate }).candidate);
      } else {
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  const move = (status: string, label: string) =>
    run(() => hrApi.candidateMove(department, candidate.id, status), label);

  const composeScreeningEmail = () => {
    const formLink = job?.screening_form_link || "(screening form link not set — add it in the job's Screening Setup)";
    const subj = (job?.screening_email_subject || "Screening Questions — {job_title}")
      .replaceAll("{candidate_name}", candidate.name || "")
      .replaceAll("{job_title}", candidate.role || job?.job_title || "");
    const defaultBody =
      `Dear ${candidate.name || "Candidate"},\n\n` +
      `Thank you for applying for the ${candidate.role || job?.job_title || "position"} role. As the next step, please fill in our screening questions here:\n\n` +
      `${formLink}\n\n` +
      `Kindly complete it within 3 working days.\n\nBest regards,\nHR Team`;
    const body = (job?.screening_email_body || defaultBody)
      .replaceAll("{candidate_name}", candidate.name || "")
      .replaceAll("{job_title}", candidate.role || job?.job_title || "")
      .replaceAll("{screening_link}", formLink)
      .replaceAll("{hiring_manager}", job?.hiring_manager || "");
    window.location.href = `mailto:${candidate.email || ""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  const composeInterviewEmailAndAdvance = () => {
    const subj = `Interview Invitation — ${candidate.role || job?.job_title || "the position"}`;
    const body =
      `Dear ${candidate.name || "Candidate"},\n\n` +
      `Thank you for applying for the ${candidate.role || job?.job_title || "position"} role. We are pleased to invite you for an interview.\n\n` +
      `Please reply to confirm your availability — we will share the date, time and location shortly.\n\n` +
      `Best regards,\nHR Team${job?.hiring_manager ? `\nHiring Manager: ${job.hiring_manager}` : ""}`;
    window.location.href = `mailto:${candidate.email || ""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    run(() => hrApi.candidateMove(department, candidate.id, "Interview Email Sent - Waiting Reply"), "Send interview email");
  };

  const confirmSchedule = (round: "first" | "manager" | "ceo") => {
    if (!schedAt) {
      setError("Pick an interview date & time first");
      return;
    }
    if (!schedInterviewer.trim()) {
      setError("Interviewer name is required (pick from Employee Directory or type a name)");
      return;
    }
    const emp = employees.find((e) => e.employees_name === schedInterviewer);
    run(() => hrApi.candidateSchedule(department, candidate.id, {
      round,
      scheduled_at: schedAt,
      interviewer_name: schedInterviewer.trim(),
      interviewer_employee_id: emp?.id,
      location: schedLocation.trim(),
    }), "Schedule interview");
  };

  const decision = (d: "continue" | "reject" | "offer") => {
    if (d === "reject" && !feedback.trim()) {
      setError("Add a short rejection reason first");
      return;
    }
    run(() => hrApi.candidateDecision(department, candidate.id, d, feedback.trim()), "Record decision");
  };

  const markWaiting = () => {
    const reason = window.prompt("Waiting for what? (e.g. candidate reply, manager availability)", "");
    if (reason === null) return;
    run(() => hrApi.candidateWaiting(department, candidate.id, reason.trim()), "Mark waiting");
  };

  const markReplied = () => run(() => hrApi.candidateWaiting(department, candidate.id, ""), "Mark replied");

  const rejectWithReason = () => {
    const reason = window.prompt("Rejection reason (kept in talent pool):", "Not suitable");
    if (reason === null) return;
    run(() => hrApi.candidateRemove(department, candidate.id, reason.trim() || "Not suitable"), "Reject");
  };

  const saveFeedback = () => {
    if (!feedback.trim()) return;
    run(() => hrApi.candidateComment(department, candidate.id, feedback.trim()), "Save feedback");
  };

  const nextInterview = interviews.filter((i) => i.status === "scheduled").sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""))[0];

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }} />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "min(860px, 96vw)", maxHeight: "90vh", overflowY: "auto",
          background: "var(--samurai-bg)", border: `1px solid ${BORDER}`,
          borderRadius: "0.75rem", padding: "1.25rem", zIndex: 51,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ marginRight: "auto" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: TEXT }}>
              {candidate.name || "Candidate"} — Recruitment Journey
            </h3>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: MUTED }}>
              {candidate.role || "—"}{candidate.email ? ` · ${candidate.email}` : ""}{candidate.phone_no ? ` · ${candidate.phone_no}` : ""}
            </p>
          </div>
          {onOpenDetails && (
            <button type="button" onClick={() => onOpenDetails(candidate)} style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
              Full details →
            </button>
          )}
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: "1rem" }}>
            <X size={16} />
          </button>
        </div>

        {/* Stepper bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", overflowX: "auto", padding: "0.25rem 0 0.5rem" }}>
          {JOURNEY_STAGES.map((s, idx) => {
            const done = !isRejected && !untracked && idx < stageIndex;
            const current = !isRejected && !untracked && idx === stageIndex;
            const color = isRejected ? MUTED : done ? OK : current ? LIME : MUTED;
            return (
              <div key={s.status} style={{ display: "flex", alignItems: "center" }}>
                {idx > 0 && <div style={{ width: "1rem", height: "2px", background: done || current ? LIME : BORDER }} />}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", minWidth: "4.5rem" }}>
                  <div
                    style={{
                      width: "1.6rem", height: "1.6rem", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.7rem", fontWeight: 700,
                      border: current ? `2px solid ${LIME}` : `1px solid ${done ? OK : BORDER}`,
                      background: done ? OK : current ? `color-mix(in srgb, ${LIME} 15%, transparent)` : "transparent",
                      color: done ? "#0a0a0a" : color,
                    }}
                  >
                    {done ? "✓" : isRejected ? "·" : idx + 1}
                  </div>
                  <span style={{ fontSize: "0.62rem", color: current ? TEXT : MUTED, fontWeight: current ? 700 : 400, textAlign: "center", lineHeight: 1.1 }}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {isRejected && (
          <div style={{ padding: "0.6rem 0.8rem", borderRadius: "0.5rem", border: `1px solid ${DANGER}`, background: `color-mix(in srgb, ${DANGER} 8%, transparent)`, marginBottom: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: DANGER }}>✗ Rejected</p>
            {candidate.removed_reason && <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: TEXT }}>{candidate.removed_reason}</p>}
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: MUTED }}>Kept in the Talent Pool — you can re-invite this candidate to a new job anytime.</p>
          </div>
        )}

        {isWaiting && !isRejected && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.8rem", borderRadius: "0.5rem", border: `1px solid ${WARNING}`, background: `color-mix(in srgb, ${WARNING} 8%, transparent)`, marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: WARNING }}>
              ⏳ Waiting {waitingDays}d{candidate.waiting_reason ? ` — ${candidate.waiting_reason}` : ""}
            </span>
            <button type="button" disabled={busy} onClick={markReplied} style={{ ...btnOutline, marginLeft: "auto", fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}>
              Replied — resume
            </button>
          </div>
        )}

        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.6rem" }}>{error}</p>}

        {/* Current step panel */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: "0.6rem", padding: "1rem", marginBottom: "0.75rem", background: SURFACE_2 }}>
          {untracked && (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>
                Stage: {stage || "(No status)"} — outside the guided journey
              </p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                This candidate is on a legacy/special stage. Move them into the journey below.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Resume Received", "Move to Resume Received")} style={btnOutline}>→ Resume Received</button>
                <button type="button" disabled={busy} onClick={() => move("Interview Email Sent - Waiting Reply", "Move to Interview Email Sent")} style={btnOutline}>→ Interview Email Sent</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "Resume Received" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 1 — Review the resume</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Read the resume{candidate.resume_url ? " (open Full details → Documents)" : ""}, then decide if this applicant is suitable.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Shortlisted", "Shortlist")} style={btnPrimary}>✓ Shortlist — suitable</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Not suitable</button>
              </div>
            </div>
          )}

          {stage === "Shortlisted" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 2 — Send interview confirmation email</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Email the candidate to confirm an interview slot. The candidate then enters "Waiting Reply" until they respond.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={composeInterviewEmailAndAdvance} style={btnPrimary}>📧 Send Interview Email →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "Interview Email Sent - Waiting Reply" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 3 — Waiting for candidate reply</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Once the candidate replies, schedule the 1st interview — this moves them to <strong>1st Interview Scheduled</strong>.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Date & time *</label>
                  <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Interviewer *</label>
                  <input list="journey-interviewers" value={schedInterviewer} onChange={(e) => setSchedInterviewer(e.target.value)} placeholder="Pick or type a name" style={inputStyle} />
                  <datalist id="journey-interviewers">
                    {employees.map((e) => <option key={e.id} value={e.employees_name} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Location</label>
                  <input value={schedLocation} onChange={(e) => setSchedLocation(e.target.value)} placeholder="Office / Meet link" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => confirmSchedule("first")} style={btnPrimary}>✓ Replied — Schedule 1st Interview →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
                <button type="button" disabled={busy} onClick={markWaiting} style={{ ...btnOutline, color: WARNING }}>⏳ Mark Waiting</button>
              </div>
            </div>
          )}

          {stage === "1st Interview Scheduled" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 4 — 1st interview scheduled (HR round)</p>
              {nextInterview && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: TEXT }}>
                  📅 {fmtDateTime(nextInterview.scheduled_at)}
                  {nextInterview.interviewer_name ? ` · Interviewer: ${nextInterview.interviewer_name}` : ""}
                  {nextInterview.location ? ` · ${nextInterview.location}` : ""}
                </p>
              )}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Once the HR interview is done, record the result.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Interview feedback / notes…"
                style={{ ...inputStyle, resize: "vertical", marginBottom: "0.6rem" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("HR Interview Done", "HR interview done")} style={btnPrimary}>✓ HR Interview Done →</button>
                <button type="button" disabled={busy} onClick={saveFeedback} style={btnOutline}>💾 Save feedback only</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "HR Interview Done" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 5 — HR interview done</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Candidate passed the HR round? Continue to ask the Manager for an interview slot, or reject.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => decision("continue")} style={btnPrimary}>✓ Continue — Request Manager Interview →</button>
                <button type="button" disabled={busy} onClick={() => decision("reject")} style={btnDanger}>✗ Reject (reason required)</button>
              </div>
            </div>
          )}

          {stage === "Waiting Manager Interview Confirm" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 6 — Waiting for Manager interview confirmation</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Waiting for the hiring manager to confirm a date/time. Once confirmed, schedule it below.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Date & time *</label>
                  <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Interviewer *</label>
                  <input list="journey-interviewers" value={schedInterviewer} onChange={(e) => setSchedInterviewer(e.target.value)} placeholder="Pick or type a name" style={inputStyle} />
                  <datalist id="journey-interviewers">
                    {employees.map((e) => <option key={e.id} value={e.employees_name} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Location</label>
                  <input value={schedLocation} onChange={(e) => setSchedLocation(e.target.value)} placeholder="Office / Meet link" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => confirmSchedule("manager")} style={btnPrimary}>✓ Manager Confirmed — Schedule →</button>
                <button type="button" disabled={busy} onClick={markWaiting} style={{ ...btnOutline, color: WARNING }}>⏳ Still waiting</button>
              </div>
            </div>
          )}

          {/* For Full Time / Contract positions: Manager Interview → CEO Interview flow */}
          {stage === "Manager Interview Scheduled" && requiresCeoInterview && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 7 — Manager interview scheduled</p>
              {nextInterview && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: TEXT }}>
                  📅 {fmtDateTime(nextInterview.scheduled_at)}
                  {nextInterview.interviewer_name ? ` · Interviewer: ${nextInterview.interviewer_name}` : ""}
                  {nextInterview.location ? ` · ${nextInterview.location}` : ""}
                </p>
              )}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Interview is set. After the manager interview, request CEO interview confirmation.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => decision("continue")} style={btnPrimary}>✓ Manager Interview Done — Request CEO Interview →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "Manager Interview Done" && requiresCeoInterview && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 8 — Manager interview completed</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Manager interview is done. Request CEO interview confirmation to proceed.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => decision("continue")} style={btnPrimary}>✓ Request CEO Interview Confirm →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "Waiting CEO Interview Confirm" && requiresCeoInterview && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 9 — Waiting for CEO interview confirmation</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Waiting for the CEO to confirm a date/time. Once confirmed, schedule it below.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Date & time *</label>
                  <input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Interviewer *</label>
                  <input list="journey-interviewers" value={schedInterviewer} onChange={(e) => setSchedInterviewer(e.target.value)} placeholder="Pick or type a name" style={inputStyle} />
                  <datalist id="journey-interviewers">
                    {employees.map((e) => <option key={e.id} value={e.employees_name} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Location</label>
                  <input value={schedLocation} onChange={(e) => setSchedLocation(e.target.value)} placeholder="Office / Meet link" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => confirmSchedule("ceo")} style={btnPrimary}>✓ CEO Confirmed — Schedule →</button>
                <button type="button" disabled={busy} onClick={markWaiting} style={{ ...btnOutline, color: WARNING }}>⏳ Still waiting</button>
              </div>
            </div>
          )}

          {stage === "CEO Interview Scheduled" && requiresCeoInterview && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 10 — CEO interview scheduled</p>
              {nextInterview && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: TEXT }}>
                  📅 {fmtDateTime(nextInterview.scheduled_at)}
                  {nextInterview.interviewer_name ? ` · Interviewer: ${nextInterview.interviewer_name}` : ""}
                  {nextInterview.location ? ` · ${nextInterview.location}` : ""}
                </p>
              )}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Interview is set. When it happens, mark that you are waiting for the interviewer's result.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Waiting Interview Result", "Waiting interview result")} style={btnPrimary}>✓ Interview Held — Waiting Result →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {/* For non-CEO positions (Internship/Freelancer), Manager Interview goes directly to Waiting Result */}
          {stage === "Manager Interview Scheduled" && !requiresCeoInterview && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 7 — Manager interview scheduled</p>
              {nextInterview && (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: TEXT }}>
                  📅 {fmtDateTime(nextInterview.scheduled_at)}
                  {nextInterview.interviewer_name ? ` · Interviewer: ${nextInterview.interviewer_name}` : ""}
                  {nextInterview.location ? ` · ${nextInterview.location}` : ""}
                </p>
              )}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Interview is set. When it happens, mark that you are waiting for the interviewer's result.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Waiting Interview Result", "Waiting interview result")} style={btnPrimary}>✓ Interview Held — Waiting Result →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
              </div>
            </div>
          )}

          {stage === "Waiting Interview Result" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 11 — Waiting for interview result</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Follow up with the interviewer. Once the result is in, confirm whether to proceed to offer.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Waiting Offer Confirmation", "Result received")} style={btnPrimary}>✓ Result Received — Confirm Offer →</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Reject</button>
                <button type="button" disabled={busy} onClick={markWaiting} style={{ ...btnOutline, color: WARNING }}>⏳ Still waiting</button>
              </div>
            </div>
          )}

          {stage === "Waiting Offer Confirmation" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 12 — Waiting for offer confirmation</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Confirm the offer details with management. Once confirmed, send the offer to the candidate.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => decision("offer")} style={btnPrimary}>✓ Confirmed — Send Offer →</button>
                <button type="button" disabled={busy} onClick={() => decision("reject")} style={btnDanger}>✗ Reject (reason required)</button>
              </div>
            </div>
          )}

          {stage === "Offer Sent - Waiting Reply" && (
            <div>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: TEXT }}>Step 13 — Offer sent, waiting for reply</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", color: MUTED }}>
                Waiting for the candidate's answer. If they accept, mark Done — then close the job from Job Openings.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => move("Done", "Offer accepted")} style={btnPrimary}>🎉 Offer Accepted — Done</button>
                <button type="button" disabled={busy} onClick={rejectWithReason} style={btnDanger}>✗ Declined / Reject</button>
                <button type="button" disabled={busy} onClick={markWaiting} style={{ ...btnOutline, color: WARNING }}>⏳ Still waiting</button>
              </div>
            </div>
          )}

          {stage === "Done" && (
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <p style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", fontWeight: 700, color: OK }}>🎉 Done — candidate hired!</p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: MUTED }}>
                Now go to <strong>Job Openings → Close Job</strong>; remaining candidates will be soft-rejected and kept in the Talent Pool. Onboarding tasks are in the Onboarding tab.
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <button type="button" onClick={() => setShowTimeline((v) => !v)} style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
            {showTimeline ? "Hide timeline" : `Timeline (${events.length})`}
          </button>
          {showTimeline && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "12rem", overflowY: "auto" }}>
              {events.length === 0 && <p style={{ margin: 0, fontSize: "0.75rem", color: MUTED }}>No events yet.</p>}
              {[...events].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).map((e) => (
                <div key={e.id} style={{ fontSize: "0.72rem", color: TEXT, borderBottom: `1px dashed ${BORDER}`, paddingBottom: "0.25rem" }}>
                  <span style={{ color: MUTED }}>{fmtDateTime(e.created_at)}</span>{" "}
                  <strong>{e.event_type}</strong>
                  {e.from_status || e.to_status ? `: ${e.from_status || "—"} → ${e.to_status || "—"}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                  {e.actor_name ? ` (${e.actor_name})` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
