import { Fragment, useEffect, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrInterviewScorecard } from "../../../lib/types";

interface Props {
  department: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const DANGER = "var(--samurai-danger)";
const WARNING = "var(--samurai-warning)";
const OK = "var(--samurai-ok)";

type ScorecardWithMeta = HrInterviewScorecard & {
  candidate_name: string;
  candidate_role: string;
  assigned_to_name: string;
  assigned_to_email: string;
};

interface RoundInfo {
  round: string;
  status: string;
  interviewer_name: string | null;
  scheduled_at: string;
  rating: number | null;
}

interface CandidateRow {
  candidate_id: number;
  candidate_name: string;
  candidate_role: string;
  scorecard: ScorecardWithMeta;
  rounds: Record<string, RoundInfo>;
}

export function InterviewScorecardsTab({ department }: Props) {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hrApi.listScorecards(department);
      const all = res.scorecards || [];
      const now = new Date().toISOString();
      const visible = all.filter((sc) => {
        if (sc.status === "revoked") return false;
        if (sc.expires_at <= now) return false;
        return true;
      });

      // Group by candidate_id
      const grouped: Record<number, CandidateRow> = {};
      for (const sc of visible) {
        const cid = sc.candidate_id;
        if (!grouped[cid]) {
          grouped[cid] = {
            candidate_id: cid,
            candidate_name: sc.candidate_name,
            candidate_role: sc.candidate_role,
            scorecard: sc,
            rounds: {},
          };
        }
      }

      // S6 FIX: Fetch stats ONCE instead of per-candidate (eliminates N+1)
      const allStats = await hrApi.stats(department);
      const allInterviews = allStats.interviews || [];

      // Map interviews to candidates
      const candidateIds = Object.keys(grouped).map(Number);
      for (const cid of candidateIds) {
        const candidateInterviews = allInterviews.filter((iv: any) => iv.candidate_id === cid);
        for (const iv of candidateInterviews) {
          const r = (iv.round || "first").toLowerCase();
          const rk = r === "first" ? "hr" : r;
          grouped[cid].rounds[rk] = {
            round: rk,
            status: iv.status || "scheduled",
            interviewer_name: iv.interviewer_name || null,
            scheduled_at: iv.scheduled_at || "",
            rating: iv.rating ?? null,
          };
        }
      }

      setCandidates(Object.values(grouped));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scorecards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [department]);

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Revoke this scorecard? The link will stop working immediately.")) return;
    try {
      await hrApi.revokeScorecard(department, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke scorecard");
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/interview-scorecard/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link copied to clipboard!");
    }).catch(() => {
      prompt("Copy this link:", url);
    });
  };

  const roundLabel = (r: string) => {
    if (r === "hr" || r === "first") return "HR Interview";
    if (r === "manager") return "Manager Interview";
    if (r === "ceo") return "CEO Interview";
    return r;
  };

  // Compute overall scorecard status: Done if all existing rounds are completed
  const getOverallStatus = (rounds: Record<string, RoundInfo>): "Done" | "Pending" => {
    const roundKeys = Object.keys(rounds);
    if (roundKeys.length === 0) return "Pending";
    const allCompleted = roundKeys.every((k) => rounds[k].status === "completed");
    return allCompleted ? "Done" : "Pending";
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: WARNING,
      completed: OK,
      cancelled: DANGER,
    };
    const bg = colors[status] || MUTED;
    return (
      <span style={{ padding: "0.15rem 0.4rem", borderRadius: "0.25rem", fontSize: "0.7rem", fontWeight: 600, color: "#0a0a0a", background: bg }}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <div style={{ padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${DANGER}`, color: DANGER, fontSize: "0.85rem" }}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "2rem" }}>Loading...</p>
      ) : candidates.length === 0 ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "2rem" }}>No active scorecards.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600, width: "30%" }}>Candidate</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600, width: "20%" }}>Position</th>
                <th style={{ textAlign: "center", padding: "0.5rem", color: MUTED, fontWeight: 600, width: "15%" }}>Status</th>
                <th style={{ textAlign: "right", padding: "0.5rem", color: MUTED, fontWeight: 600, width: "35%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const isExpanded = expandedId === c.candidate_id;
                return (
                  <Fragment key={c.candidate_id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : c.candidate_id)}
                      style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: isExpanded ? SURFACE_2 : "transparent" }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = SURFACE_2; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "0.6rem 0.5rem", color: TEXT, fontWeight: 600 }}>
                        <span style={{ marginRight: "0.4rem", fontSize: "0.75rem", color: MUTED }}>{isExpanded ? "▼" : "▶"}</span>
                        {c.candidate_name}
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem", color: MUTED }}>{c.candidate_role || "—"}</td>
                      <td style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>
                        {(() => {
                          const overall = getOverallStatus(c.rounds);
                          return (
                            <span style={{
                              display: "inline-block",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "0.3rem",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#0a0a0a",
                              background: overall === "Done" ? OK : WARNING,
                            }}>
                              {overall}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => window.open(`/interview-scorecard/${c.scorecard.token}`, "_blank")}
                            style={{ padding: "0.25rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${LIME}`, background: LIME, color: "#0a0a0a", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            🔗 Open
                          </button>
                          <button
                            onClick={() => copyLink(c.scorecard.token)}
                            style={{ padding: "0.25rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontSize: "0.72rem", cursor: "pointer" }}
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={() => handleRevoke(c.scorecard.id)}
                            style={{ padding: "0.25rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, fontSize: "0.72rem", cursor: "pointer" }}
                          >
                            ✕ Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Round Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} style={{ padding: "0 0.5rem 0.75rem", background: SURFACE_2 }}>
                          <div style={{ padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: SURFACE, marginTop: "0.25rem" }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: MUTED, marginBottom: "0.5rem" }}>Interview Rounds</div>
                            {(["hr", "manager", "ceo"] as const).map((rk) => {
                              const round = c.rounds[rk];
                              return (
                                <div key={rk} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", padding: "0.4rem 0", borderBottom: `1px solid ${BORDER}`, fontSize: "0.8rem", alignItems: "center" }}>
                                  <div style={{ fontWeight: 600, color: TEXT }}>{roundLabel(rk)}</div>
                                  <div style={{ color: MUTED }}>
                                    {round?.interviewer_name || <span style={{ fontStyle: "italic" }}>Not assigned</span>}
                                  </div>
                                  <div style={{ color: MUTED }}>
                                    {round?.scheduled_at ? new Date(round.scheduled_at).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                  </div>
                                  <div>{round ? statusBadge(round.status) : <span style={{ fontSize: "0.7rem", color: MUTED }}>—</span>}</div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

