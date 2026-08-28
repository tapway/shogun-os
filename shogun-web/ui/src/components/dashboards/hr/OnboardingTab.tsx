import { useMemo, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrDashboardStats, HrOnboardingTask } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
  onChanged: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const WARNING = "var(--samurai-warning)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";

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

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "";
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

export function OnboardingTab({ stats, color, department, onChanged }: Props) {
  const tasks = stats.onboarding_tasks || [];
  const checklistItems = useMemo(
    () => [...(stats.onboarding_checklist_items || [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [stats.onboarding_checklist_items],
  );
  const progress = stats.onboarding_checklist_progress || [];

  const [showChecklistSetup, setShowChecklistSetup] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editItem, setEditItem] = useState<{ id: number; title: string; description: string } | null>(null);
  const [checklistStaff, setChecklistStaff] = useState<HrOnboardingTask | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const staffDone = (staff: string) =>
    progress.filter((p) => p.staff_name === staff && p.completed).length;

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
    { label: "Checklist Items", value: `${checklistItems.length}` },
  ];

  const addItem = async () => {
    if (!newTitle.trim()) {
      setError("Item title is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await hrApi.checklistAdd(department, { title: newTitle.trim(), description: newDesc.trim() || undefined });
      setNewTitle("");
      setNewDesc("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add checklist item");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    if (!editItem.title.trim()) {
      setError("Item title is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await hrApi.checklistUpdate(department, editItem.id, {
        title: editItem.title.trim(),
        description: editItem.description.trim() || undefined,
      });
      setEditItem(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update checklist item");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: number, title: string) => {
    if (!window.confirm(`Remove checklist item "${title}"? All staff progress for this item will be removed too.`)) return;
    setBusy(true);
    setError("");
    try {
      await hrApi.checklistDelete(department, id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove checklist item");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: "0.5rem",
    border: `1px solid ${BORDER}`,
    background: "var(--samurai-surface)",
    color: TEXT,
    padding: "0.45rem 0.6rem",
    fontSize: "0.85rem",
  };

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

      {error && (
        <p style={{ color: DANGER, fontSize: "0.8rem", margin: 0 }}>{error}</p>
      )}

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

      {/* Onboarding Checklist Setup (HR-managed template) */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>
            Onboarding Checklist
          </h3>
          <button
            onClick={() => setShowChecklistSetup((v) => !v)}
            style={{
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: TEXT,
              fontSize: "0.8rem",
              padding: "0.4rem 0.8rem",
              cursor: "pointer",
            }}
          >
            {showChecklistSetup ? "Hide Setup" : "Setup Checklist"}
          </button>
        </div>

        {checklistItems.length === 0 && !showChecklistSetup && (
          <p style={{ padding: "0.5rem 0", fontSize: "0.85rem", color: MUTED }}>
            No checklist items yet. Click <strong>Setup Checklist</strong> to define the onboarding checklist for all new staff.
          </p>
        )}

        {showChecklistSetup && (
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "0.6rem", padding: "0.9rem", marginBottom: checklistItems.length > 0 ? "0.9rem" : 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", alignItems: "end" }}>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: MUTED, display: "block", marginBottom: "0.25rem" }}>Item Title *</label>
                <input style={{ ...inputStyle, width: "100%" }} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Sign employment contract" />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: MUTED, display: "block", marginBottom: "0.25rem" }}>Description (optional)</label>
                <input style={{ ...inputStyle, width: "100%" }} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="e.g. Collect IC and bank details" />
              </div>
              <button
                onClick={addItem}
                disabled={busy}
                style={{
                  borderRadius: "0.5rem",
                  border: "none",
                  background: LIME,
                  color: "#0a0a0a",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  padding: "0.5rem 1rem",
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {busy ? "Adding…" : "+ Add Item"}
              </button>
            </div>
          </div>
        )}

        {checklistItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {checklistItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: MUTED, minWidth: "1.4rem" }}>{idx + 1}.</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>{item.title}</div>
                  {item.description && (
                    <div style={{ fontSize: "0.75rem", color: MUTED }}>{item.description}</div>
                  )}
                </div>
                <button
                  onClick={() => setEditItem({ id: item.id, title: item.title, description: item.description || "" })}
                  style={{
                    borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent",
                    color: TEXT, fontSize: "0.72rem", padding: "0.2rem 0.55rem", cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => removeItem(item.id, item.title)}
                  style={{
                    borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent",
                    color: DANGER, fontSize: "0.72rem", padding: "0.2rem 0.55rem", cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <Th align="center">Checklist</Th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const days = computeDays(t.start_date, t.end_date);
                  const emoji = taskStatusEmoji(t.task_status);
                  const statusClass = onboardingStatusChip(t.status);
                  const doneCount = staffDone(t.staff_name);
                  const totalItems = checklistItems.length;
                  const allDone = totalItems > 0 && doneCount >= totalItems;
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
                      <td className="px-3 py-2 text-center">
                        {totalItems === 0 ? (
                          <span style={{ color: MUTED, fontSize: "0.75rem" }}>No items set</span>
                        ) : allDone ? (
                          <span className="sd-chip ok" style={{ cursor: "pointer" }} onClick={() => setChecklistStaff(t)}>
                            ✅ Done {doneCount}/{totalItems}
                          </span>
                        ) : (
                          <button
                            onClick={() => setChecklistStaff(t)}
                            style={{
                              borderRadius: "0.4rem",
                              border: `1px solid ${BORDER}`,
                              background: "transparent",
                              color: TEXT,
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.6rem",
                              cursor: "pointer",
                            }}
                          >
                            {doneCount}/{totalItems} Tick Items
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Checklist Item Modal */}
      {editItem && (
        <div
          onClick={() => setEditItem(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 480, padding: "1.25rem" }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: TEXT }}>Edit Checklist Item</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: MUTED, display: "block", marginBottom: "0.25rem" }}>Item Title *</label>
                <input style={{ ...inputStyle, width: "100%" }} value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: MUTED, display: "block", marginBottom: "0.25rem" }}>Description</label>
                <input style={{ ...inputStyle, width: "100%" }} value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button
                onClick={() => setEditItem(null)}
                style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={busy}
                style={{ borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1.1rem", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Checklist Modal */}
      {checklistStaff && (
        <StaffChecklistModal
          task={checklistStaff}
          department={department}
          items={checklistItems}
          progress={progress}
          busy={busy}
          onBusy={setBusy}
          onError={setError}
          onClose={() => setChecklistStaff(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function StaffChecklistModal({
  task,
  department,
  items,
  progress,
  busy,
  onBusy,
  onError,
  onClose,
  onChanged,
}: {
  task: HrOnboardingTask;
  department: string;
  items: { id: number; title: string; description?: string | null }[];
  progress: { staff_name: string; item_id: number; completed: boolean; completed_at?: string | null; completed_by?: string | null }[];
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const staffProgress = progress.filter((p) => p.staff_name === task.staff_name);
  const doneCount = staffProgress.filter((p) => p.completed).length;
  const total = items.length;
  const allDone = total > 0 && doneCount >= total;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  const toggle = async (itemId: number, completed: boolean) => {
    onBusy(true);
    onError("");
    try {
      await hrApi.checklistToggle(department, itemId, task.staff_name, completed);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to update checklist");
    } finally {
      onBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", padding: "1.25rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: TEXT, marginRight: "auto" }}>
            Onboarding Checklist — {task.staff_name}
          </h3>
          <button
            onClick={onClose}
            style={{ borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.8rem", padding: "0.25rem 0.7rem", cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        {allDone && (
          <div
            style={{
              background: `color-mix(in srgb, ${OK} 15%, transparent)`,
              border: `1px solid ${OK}`,
              borderRadius: "0.5rem",
              padding: "0.6rem 0.9rem",
              marginBottom: "0.9rem",
              fontSize: "0.85rem",
              color: TEXT,
              fontWeight: 600,
            }}
          >
            ✅ Onboarding complete — all {total} items ticked.
          </div>
        )}

        {/* progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ height: "0.6rem", flex: 1, borderRadius: 999, overflow: "hidden", background: SURFACE_2 }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: pct >= 100 ? OK : LIME,
                width: `${Math.min(pct, 100)}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>
            {doneCount}/{total}
          </span>
        </div>

        {total === 0 ? (
          <p style={{ color: MUTED, fontSize: "0.85rem" }}>
            No checklist items have been set yet. Ask HR to add items under <strong>Onboarding Checklist → Setup Checklist</strong>.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {items.map((item, idx) => {
              const p = staffProgress.find((x) => x.item_id === item.id);
              const completed = p?.completed ?? false;
              return (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    border: `1px solid ${completed ? OK : BORDER}`,
                    background: completed ? `color-mix(in srgb, ${OK} 8%, transparent)` : undefined,
                    borderRadius: "0.5rem",
                    padding: "0.6rem 0.8rem",
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={completed}
                    disabled={busy}
                    onChange={(e) => toggle(item.id, e.target.checked)}
                    style={{ marginTop: "0.15rem", accentColor: "var(--samurai-lime)", width: 15, height: 15 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: completed ? MUTED : TEXT, textDecoration: completed ? "line-through" : undefined }}>
                      {idx + 1}. {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: "0.75rem", color: MUTED }}>{item.description}</div>
                    )}
                    {completed && p?.completed_at && (
                      <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "0.15rem" }}>
                        ✓ {fmtDateTime(p.completed_at)}{p.completed_by ? ` by ${p.completed_by}` : ""}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
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
