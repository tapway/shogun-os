import { useMemo, useState } from "react";
import type { HrDashboardStats, HrEquipment } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const DANGER = "var(--samurai-danger)";
const SURFACE = "var(--samurai-surface)";

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

/** Check if equipment is overdue based on is_overdue flag or return_due_date in the past. */
function isOverdue(eq: HrEquipment): boolean {
  if (eq.is_overdue != null) return eq.is_overdue;
  if (!eq.return_due_date) return false;
  const d = new Date(eq.return_due_date);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

export function EquipmentTab({ stats, color }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const equipment = stats.equipment || [];

  const categories = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.category).filter(Boolean))).sort(),
    [equipment],
  );

  const filtered = useMemo(() => {
    return equipment.filter((e: HrEquipment) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [equipment, categoryFilter]);

  // KPI calculations
  const totalEquipment = equipment.length;
  const overdueReturns = equipment.filter((e) => isOverdue(e)).length;
  const categoriesCount = categories.length;

  const KPIs = [
    { label: "Total Equipment", value: `${totalEquipment}` },
    { label: "Overdue Returns", value: `${overdueReturns}`, warn: overdueReturns > 0 },
    { label: "Categories", value: `${categoriesCount}` },
  ];

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value" style={{ color: k.warn ? DANGER : TEXT }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Equipment Table */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>Equipment Tracker</h3>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              color: TEXT,
              padding: "0.375rem 0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No equipment found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Equipment Name</Th>
                  <Th align="left">Category</Th>
                  <Th align="left">Condition</Th>
                  <Th align="left">Assigned To</Th>
                  <Th align="left">Purchase Date</Th>
                  <Th align="left">Return Due Date</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq) => {
                  const overdue = isOverdue(eq);
                  return (
                    <tr
                      key={eq.id}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: overdue ? `color-mix(in srgb, var(--samurai-danger) 8%, transparent)` : undefined,
                      }}
                    >
                      <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{eq.equipment_name || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{eq.category || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`sd-chip ${conditionChipClass(eq.condition)}`}>{eq.condition || "—"}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{eq.assigned_to || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(eq.purchase_date)}</td>
                      <td className="px-3 py-2" style={{ color: overdue ? DANGER : MUTED, fontSize: "0.78rem", fontWeight: overdue ? 600 : 400 }}>
                        {fmtDate(eq.return_due_date)}
                        {overdue && <span style={{ marginLeft: "0.35rem", color: DANGER }}>(Overdue)</span>}
                      </td>
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

/** Map equipment condition to chip class. */
function conditionChipClass(condition: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const c = (condition || "").toLowerCase();
  if (c.includes("excellent") || c.includes("good") || c.includes("new")) return "ok";
  if (c.includes("fair") || c.includes("used") || c.includes("average")) return "warn";
  if (c.includes("poor") || c.includes("damaged") || c.includes("broken")) return "bad";
  return "muted";
}
