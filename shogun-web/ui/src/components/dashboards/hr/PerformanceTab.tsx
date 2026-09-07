import { useState } from "react";
import { TrendingUp, Star } from "lucide-react";
import type { HrDashboardStats, HrPerformanceReview } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const SURFACE_2 = "var(--samurai-surface-2)";
const BORDER = "var(--samurai-border)";

const RATING_CHIP: Record<string, string> = {
  "1": "bad", "2": "bad", "3": "bad",
  "4": "warn", "5": "warn", "6": "warn",
  "7": "ok", "8": "ok", "9": "ok", "10": "ok",
};

const LEVEL_CHIP: Record<string, string> = {
  "Above Average": "ok",
  "Excellent": "ok",
  "Average": "warn",
  "Below Average": "bad",
  "Needs Improvement": "bad",
};

const CHIP_COLOR: Record<string, string> = {
  ok: "var(--samurai-ok)",
  warn: "var(--samurai-warning)",
  bad: "var(--samurai-danger)",
  muted: MUTED,
};

export function PerformanceTab({ stats }: Props) {
  const [selected, setSelected] = useState<HrPerformanceReview | null>(null);
  const reviews = stats.performance_reviews || [];

  // Rating distribution
  const ratingDist = reviews
    .map((r) => r.performance_rating)
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r!] = (acc[r!] || 0) + 1;
      return acc;
    }, {});

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Total Reviews</div>
          <div className="sd-kpi-value">{stats.total_reviews}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Avg Rating</div>
          <div className="sd-kpi-value" style={{ color: "var(--samurai-lime)" }}>
            {reviews.length > 0
              ? (reviews
                  .map((r) => parseInt(r.performance_rating || "0", 10))
                  .filter((n) => !isNaN(n))
                  .reduce((a, b) => a + b, 0) /
                    reviews.filter((r) => r.performance_rating && !isNaN(parseInt(r.performance_rating, 10))).length
                ).toFixed(1)
              : "—"}
          </div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Rating Distribution</div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
            {Object.entries(ratingDist).map(([rating, count]) => (
              <span
                key={rating}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.1rem 0.5rem",
                  borderRadius: "0.4rem",
                  background: SURFACE_2,
                  color: CHIP_COLOR[RATING_CHIP[rating] || "muted"],
                }}
              >
                {rating}★ ({count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Performance Reviews</h3>
        <p className="sd-chart-sub">Click a row for full review details</p>
        {reviews.length === 0 ? (
          <div className="sd-empty">
            <Star className="h-8 w-8" style={{ color: MUTED }} />
            <p>No performance reviews synced yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={thStyle}>Quarterly Performance</th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Rating</th>
                  <th style={thStyle}>Level</th>
                  <th style={thStyle}>Manager</th>
                  <th style={thStyle}>Review Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>{r.quarterly_performance}</td>
                    <td style={tdStyle}>{r.employee_name}</td>
                    <td style={tdStyle}>{r.department}</td>
                    <td style={tdStyle}>
                      {r.performance_rating && (
                        <span style={chipStyle(RATING_CHIP[r.performance_rating] || "muted")}>
                          {r.performance_rating}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {r.performance_level && (
                        <span style={chipStyle(LEVEL_CHIP[r.performance_level] || "muted")}>
                          {r.performance_level}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>{r.manager_name}</td>
                    <td style={tdStyle}>{r.review_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--samurai-surface)",
              borderRadius: "0.75rem",
              border: `1px solid ${BORDER}`,
              padding: "1.5rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: TEXT, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TrendingUp size={18} /> {selected.quarterly_performance}
              </h3>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: "1.2rem" }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.85rem" }}>
              <DetailRow label="Employee" value={selected.employee_name} />
              <DetailRow label="Department" value={selected.department} />
              <DetailRow label="Rating" value={selected.performance_rating} />
              <DetailRow label="Level" value={selected.performance_level} />
              <DetailRow label="Manager" value={selected.manager_name} />
              <DetailRow label="Review Date" value={selected.review_date} />
              {selected.areas_of_improvement && (
                <div>
                  <div style={{ color: MUTED, marginBottom: "0.25rem" }}>Areas of Improvement</div>
                  <div style={{ color: TEXT, padding: "0.75rem", background: SURFACE_2, borderRadius: "0.5rem" }}>
                    {selected.areas_of_improvement}
                  </div>
                </div>
              )}
              {selected.action_items && (
                <div>
                  <div style={{ color: MUTED, marginBottom: "0.25rem" }}>Action Items / Next Goals</div>
                  <div style={{ color: TEXT, padding: "0.75rem", background: SURFACE_2, borderRadius: "0.5rem" }}>
                    {selected.action_items}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  color: "var(--samurai-muted)",
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  color: "var(--samurai-text)",
};

function chipStyle(cls: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "0.1rem 0.5rem",
    borderRadius: "0.4rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "var(--samurai-surface-2)",
    color: CHIP_COLOR[cls],
  };
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: TEXT, textAlign: "right" }}>{value}</span>
    </div>
  );
}
