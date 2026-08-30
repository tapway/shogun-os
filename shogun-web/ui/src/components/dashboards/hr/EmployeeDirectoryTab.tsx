import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { HrDashboardStats, HrEmployee } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE = "var(--samurai-surface)";
const SURFACE_2 = "var(--samurai-surface-2)";
const DANGER = "var(--samurai-danger)";

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

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function driveThumb(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w512` : url;
}

function EmployeeAvatar({ e }: { e: HrEmployee }) {
  const [err, setErr] = useState(false);
  const src = e.profile_picture_url ? driveThumb(e.profile_picture_url) : null;
  const initials = (e.employees_name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src && !err) {
    return (
      <img
        src={src}
        alt={e.employees_name || "Profile picture"}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
        style={{ width: "3rem", height: "3rem", borderRadius: "9999px", objectFit: "cover", border: `2px solid ${BORDER}`, background: SURFACE_2, flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: "3rem", height: "3rem", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", background: SURFACE_2, border: `2px solid ${BORDER}`, color: MUTED, fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function EmployeeDirectoryTab({ stats, color }: Props) {
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selected, setSelected] = useState<HrEmployee | null>(null);

  const departments = useMemo(
    () => Object.entries(stats.dept_counts || {}).map(([name, count]) => ({ name, count })),
    [stats.dept_counts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (stats.employees || []).filter((e: HrEmployee) => {
      if (q) {
        const hay = `${e.employees_name} ${e.role} ${e.department} ${e.manager_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      return true;
    });
  }, [stats.employees, query, deptFilter]);

  const totalEmployees = stats.employees?.length ?? 0;
  const deptCount = departments.length;
  const avgTenure = useMemo(() => {
    const years = (stats.employees || [])
      .map((e) => e.no_of_years ?? 0)
      .filter((n) => typeof n === "number" && n > 0);
    if (years.length === 0) return 0;
    return years.reduce((s, n) => s + n, 0) / years.length;
  }, [stats.employees]);

  const KPIs = [
    { label: "Total Employees", value: `${totalEmployees}` },
    { label: "Departments", value: `${deptCount}` },
    { label: "Avg Tenure (yrs)", value: avgTenure.toFixed(1) },
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

      {/* Employee Directory Table */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>Employee Directory</h3>
          <div style={{ position: "relative" }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, department…"
              style={{
                width: "16rem",
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
        </div>

        {/* Department filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
          <Pill active={deptFilter === "all"} onClick={() => setDeptFilter("all")} color={color}>
            All ({totalEmployees})
          </Pill>
          {departments.map((d) => (
            <Pill key={d.name} active={deptFilter === d.name} onClick={() => setDeptFilter(d.name)} color={color}>
              {d.name} ({d.count})
            </Pill>
          ))}
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
                  <Th align="left">Name</Th>
                  <Th align="left">Department</Th>
                  <Th align="left">Role</Th>
                  <Th align="left">Manager</Th>
                  <Th align="left">Date of Hire</Th>
                  <Th align="right">No. of Years</Th>
                  <Th align="center">Q1</Th>
                  <Th align="center">Q2</Th>
                  <Th align="center">Q3</Th>
                  <Th align="center">Q4</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = SURFACE_2)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
                  >
                    <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{e.employees_name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{e.department || "—"}</td>
                    <td className="px-3 py-2" style={{ color: TEXT }}>{e.role || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED }}>{e.manager_name || "—"}</td>
                    <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(e.date_of_hire)}</td>
                    <td className="px-3 py-2 text-right" style={{ fontWeight: 600, color: TEXT }}>{e.no_of_years ?? "—"}</td>
                    <td className="px-3 py-2 text-center" style={{ color: MUTED, fontSize: "0.78rem" }}>{e.q1 || "—"}</td>
                    <td className="px-3 py-2 text-center" style={{ color: MUTED, fontSize: "0.78rem" }}>{e.q2 || "—"}</td>
                    <td className="px-3 py-2 text-center" style={{ color: MUTED, fontSize: "0.78rem" }}>{e.q3 || "—"}</td>
                    <td className="px-3 py-2 text-center" style={{ color: MUTED, fontSize: "0.78rem" }}>{e.q4 || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selected && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)", border: "none", cursor: "default" }}
            onClick={() => setSelected(null)}
            aria-label="Close"
          />
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
            onClick={() => setSelected(null)}
          >
            <div
              className="sd-chart-card"
              style={{ position: "relative", zIndex: 50, width: "100%", maxWidth: "30rem", padding: "1.25rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <EmployeeAvatar e={selected} />
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, color: TEXT, margin: 0 }}>
                      {selected.employees_name || "Unknown"}
                    </h2>
                    <p style={{ fontSize: "0.72rem", color: MUTED, margin: 0 }}>
                      {selected.role || "—"} · {selected.department || "—"}
                    </p>
                  </div>
                </div>
                <button type="button" className="sd-icon-btn" onClick={() => setSelected(null)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <DetailField label="Manager" value={selected.manager_name} />
                <DetailField label="Date of Hire" value={fmtDate(selected.date_of_hire)} />
                <DetailField label="No. of Years" value={selected.no_of_years != null ? `${selected.no_of_years}` : "—"} />
                <DetailField label="Phone" value={selected.phone_number || "—"} />
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, marginBottom: "0.5rem" }}>
                  Quarterly Leave
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                    <div key={q} style={{ borderRadius: "0.5rem", background: SURFACE_2, padding: "0.6rem", textAlign: "center" }}>
                      <div style={{ fontSize: "0.72rem", color: MUTED, textTransform: "uppercase" }}>{q.toUpperCase()}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: TEXT }}>{selected[q] || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.leave_taken && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: MUTED }}>Total Leave Taken</span>
                  <span style={{ fontWeight: 600, color: TEXT }}>{selected.leave_taken}</span>
                </div>
              )}

                            {(selected.linkedin_profile || selected.employee_file_url) && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                  {selected.linkedin_profile ? (
                    <a href={selected.linkedin_profile} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "var(--samurai-lime)" }}>
                      LinkedIn Profile →
                    </a>
                  ) : (
                    <span />
                  )}
                  {selected.employee_file_url && (
                    <a href={selected.employee_file_url} target="_blank" rel="noreferrer" title="Open employee file in Google Drive" style={{ fontSize: "0.78rem", color: "var(--samurai-lime)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      Employee File ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sd-chip"
      style={{
        cursor: "pointer",
        background: active ? color : SURFACE_2,
        color: active ? "var(--samurai-bg)" : MUTED,
        border: `1px solid ${active ? color : BORDER}`,
        opacity: active ? 1 : 0.85,
      }}
    >
      {children}
    </button>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: "0.5rem", background: SURFACE_2, padding: "0.6rem" }}>
      <div style={{ fontSize: "0.66rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: TEXT, fontSize: "0.85rem", marginTop: "0.15rem" }}>
        {value}
      </div>
    </div>
  );
}

export { parseLeave };
