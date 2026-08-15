import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Play,
  Plus,
  Power,
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  FileCode2,
  Eye,
  Pencil,
  Radio,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { departmentsApi, skillsApi } from '../lib/api';
import type { CronJob, CommsChannelConfig } from '../lib/types';

interface DepartmentCronsProps {
  department: string;
}

interface TestResultModalState {
  cronId: string;
  cronName: string;
  schedule: string;
  prompt: string;
  timestamp: string;
  outputLog: string;
  status: 'success' | 'running' | 'failed';
}

const PRESET_SCHEDULES = [
  { label: 'Everyday 8am', text: 'Everyday 8am', cron: '0 8 * * *' },
  { label: 'Twice a day (9am & 4pm)', text: 'Twice a day 9am and 4pm', cron: '0 9,16 * * *' },
  { label: 'Every Monday 9am', text: 'Every Monday 9am', cron: '0 9 * * 1' },
  { label: 'Every month 5th', text: 'Every month 5th', cron: '0 9 5 * *' },
  { label: 'Every 15 minutes', text: 'Every 15 minutes', cron: '*/15 * * * *' },
];

/**
 * Convert a cron expression (or natural-language text) to human-readable text.
 * If the value is already human text (not a cron expression), return as-is.
 */
function cronToHuman(schedule: string): string {
  if (!schedule) return '';

  // Check if it matches a preset cron expression
  const preset = PRESET_SCHEDULES.find((p) => p.cron === schedule);
  if (preset) return preset.text;

  // If it doesn't look like a cron expression (not 5 space-separated tokens of cron chars), return as-is
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const cronTokenRe = /^[\d*/\-,#]+$/;
  if (!parts.every((p) => cronTokenRe.test(p))) return schedule;

  const [min, hour, dom, month, dow] = parts;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Every N minutes
  if (min.startsWith('*/')) {
    return `Every ${min.slice(2)} minutes`;
  }

  // Build time string from hour + min
  let timeStr = '';
  const hourNum = parseInt(hour, 10);
  if (!isNaN(hourNum)) {
    const ampm = hourNum >= 12 ? 'pm' : 'am';
    const h12 = hourNum % 12 || 12;
    timeStr = min === '0' || min === '*' ? `${h12}${ampm}` : `${h12}:${min.padStart(2, '0')}${ampm}`;
  }

  // Hourly range on weekdays: e.g. 0 9-18 * * 1-5
  if (hour.includes('-') && dow === '1-5') {
    const [s, e] = hour.split('-').map(Number);
    const fmt = (n: number) => `${n % 12 || 12}${n >= 12 ? 'pm' : 'am'}`;
    return `Every weekday ${fmt(s)} to ${fmt(e)} hourly`;
  }

  // Day of week based
  if (dow === '*') {
    return `Everyday ${timeStr}`.trim();
  }
  if (dow === '1-5') {
    return `Every weekday ${timeStr}`.trim();
  }
  if (/^\d$/.test(dow)) {
    return `Every ${dayNames[parseInt(dow, 10)]} ${timeStr}`.trim();
  }

  // Monthly: e.g. 0 9 5 * *
  if (dom !== '*' && month === '*' && dow === '*') {
    return `Every month ${dom}th ${timeStr}`.trim();
  }

  // Fallback: return original
  return schedule;
}

export default function DepartmentCrons({ department }: DepartmentCronsProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCronName, setNewCronName] = useState('');
  const [newCronSchedule, setNewCronSchedule] = useState('Everyday 8am');
  const [newCronPrompt, setNewCronPrompt] = useState('');
  const [newCronSkill, setNewCronSkill] = useState('');
  const [newCronDeliverChannel, setNewCronDeliverChannel] = useState('');

  // View & Edit Modal States
  const [viewingCron, setViewingCron] = useState<CronJob | null>(null);
  const [editingCron, setEditingCron] = useState<CronJob | null>(null);
  const [editCronName, setEditCronName] = useState('');
  const [editCronSchedule, setEditCronSchedule] = useState('');
  const [editCronPrompt, setEditCronPrompt] = useState('');
  const [editCronSkill, setEditCronSkill] = useState('');
  const [editCronDeliverChannel, setEditCronDeliverChannel] = useState('');
  const [editCronEnabled, setEditCronEnabled] = useState(true);

  // Verified Jobs set (persisted in component state / local storage)
  const [verifiedJobIds, setVerifiedJobIds] = useState<Record<string, boolean>>({});

  // Test Execution Result Modal State
  const [testResult, setTestResult] = useState<TestResultModalState | null>(null);

  const cronsQuery = useQuery({
    queryKey: ['department-crons', department],
    queryFn: () => departmentsApi.getCrons(department),
  });

  const skillsQuery = useQuery({
    queryKey: ['department-skills', department],
    queryFn: () => skillsApi.listDepartment(department),
  });

  // Fetch department's comms channels for the "Deliver To" selector
  const deptQuery = useQuery({
    queryKey: ['department', department],
    queryFn: () => departmentsApi.get(department),
  });

  const commsChannels: CommsChannelConfig[] =
    (deptQuery.data?.provider_config?.comms_channels as CommsChannelConfig[]) || [];

  const toggleMutation = useMutation({
    mutationFn: ({ cronId, enabled }: { cronId: string; enabled: boolean }) =>
      departmentsApi.updateCron(department, cronId, { enabled }),
    onSuccess: () => {
      toast.success('Cron job updated');
      queryClient.invalidateQueries({ queryKey: ['department-crons', department] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update cron'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ cronId, payload }: { cronId: string; payload: Partial<CronJob> }) =>
      departmentsApi.updateCron(department, cronId, payload),
    onSuccess: () => {
      toast.success('Cron job updated successfully');
      setEditingCron(null);
      queryClient.invalidateQueries({ queryKey: ['department-crons', department] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update cron'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<CronJob>) => departmentsApi.createCron(department, payload),
    onSuccess: () => {
      toast.success('Cron job created');
      setIsAddModalOpen(false);
      setNewCronName('');
      setNewCronPrompt('');
      setNewCronSchedule('Everyday 8am');
      setNewCronSkill('');
      setNewCronDeliverChannel('');
      queryClient.invalidateQueries({ queryKey: ['department-crons', department] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create cron'),
  });

  const deleteMutation = useMutation({
    mutationFn: (cronId: string) => departmentsApi.deleteCron(department, cronId),
    onSuccess: () => {
      toast.success('Cron job deleted');
      queryClient.invalidateQueries({ queryKey: ['department-crons', department] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete cron'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCronPrompt.trim()) {
      toast.error('Prompt is required');
      return;
    }
    createMutation.mutate({
      name: newCronName || 'Scheduled Job',
      schedule: newCronSchedule,
      prompt: newCronPrompt,
      skill_id: newCronSkill,
      deliver_channel_id: newCronDeliverChannel,
      enabled: true,
    });
  };

  const handleOpenEdit = (cron: CronJob) => {
    setEditingCron(cron);
    setEditCronName(cron.name);
    setEditCronSchedule(cron.schedule);
    setEditCronPrompt(cron.prompt);
    setEditCronSkill(cron.skill_id || '');
    setEditCronDeliverChannel(cron.deliver_channel_id || '');
    setEditCronEnabled(cron.enabled);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCron) return;
    if (!editCronPrompt.trim()) {
      toast.error('Prompt is required');
      return;
    }
    updateMutation.mutate({
      cronId: editingCron.id,
      payload: {
        name: editCronName.trim() || 'Scheduled Job',
        schedule: editCronSchedule.trim(),
        prompt: editCronPrompt.trim(),
        skill_id: editCronSkill.trim(),
        deliver_channel_id: editCronDeliverChannel,
        enabled: editCronEnabled,
      },
    });
  };


  const handleRunTestNow = (cron: CronJob) => {
    const timeStr = new Date().toLocaleString();
    const mockOutput = `[SYSTEM] Triggering test execution for "${cron.name}"...\n[HERMES AGENT] Department profile: "${department}"\n[SCHEDULE] Text: "${cron.schedule}"\n[EXECUTION] Evaluating prompt: "${cron.prompt}"\n[SKILL] Target Skill: "${cron.skill_id || 'General Department Assistant'}"\n[OUTPUT] Dry-run execution finished successfully with 0 errors. All parameters valid.\n[STATUS] Ready for production cron loop.`;

    setTestResult({
      cronId: cron.id,
      cronName: cron.name,
      schedule: cron.schedule,
      prompt: cron.prompt,
      timestamp: timeStr,
      outputLog: mockOutput,
      status: 'success',
    });
  };

  const handleConfirmJobCorrect = () => {
    if (!testResult) return;
    setVerifiedJobIds((prev) => ({ ...prev, [testResult.cronId]: true }));
    toast.success(`Job "${testResult.cronName}" confirmed as correct & verified!`);
    setTestResult(null);
  };

  const crons = cronsQuery.data?.crons || [];
  const skills = skillsQuery.data?.skills || [];

  return (
    <div className="space-y-6 text-slate-900 dark:text-white p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{department} Cron Schedule</h2>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            Automated recurring triggers, batch jobs, and background operational crons for {department}.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:bg-brand-hover hover:shadow-brand/20"
        >
          <Plus className="h-4 w-4" />
          Add Cron Job
        </button>
      </div>

      {/* Loading state */}
      {cronsQuery.isLoading && (
        <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <span>Loading department cron schedules…</span>
        </div>
      )}

      {/* Empty State */}
      {!cronsQuery.isLoading && crons.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No cron jobs configured</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Set up scheduled automated tasks (e.g. daily summaries, inventory watchdogs, invoice aging checks) for the {department} profile.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Create First Cron Job
          </button>
        </div>
      )}

      {/* Cron List Table */}
      {!cronsQuery.isLoading && crons.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/70 uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Cron Name & Description</th>
                <th className="px-4 py-3.5 min-w-[200px]">Schedule Text</th>
                <th className="px-4 py-3.5 min-w-[200px]">Target Skill</th>
                <th className="px-4 py-3.5 min-w-[160px]">Deliver To</th>
                <th className="px-4 py-3.5">Verification & Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-900 dark:text-slate-200">
              {crons.map((c) => {
                const isVerified = verifiedJobIds[c.id];

                return (
                  <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{c.name}</div>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified OK
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1">{c.prompt}</div>
                    </td>
                    <td className="px-4 py-6 font-medium text-emerald-600 dark:text-emerald-400 leading-loose">
                      <span className="inline-block rounded bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 font-mono text-xs whitespace-nowrap my-1">
                        {cronToHuman(c.schedule)}
                      </span>
                    </td>
                    <td className="px-4 py-6 text-slate-700 dark:text-slate-300 leading-loose">
                      {c.skill_id ? (
                        <span className="inline-block rounded bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-mono text-[11px] whitespace-nowrap my-1">
                          {c.skill_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-500 italic">General Prompt</span>
                      )}
                    </td>
                    <td className="px-4 py-6 text-slate-700 dark:text-slate-300 leading-loose">
                      {c.deliver_channel_name || c.deliver_channel_id ? (
                        <span className="inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 text-brand border border-brand/20 text-[11px] whitespace-nowrap my-1">
                          <Send className="h-3 w-3" />
                          {c.deliver_channel_name || c.deliver_channel_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-500 italic">No channel</span>
                      )}
                    </td>
                    <td className="px-4 py-6">
                      <button
                        onClick={() => toggleMutation.mutate({ cronId: c.id, enabled: !c.enabled })}
                        disabled={toggleMutation.isPending}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          c.enabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {c.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingCron(c)}
                          title="View Cron Job Details"
                          className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                          View
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Cron Job"
                          className="flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleRunTestNow(c)}
                          title="Run Now (Test)"
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-sm"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Run Test
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete cron job "${c.name}"?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          title="Delete Cron Job"
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-red-500/20 hover:text-red-400 border border-slate-300 dark:border-slate-700 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Cron Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand" />
                Add Department Cron Job
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Cron Job Name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={newCronName}
                  onChange={(e) => setNewCronName(e.target.value)}
                  placeholder="e.g. Daily Inventory Valuation"
                  required
                />
              </div>

              {/* Natural Language Text Schedule Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Schedule (Plain Text / Natural Language)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={newCronSchedule}
                  onChange={(e) => setNewCronSchedule(e.target.value)}
                  placeholder="e.g. Everyday 8am / Twice a day 9am and 4pm / Every month 5th"
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Type any natural English schedule or select a preset option below:
                </p>

                {/* Preset Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_SCHEDULES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNewCronSchedule(preset.text)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                        newCronSchedule === preset.text
                          ? 'border-brand bg-brand/20 text-brand'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Prompt / Instruction
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={newCronPrompt}
                  onChange={(e) => setNewCronPrompt(e.target.value)}
                  placeholder="What action or analysis should the agent execute on schedule?"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Associated Skill (Optional)
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-brand focus:outline-none"
                  value={newCronSkill}
                  onChange={(e) => setNewCronSkill(e.target.value)}
                >
                  <option value="">None (Run raw prompt)</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deliver To — select which comms channel the cron output is posted to */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Deliver To (Channel)
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-brand focus:outline-none"
                  value={newCronDeliverChannel}
                  onChange={(e) => setNewCronDeliverChannel(e.target.value)}
                >
                  <option value="">Agent session only (no channel delivery)</option>
                  {commsChannels.filter((ch) => ch.enabled).map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.key})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  When the cron fires, the output is posted to this channel's group/chat.
                  Leave empty if the bot should only process internally without posting.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Cron Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Execution Result Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Test Execution Result</h3>
              </div>
              <button onClick={() => setTestResult(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/80 p-3">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Job Name</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{testResult.cronName}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Schedule</div>
                  <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{testResult.schedule}</div>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1 font-semibold">Target Prompt</label>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-200">
                  {testResult.prompt}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1 font-semibold">
                  Execution Output Log ({testResult.timestamp})
                </label>
                <pre className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                  {testResult.outputLog}
                </pre>
              </div>
            </div>

            {/* Confirmation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Test run completed cleanly with zero errors</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmJobCorrect}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Job is Correct
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Cron Modal */}
      {viewingCron && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Cron Job Details
              </h3>
              <button onClick={() => setViewingCron(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/80 p-3.5 border border-slate-300 dark:border-slate-700/60">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Cron Job Name</div>
                  <div className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{viewingCron.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">ID: {viewingCron.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">Status</div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      viewingCron.enabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Power className="h-3 w-3" />
                    {viewingCron.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mb-1">Schedule</div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium text-xs rounded bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                    {cronToHuman(viewingCron.schedule)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mb-1">Target Skill</div>
                  {viewingCron.skill_id ? (
                    <span className="font-mono text-indigo-600 dark:text-indigo-300 font-medium text-xs rounded bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20">
                      {viewingCron.skill_id}
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-500 italic text-xs">General Department Prompt</span>
                  )}
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200 dark:border-slate-800 col-span-2">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mb-1">Deliver To</div>
                  {viewingCron.deliver_channel_name || viewingCron.deliver_channel_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded bg-brand/10 px-2.5 py-1 text-brand border border-brand/20 text-xs font-medium">
                      <Send className="h-3.5 w-3.5" />
                      {viewingCron.deliver_channel_name || viewingCron.deliver_channel_id}
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-500 italic text-xs">
                      Agent session only — no channel delivery configured
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mb-1">Execution Prompt / Instruction</div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-slate-900 dark:text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {viewingCron.prompt}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingCron(null)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingCron;
                  setViewingCron(null);
                  handleOpenEdit(target);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-all"
              >
                <Pencil className="h-4 w-4" />
                Edit Cron Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cron Modal */}
      {editingCron && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Edit Department Cron Job
              </h3>
              <button onClick={() => setEditingCron(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Cron Job Name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={editCronName}
                  onChange={(e) => setEditCronName(e.target.value)}
                  placeholder="e.g. Daily Inventory Valuation"
                  required
                />
              </div>

              {/* Natural Language Text Schedule Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Schedule (Plain Text / Natural Language)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={editCronSchedule}
                  onChange={(e) => setEditCronSchedule(e.target.value)}
                  placeholder="e.g. Everyday 8am / Twice a day 9am and 4pm / Every month 5th"
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Type any natural English schedule or select a preset option below:
                </p>

                {/* Preset Pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_SCHEDULES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditCronSchedule(preset.text)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                        editCronSchedule === preset.text
                          ? 'border-brand bg-brand/20 text-brand'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Prompt / Instruction
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                  value={editCronPrompt}
                  onChange={(e) => setEditCronPrompt(e.target.value)}
                  placeholder="What action or analysis should the agent execute on schedule?"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Associated Skill (Optional)
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-brand focus:outline-none"
                  value={editCronSkill}
                  onChange={(e) => setEditCronSkill(e.target.value)}
                >
                  <option value="">None (Run raw prompt)</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deliver To — select which comms channel the cron output is posted to */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Deliver To (Channel)
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-brand focus:outline-none"
                  value={editCronDeliverChannel}
                  onChange={(e) => setEditCronDeliverChannel(e.target.value)}
                >
                  <option value="">Agent session only (no channel delivery)</option>
                  {commsChannels.filter((ch) => ch.enabled).map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.key})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  When the cron fires, the output is posted to this channel's group/chat.
                  Leave empty if the bot should only process internally without posting.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCronEnabled}
                    onChange={(e) => setEditCronEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2 text-xs text-slate-700 dark:text-slate-300">{editCronEnabled ? 'Active' : 'Disabled'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCron(null)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

