import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { emailTemplatesApi } from '../lib/api';
import type { EmailTemplate } from '../lib/types';

interface EmailTemplatesManagerProps {
  department: string;
  isAdmin: boolean;
}

const TEXT = 'var(--samurai-text)';
const MUTED = 'var(--samurai-muted)';
const BORDER = 'var(--samurai-border)';

interface EditState {
  id?: string;
  name: string;
  scenario: string;
  subject_template: string;
  body_template: string;
}

const EMPTY_EDIT: EditState = {
  name: '',
  scenario: 'dunning_reminder',
  subject_template: '',
  body_template: '',
};

export function EmailTemplatesManager({ department, isAdmin }: EmailTemplatesManagerProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['email-templates', department],
    queryFn: () => emailTemplatesApi.list(department),
  });

  const templates: EmailTemplate[] = templatesQuery.data?.templates ?? [];

  const createMutation = useMutation({
    mutationFn: (data: EditState) => emailTemplatesApi.create(department, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', department] });
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditState }) =>
      emailTemplatesApi.update(department, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', department] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplatesApi.delete(department, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates', department] });
    },
  });

  const handleSave = () => {
    if (!editing?.name || !editing.subject_template || !editing.body_template) return;
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
            Email Templates
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            Manage email templates for dunning reminders, payment confirmations, and more. Templates use <code className="text-emerald-600 dark:text-emerald-400">{'{company}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{amount_due}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{overdue_days}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{invoice_no}'}</code> placeholders.
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

      {/* Template list */}
      {templatesQuery.isLoading ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Loading templates…</div>
      ) : templates.length === 0 && !editing ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-8 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">No email templates yet. Click "Add Template" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Edit form (inline card) */}
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
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Template Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Reminder — First Notice"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Scenario</label>
                <select
                  value={editing.scenario}
                  onChange={(e) => setEditing({ ...editing, scenario: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-sm"
                >
                  <option value="dunning_reminder">Dunning Reminder</option>
                  <option value="dunning_final">Final Demand</option>
                  <option value="payment_receipt">Payment Confirmation</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="recruitment_screening">Recruitment — Screening Questions</option>
                  <option value="recruitment_interview">Recruitment — Interview Scheduling</option>
                  <option value="recruitment_feedback">Recruitment — Interview Feedback</option>
                  <option value="recruitment_offer">Recruitment — Job Offer</option>
                  <option value="recruitment_rejection">Recruitment — Not Proceeding</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Subject Template</label>
                <input
                  type="text"
                  value={editing.subject_template}
                  onChange={(e) => setEditing({ ...editing, subject_template: e.target.value })}
                  placeholder="e.g. Overdue Invoice {invoice_no} — {company}"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Body Template</label>
                <textarea
                  value={editing.body_template}
                  onChange={(e) => setEditing({ ...editing, body_template: e.target.value })}
                  rows={10}
                  placeholder="Dear {company},&#10;&#10;This is a reminder that Invoice {invoice_no} for {amount_due} is {overdue_days} days overdue..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-sm font-mono"
                  style={{ resize: 'vertical' }}
                />
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
                  disabled={isSaving || !editing.name || !editing.subject_template || !editing.body_template}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover text-xs font-semibold disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving…' : 'Save Template'}
                </button>
              </div>
            </div>
          )}

          {/* Template cards */}
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                      {t.scenario}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-slate-600 dark:text-slate-500">Subject:</span> {t.subject_template}
                  </p>
                  <pre className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap font-mono line-clamp-3">
                    {t.body_template}
                  </pre>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing({
                        id: t.id, name: t.name, scenario: t.scenario,
                        subject_template: t.subject_template, body_template: t.body_template,
                      })}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete template "${t.name}"?`)) deleteMutation.mutate(t.id);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
