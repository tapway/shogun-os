import { useState } from 'react';
import { MOCK_TASKS, CURRENT_SPRINT, type TaskItem } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const COLUMNS: { id: TaskItem['status']; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Code Review' },
  { id: 'qa', label: 'QA' },
  { id: 'done', label: 'Done' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

interface Props {
  dept: string;
  color: string;
}

export function SprintBoardTab({ dept, color }: Props) {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const assignees = Array.from(new Set(tasks.map(t => t.assignee)));

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const moveTask = (taskId: string, newStatus: TaskItem['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const sprint = CURRENT_SPRINT;
  const progressPct = Math.round((sprint.completedPoints / sprint.totalPoints) * 100);

  return (
    <div className="sd-stack" style={{ gap: 12 }}>
      {/* Sprint Header */}
      <div className="sd-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{sprint.name}</div>
          <div style={{ fontSize: '0.7rem', color: MUTED }}>{sprint.startDate} → {sprint.endDate} · {progressPct}% complete</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            style={{ background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            <option value="all">All Assignees</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(160px, 1fr))`, gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const colPoints = colTasks.reduce((sum, t) => sum + t.points, 0);
          return (
            <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              {/* Column Header */}
              <div style={{
                padding: '6px 10px', borderRadius: 8,
                background: 'var(--samurai-surface-2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT }}>{col.label}</span>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>{colTasks.length} · {colPoints}pts</span>
              </div>

              {/* Task Cards */}
              {colTasks.map(task => (
                <div
                  key={task.id}
                  className="sd-card interactive"
                  onClick={() => setSelectedTask(task)}
                  style={{ padding: '10px 12px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: MUTED, fontFamily: 'monospace' }}>{task.id}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: PRIORITY_COLORS[task.priority],
                    }} title={task.priority} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: TEXT, lineHeight: 1.35, marginBottom: 6 }}>{task.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: MUTED }}>{task.assignee}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color, background: `${color}18`, padding: '1px 6px', borderRadius: 99 }}>{task.points}pt</span>
                  </div>
                  {task.labels.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
                      {task.labels.slice(0, 3).map(l => (
                        <span key={l} style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: 99, background: 'var(--samurai-surface-2)', color: MUTED }}>{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {colTasks.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: '0.7rem', color: MUTED, border: `1px dashed ${BORDER}`, borderRadius: 8 }}>
                  No tasks
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelectedTask(null)}>
          <div
            className="sd-card"
            style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: MUTED }}>{selectedTask.id}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem', color: TEXT }}>{selectedTask.title}</h3>
              </div>
              <button className="sd-btn sd-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedTask(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: '0.8rem' }}>
              <div><span style={{ color: MUTED }}>Assignee:</span> <span style={{ color: TEXT }}>{selectedTask.assignee}</span></div>
              <div><span style={{ color: MUTED }}>Priority:</span> <span style={{ color: PRIORITY_COLORS[selectedTask.priority], fontWeight: 600 }}>{selectedTask.priority}</span></div>
              <div><span style={{ color: MUTED }}>Points:</span> <span style={{ color: TEXT }}>{selectedTask.points}</span></div>
              <div><span style={{ color: MUTED }}>Sprint:</span> <span style={{ color: TEXT }}>{selectedTask.sprint}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {selectedTask.labels.map(l => (
                <span key={l} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'var(--samurai-surface-2)', color: MUTED }}>{l}</span>
              ))}
            </div>

            {/* Move Actions */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 8 }}>Move to:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLUMNS.filter(c => c.id !== selectedTask.status).map(col => (
                  <button
                    key={col.id}
                    className="sd-btn sd-btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                    onClick={() => moveTask(selectedTask.id, col.id)}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
