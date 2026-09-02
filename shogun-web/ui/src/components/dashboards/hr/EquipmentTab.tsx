import { useMemo, useRef, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrDashboardStats, HrEquipment } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
  onChanged: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const DANGER = "var(--samurai-danger)";
const SURFACE = "var(--samurai-surface)";
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

function fmtAmount(v: number | null | undefined): string {
  if (v == null) return "—";
  return `RM ${v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Check if equipment is overdue based on is_overdue flag or return_due_date in the past. */
function isOverdue(eq: HrEquipment): boolean {
  if (eq.returned) return false;
  if (eq.is_overdue != null) return eq.is_overdue;
  if (!eq.return_due_date) return false;
  const d = new Date(eq.return_due_date);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: TEXT,
  padding: "0.45rem 0.6rem",
  fontSize: "0.85rem",
};
const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: MUTED,
  display: "block",
  marginBottom: "0.25rem",
};

interface EqFormState {
  equipment_name: string;
  item_number: string;
  category: string;
  condition: string;
  assigned_to: string;
  amount: string;
  purchase_date: string;
  return_due_date: string;
}

const EMPTY_FORM: EqFormState = {
  equipment_name: "",
  item_number: "",
  category: "",
  condition: "",
  assigned_to: "",
  amount: "",
  purchase_date: "",
  return_due_date: "",
};

const CONDITIONS = ["Excellent", "Good", "Fair", "Used", "Damaged", "Broken"];

export function EquipmentTab({ stats, color, department, onChanged }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<HrEquipment | null>(null);
  const [returnTarget, setReturnTarget] = useState<HrEquipment | null>(null);
  const [logsFor, setLogsFor] = useState<HrEquipment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EqFormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const equipment = stats.equipment || [];
  const logs = stats.equipment_logs || [];

  const categories = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.category).filter(Boolean))).sort(),
    [equipment],
  );

  const filtered = useMemo(() => {
    return equipment.filter((e: HrEquipment) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (statusFilter === "active" && e.returned) return false;
      if (statusFilter === "returned" && !e.returned) return false;
      return true;
    });
  }, [equipment, categoryFilter, statusFilter]);

  // KPI calculations
  const totalEquipment = equipment.length;
  const overdueReturns = equipment.filter((e) => isOverdue(e)).length;
  const returnedCount = equipment.filter((e) => e.returned).length;
  const categoriesCount = categories.length;

  const KPIs = [
    { label: "Total Equipment", value: `${totalEquipment}` },
    { label: "On Loan", value: `${totalEquipment - returnedCount}` },
    { label: "Overdue Returns", value: `${overdueReturns}`, warn: overdueReturns > 0 },
    { label: "Returned", value: `${returnedCount}` },
    { label: "Categories", value: `${categoriesCount}` },
  ];

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setSigFile(null);
    setError("");
    setShowAdd(true);
  };

  const openEdit = (eq: HrEquipment) => {
    setForm({
      equipment_name: eq.equipment_name || "",
      item_number: eq.item_number || "",
      category: eq.category || "",
      condition: eq.condition || "",
      assigned_to: eq.assigned_to || "",
      amount: eq.amount != null ? String(eq.amount) : "",
      purchase_date: eq.purchase_date || "",
      return_due_date: eq.return_due_date || "",
    });
    setImageFile(null);
    setSigFile(null);
    setError("");
    setEditTarget(eq);
  };

  const closeModals = () => {
    setShowAdd(false);
    setEditTarget(null);
    setReturnTarget(null);
    setBusy(false);
    setError("");
  };

  const submitCreate = async () => {
    if (!form.equipment_name.trim()) {
      setError("Equipment name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);
      if (sigFile) fd.append("signature_doc", sigFile);
      await hrApi.equipmentCreate(department, fd);
      closeModals();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add equipment");
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, string | null> = { ...form };
      await hrApi.equipmentUpdate(department, editTarget.id, payload);
      if (imageFile) await hrApi.equipmentFileUpload(department, editTarget.id, imageFile, "image");
      if (sigFile) await hrApi.equipmentFileUpload(department, editTarget.id, sigFile, "signature_doc");
      closeModals();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update equipment");
      setBusy(false);
    }
  };

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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              borderRadius: "0.5rem",
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              color: TEXT,
              padding: "0.375rem 0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <option value="all">All Status</option>
            <option value="active">On Loan</option>
            <option value="returned">Returned</option>
          </select>
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
          <button
            onClick={openAdd}
            style={{
              borderRadius: "0.5rem",
              border: "none",
              background: LIME,
              color: "#0a0a0a",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "0.45rem 0.9rem",
              cursor: "pointer",
            }}
          >
            + Add Equipment
          </button>
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
                  <Th align="left">Image</Th>
                  <Th align="left">Equipment Name</Th>
                  <Th align="left">Item No.</Th>
                  <Th align="left">Category</Th>
                  <Th align="left">Condition</Th>
                  <Th align="right">Amount</Th>
                  <Th align="left">Assigned To</Th>
                  <Th align="left">Purchase Date</Th>
                  <Th align="left">Return Due</Th>
                  <Th align="left">Status</Th>
                  <Th align="left">Signature</Th>
                  <Th align="left">Logs</Th>
                  <Th align="right">Actions</Th>
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
                      <td className="px-3 py-2">
                        {eq.image_url ? (
                          <a href={eq.image_url} target="_blank" rel="noreferrer">
                            <img
                              src={eq.image_url}
                              alt={eq.equipment_name}
                              style={{ width: 40, height: 40, borderRadius: "0.4rem", objectFit: "cover", border: `1px solid ${BORDER}` }}
                            />
                          </a>
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: "0.4rem", border: `1px dashed ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: "0.6rem" }}>
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2" style={{ fontWeight: 600, color: TEXT }}>{eq.equipment_name || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.8rem" }}>{eq.item_number || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{eq.category || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`sd-chip ${conditionChipClass(eq.condition)}`}>{eq.condition || "—"}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: TEXT, textAlign: "right", fontSize: "0.8rem" }}>{fmtAmount(eq.amount)}</td>
                      <td className="px-3 py-2" style={{ color: MUTED }}>{eq.assigned_to || "—"}</td>
                      <td className="px-3 py-2" style={{ color: MUTED, fontSize: "0.78rem" }}>{fmtDate(eq.purchase_date)}</td>
                      <td className="px-3 py-2" style={{ color: overdue ? DANGER : MUTED, fontSize: "0.78rem", fontWeight: overdue ? 600 : 400 }}>
                        {fmtDate(eq.return_due_date)}
                        {overdue && <span style={{ marginLeft: "0.35rem", color: DANGER }}>(Overdue)</span>}
                      </td>
                      <td className="px-3 py-2">
                        {eq.returned ? (
                          <span className="sd-chip ok" title={eq.return_date ? `Returned ${fmtDate(eq.return_date)}` : undefined}>Returned</span>
                        ) : (
                          <span className="sd-chip muted">On Loan</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {eq.signature_doc_url ? (
                          <a href={eq.signature_doc_url} target="_blank" rel="noreferrer" style={{ color, fontSize: "0.8rem", textDecoration: "underline" }}>
                            View
                          </a>
                        ) : (
                          <span style={{ color: MUTED }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setLogsFor(eq)}
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
                          View Logs
                        </button>
                      </td>
                      <td className="px-3 py-2" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => openEdit(eq)}
                          style={{
                            borderRadius: "0.4rem",
                            border: `1px solid ${BORDER}`,
                            background: "transparent",
                            color: TEXT,
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.6rem",
                            cursor: "pointer",
                            marginRight: "0.35rem",
                          }}
                        >
                          Edit
                        </button>
                        {!eq.returned && (
                          <button
                            onClick={() => { setReturnTarget(eq); setError(""); }}
                            style={{
                              borderRadius: "0.4rem",
                              border: `1px solid ${BORDER}`,
                              background: "transparent",
                              color: DANGER,
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.6rem",
                              cursor: "pointer",
                            }}
                          >
                            Return
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

      {/* Add / Edit Modal */}
      {(showAdd || editTarget) && (
        <div
          onClick={closeModals}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: TEXT }}>
              {editTarget ? `Edit Equipment — ${editTarget.equipment_name}` : "Add Equipment"}
            </h3>
            {error && <p style={{ color: DANGER, fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Equipment Name *</label>
                <input style={inputStyle} value={form.equipment_name} onChange={(e) => setForm({ ...form, equipment_name: e.target.value })} placeholder="e.g. MacBook Pro 14&quot;" />
              </div>
              <div>
                <label style={labelStyle}>Item Number</label>
                <input style={inputStyle} value={form.item_number} onChange={(e) => setForm({ ...form, item_number: e.target.value })} placeholder="e.g. EQ-0021" />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Laptop" list="eq-categories" />
                <datalist id="eq-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Condition</label>
                <select style={inputStyle} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option value="">—</option>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount (RM)</label>
                <input style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 8500" inputMode="decimal" />
              </div>
              <div>
                <label style={labelStyle}>Assigned To</label>
                <input style={inputStyle} value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Employee name" />
              </div>
              <div>
                <label style={labelStyle}>Purchase Date</label>
                <input style={inputStyle} type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Return Due Date</label>
                <input style={inputStyle} type="date" value={form.return_due_date} onChange={(e) => setForm({ ...form, return_due_date: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Equipment Image</label>
                <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                <button onClick={() => imageInputRef.current?.click()} style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}>
                  {imageFile ? imageFile.name : editTarget?.image_url ? "Replace image…" : "Choose image…"}
                </button>
              </div>
              <div>
                <label style={labelStyle}>Signature Document</label>
                <input ref={sigInputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" style={{ display: "none" }}
                  onChange={(e) => setSigFile(e.target.files?.[0] || null)} />
                <button onClick={() => sigInputRef.current?.click()} style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}>
                  {sigFile ? sigFile.name : editTarget?.signature_doc_url ? "Replace signature doc…" : "Choose signature doc…"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button
                onClick={closeModals}
                style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={editTarget ? submitEdit : submitCreate}
                disabled={busy}
                style={{ borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1.1rem", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Saving…" : editTarget ? "Save Changes" : "Add Equipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnTarget && (
        <ReturnModal
          equipment={returnTarget}
          department={department}
          busy={busy}
          error={error}
          onClose={closeModals}
          onBusy={setBusy}
          onError={setError}
          onDone={() => { closeModals(); onChanged(); }}
        />
      )}

      {/* Logs Modal */}
      {logsFor && (
        <div
          onClick={() => setLogsFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: TEXT, marginRight: "auto" }}>
                Equipment Details — {logsFor.equipment_name}
              </h3>
              <button
                onClick={() => setLogsFor(null)}
                style={{ borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.8rem", padding: "0.25rem 0.7rem", cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            {/* Equipment Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 1.2rem", marginBottom: "1rem", padding: "0.8rem", border: `1px solid ${BORDER}`, borderRadius: "0.5rem", background: SURFACE }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Item Number</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{logsFor.item_number || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Category</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{logsFor.category || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Condition</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{logsFor.condition || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Assigned To</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{logsFor.assigned_to || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Amount</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{fmtAmount(logsFor.amount)}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Purchase Date</span>
                <span style={{ fontSize: "0.85rem", color: TEXT }}>{fmtDate(logsFor.purchase_date)}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Return Due Date</span>
                <span style={{ fontSize: "0.85rem", color: isOverdue(logsFor) ? DANGER : TEXT }}>{fmtDate(logsFor.return_due_date)}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: MUTED, display: "block" }}>Status</span>
                <span style={{ fontSize: "0.85rem", color: logsFor.returned ? LIME : isOverdue(logsFor) ? DANGER : TEXT }}>
                  {logsFor.returned ? `Returned (${fmtDate(logsFor.return_date)})` : isOverdue(logsFor) ? "Overdue" : "On Loan"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {logsFor.image_url && (
                <a
                  href={logsFor.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: "0.8rem", textDecoration: "none", cursor: "pointer" }}
                >
                  📷 View Equipment Image
                </a>
              )}
              {logsFor.signature_doc_url && (
                <a
                  href={logsFor.signature_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: "0.8rem", textDecoration: "none", cursor: "pointer" }}
                >
                  📄 View Signed Document
                </a>
              )}
            </div>

            {/* Activity Log Section */}
            <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.9rem", color: TEXT }}>Activity Log</h4>
            {(() => {
              const entries = logs.filter((l) => l.equipment_id === logsFor.id);
              if (entries.length === 0) {
                return <p style={{ color: MUTED, fontSize: "0.85rem" }}>No log entries yet for this equipment.</p>;
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {entries.map((l) => (
                    <div key={l.id} style={{ border: `1px solid ${BORDER}`, borderRadius: "0.5rem", padding: "0.6rem 0.8rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <span className={`sd-chip ${l.event_type === "returned" ? "ok" : l.event_type === "created" ? "muted" : "warn"}`}>
                          {l.event_type}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: MUTED, marginLeft: "auto" }}>
                          {l.created_at ? fmtDate(l.created_at) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: TEXT }}>{l.detail || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "0.15rem" }}>by {l.actor || "HR"}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnModal({
  equipment,
  department,
  busy,
  error,
  onClose,
  onBusy,
  onError,
  onDone,
}: {
  equipment: HrEquipment;
  department: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onDone: () => void;
}) {
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [condition, setCondition] = useState(equipment.condition || "");
  const [note, setNote] = useState("");

  const submit = async () => {
    onBusy(true);
    onError("");
    try {
      await hrApi.equipmentReturn(department, equipment.id, {
        return_date: returnDate,
        condition,
        note,
      });
      onDone();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to mark as returned");
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
        style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 440, padding: "1.25rem" }}
      >
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: TEXT }}>
          Return Equipment — {equipment.equipment_name}
        </h3>
        {error && <p style={{ color: DANGER, fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{error}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Return Date</label>
            <input style={inputStyle} type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Condition on Return</label>
            <select style={inputStyle} value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">—</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Returned by employee, checked by HR" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            onClick={onClose}
            style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{ borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1.1rem", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Saving…" : "Mark Returned"}
          </button>
        </div>
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
