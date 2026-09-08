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
const SURFACE = 'var(--samurai-surface)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const NAVY = '#1e3a5f';
const BLUE = '#3b82f6';
const GREEN = '#10b981';
const RED = '#ef4444';
const ORANGE = '#f59e0b';
const GRAY = '#9ca3af';

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function priorityColor(priority?: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return RED;
  if (p === 'high') return ORANGE;
  if (p === 'medium') return BLUE;
  return GRAY;
}

function isOverdue(deadline?: string | null, status?: string): boolean {
  if (!deadline || status === 'done' || status === 'cancelled') return false;
  return deadline < new Date().toISOString();
}

const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: GRAY, bg: 'transparent' },
  { id: 'in-progress', label: 'In Progress', color: BLUE, bg: 'rgba(59,130,246,0.08)' },
  { id: 'blocked', label: 'Blocked', color: RED, bg: 'rgba(239,68,68,0.08)' },
  { id: 'done', label: 'Done', color: GREEN, bg: 'rgba(16,185,129,0.08)' },
  { id: 'cancelled', label: 'Cancelled', color: GRAY, bg: 'transparent' },
] as const;

export function TasksTab({ dept, color, onOpenProject }: Props) {
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [appliedProject, setAppliedProject] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedPriority, setAppliedPriority] = useState('');
  const [appliedPm, setAppliedPm] = useState('');

  const query = useQuery({
    queryKey: ['projects-all-tasks', dept],
    queryFn: () => departmentsApi.projectsAllTasks(dept),
    refetchInterval: 120_000,
  });

  const allTasks: ProjectTaskItem[] = useMemo(() => {
    const raw = query.data?.tasks ?? [];
    return raw.map((t: any) => {
      if (t.task && typeof t.task === 'object') {
        return { ...t.task, projectId: t.projectId || t.task.projectId, projectName: t.projectName || t.task.projectName };
      }
      return t;
    });
  }, [query.data]);

  const projects = useMemo(() => {
    const set = new Set(allTasks.map((t) => t.projectName).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allTasks]);

  const filtered = useMemo(() => {
    return allTasks.filter((t) => {
      if (appliedProject && t.projectName !== appliedProject) return false;
      if (appliedStatus && t.status !== appliedStatus) return false;
      if (appliedPriority && t.priority !== appliedPriority) return false;
      if (appliedPm && !((t.owner || '').toLowerCase().includes(appliedPm.toLowerCase()))) return false;
      return true;
    });
  }, [allTasks, appliedProject, appliedStatus, appliedPriority, appliedPm]);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'todo').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const cancelled = allTasks.filter(t => t.status === 'cancelled').length;
    const now = new Date().toISOString();
    const overdue = allTasks.filter(t => t.deadline && t.deadline < now && t.status !== 'done' && t.status !== 'cancelled').length;
    return { total, todo, inProgress, blocked, done, cancelled, overdue };
  }, [allTasks]);

  function handleApply() {
    setAppliedProject(projectFilter);
    setAppliedStatus(statusFilter);
    setAppliedPriority(priorityFilter);
    setAppliedPm(pmFilter);
  }

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
        <h2>No task data available</h2>
        <p>Check mock data configuration.</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.82rem',
    minWidth: '160px',
    height: '44px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
    display: 'block',
  };

  const statCardStyle: React.CSSProperties = {
    background: SURFACE,
    borderRadius: '14px',
    padding: '24px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };

  // ─── Kanban Card ──────────────────────────────────────────────
  function TaskCard({ task }: { task: ProjectTaskItem }) {
    const overdue = isOverdue(task.deadline, task.status);
    return (
      <div
        onClick={() => task.projectId && onOpenProject(task.projectId)}
        style={{
          background: SURFACE,
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: `1px solid ${BORDER}`,
          cursor: task.projectId ? 'pointer' : 'default',
          transition: 'box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
      >
        {/* Row 1: ID + Priority pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.02em' }}>
            {task.id || '—'}
          </span>
          {task.priority && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              background: priorityColor(task.priority),
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        {task.title && (
          <div style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: TEXT,
            marginBottom: '8px',
            lineHeight: '1.35',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {task.title}
          </div>
        )}

        {/* Row 3: Project name */}
        {task.projectName && (
          <div style={{ fontSize: '0.78rem', fontWeight: 500, color: GREEN, marginBottom: '10px' }}>
            {task.projectName}
          </div>
        )}

        {/* Row 4: Assignee + Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: MUTED }}>
            {task.owner ? `@${task.owner}` : ''}
          </span>
          {task.deadline && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: overdue ? 600 : 400,
              color: overdue ? RED : MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}>
              {overdue && <span style={{ fontSize: '0.7rem' }}>⚠</span>}
              {fmtDate(task.deadline)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Kanban View ──────────────────────────────────────────────
  function KanbanBoard() {
    return (
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px' }}>
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = filtered.filter(t => (t.status || 'todo') === col.id);
          return (
            <div key={col.id} style={{ flex: '1', minWidth: '280px', maxWidth: '360px', display: 'flex', flexDirection: 'column' }}>
              {/* Column Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '10px',
                background: col.bg,
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: col.color }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#fff',
                  background: col.color,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  minWidth: '28px',
                  textAlign: 'center',
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {colTasks.map((task, i) => (
                  <TaskCard key={`${task.id}-${i}`} task={task} />
                ))}
                {colTasks.length === 0 && (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                    color: MUTED,
                    border: `1px dashed ${BORDER}`,
                    borderRadius: '12px',
                  }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Table View ───────────────────────────────────────────────
  function TableView() {
    if (filtered.length === 0) {
      return (
        <div className="sd-empty" style={{ padding: '32px 0' }}>
          <p>No tasks match the current filters.</p>
        </div>
      );
    }
    return (
      <div className="sd-chart-card" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Project</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Owner</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Start</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Deadline</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Priority</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => (
                <tr
                  key={`${task.id}-${i}`}
                  onClick={() => task.projectId && onOpenProject(task.projectId)}
                  style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: MUTED, fontFamily: 'var(--font-mono, monospace)' }}>{task.id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {task.title ? <span style={{ color: TEXT, fontWeight: 500 }}>{task.title}</span> : <span style={{ color: MUTED }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: GREEN, fontWeight: 500 }}>{task.projectName || '—'}</td>
                  <td style={{ padding: '12px 16px', color: MUTED }}>{task.owner || '—'}</td>
                  <td style={{ padding: '12px 16px', color: MUTED, fontSize: '0.72rem' }}>{fmtDate(task.start)}</td>
                  <td style={{ padding: '12px 16px', color: isOverdue(task.deadline, task.status) ? RED : MUTED, fontSize: '0.72rem', fontWeight: isOverdue(task.deadline, task.status) ? 600 : 400 }}>
                    {isOverdue(task.deadline, task.status) && '⚠ '}{fmtDate(task.deadline)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px', background: priorityColor(task.priority), color: '#fff' }}>
                      {task.priority || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: TEXT, textTransform: 'capitalize' }}>{task.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Header with view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, margin: 0 }}>Task Dashboard</h2>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
          <button
            onClick={() => setView('table')}
            style={{
              padding: '8px 18px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: view === 'table' ? NAVY : SURFACE,
              color: view === 'table' ? '#fff' : MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ▤ Table
          </button>
          <button
            onClick={() => setView('kanban')}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderLeft: `1px solid ${BORDER}`,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: view === 'kanban' ? NAVY : SURFACE,
              color: view === 'kanban' ? '#fff' : MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⋮ Kanban
          </button>
        </div>
      </div>

      {/* Stat cards — 2 rows of 3 */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6" style={{ marginBottom: '24px' }}>
        <div style={statCardStyle}>
          <div style={labelStyle}>Total Tasks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: TEXT }}>{stats.total}</div>
        </div>
        <div style={statCardStyle}>
          <div style={labelStyle}>To Do</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: GRAY }}>{stats.todo}</div>
        </div>
        <div style={statCardStyle}>
          <div style={labelStyle}>In Progress</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: BLUE }}>{stats.inProgress}</div>
        </div>
        <div style={statCardStyle}>
          <div style={labelStyle}>Blocked</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: RED }}>{stats.blocked}</div>
        </div>
        <div style={statCardStyle}>
          <div style={labelStyle}>Done</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: GREEN }}>{stats.done}</div>
        </div>
        <div style={statCardStyle}>
          <div style={labelStyle}>Overdue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: RED }}>{stats.overdue}</div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="sd-chart-card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label style={labelStyle}>Project</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={selectStyle}>
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>PM</label>
            <input
              type="text"
              placeholder="Filter by PM..."
              value={pmFilter}
              onChange={(e) => setPmFilter(e.target.value)}
              style={{ ...selectStyle, minWidth: '180px' }}
            />
          </div>
          <button
            onClick={handleApply}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              height: '44px',
              marginLeft: 'auto',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Main content: Kanban or Table */}
      {view === 'kanban' ? <KanbanBoard /> : <TableView />}
    </div>
  );
}
