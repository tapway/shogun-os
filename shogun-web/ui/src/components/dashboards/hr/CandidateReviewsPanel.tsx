import { useMemo } from "react";
import type { HrCandidateEvent } from "../../../lib/types";

const TEXT = "var(--samurai-text)";
const MUTED = "var(--samurai-muted)";
const BORDER = "var(--samurai-border)";
const LIME = "var(--samurai-lime)";

const EVENT_LABEL: Record<string, string> = {
  comment: "💬 Comment",
  decision: "⚖ Decision",
  note: "📝 Note",
  review: "👁 Review",
  upload: "📎 Upload",
  stage_move: "➜ Stage Move",
};

const EVENT_COLOR: Record<string, string> = {
  comment: "var(--samurai-info)",
  decision: "var(--samurai-warning)",
  note: MUTED,
  review: LIME,
  upload: MUTED,
  stage_move: MUTED,
};

/** Returns only events that count as "reviews/feedback" written during recruitment. */
export function reviewEvents(events: HrCandidateEvent[], candidateId: number): HrCandidateEvent[] {
  return (events || [])
    .filter((e) => e.candidate_id === candidateId)
    .filter((e) => ["comment", "decision", "note", "review"].includes(e.event_type))
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  events: HrCandidateEvent[];
  candidateId: number;
  /** compact inline mode (used inside expandable table rows) */
  compact?: boolean;
}

/**
 * Renders the review/feedback history written for a candidate during the
 * recruitment pipeline (comments, decisions, waiting notes, review taps).
 * Shared by the per-job Candidate Pool and the Candidate Detail page.
 */
export function CandidateReviewsPanel({ events, candidateId, compact }: Props) {
  const reviews = useMemo(() => reviewEvents(events, candidateId), [events, candidateId]);

  if (reviews.length === 0) {
    return (
      <p style={{ margin: compact ? "0.3rem 0" : 0, fontSize: "0.78rem", color: MUTED }}>
        No reviews or feedback recorded yet for this candidate.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: compact ? "14rem" : "20rem", overflowY: "auto" }}>
      {reviews.map((e) => (
        <div
          key={e.id}
          style={{
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${EVENT_COLOR[e.event_type] || BORDER}`,
            borderRadius: "0.4rem",
            padding: "0.4rem 0.6rem",
            background: "var(--samurai-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: e.note ? "0.2rem" : 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: EVENT_COLOR[e.event_type] || TEXT }}>
              {EVENT_LABEL[e.event_type] || e.event_type}
            </span>
            {e.from_status || e.to_status ? (
              <span style={{ fontSize: "0.68rem", color: MUTED }}>
                {e.from_status || "—"} → {e.to_status || "—"}
              </span>
            ) : null}
            <span style={{ fontSize: "0.68rem", color: MUTED, marginLeft: "auto", whiteSpace: "nowrap" }}>
              {e.actor_name ? `${e.actor_name} · ` : ""}{fmtDateTime(e.created_at)}
            </span>
          </div>
          {e.note && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: TEXT, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{e.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Small pill showing how many reviews a candidate has. */
export function ReviewCountBadge({ events, candidateId }: { events: HrCandidateEvent[]; candidateId: number }) {
  const n = reviewEvents(events, candidateId).length;
  if (n === 0) return <span style={{ fontSize: "0.72rem", color: MUTED }}>—</span>;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.25rem",
        fontSize: "0.7rem", fontWeight: 700, color: "#0a0a0a",
        background: LIME, borderRadius: "999px", padding: "0.1rem 0.5rem",
      }}
    >
      💬 {n}
    </span>
  );
}
