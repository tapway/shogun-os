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
const GREEN = '#10b981';
const BLUE = '#3b82f6';
const RED = '#ef4444';
const ORANGE = '#f59e0b';
const GRAY = '#9ca3af';

// Get next 5 working days starting from today
function getNextWorkingDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  while (days.length < 5) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function fmtDayDate(date: Date): string {
  return date.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' });
}

function fmtShortDate(date: Date): string {
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function priorityColor(priority?: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return ORANGE;
  if (p === 'high') return ORANGE;
  if (p === 'medium') return BLUE;
  return MUTED;
}

function statusColor(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('done')) return GREEN;
  if (s.includes('progress')) return BLUE;
  if (s.includes('block')) return RED;
  return GRAY;
}

export function PlanTab({ dept, color, onOpenProject }: Props) {
  const [projectFilter, setProjectFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [fdeFilter, setFdeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const query = useQuery({
    queryKey: ['projects-plan', dept],
    queryFn: () => departmentsApi.projectsPlan(dept),
    refetchInterval: 120_000,
  });

  // Flatten task structure
  const allTasks: ProjectTaskItem[] = useMemo(() => {
    const raw = query.data?.tasks ?? [];
    return raw.map((t: any) => {
      if (t.task && typeof t.task === 'object') {
        return { ...t.task, projectId: t.projectId || t.task.projectId, projectName: t.projectName || t.task.projectName };
      }
      return t;
    });
  }, [query.data]);

  // Get next 5 working days
  const weekDays = useMemo(() => getNextWorkingDays(new Date(2026, 8, 7)), []); // Sept 7, 2026

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (projectFilter && t.projectName !== projectFilter) return false;
      if (pmFilter && !(t.owner || '').toLowerCase().includes(pmFilter.toLowerCase())) return false;
      if (fdeFilter && !(t.owner || '').toLowerCase().includes(fdeFilter.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [allTasks, projectFilter, pmFilter, fdeFilter, statusFilter, priorityFilter]);

  // Group tasks by deadline day
  const tasksByDay = useMemo(() => {
    const groups: Record<string, ProjectTaskItem[]> = {};
    weekDays.forEach(d => {
      const key = d.toISOString().split('T')[0];
      groups[key] = [];
    });

    filteredTasks.forEach(t => {
      if (!t.deadline) return;
      const deadlineDate = new Date(t.deadline).toISOString().split('T')[0];
      if (groups[deadlineDate]) {
        groups[deadlineDate].push(t);
      }
    });

    return groups;
  }, [filteredTasks, weekDays]);

  // Calculate stats
  const stats = useMemo(() => {
    const planned = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in-progress').length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const blocked = filteredTasks.filter(t => t.status === 'blocked').length;
    const atRisk = filteredTasks.filter(t => t.status !== 'done' && t.deadline && new Date(t.deadline) <= new Date()).length;
    return { planned, done, inProgress, todo, blocked, atRisk };
  }, [filteredTasks]);

  // Get unique projects and owners for filters
  const projects = useMemo(() => [...new Set(allTasks.map(t => t.projectName).filter(Boolean))].sort(), [allTasks]);
  const owners = useMemo(() => [...new Set(allTasks.map(t => t.owner).filter(Boolean))].sort(), [allTasks]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading plan…</p>
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
    background: SURFACE,
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flex: '1',
    minWidth: '140px',
  };

  const today = new Date(2026, 8, 7).toISOString().split('T')[0];

  return (
    <div className="sd-stack">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: NAVY, margin: 0 }}>Task Plan — Next 5 Working Days</h2>
          </div>
          <p style={{ fontSize: '0.78rem', color: MUTED, margin: 0 }}>
            Monday 7 Sept – Friday 11 Sept · grouped by project · deadline = planned day
          </p>
        </div>
        <button
          onClick={() => onOpenProject('')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: `1px solid ${BORDER}`,
            background: SURFACE,
            color: MUTED,
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          View All Tasks →
        </button>
      </div>

      {/* KPI Cards - 2 rows of 3 */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6" style={{ marginBottom: '16px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Planned</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY }}>{stats.planned}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Done</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: GREEN }}>{stats.done}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: BLUE }}>{stats.inProgress}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>To Do</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: GRAY }}>{stats.todo}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Blocked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats.blocked}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>At Risk ⚠</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ORANGE }}>{stats.atRisk}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sd-chart-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label style={labelStyle}>Project</label>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
              <option value="">All Projects</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Project Manager</label>
            <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)} style={selectStyle}>
              <option value="">All PMs</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>FDE</label>
            <select value={fdeFilter} onChange={(e) => setFdeFilter(e.target.value)} style={selectStyle}>
              <option value="">All FDEs</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
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
        </div>
      </div>

      {/* Weekly Kanban Board */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
        {weekDays.map((day, idx) => {
          const dayKey = day.toISOString().split('T')[0];
          const dayTasks = tasksByDay[dayKey] || [];
          const isToday = dayKey === today;
          const count = dayTasks.length;

          // Group tasks by project
          const byProject: Record<string, ProjectTaskItem[]> = {};
          dayTasks.forEach(t => {
            const proj = t.projectName || 'Unknown';
            if (!byProject[proj]) byProject[proj] = [];
            byProject[proj].push(t);
          });

          return (
            <div
              key={dayKey}
              style={{
                flex: '1',
                minWidth: '280px',
                background: isToday ? SURFACE_2 : SURFACE,
                borderRadius: '12px',
                border: isToday ? `2px solid ${BLUE}` : `1px solid ${BORDER}`,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Day header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>
                    {day.toLocaleDateString('en-MY', { weekday: 'long' })}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: NAVY }}>
                    {fmtShortDate(day)}
                  </div>
                </div>
                {isToday && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: BLUE }} />}
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '10px',
                  background: '#f3f4f6',
                  color: MUTED,
                }}>
                  {count} planned
                </span>
              </div>

              {/* Tasks grouped by project */}
              {count === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px dashed ${BORDER}`,
                  borderRadius: '8px',
                  color: MUTED,
                  fontSize: '0.78rem',
                  minHeight: '120px',
                }}>
                  No tasks planned
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(byProject).map(([projectName, tasks]) => (
                    <div key={projectName}>
                      {/* Project group header */}
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: GREEN,
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>{projectName}</span>
                        <span style={{ fontSize: '0.68rem', color: MUTED, fontWeight: 400 }}>
                          PM: {tasks[0]?.owner || '—'}
                        </span>
                      </div>

                      {/* Task cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tasks.map((task, i) => (
                          <div
                            key={`${task.id}-${i}`}
                            onClick={() => task.projectId && onOpenProject(task.projectId)}
                            style={{
                              background: SURFACE,
                              border: `1px solid ${BORDER}`,
                              borderRadius: '8px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderLeft: task.status === 'blocked' || (task.deadline && new Date(task.deadline) < new Date()) ? `3px solid ${RED}` : 'none',
                            }}
                          >
                            {/* Top row: ID + Priority */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.68rem', color: MUTED }}>{task.id}</span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                background: priorityColor(task.priority),
                                color: '#fff',
                              }}>
                                {task.priority}
                              </span>
                            </div>

                            {/* Title */}
                            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: NAVY, marginBottom: '6px', lineHeight: '1.3' }}>
                              {task.title || '—'}
                            </div>

                            {/* Bottom row: Assignee + Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: MUTED }}>@{task.owner || 'unassigned'}</span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                background: '#f3f4f6',
                                color: statusColor(task.status),
                              }}>
                                {task.status?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: SURFACE,
        borderRadius: '8px',
        border: `1px solid ${BORDER}`,
        fontSize: '0.72rem',
        color: MUTED,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      }}>
        <span style={{ color: RED }}>▲</span>
        <span>
          <strong style={{ color: RED }}>Red left border</strong> = overdue / blocked · Exact planned day comes from task deadline.
          <strong> ⚠ Any task in today's column still todo / in-progress / blocked at 4:30pm</strong> fires one warning to <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>#project-management</code>.
        </span>
      </div>
    </div>
  );
}
