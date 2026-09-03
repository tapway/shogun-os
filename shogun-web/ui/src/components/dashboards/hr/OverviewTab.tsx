import { useMemo } from "react";
import { BarChart, PieChart } from "../charts";
import type { HrDashboardStats } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
  onNavigateTab?: (tabId: string) => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const DANGER = "var(--samurai-danger)";

export function OverviewTab({ stats, onNavigateTab }: Props) {
  // Department breakdown for chart
  const deptData = useMemo(() => {
    const entries = Object.entries(stats.dept_counts || {});
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, value: count }));
  }, [stats.dept_counts]);

  // Pipeline funnel data — axis labels shortened to avoid overlap.
  const FUNNEL_SHORT: Record<string, string> = {
    "Resume Received": "Resume",
    "Shortlisted": "Shortlisted",
    "Interview Email Sent - Waiting Reply": "Email Sent",
    "1st Interview Scheduled": "1st Scheduled",
    "HR Interview Done": "HR Done",
    "Waiting Manager Interview Confirm": "Mgr Confirm",
    "Manager Interview Scheduled": "Mgr Scheduled",
    "Waiting CEO Interview Confirm": "CEO Confirm",
    "CEO Interview Scheduled": "CEO Scheduled",
    "Waiting Interview Result": "Result",
    "Waiting Offer Confirmation": "Offer Confirm",
    "Offer Sent - Waiting Reply": "Offer Sent",
    "Done": "Done",
  };
  const funnelData = useMemo(() => {
    const ordered = [
      "Resume Received",
      "Shortlisted",
      "Interview Email Sent - Waiting Reply",
      "1st Interview Scheduled",
      "HR Interview Done",
      "Waiting Manager Interview Confirm",
      "Manager Interview Scheduled",
      "Waiting CEO Interview Confirm",
      "CEO Interview Scheduled",
      "Waiting Interview Result",
      "Waiting Offer Confirmation",
      "Offer Sent - Waiting Reply",
      "Done",
    ];
    return ordered
      .filter((s) => stats.pipeline_counts?.[s])
      .map((name) => ({ name: FUNNEL_SHORT[name] || name, value: stats.pipeline_counts[name] }));
  }, [stats.pipeline_counts]);

  const KPIs = [
    {
      label: "Total Employees",
      value: `${stats.total_employees}`,
      targetTab: "directory",
    },
    {
      label: "Open Positions",
      value: `${stats.total_job_openings}`,
      sub:
        stats.overdue_openings > 0
          ? `${stats.overdue_openings} overdue`
          : "All on track",
      warn: stats.overdue_openings > 0,
      targetTab: "openings",
    },
    {
      label: "Active Candidates",
      value: `${stats.total_candidates}`,
      targetTab: "pipeline",
    },
    {
      label: "Onboarding In Progress",
      value: `${stats.onboarding_in_progress}`,
      sub: `${stats.onboarding_done} completed`,
      targetTab: "onboarding",
    },
    {
      label: "Performance Reviews",
      value: `${stats.total_reviews}`,
      targetTab: "performance",
    },
    {
      label: "Equipment On Loan",
      value: `${stats.total_equipment}`,
      sub:
        stats.equipment_overdue > 0
          ? `${stats.equipment_overdue} overdue`
          : "All returned",
      warn: stats.equipment_overdue > 0,
      targetTab: "equipment",
    },
    {
      label: "Training Programs",
      value: `${stats.total_trainings}`,
      targetTab: "training",
    },
    {
      label: "Training Charges",
      value: `RM ${(stats.training_total_charges || 0).toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      targetTab: "training",
    },
  ];

  return (
    <div className="sd-stack">
      {/* KPI Grid */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {KPIs.map((m) => (
          <div
            key={m.label}
            className="sd-kpi-card"
            style={{ cursor: m.targetTab ? "pointer" : "default" }}
            onClick={() => m.targetTab && onNavigateTab?.(m.targetTab)}
          >
            <div className="sd-kpi-label">{m.label}</div>
            <div
              className="sd-kpi-value"
              style={{ color: m.warn ? DANGER : TEXT }}
            >
              {m.value}
            </div>
            {m.sub && (
              <div style={{ fontSize: "0.7rem", color: m.warn ? DANGER : MUTED, marginTop: "0.25rem" }}>
                {m.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Headcount by Department</h3>
          <p className="sd-chart-sub">Distribution across {deptData.length} departments</p>
          {deptData.length > 0 && <BarChart data={deptData} xKey="name" yKey="value" color={TEXT} xAngle={-25} />}
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Recruitment Pipeline Funnel</h3>
          <p className="sd-chart-sub">{stats.total_candidates} total candidates</p>
          {funnelData.length > 0 && <BarChart data={funnelData} xKey="name" yKey="value" color="var(--samurai-lime)" xAngle={-25} />}
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Department Summary</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          {deptData.map((d) => (
            <div
              key={d.name}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "var(--samurai-surface-2)",
                border: "1px solid var(--samurai-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.85rem", color: MUTED }}>{d.name}</span>
              <span style={{ fontWeight: 700, color: TEXT }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
