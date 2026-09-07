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

function fmtDate(iso?: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priorityColor(priority?: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return ORANGE;
  if (p === 'high') return ORANGE;
  if (p === 'medium') return BLUE;
  return MUTED;
}

function statusDotColor(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return GREEN;
  if (s.includes('progress')) return BLUE;
  if (s.includes('block')) return RED;
  return '#9ca3af'; // gray for todo
}

export function TasksTab({ dept, color, onOpenProject }: Props) {
  const [view, setView] = useState<'table' | 'kanban'>('table');
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

  // Flatten task structure from backend
  const allTasks: ProjectTaskItem[] = useMemo(() => {
    const raw = query.data?.tasks ?? [];
    return raw.map((t: any) => ({
      ...t.task,
      projectId: t.projectId,
      projectName: t.projectName,
    }));
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

  // Calculate stats
  const stats = useMemo(() => {
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'todo').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const now = new Date().toISOString();
    const overdue = allTasks.filter(t => t.deadline && t.deadline < now && t.status !== 'done').length;
    return { total, todo, inProgress, blocked, done, overdue };
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
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.8rem',
    minWidth: '140px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  const statCardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flex: '1',
    minWidth: '140px',
  };

  return (
    <div className="sd-stack">
      {/* Header with view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: NAVY, margin: 0 }}>Task Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setView('table')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: view === 'table' ? NAVY : '#f3f4f6',
              color: view === 'table' ? '#fff' : MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>▤</span> Table
          </button>
          <button
            onClick={() => setView('kanban')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: view === 'kanban' ? NAVY : '#f3f4f6',
              color: view === 'kanban' ? '#fff' : MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⋮</span> Kanban
          </button>
        </div>
      </div>

      {/* Stat cards - 2 rows of 3 */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6" style={{ marginBottom: '16px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Total Tasks</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY }}>{stats.total}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>To Do</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: MUTED }}>{stats.todo}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: BLUE }}>{stats.inProgress}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Blocked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats.blocked}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Done</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: GREEN }}>{stats.done}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats.overdue}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sd-chart-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div className="flex flex-wrap items-end gap-4">
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
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Task table */}
      {filtered.length === 0 ? (
        <div className="sd-empty" style={{ padding: '32px 0' }}>
          <p>No tasks match the current filters.</p>
        </div>
      ) : (
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>
                    Deadline <span style={{ fontSize: '0.6rem' }}>▲</span>
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Deps</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task, i) => (
                  <tr
                    key={`${task.id}-${i}`}
                    onClick={() => task.projectId && onOpenProject(task.projectId)}
                    style={{
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: MUTED, fontFamily: 'var(--font-mono, monospace)' }}>
                      {task.id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {task.title ? (
                        <span style={{ color: BLUE, textDecoration: 'underline' }}>{task.title}</span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: MUTED }}>{task.projectName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: MUTED }}>{task.owner || '—'}</td>
                    <td style={{ padding: '12px 16px', color: MUTED, fontSize: '0.72rem' }}>{fmtDate(task.start)}</td>
                    <td style={{ padding: '12px 16px', color: MUTED, fontSize: '0.72rem' }}>{fmtDate(task.deadline)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: '10px',
                        background: priorityColor(task.priority),
                        color: '#fff',
                      }}>
                        {task.priority || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusDotColor(task.status),
                        display: 'inline-block',
                      }} />
                      <span style={{ color: TEXT, textTransform: 'capitalize' }}>{task.status || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: MUTED }}>{task.dependsOn || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
