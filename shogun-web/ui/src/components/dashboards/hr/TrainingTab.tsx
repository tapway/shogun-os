import { useMemo, useRef, useState } from "react";
import { hrApi } from "../../../lib/api";
import type { HrDashboardStats, HrTraining, HrTrainingParticipant } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
  department: string;
  onChanged: () => void;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const OK = "var(--samurai-ok)";
const DANGER = "var(--samurai-danger)";
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

function fmtMyr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: `1px solid ${BORDER}`,
  background: "var(--samurai-surface)",
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

const FORMATS = ["Online", "Physical", "Hybrid", "Workshop", "Seminar", "In-house"];

interface TrainingFormState {
  training_name: string;
  staff_name: string;
  trainer_name: string;
  training_format: string;
  start_date: string;
  end_date: string;
  training_charges: string;
  exam_included: boolean;
  bond_agreement: boolean;
}

const EMPTY_FORM: TrainingFormState = {
  training_name: "",
  staff_name: "",
  trainer_name: "",
  training_format: "",
  start_date: "",
  end_date: "",
  training_charges: "",
  exam_included: false,
  bond_agreement: false,
};

export function TrainingTab({ stats, color, department, onChanged }: Props) {
  const trainings = stats.trainings || [];
  const trainers = stats.trainers || [];
  const participants = stats.training_participants || [];
  const employees = stats.employees || [];

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TrainingFormState>(EMPTY_FORM);
  const [approvalFile, setApprovalFile] = useState<File | null>(null);
  const approvalInputRef = useRef<HTMLInputElement>(null);
  const [participantsFor, setParticipantsFor] = useState<HrTraining | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // KPI calculations
  const totalTrainings = trainings.length;
  const totalCharges = trainings.reduce((sum, t) => sum + (t.training_charges ?? 0), 0);
  const totalTrainers = trainers.length;
  const totalParticipants = participants.length;
  const certsUploaded = participants.filter((p) => p.cert_url).length;

  const KPIs = [
    { label: "Total Trainings", value: `${totalTrainings}` },
    { label: "Total Charges", value: fmtMyr(totalCharges) },
    { label: "Total Trainers", value: `${totalTrainers}` },
    { label: "Participants", value: `${totalParticipants}` },
    { label: "Certificates", value: `${certsUploaded}` },
  ];

  const participantsForTraining = (trainingId: number) =>
    participants.filter((p) => p.training_id === trainingId);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setApprovalFile(null);
    setError("");
    setShowAdd(true);
  };

  const submitCreate = async () => {
    if (!form.training_name.trim()) {
      setError("Training name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("training_name", form.training_name);
      fd.append("staff_name", form.staff_name);
      fd.append("trainer_name", form.trainer_name);
      fd.append("training_format", form.training_format);
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date);
      fd.append("training_charges", form.training_charges);
      fd.append("exam_included", form.exam_included ? "true" : "false");
      fd.append("bond_agreement", form.bond_agreement ? "true" : "false");
      if (approvalFile) fd.append("approval_doc", approvalFile);
      await hrApi.trainingCreate(department, fd);
      setShowAdd(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create training program");
      setBusy(false);
    }
  };

  const uploadApprovalDoc = async (training: HrTraining, file: File) => {
    setBusy(true);
    setError("");
    try {
      await hrApi.trainingApprovalDoc(department, training.id, file);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload approval doc");
    } finally {
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
            <div className="sd-kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: DANGER, fontSize: "0.8rem", margin: 0 }}>{error}</p>}

      {/* Section 1: Trainings Table */}
      <div className="sd-chart-card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: "auto" }}>Training Programs</h3>
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
            + Add Training Program
          </button>
        </div>

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
                  <Th align="left">Approval Doc</Th>
                  <Th align="left">Participants</Th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((t) => {
                  const parts = participantsForTraining(t.id);
                  return (
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
                      <td className="px-3 py-2">
                        <ApprovalDocCell training={t} onUpload={uploadApprovalDoc} busy={busy} color={color} />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => { setError(""); setParticipantsFor(t); }}
                          style={{
                            borderRadius: "0.4rem",
                            border: `1px solid ${BORDER}`,
                            background: "transparent",
                            color: TEXT,
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.6rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {parts.length > 0 ? `${parts.length} Manage` : "Add"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Add Training Program Modal */}
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: TEXT }}>Add Training Program</h3>
            {error && <p style={{ color: DANGER, fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Training Name *</label>
                <input style={inputStyle} value={form.training_name} onChange={(e) => setForm({ ...form, training_name: e.target.value })} placeholder="e.g. AWS Solutions Architect Certification" />
              </div>
              <div>
                <label style={labelStyle}>Staff (Participant)</label>
                <input style={inputStyle} value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} placeholder="e.g. Ali Bin Abu" list="hr-employees-list" />
                <datalist id="hr-employees-list">
                  {employees.map((emp) => <option key={emp.id} value={emp.employees_name} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Trainer</label>
                <input style={inputStyle} value={form.trainer_name} onChange={(e) => setForm({ ...form, trainer_name: e.target.value })} placeholder="Trainer name" />
              </div>
              <div>
                <label style={labelStyle}>Format</label>
                <select style={inputStyle} value={form.training_format} onChange={(e) => setForm({ ...form, training_format: e.target.value })}>
                  <option value="">—</option>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Charges (RM)</label>
                <input style={inputStyle} value={form.training_charges} onChange={(e) => setForm({ ...form, training_charges: e.target.value })} placeholder="e.g. 3500" inputMode="decimal" />
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input style={inputStyle} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input style={inputStyle} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.exam_included} onChange={(e) => setForm({ ...form, exam_included: e.target.checked })} style={{ accentColor: LIME }} />
                  Exam included
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: TEXT, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.bond_agreement} onChange={(e) => setForm({ ...form, bond_agreement: e.target.checked })} style={{ accentColor: LIME }} />
                  Bond agreement
                </label>
              </div>
              <div>
                <label style={labelStyle}>Approval Document</label>
                <input ref={approvalInputRef} type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" style={{ display: "none" }}
                  onChange={(e) => setApprovalFile(e.target.files?.[0] || null)} />
                <button onClick={() => approvalInputRef.current?.click()} style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}>
                  {approvalFile ? approvalFile.name : "Choose approval doc…"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{ borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.85rem", padding: "0.45rem 1rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={submitCreate}
                disabled={busy}
                style={{ borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a", fontWeight: 600, fontSize: "0.85rem", padding: "0.45rem 1.1rem", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Creating…" : "Create Program"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {participantsFor && (
        <ParticipantsModal
          training={participantsFor}
          participants={participantsForTraining(participantsFor.id)}
          employees={employees.map((e) => ({ id: e.id, name: e.employees_name, department: e.department }))}
          department={department}
          busy={busy}
          onBusy={setBusy}
          onError={setError}
          onClose={() => setParticipantsFor(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function ApprovalDocCell({ training, onUpload, busy, color }: {
  training: HrTraining;
  onUpload: (t: HrTraining, f: File) => void;
  busy: boolean;
  color: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      {training.approval_doc_url ? (
        <a href={training.approval_doc_url} target="_blank" rel="noreferrer" style={{ color, fontSize: "0.78rem", textDecoration: "underline", whiteSpace: "nowrap" }}>
          View
        </a>
      ) : (
        <span style={{ color: MUTED, fontSize: "0.78rem" }}>—</span>
      )}
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(training, f); e.target.value = ""; }} />
      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        style={{
          borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent",
          color: MUTED, fontSize: "0.7rem", padding: "0.15rem 0.5rem", cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap",
        }}
      >
        {training.approval_doc_url ? "Replace" : "Upload"}
      </button>
    </div>
  );
}

function ParticipantsModal({
  training,
  participants,
  employees,
  department,
  busy,
  onBusy,
  onError,
  onClose,
  onChanged,
}: {
  training: HrTraining;
  participants: HrTrainingParticipant[];
  employees: { id: number; name: string; department: string }[];
  department: string;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");
  const certRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addParticipant = async () => {
    if (!newName.trim()) {
      onError("Participant name is required");
      return;
    }
    onBusy(true);
    onError("");
    try {
      await hrApi.trainingAddParticipant(department, training.id, {
        staff_name: newName.trim(),
        department: newDept.trim() || undefined,
      });
      setNewName("");
      setNewDept("");
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to add participant");
    } finally {
      onBusy(false);
    }
  };

  const removeParticipant = async (p: HrTrainingParticipant) => {
    if (!window.confirm(`Remove ${p.staff_name} from "${training.training_name}"?`)) return;
    onBusy(true);
    onError("");
    try {
      await hrApi.trainingRemoveParticipant(department, training.id, p.id);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to remove participant");
    } finally {
      onBusy(false);
    }
  };

  const uploadCert = async (p: HrTrainingParticipant, file: File) => {
    onBusy(true);
    onError("");
    try {
      await hrApi.trainingUploadCert(department, training.id, p.id, file);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to upload certificate");
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
        style={{ background: "var(--samurai-bg)", border: `1px solid ${BORDER}`, borderRadius: "0.75rem", width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", padding: "1.25rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: TEXT, marginRight: "auto" }}>
            Participants — {training.training_name}
          </h3>
          <button
            onClick={onClose}
            style={{ borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: "0.8rem", padding: "0.25rem 0.7rem", cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        {/* Add participant row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: "0.5rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Staff Name *</label>
            <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Select or type staff name" list="participants-employee-list" />
            <datalist id="participants-employee-list">
              {employees.map((emp) => <option key={emp.id} value={emp.name} />)}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <input style={inputStyle} value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="e.g. Engineering" list="participants-dept-list" />
            <datalist id="participants-dept-list">
              {Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>
          <button
            onClick={addParticipant}
            disabled={busy}
            style={{
              alignSelf: "end",
              borderRadius: "0.5rem",
              border: "none",
              background: LIME,
              color: "#0a0a0a",
              fontWeight: 600,
              fontSize: "0.82rem",
              padding: "0.5rem 0.9rem",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            + Add
          </button>
        </div>

        {participants.length === 0 ? (
          <p style={{ color: MUTED, fontSize: "0.85rem", textAlign: "center", padding: "0.75rem 0" }}>
            No participants yet. Add staff above — you can then upload their certificates.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>{p.staff_name}</div>
                  {p.department && <div style={{ fontSize: "0.72rem", color: MUTED }}>{p.department}</div>}
                </div>
                {p.cert_url ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className="sd-chip ok" style={{ fontSize: "0.7rem" }}>✓ Cert</span>
                    <a href={p.cert_url} target="_blank" rel="noreferrer" style={{ color: "var(--samurai-lime)", fontSize: "0.75rem", textDecoration: "underline" }}>
                      View
                    </a>
                  </span>
                ) : (
                  <span className="sd-chip muted" style={{ fontSize: "0.7rem" }}>No cert</span>
                )}
                <input
                  ref={(el) => { certRefs.current[p.id] = el; }}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCert(p, f); e.target.value = ""; }}
                />
                <button
                  onClick={() => certRefs.current[p.id]?.click()}
                  disabled={busy}
                  style={{
                    borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent",
                    color: TEXT, fontSize: "0.72rem", padding: "0.25rem 0.55rem", cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {p.cert_url ? "Replace Cert" : "Upload Cert"}
                </button>
                <button
                  onClick={() => removeParticipant(p)}
                  disabled={busy}
                  style={{
                    borderRadius: "0.4rem", border: `1px solid ${BORDER}`, background: "transparent",
                    color: DANGER, fontSize: "0.72rem", padding: "0.25rem 0.55rem", cursor: busy ? "wait" : "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
