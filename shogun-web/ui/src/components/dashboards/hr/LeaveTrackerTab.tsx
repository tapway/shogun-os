import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { HrDashboardStats, HrEmployee } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";

const th = { fontSize: "0.72rem", fontWeight: 500, color: MUTED } as const;
function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" | "center" }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

/** Parse a Notion-style quarterly leave field ("3" / "3 days" / "" / null) into a number. */
function parseLeave(v: string | null | undefined): number {
  if (!v) return 0;
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

/** Sum all quarterly leave values for an employee. */
function totalLeaveTaken(e: HrEmployee): number {
  return parseLeave(e.q1) + parseLeave(e.q2) + parseLeave(e.q3) + parseLeave(e.q4);
}

export function LeaveTrackerTab({ stats, color }: Props) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const employees = stats.employees || [];
  const departments = useMemo(
    () => Object.entries(stats.dept_counts || {}).map(([name]) => name),
    [stats.dept_counts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e: HrEmployee) => {
      if (q) {
        const hay = `${e.employees_name} ${e.role} ${e.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      return true;
    });
  }, [employees, query, deptFilter]);

  // KPI calculations
  const totalEmployees = employees.length;
  // "On Leave" = employees with any quarterly leave > 0
  const onLeave = employees.filter((e) => totalLeaveTaken(e) > 0).length;
  // Avg leave per quarter = average of all quarterly values across all employees
  const avgLeavePerQuarter = useMemo(() => {
    if (employees.length === 0) return 0;
    let sum = 0;
    let count = 0;
    employees.forEach((e) => {
      [e.q1, e.q2, e.q3, e.q4].forEach((v) => {
        const n = parseLeave(v);
        if (n > 0) {
          sum += n;
          count += 1;
        }
      });
    });
    return count > 0 ? sum / count : 0;
  }, [employees]);

  const KPIs = [
    { label: "Total Employees", value: `${totalEmployees}` },
    { label: "On Leave", value: `${onLeave}` },
    { label: "Avg Leave / Quarter", value: avgLeavePerQuarter.toFixed(1) },
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

      {/* Empty data notice — Q1-Q4 are empty in Notion */}
      {onLeave === 0 && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "var(--samurai-surface-2)",
            border: "1px solid var(--samurai-border)",
            borderLeft: "3px solid var(--samurai-warning)",
            fontSize: "0.8rem",
            color: "var(--samurai-muted)",
          }}
        >
          ⚠️ <strong style={{ color: "var(--samurai-text)" }}>Leave data is empty in Notion.</strong> The Q1–Q4 and
          Leave Taken fields exist as columns on the Employee Directory, but no values have been filled in.
          Once your HR team fills them in Notion and you re-sync, the data will appear here.
        </div>
      )}

      {/* Leave Tracker Table */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>Quarterly Leave Tracker</h3>
          <div style={{ position: "relative" }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee…"
              style={{
                width: "14rem",
                borderRadius: "0.5rem",
                border: `1px solid ${BORDER}`,
                background: SURFACE,
                paddingLeft: "2rem",
                paddingRight: "0.75rem",
                paddingTop: "0.375rem",
                paddingBottom: "0.375rem",
                fontSize: "0.85rem",
                color: TEXT,
              }}
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              color: TEXT,
              padding: "0.375rem 0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No employees match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Employee Name</Th>
                  <Th align="left">Department</Th>
                  <Th align="center">Q1</Th>
                  <Th align="center">Q2</Th>
                  <Th align="center">Q3</Th>
                  <Th align="center">Q4</Th>
                  <Th align="right">Leave Taken</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const q1 = parseLeave(e.q1);
                  const q2 = parseLeave(e.q2);
                  const q3 = parseLeave(e.q3);
                  const q4 = parseLeave(e.q4);
                  const total = q1 + q2 + q3 + q4;
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{e.employees_name || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{e.department || "—"}</td>
                      <td className="px-3 py-2 text-center" style={{ color: q1 > 0 ? TEXT : MUTED }}>{e.q1 || "—"}</td>
                      <td className="px-3 py-2 text-center" style={{ color: q2 > 0 ? TEXT : MUTED }}>{e.q2 || "—"}</td>
                      <td className="px-3 py-2 text-center" style={{ color: q3 > 0 ? TEXT : MUTED }}>{e.q3 || "—"}</td>
                      <td className="px-3 py-2 text-center" style={{ color: q4 > 0 ? TEXT : MUTED }}>{e.q4 || "—"}</td>
                      <td className="px-3 py-2 text-right" style={{ fontWeight: 600, color: total > 0 ? TEXT : MUTED }}>
                        {total > 0 ? total.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note about data source */}
      <div className="sd-chart-card" style={{ padding: "0.75rem 1rem" }}>
        <p style={{ fontSize: "0.75rem", color: MUTED, margin: 0 }}>
          <strong>Note:</strong> Leave data is sourced from Employee Directory Q1–Q4 fields. No separate leave database exists.
        </p>
      </div>
    </div>
  );
}
