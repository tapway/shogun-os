import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, FileText, MessageSquare, Paperclip, Upload, X } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrCandidate, HrCandidateEvent, HrCandidateFile, HrDashboardStats } from "../../../lib/types";

interface Props {
  candidate: HrCandidate;
  stats: HrDashboardStats;
  department: string;
  onClose: () => void;
  onCandidateChanged?: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";

const KIND_LABEL: Record<string, string> = {
  resume: "Resume",
  screening_answers: "Screening Answers",
  offer_letter: "Offer Letter",
  other: "Document",
};

const EVENT_ICON: Record<string, string> = {
  stage_move: "→",
  comment: "💬",
  decision: "⚖",
  upload: "📎",
  note: "🕓",
};

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CandidateWorkflowModal({ candidate, stats, department, onClose, onCandidateChanged }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [uploadKind, setUploadKind] = useState("screening_answers");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const events: HrCandidateEvent[] = useMemo(
    () => (stats.candidate_events || []).filter((e) => e.candidate_id === candidate.id),
    [stats.candidate_events, candidate.id],
  );
  const files: HrCandidateFile[] = useMemo(
    () => (stats.candidate_files || []).filter((f) => f.candidate_id === candidate.id),
    [stats.candidate_files, candidate.id],
  );

  const stage = (candidate.status || "").trim();
  // decision stages (backend validates): continue from HR Interview Done,
  // offer from Waiting Offer Confirmation
  const is1stInterview = stage === "HR Interview Done";
  const isManagerInterview = stage === "Waiting Offer Confirmation";
  // scheduling stages: first round from the waiting-reply stage,
  // manager round from the waiting-manager-confirm stage
  const isSchedule1st = stage === "Interview Email Sent - Waiting Reply";
  const isScheduleManager = stage === "Waiting Manager Interview Confirm";

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard-hr-stats"] });
    onCandidateChanged?.();
  }

  async function submitComment() {
    if (!comment.trim()) return;
    setBusy("comment");
    setError("");
    try {
      await hrApi.candidateComment(department, candidate.id, comment.trim());
      setComment("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment.");
    } finally {
      setBusy("");
    }
  }

  async function submitDecision(decision: string) {
    if (!decisionComment.trim()) {
      setError("Please leave a comment before confirming the decision.");
      return;
    }
    setBusy(`decision-${decision}`);
    setError("");
    try {
      await hrApi.candidateDecision(department, candidate.id, decision, decisionComment.trim());
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusy("");
    }
  }

