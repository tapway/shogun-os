import { useMemo } from "react";
import type { HrDashboardStats, HrOnboardingTask } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const WARNING = "var(--samurai-warning)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";
const SURFACE_2 = "var(--samurai-surface-2)";

const th = { fontSize: "0.72rem", fontWeight: 500, color: MUTED } as const;
function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" | "center" }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

/** Compute days between start and end date. */
function computeDays(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Map task_status to emoji: 🟡 (in progress), ✅ (done), ⚪ (not started/pending). */
function taskStatusEmoji(status: string | null | undefined): string {
  const s = (status || "").toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "✅";
  if (s.includes("progress") || s.includes("ongoing") || s.includes("active")) return "🟡";
  return "⚪";
}

export function OnboardingTab({ stats, color }: Props) {
  const tasks = stats.onboarding_tasks || [];

  // KPI calculations
  const inProgress = tasks.filter((t) => {
    const s = (t.status || "").toLowerCase();
    return s.includes("progress") || s.includes("ongoing") || s.includes("active") || s.includes("pending");
  }).length;
  const done = tasks.filter((t) => {
    const s = (t.status || "").toLowerCase();
    return s.includes("done") || s.includes("complete");
  }).length;
  const total = tasks.length;

  // Progress percentage
  const progressPct = total > 0 ? (done / total) * 100 : 0;

  const KPIs = [
    { label: "In Progress", value: `${inProgress}`, warn: inProgress > 0 },
    { label: "Done", value: `${done}`, ok: true },
    { label: "Total", value: `${total}` },
  ];

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div
              className="sd-kpi-value"
              style={{ color: k.ok ? OK : k.warn ? WARNING : TEXT }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Onboarding Progress</h3>
        <p className="sd-chart-sub">{done} of {total} tasks completed</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              height: "0.75rem",
              flex: 1,
              borderRadius: 999,
              overflow: "hidden",
              background: SURFACE_2,
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: progressPct >= 100 ? OK : progressPct >= 50 ? WARNING : DANGER,
                width: `${Math.min(progressPct, 100)}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ width: "3.5rem", textAlign: "right", fontSize: "0.78rem", fontWeight: 600, color: TEXT }}>
            {progressPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Onboarding Tasks Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ margin: 0, marginBottom: "0.75rem" }}>Onboarding Tasks</h3>

        {tasks.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No onboarding tasks found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Staff Name</Th>
                  <Th align="left">Department</Th>
                  <Th align="left">Start Date</Th>
                  <Th align="left">End Date</Th>
                  <Th align="right">Days</Th>
                  <Th align="left">Assigned To</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Task Status</Th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const days = computeDays(t.start_date, t.end_date);
                  const emoji = taskStatusEmoji(t.task_status);
                  const statusClass = onboardingStatusChip(t.status);
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{t.staff_name || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{t.department || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(t.start_date)}</td>
                      <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(t.end_date)}</td>
                      <td className="px-3 py-2 text-right" style={{ fontWeight: 600, color: TEXT }}>
                        {t.days != null ? `${t.days}` : days != null ? `${days}` : "—"}
                      </td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{t.assigned_to || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`sd-chip ${statusClass}`}>{t.status || "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-center" style={{ fontSize: "1rem" }}>{emoji}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Map onboarding status to chip class. */
function onboardingStatusChip(status: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "ok";
  if (s.includes("progress") || s.includes("ongoing") || s.includes("active")) return "warn";
  if (s.includes("pending") || s.includes("not started")) return "muted";
  if (s.includes("cancelled") || s.includes("blocked")) return "bad";
  return "muted";
}
