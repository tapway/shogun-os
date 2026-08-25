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

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

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

function statusChipClass(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'ok';
  if (s.includes('progress')) return 'warn';
  if (s.includes('cancel')) return 'bad';
  return 'muted';
}

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'done' | 'overdue';

export function TasksTab({ dept, color, onOpenProject }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['projects-all-tasks', dept],
    queryFn: () => departmentsApi.projectsAllTasks(dept),
    refetchInterval: 120_000,
  });

  const allTasks: ProjectTaskItem[] = query.data?.tasks ?? [];

  const owners = useMemo(() => {
    const set = new Set(allTasks.map((t) => t.owner).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allTasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (ownerFilter && t.owner !== ownerFilter) return false;
      if (statusFilter === 'overdue') {
        if (!t.isOverdue) return false;
      } else if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (q && !`${t.id} ${t.title ?? ''} ${t.projectName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTasks, statusFilter, ownerFilter, search]);

  const overdueCount = allTasks.filter((t) => t.isOverdue).length;
  const doneCount = allTasks.filter((t) => t.status === 'done').length;

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading tasks…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="sd-empty">
        <h2>No task data synced yet</h2>
        <p>
          Run <code>scripts/sync-project-dashboard.py</code> with <code>PROJECT_DASHBOARD_API_URL</code> set
          to import tasks from the external tracker.
        </p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    background: SURFACE_2,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '0.5rem',
    padding: '0.4rem 0.6rem',
    fontSize: '0.8rem',
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: `All (${allTasks.length})` },
    { id: 'todo', label: `To Do (${allTasks.filter((t) => t.status === 'todo').length})` },
    { id: 'in-progress', label: `In Progress (${allTasks.filter((t) => t.status === 'in-progress').length})` },
    { id: 'done', label: `Done (${doneCount})` },
    { id: 'overdue', label: `Overdue (${overdueCount})` },
  ];

  return (
    <div className="sd-stack">
      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: '0.9rem 1rem' }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, minWidth: '220px' }}
          />
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={selectStyle}>
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: MUTED }}>
            {filtered.length} of {allTasks.length} tasks
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="sd-chart-card">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2" style={{ marginBottom: '0.9rem' }}>
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`sd-subnav-pill ${statusFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>No tasks match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: '620px', overflowY: 'auto' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Task</Th>
                  <Th align="left">Project</Th>
                  <Th align="left">Owner</Th>
                  <Th align="center">Priority</Th>
                  <Th align="left">Deadline</Th>
                  <Th align="center">Days Left</Th>
                  <Th align="left">Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task, i) => (
                  <tr
                    key={task.id}
                    onClick={() => task.projectId && onOpenProject(task.projectId)}
                    style={{
                      borderBottom: `1px solid ${BORDER}`,
                      background: i % 2 === 1 ? SURFACE_2 : undefined,
                      cursor: 'pointer',
                    }}
                    title={`Open project ${task.projectName ?? task.projectId}`}
                  >
                    <td className="px-3 py-2.5 max-w-[280px]" style={{ color: TEXT }}>
                      <div className="truncate" title={task.title}>{task.title || '—'}</div>
                      <div style={{ fontSize: '0.68rem', color: MUTED, fontFamily: 'var(--font-mono, monospace)' }}>{task.id}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate" style={{ color: MUTED }}>{task.projectName || task.projectId}</td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{task.owner || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${priorityChipClass(task.priority)}`}>{task.priority || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{fmtDate(task.deadline)}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: task.isOverdue ? DANGER : MUTED, fontWeight: task.isOverdue ? 600 : 400 }}>
                      {task.deadline ? (task.isOverdue ? `${Math.abs(task.daysLeft ?? 0)}d over` : `${task.daysLeft ?? 0}d`) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`sd-chip ${statusChipClass(task.status)}`}>{task.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