  async function uploadFile(file: File) {
    setBusy("upload");
    setError("");
    try {
      await hrApi.candidateFileUpload(department, candidate.id, file, uploadKind);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function clearWaiting() {
    setBusy("waiting");
    setError("");
    try {
      await hrApi.candidateWaiting(department, candidate.id, "");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update waiting state.");
    } finally {
      setBusy("");
    }
  }

  async function removeCandidate() {
    const reason = window.prompt("Remove candidate — reason (saved for audit, candidate is soft-rejected):", "No response");
    if (reason === null) return;
    setBusy("remove");
    setError("");
    try {
      await hrApi.candidateRemove(department, candidate.id, reason.trim() || "No response");
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE, borderRadius: "0.75rem", border: `1px solid ${BORDER}`,
          padding: "1.25rem", maxWidth: "760px", width: "100%", maxHeight: "88vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0, color: TEXT, fontSize: "1.05rem" }}>{candidate.name}</h3>
            <div style={{ fontSize: "0.78rem", color: MUTED, marginTop: "0.2rem" }}>
              {candidate.role || "—"} · {candidate.candidate_type || "—"} · current stage: <strong style={{ color: TEXT }}>{stage || "(none)"}</strong>
            </div>
            {candidate.waiting_since && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--samurai-warning)" }}>
                ⏳ Waiting since {fmtDateTime(candidate.waiting_since)}{candidate.waiting_reason ? ` — ${candidate.waiting_reason}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${DANGER}`, color: DANGER, fontSize: "0.78rem", marginBottom: "0.75rem" }}>
            {error}
          </div>
        )}

        {/* Stage actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {(is1stInterview || isManagerInterview) && (
            <>
              <input
                type="text"
                placeholder="Interview comment (required)…"
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                style={{ flex: 1, minWidth: "180px", padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, fontSize: "0.8rem" }}
              />
              {is1stInterview && (
                <button onClick={() => submitDecision("continue")} disabled={busy !== ""} style={btnStyle(LIME)}>
                  {busy === "decision-continue" ? "…" : "Continue → Manager"}
                </button>
              )}
              {isManagerInterview && (
                <button onClick={() => submitDecision("offer")} disabled={busy !== ""} style={btnStyle(LIME)}>
                  {busy === "decision-offer" ? "…" : "Offer → Offer Sent"}
                </button>
              )}
              <button onClick={() => submitDecision("reject")} disabled={busy !== ""} style={btnStyle(DANGER, true)}>
                {busy === "decision-reject" ? "…" : "Reject"}
              </button>
            </>
          )}
          {(isSchedule1st || isScheduleManager) && (
            <button onClick={() => setScheduleOpen(true)} style={btnStyle(LIME)}>
              <CalendarClock size={13} style={{ marginRight: "0.3rem" }} />
              {isSchedule1st ? "Confirm 1st Round Interview" : "Confirm Manager Interview"}
            </button>
          )}
          {candidate.waiting_since ? (
            <button onClick={clearWaiting} disabled={busy === "waiting"} style={btnStyle(OK)}>
              <CheckCircle2 size={13} style={{ marginRight: "0.3rem" }} /> Mark replied
            </button>
          ) : (
            <button
              onClick={() => {
                const reason = window.prompt("Waiting reason (e.g. awaiting answers):");
                if (reason && reason.trim()) {
                  hrApi.candidateWaiting(department, candidate.id, reason.trim()).then(refresh).catch(() => setError("Failed to set waiting."));
                }
              }}
              style={btnStyle(MUTED)}
            >
              ⏳ Mark waiting
            </button>
          )}
          <button onClick={removeCandidate} disabled={busy === "remove"} style={{ ...btnStyle(DANGER, true), marginLeft: "auto" }}>
            Remove
          </button>
        </div>

        {/* Files */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.4rem" }}>
            Documents
          </div>
          {files.length === 0 && <p style={{ fontSize: "0.8rem", color: MUTED, margin: "0.2rem 0" }}>No documents uploaded yet.</p>}
          <div style={{ display: "grid", gap: "0.3rem" }}>
            {files.map((f) => (
              <a
                key={f.id}
                href={f.file_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: LIME, textDecoration: "none" }}
              >
                <Paperclip size={12} /> {KIND_LABEL[f.kind] || f.kind}: {f.filename}
                <span style={{ color: MUTED, fontSize: "0.7rem" }}>({fmtDateTime(f.uploaded_at)}{f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ""})</span>
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <select value={uploadKind} onChange={(e) => setUploadKind(e.target.value)} style={selectStyle}>
              <option value="screening_answers">Screening Answers</option>
              <option value="resume">Resume</option>
              <option value="offer_letter">Offer Letter</option>
              <option value="other">Other</option>
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, fontSize: "0.78rem", fontWeight: 600, cursor: busy === "upload" ? "default" : "pointer" }}>
              <Upload size={13} /> {busy === "upload" ? "Uploading…" : "Upload file"}
              <input type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        {/* Comment + Timeline */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem" }}>
          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.4rem" }}>
            Timeline & Comments
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <input
              type="text"
              placeholder="Leave a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, fontSize: "0.8rem" }}
            />
            <button onClick={submitComment} disabled={!comment.trim() || busy === "comment"} style={{ ...btnStyle(LIME), opacity: comment.trim() ? 1 : 0.5 }}>
              <MessageSquare size={13} style={{ marginRight: "0.25rem" }} /> Post
            </button>
          </div>
          {events.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: MUTED }}>No activity yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.45rem", maxHeight: "220px", overflowY: "auto" }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ fontSize: "0.78rem", display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                  <span style={{ width: "1.2rem", textAlign: "center" }}>{EVENT_ICON[ev.event_type] || "•"}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: TEXT, fontWeight: 600 }}>
                      {ev.event_type === "stage_move" && ev.from_status && ev.to_status
                        ? `${ev.from_status} → ${ev.to_status}`
                        : ev.event_type === "comment" ? "Comment" : ev.event_type === "decision" ? "Decision" : ev.event_type === "upload" ? "Upload" : "Note"}
                    </span>
                    {ev.note && <span style={{ color: MUTED }}> — {ev.note}</span>}
                    <div style={{ fontSize: "0.68rem", color: MUTED }}>
                      {fmtDateTime(ev.created_at)}{ev.actor_name ? ` · ${ev.actor_name}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleInterviewModal
          candidate={candidate}
          stats={stats}
          department={department}
          round={isSchedule1st ? "first" : "manager"}
          onClose={() => setScheduleOpen(false)}
          onDone={async () => {
            setScheduleOpen(false);
            await refresh();
            onClose();
          }}
        />
      )}
    </div>
  );
}

function ScheduleInterviewModal({
  candidate, stats, department, round, onClose, onDone,
}: {
  candidate: HrCandidate;
  stats: HrDashboardStats;
  department: string;
  round: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [when, setWhen] = useState("");
  const [interviewerId, setInterviewerId] = useState<string>("");
  const [freeText, setFreeText] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const employees = stats.employees || [];
  const interviewerName = interviewerId
    ? employees.find((e) => String(e.id) === interviewerId)?.employees_name || freeText
    : freeText;

  async function submit() {
    if (!when) { setError("Pick the interview date and time."); return; }
    if (!interviewerName.trim()) { setError("Select an interviewer (or type a name)."); return; }
    setBusy(true);
    setError("");
    try {
      await hrApi.candidateSchedule(department, candidate.id, {
        round,
        scheduled_at: when,
        interviewer_name: interviewerName.trim(),
        interviewer_employee_id: interviewerId ? Number(interviewerId) : undefined,
        location: location.trim(),
      });
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduling failed.");
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: SURFACE, borderRadius: "0.75rem", border: `1px solid ${BORDER}`, padding: "1.25rem", maxWidth: "26rem", width: "100%" }}
      >
        <h3 style={{ margin: "0 0 0.25rem", color: TEXT, fontSize: "1rem" }}>
          {round === "first" ? "Schedule 1st Round Interview" : "Schedule Manager Interview"}
        </h3>
        <p style={{ fontSize: "0.75rem", color: MUTED, margin: "0 0 0.75rem" }}>
          Confirming creates the schedule entry and moves {candidate.name} into the interview stage.
        </p>
        <label style={labelStyle}>Date & time
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>Interviewer (from Employee Directory)
          <select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} style={inputStyle}>
            <option value="">— select employee —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.employees_name} ({e.role || e.department})</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>…or type a name
          <input type="text" value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Free-text interviewer" style={inputStyle} disabled={!!interviewerId} />
        </label>
        <label style={labelStyle}>Location / Meet link (optional)
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / Google Meet link" style={inputStyle} />
        </label>
        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0.5rem 0 0" }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.9rem" }}>
          <button onClick={onClose} style={btnStyle(MUTED)}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ ...btnStyle(LIME), opacity: busy ? 0.6 : 1 }}>
            {busy ? "Saving…" : "Confirm & Move"}
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color: string, outline = false): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: "0.3rem",
    padding: "0.4rem 0.85rem", borderRadius: "0.5rem",
    border: `1px solid ${outline ? color : "transparent"}`,
    background: outline ? "transparent" : color,
    color: outline ? color : color === LIME ? "#0a0a0a" : "#ffffff",
    fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
  };
}

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`,
  background: SURFACE_2, color: TEXT, fontSize: "0.78rem",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.68rem", textTransform: "uppercase",
  letterSpacing: "0.08em", color: MUTED, marginBottom: "0.6rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: "0.25rem", padding: "0.4rem 0.55rem",
  borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE_2,
  color: TEXT, fontSize: "0.82rem", boxSizing: "border-box",
};