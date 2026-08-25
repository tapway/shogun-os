import { useMemo } from "react";
import type { HrDashboardStats, HrTraining, HrTrainer } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const OK = "var(--samurai-ok)";

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

function fmtMyr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function TrainingTab({ stats, color }: Props) {
  const trainings = stats.trainings || [];
  const trainers = stats.trainers || [];

  // KPI calculations
  const totalTrainings = trainings.length;
  const totalCharges = trainings.reduce((sum, t) => sum + (t.training_charges ?? 0), 0);
  const totalTrainers = trainers.length;

  const KPIs = [
    { label: "Total Trainings", value: `${totalTrainings}` },
    { label: "Total Charges", value: fmtMyr(totalCharges) },
    { label: "Total Trainers", value: `${totalTrainers}` },
  ];

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Section 1: Trainings Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ margin: 0, marginBottom: "0.75rem" }}>Training Programs</h3>

        {trainings.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No training programs found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Training Name</Th>
                  <Th align="left">Staff</Th>
                  <Th align="left">Trainer</Th>
                  <Th align="left">Format</Th>
                  <Th align="left">Start</Th>
                  <Th align="left">End</Th>
                  <Th align="right">Charges</Th>
                  <Th align="center">Exam</Th>
                  <Th align="center">Bond</Th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{t.training_name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{t.staff_name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{t.trainer_name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: TEXT }}>{t.training_format || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(t.start_date)}</td>
                    <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(t.end_date)}</td>
                    <td className="px-3 py-2 text-right" style={{ fontWeight: 600, color: TEXT }}>{fmtMyr(t.training_charges)}</td>
                    <td className="px-3 py-2 text-center" style={{ fontSize: "1rem" }}>
                      {t.exam_included ? "✓" : "✗"}
                    </td>
                    <td className="px-3 py-2 text-center" style={{ fontSize: "1rem" }}>
                      {t.bond_agreement ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Trainers Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ margin: 0, marginBottom: "0.75rem" }}>Trainers</h3>

        {trainers.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No trainers found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Name</Th>
                  <Th align="left">Specialization</Th>
                  <Th align="left">Email</Th>
                  <Th align="left">Phone</Th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((tr) => (
                  <tr key={tr.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{tr.name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{tr.specialization || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>
                      {tr.contact_email ? (
                        <a href={`mailto:${tr.contact_email}`} style={{ color: "var(--samurai-lime)" }}>
                          {tr.contact_email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{tr.phone_number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
