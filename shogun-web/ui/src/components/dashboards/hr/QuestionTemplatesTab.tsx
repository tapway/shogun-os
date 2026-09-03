import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { hrApi } from "../../../lib/api";
import type { HrQuestionTemplate } from "../../../lib/types";

interface Props {
  department: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const BORDER = "var(--samurai-border)";
const SURFACE_2 = "var(--samurai-surface-2)";
const LIME = "var(--samurai-lime)";
const DANGER = "var(--samurai-danger)";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.4rem",
  border: `1px solid ${BORDER}`,
  background: SURFACE_2,
  color: TEXT,
  padding: "0.45rem 0.6rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  borderRadius: "0.5rem", border: "none", background: LIME, color: "#0a0a0a",
  fontSize: "0.8rem", fontWeight: 700, padding: "0.45rem 0.9rem", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "0.3rem",
};
const btnOutline: React.CSSProperties = {
  borderRadius: "0.5rem", border: `1px solid ${BORDER}`, background: "transparent",
  color: TEXT, fontSize: "0.8rem", fontWeight: 600, padding: "0.45rem 0.9rem", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "0.3rem",
};

export function QuestionTemplatesTab({ department }: Props) {
  const [templates, setTemplates] = useState<HrQuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HrQuestionTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [formDept, setFormDept] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formRound, setFormRound] = useState("first");
  const [formQuestions, setFormQuestions] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await hrApi.listTemplates(department);
      setTemplates(res.templates || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [department]);

  function startNew() {
    setEditing({ id: 0, department: "", role_pattern: "", round: "first", questions: [""] } as HrQuestionTemplate);
    setFormDept("");
    setFormRole("");
    setFormRound("first");
    setFormQuestions([""]);
    setIsNew(true);
    setError("");
    setSaved(false);
  }

  function startEdit(tmpl: HrQuestionTemplate) {
    setEditing(tmpl);
    setFormDept(tmpl.department || "");
    setFormRole(tmpl.role_pattern || "");
    setFormRound(tmpl.round || "first");
    setFormQuestions(tmpl.questions.length > 0 ? [...tmpl.questions] : [""]);
    setIsNew(false);
    setError("");
    setSaved(false);
  }

  function cancelEdit() {
    setEditing(null);
    setError("");
  }

  async function save() {
    if (!formQuestions.some((q) => q.trim())) {
      setError("Add at least one question");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cleanQuestions = formQuestions.filter((q) => q.trim());
      await hrApi.createTemplate(department, {
        department: formDept.trim(),
        role_pattern: formRole.trim(),
        round: formRound,
        questions: cleanQuestions,
      });
      setSaved(true);
      setEditing(null);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: number) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await hrApi.deleteTemplate(department, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }

  const roundLabel = (r: string) => r === "ceo" ? "CEO Interview" : r === "manager" ? "Manager Interview" : "HR Interview";

  if (editing) {
    return (
      <div className="sd-chart-card" style={{ maxWidth: "800px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h3 className="sd-chart-title" style={{ margin: 0 }}>
            {isNew ? "➕ New Question Template" : `✏️ Edit Template — ${editing.role_pattern || "General"} · ${roundLabel(editing.round)}`}
          </h3>
          <button type="button" onClick={cancelEdit} style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>Cancel</button>
        </div>

        {error && <p style={{ color: DANGER, fontSize: "0.78rem", margin: "0 0 0.5rem" }}>{error}</p>}
        {saved && <p style={{ color: "var(--samurai-ok)", fontSize: "0.78rem", margin: "0 0 0.5rem" }}>✓ Saved successfully</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Department</label>
            <input value={formDept} onChange={(e) => setFormDept(e.target.value)} placeholder="e.g. Engineering" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Role Pattern *</label>
            <input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="e.g. Backend Engineer" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.25rem" }}>Interview Round *</label>
            <select value={formRound} onChange={(e) => setFormRound(e.target.value)} style={inputStyle}>
              <option value="first">HR Interview</option>
              <option value="manager">Manager Interview</option>
              <option value="ceo">CEO Interview</option>
            </select>
          </div>
        </div>

        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem" }}>
          Questions ({formQuestions.filter((q) => q.trim()).length})
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
          {formQuestions.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: MUTED, minWidth: "1.5rem", paddingTop: "0.45rem" }}>{i + 1}.</span>
              <textarea
                value={q}
                onChange={(e) => {
                  const updated = [...formQuestions];
                  updated[i] = e.target.value;
                  setFormQuestions(updated);
                }}
                rows={2}
                placeholder="Type a question…"
                style={{ ...inputStyle, resize: "vertical", flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setFormQuestions(formQuestions.filter((_, j) => j !== i))}
                style={{ border: "none", background: "transparent", color: DANGER, cursor: "pointer", padding: "0.3rem" }}
                disabled={formQuestions.length <= 1}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormQuestions([...formQuestions, ""])}
            style={{ ...btnOutline, fontSize: "0.72rem", padding: "0.3rem 0.6rem", alignSelf: "flex-start" }}
          >
            <Plus size={13} /> Add question
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" disabled={busy} onClick={save} style={btnPrimary}>
            <Save size={13} /> {isNew ? "Create Template" : "Save Changes"}
          </button>
          <button type="button" onClick={cancelEdit} style={btnOutline}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <h3 className="sd-chart-title" style={{ margin: 0 }}>Question Templates</h3>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: MUTED }}>
            Reusable interview question sets organized by role and round. Apply these when preparing interviews for candidates.
          </p>
        </div>
        <button type="button" onClick={startNew} style={btnPrimary}>
          <Plus size={14} /> New Template
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: MUTED, padding: "2rem 0" }}>Loading templates…</p>
      ) : templates.length === 0 ? (
        <div className="sd-chart-card" style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "0.85rem", color: MUTED, margin: "0 0 0.5rem" }}>No templates yet</p>
          <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0 0 0.75rem" }}>
            Create your first template to speed up interview preparation. You can also save questions as templates directly from a candidate's journey modal.
          </p>
          <button type="button" onClick={startNew} style={btnPrimary}>
            <Plus size={14} /> Create First Template
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "0.75rem" }}>
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="sd-chart-card" style={{ padding: "0.75rem 0.85rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <div>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: TEXT }}>
                    {tmpl.role_pattern || "General"}
                  </span>
                  <span style={{
                    display: "inline-block", marginLeft: "0.4rem", fontSize: "0.65rem", fontWeight: 700,
                    padding: "0.1rem 0.4rem", borderRadius: "0.3rem",
                    background: tmpl.round === "ceo" ? "var(--samurai-warning)" : tmpl.round === "manager" ? "var(--samurai-lime)" : "var(--samurai-info, #60a5fa)",
                    color: "#0a0a0a",
                  }}>
                    {roundLabel(tmpl.round)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button type="button" onClick={() => startEdit(tmpl)} style={{ ...btnOutline, fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>Edit</button>
                  <button type="button" onClick={() => deleteTemplate(tmpl.id)} style={{ border: "none", background: "transparent", color: DANGER, cursor: "pointer", padding: "0.2rem" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {tmpl.department && (
                <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", color: MUTED }}>📁 {tmpl.department}</p>
              )}
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", color: TEXT }}>
                {tmpl.questions.length} question{tmpl.questions.length !== 1 ? "s" : ""}
              </p>
              {/* Preview first 3 questions */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.4rem" }}>
                {tmpl.questions.slice(0, 3).map((q, i) => (
                  <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.72rem", color: MUTED, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 600, marginRight: "0.2rem" }}>{i + 1}.</span>
                    {q.length > 80 ? q.slice(0, 80) + "…" : q}
                  </p>
                ))}
                {tmpl.questions.length > 3 && (
                  <p style={{ margin: 0, fontSize: "0.68rem", color: MUTED, fontStyle: "italic" }}>
                    +{tmpl.questions.length - 3} more…
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
