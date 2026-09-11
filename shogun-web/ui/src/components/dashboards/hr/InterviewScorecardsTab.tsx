import { useEffect, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrInterviewScorecard } from "../../../lib/types";

interface Props {
  department: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
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

export function InterviewScorecardsTab({ department }: Props) {
  const [scorecards, setScorecards] = useState<ScorecardWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [expiresDays, setExpiresDays] = useState(3);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; email: string; department: string }>>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hrApi.listScorecards(department);
      const all = res.scorecards || [];
      // Show scorecards that are not expired and not revoked
      // - pending: still active, within expiry period
      // - completed: all rounds done, but still within expiry period (for reference)
      // Auto-hide: expired (past expires_at) or revoked
      const now = new Date().toISOString();
      const visible = all.filter((sc) => {
        if (sc.status === "revoked") return false;
        if (sc.expires_at <= now) return false; // expired
        return true; // pending or completed within expiry
      });
      setScorecards(visible);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scorecards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [department]);

  // Search employees for assignment
  useEffect(() => {
    if (!employeeSearch.trim()) {
      setEmployees([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await hrApi.searchEmployees(department, employeeSearch, 10);
        setEmployees(res.employees || []);
      } catch {
        // Ignore search errors
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch, department]);

  const handleCreate = async () => {
    if (!candidateId || !assignedUserId) {
      setError("Please select a candidate and assign an interviewer");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await hrApi.createScorecard(department, {
        candidate_id: candidateId,
        assigned_to_user_id: assignedUserId,
        expires_days: expiresDays,
      });
      setShowCreate(false);
      setCandidateId(null);
      setAssignedUserId(null);
      setEmployeeSearch("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create scorecard");
    } finally {
      setCreating(false);
    }
  };

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

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return WARNING;
      case "completed": return OK;
      case "expired": return MUTED;
      case "revoked": return DANGER;
      default: return TEXT;
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return "Expired";
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
    return `${diffHours}h left`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: TEXT }}>
          📋 Interview Scorecards
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: LIME,
            color: "#0a0a0a",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showCreate ? "✕ Cancel" : "+ Generate Scorecard"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", borderRadius: "0.5rem", border: `1px solid ${DANGER}`, background: `color-mix(in srgb, ${DANGER} 8%, transparent)`, color: DANGER, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div style={{ padding: "1rem", borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "var(--samurai-surface)" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 600, color: TEXT }}>
            Generate New Scorecard
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Candidate Selection (placeholder - would need candidate picker) */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
                Candidate ID
              </label>
              <input
                type="number"
                value={candidateId || ""}
                onChange={(e) => setCandidateId(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Enter candidate ID"
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "var(--samurai-bg)", color: TEXT }}
              />
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: MUTED }}>
                💡 Future: Will be a searchable dropdown from active candidates
              </p>
            </div>

            {/* Interviewer Search */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
                Assign Interviewer
              </label>
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setAssignedUserId(null);
                }}
                placeholder="Search by name or email..."
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "var(--samurai-bg)", color: TEXT }}
              />
              {employees.length > 0 && (
                <div style={{ marginTop: "0.25rem", maxHeight: "150px", overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: "0.4rem" }}>
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setAssignedUserId(emp.id);
                        setEmployeeSearch(emp.name);
                        setEmployees([]);
                      }}
                      style={{
                        padding: "0.5rem",
                        cursor: "pointer",
                        borderBottom: `1px solid ${BORDER}`,
                        fontSize: "0.8rem",
                        color: TEXT,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--samurai-surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <strong>{emp.name}</strong> · {emp.department} · {emp.email}
                    </div>
                  ))}
                </div>
              )}
              {assignedUserId && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: OK }}>
                  ✓ Assigned to user ID: {assignedUserId}
                </p>
              )}
            </div>

            {/* Expiry */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>
                Expires In (days)
              </label>
              <select
                value={expiresDays}
                onChange={(e) => setExpiresDays(parseInt(e.target.value))}
                style={{ padding: "0.5rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "var(--samurai-bg)", color: TEXT }}
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
              </select>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !candidateId || !assignedUserId}
              style={{
                padding: "0.6rem",
                borderRadius: "0.5rem",
                border: "none",
                background: creating ? MUTED : LIME,
                color: "#0a0a0a",
                fontWeight: 600,
                cursor: creating ? "not-allowed" : "pointer",
                opacity: (!candidateId || !assignedUserId) ? 0.5 : 1,
              }}
            >
              {creating ? "Creating..." : "Generate Scorecard Link"}
            </button>
          </div>
        </div>
      )}

      {/* Scorecards Table */}
      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "2rem" }}>Loading...</p>
      ) : scorecards.length === 0 ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "2rem" }}>
          No scorecards yet. Click "Generate Scorecard" to create one.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Candidate</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Position</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Assigned To</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Generated</th>
                <th style={{ textAlign: "left", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Expires</th>
                <th style={{ textAlign: "right", padding: "0.5rem", color: MUTED, fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scorecards.map((sc) => (
                <tr key={sc.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "0.5rem", color: TEXT }}>{sc.candidate_name}</td>
                  <td style={{ padding: "0.5rem", color: MUTED }}>{sc.candidate_role || "—"}</td>
                  <td style={{ padding: "0.5rem", color: TEXT }}>
                    {sc.assigned_to_name}
                    <div style={{ fontSize: "0.7rem", color: MUTED }}>{sc.assigned_to_email}</div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.3rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#0a0a0a",
                      background: statusColor(sc.status),
                    }}>
                      {sc.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem", color: MUTED, fontSize: "0.8rem" }}>
                    {new Date(sc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.5rem", color: sc.status === "pending" ? WARNING : MUTED, fontSize: "0.8rem" }}>
                    {formatExpiry(sc.expires_at)}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>
                    {sc.status === "pending" && (
                      <>
                        <button
                          onClick={() => window.open(`/interview-scorecard/${sc.token}`, "_blank")}
                          style={{
                            marginRight: "0.5rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.3rem",
                            border: `1px solid ${LIME}`,
                            background: LIME,
                            color: "#0a0a0a",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          🔗 Open Link
                        </button>
                        <button
                          onClick={() => copyLink(sc.token)}
                          style={{
                            marginRight: "0.5rem",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.3rem",
                            border: `1px solid ${BORDER}`,
                            background: "transparent",
                            color: TEXT,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          🔗 Copy Link
                        </button>
                        <button
                          onClick={() => handleRevoke(sc.id)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.3rem",
                            border: `1px solid ${DANGER}`,
                            background: "transparent",
                            color: DANGER,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          ✕ Revoke
                        </button>
                      </>
                    )}
                    {sc.status === "completed" && (
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          onClick={() => window.open(`/interview-scorecard/${sc.token}`, "_blank")}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.3rem",
                            border: `1px solid ${BORDER}`,
                            background: "transparent",
                            color: TEXT,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          👁️ View
                        </button>
                        <span style={{ fontSize: "0.75rem", color: OK }}>✓ Done</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
