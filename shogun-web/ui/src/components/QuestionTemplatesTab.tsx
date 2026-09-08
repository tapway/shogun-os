import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { hrApi } from '../lib/api';
import type { HrInterviewTemplate } from '../lib/types';

interface QuestionTemplatesTabProps {
  department: string;
  isAdmin: boolean;
}

interface EditState {
  id?: number;
  name: string;
  department: string;
  role_pattern: string;
  round: string;
  questions: string[];
}

const EMPTY_EDIT: EditState = {
  name: '',
  department: '',
  role_pattern: '',
  round: 'first',
  questions: [''],
};

const ROUND_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  first: { label: 'HR', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  hr: { label: 'HR', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  manager: { label: 'Manager', color: '#4d7c0f', bg: '#f7fee7', border: '#d9f99d' },
  ceo: { label: 'CEO', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
};

function roundMeta(round: string | undefined): { label: string; color: string; bg: string; border: string } {
  return ROUND_META[((round || '').trim().toLowerCase())] || { label: round || 'Interview', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-sm';
const labelCls = 'text-xs text-slate-500 dark:text-slate-400 block mb-1';

export function QuestionTemplatesTab({ department, isAdmin }: QuestionTemplatesTabProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['interview-templates', department],
    queryFn: () => hrApi.listInterviewTemplates(department),
  });

  const templates: HrInterviewTemplate[] = templatesQuery.data?.templates ?? [];

  const createMutation = useMutation({
    mutationFn: (data: EditState) =>
      hrApi.createInterviewTemplate(department, {
        name: data.name,
        department: data.department,
        role_pattern: data.role_pattern,
        round: data.round,
        questions: data.questions.filter((q) => q.trim()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-templates', department] });
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditState }) =>
      hrApi.updateInterviewTemplate(department, id, {
        name: data.name,
        department: data.department,
        role_pattern: data.role_pattern,
        round: data.round,
        questions: data.questions.filter((q) => q.trim()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-templates', department] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => hrApi.deleteInterviewTemplate(department, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-templates', department] });
    },
  });

  const handleSave = () => {
    if (!editing) return;
    const role = editing.role_pattern.trim();
    const questions = editing.questions.filter((q) => q.trim());
    if (!role) return;
    if (!questions.length) return;
    if (editing.id) {
      updateMutation.mutate({ id: editing.id, data: editing });
    } else {
      createMutation.mutate(editing);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-brand" />
            Question Templates
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            Reusable interview question sets. Templates created here are available in the Recruitment Pipeline →
            candidate card → <strong>📋 Questions</strong> → Templates tab, where they can be applied to a specific
            interview. Questions crafted in an interview can be saved back here too.
          </p>
        </div>
        {isAdmin && !editing && (
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY_EDIT })}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-brand-hover transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Template
          </button>
        )}
      </div>

      {/* Create/Edit form */}
      {editing && (
        <div className="rounded-xl border border-emerald-600/40 bg-white dark:bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {editing.id ? 'Edit Template' : 'New Template'}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Department (optional)</label>
              <input
                type="text"
                value={editing.department}
                onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                placeholder="e.g. Engineering"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Role Pattern *</label>
              <input
                type="text"
                value={editing.role_pattern}
                onChange={(e) => setEditing({ ...editing, role_pattern: e.target.value })}
                placeholder="e.g. Backend Engineer"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Interview Round *</label>
              <select
                value={editing.round}
                onChange={(e) => setEditing({ ...editing, round: e.target.value })}
                className={inputCls}
              >
                <option value="first">HR</option>
                <option value="manager">Manager</option>
                <option value="ceo">CEO</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls} style={{ marginBottom: 0 }}>Questions *</label>
              <button
                type="button"
                onClick={() => setEditing({ ...editing, questions: [...editing.questions, ''] })}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add question
              </button>
            </div>
            <div className="space-y-2">
              {editing.questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-2.5 w-5 text-right">
                    {i + 1}.
                  </span>
                  <textarea
                    value={q}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        questions: editing.questions.map((x, idx) => (idx === i ? e.target.value : x)),
                      })
                    }
                    rows={2}
                    placeholder={`Question ${i + 1}…`}
                    className={`${inputCls} resize-y font-mono text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ ...editing, questions: editing.questions.filter((_, idx) => idx !== i) })
                    }
                    disabled={editing.questions.length <= 1}
                    className="p-1.5 mt-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-500 dark:text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !editing.role_pattern.trim() || !editing.questions.some((q) => q.trim())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover text-xs font-semibold disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving…' : editing.id ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      )}

      {/* Card grid */}
      {templatesQuery.isLoading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-8 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            No question templates yet. Click "Add Template" to create one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const rm = roundMeta(t.round);
            const preview = t.questions.slice(0, 3);
            const isExpanded = expanded === t.id;
            const visible = isExpanded ? t.questions : preview;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={t.role_pattern}>
                      {t.role_pattern || t.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className="text-[0.65rem] px-2 py-0.5 rounded-full font-semibold"
                        style={{ color: rm.color, background: rm.bg, border: `1px solid ${rm.border}` }}
                      >
                        {rm.label}
                      </span>
                      {t.department && (
                        <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                          {t.department}
                        </span>
                      )}
                      <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
                        {t.questions.length} question{t.questions.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            id: t.id,
                            name: t.name,
                            department: t.department,
                            role_pattern: t.role_pattern,
                            round: t.round,
                            questions: [...t.questions],
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete template "${t.role_pattern || t.name}"?`)) deleteMutation.mutate(t.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <ol className="space-y-1 mt-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {visible.map((q, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      <span className="font-bold text-slate-400 dark:text-slate-500">{i + 1}.</span> {q}
                    </li>
                  ))}
                </ol>
                {t.questions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : t.id)}
                    className="flex items-center gap-1 text-[0.7rem] font-medium text-emerald-600 dark:text-emerald-400 hover:underline self-start"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? 'Show less' : `Show all ${t.questions.length}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}