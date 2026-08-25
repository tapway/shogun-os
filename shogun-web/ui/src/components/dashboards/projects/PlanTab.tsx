import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import type { ProjectTaskItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  onOpenProject: (projectId: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priorityChipClass(priority?: string): string {
  const p = (priority || '').toLowerCase();
  if (p.includes('critical') || p.includes('high')) return 'bad';
  if (p.includes('medium')) return 'warn';
  return 'muted';
}

type UrgencyFilter = 'all' | 'overdue' | 'this-week' | 'later';

export function PlanTab({ dept, color, onOpenProject }: Props) {
  const [urgency, setUrgency] = useState<UrgencyFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState('');

  const query = useQuery({
    queryKey: ['projects-plan', dept],
    queryFn: () => departmentsApi.projectsPlan(dept),
    refetchInterval: 120_000,
  });

  const tasks: ProjectTaskItem[] = query.data?.tasks ?? [];

  const owners = useMemo(() => {
    const set = new Set(tasks.map((t) => t.owner).filter(Boolean) as string[]);
    return [...set].sort();
  }, [tasks]);

  const buckets = useMemo(() => {
    const overdue: ProjectTaskItem[] = [];
    const thisWeek: ProjectTaskItem[] = [];
    const later: ProjectTaskItem[] = [];
    for (const t of tasks) {
      if (t.isOverdue) overdue.push(t);
      else if ((t.daysLeft ?? Infinity) <= 7) thisWeek.push(t);
      else later.push(t);
    }
    return { overdue, thisWeek, later };
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (urgency === 'overdue') list = buckets.overdue;
    else if (urgency === 'this-week') list = buckets.thisWeek;
    else if (urgency === 'later') list = buckets.later;
    if (ownerFilter) list = list.filter((t) => t.owner === ownerFilter);
    return list;
  }, [tasks, buckets, urgency, ownerFilter]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading plan…</p>
      </div>
    );
  }

  const pills: { id: UrgencyFilter; label: string; count: number; dot?: string }[] = [
    { id: 'all', label: 'All planned', count: tasks.length },
    { id: 'overdue', label: 'Overdue', count: buckets.overdue.length, dot: DANGER },
    { id: 'this-week', label: 'Due ≤ 7 days', count: buckets.thisWeek.length, dot: WARNING },
    { id: 'later', label: 'Later', count: buckets.later.length },
  ];

  const selectStyle: React.CSSProperties = {
    background: SURFACE_2,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '0.5rem',
    padding: '0.4rem 0.6rem',
    fontSize: '0.8rem',
  };

  return (
    <div className="sd-stack">
      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: '0.9rem 1rem' }}>
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setUrgency(pill.id)}
              className={`sd-subnav-pill ${urgency === pill.id ? 'active' : ''}`}
            >
              {pill.dot && (
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: pill.dot, marginRight: '0.4rem' }} />
              )}
              {pill.label} ({pill.count})
            </button>
          ))}
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ ...selectStyle, marginLeft: 'auto' }}>
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline list */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Upcoming deadlines</h3>
        <p className="sd-chart-sub">Open tasks with a deadline, soonest first</p>
        {filtered.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>No planned tasks in this view.</p>
          </div>
        ) : (
          <div className="sd-stack" style={{ gap: '0.4rem', maxHeight: '620px', overflowY: 'auto' }}>
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => t.projectId && onOpenProject(t.projectId)}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                style={{ background: SURFACE_2, cursor: 'pointer', borderLeft: `3px solid ${t.isOverdue ? DANGER : (t.daysLeft ?? 99) <= 7 ? WARNING : BORDER}` }}
                title={`Open project ${t.projectName ?? t.projectId}`}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: '0.84rem', color: TEXT, fontWeight: 500 }}>{t.title || t.taskRef || t.id}</div>
                  <div style={{ fontSize: '0.7rem', color: MUTED }}>
                    {t.projectName || t.projectId} · {t.owner || 'Unassigned'}
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                  {t.priority && <span className={`sd-chip ${priorityChipClass(t.priority)}`}>{t.priority}</span>}
                  <span className={`sd-chip ${t.status === 'in-progress' ? 'warn' : 'muted'}`}>{t.status}</span>
                  <span style={{ fontSize: '0.75rem', color: t.isOverdue ? DANGER : MUTED, fontWeight: t.isOverdue ? 600 : 400, minWidth: '74px', textAlign: 'right' }}>
                    {t.isOverdue ? `${Math.abs(t.daysLeft ?? 0)}d overdue` : fmtDate(t.deadline)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
