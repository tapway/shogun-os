import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SquareCheckBig, ChevronDown, ChevronRight } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmTaskItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  onDealClick?: (dealSlug: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

type ViewMode = 'assignee' | 'deal';
type FilterMode = 'open' | 'done';

export function TasksTab({ dept, color, onDealClick }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('assignee');
  const [filter, setFilter] = useState<FilterMode>('open');
  const [collapsedAssignees, setCollapsedAssignees] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['crm-tasks', dept, filter],
    queryFn: () => {
      const completed = filter === 'done';
      return departmentsApi.crmTasksList(dept, completed, '', '');
    },
    refetchInterval: 120_000,
  });

  const tasks = query.data?.tasks ?? [];

  // Group by assignee
  const groupedByAssignee = useMemo(() => {
    const map = new Map<string, CrmTaskItem[]>();
    for (const t of tasks) {
      const assignee = t.assignee || 'Unassigned';
      const arr = map.get(assignee) ?? [];
      arr.push(t);
      map.set(assignee, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  // Group by deal
  const groupedByDeal = useMemo(() => {
    const map = new Map<string, { title: string; tasks: CrmTaskItem[] }>();
    for (const t of tasks) {
      const slug = t.deal_slug || 'no-deal';
      const existing = map.get(slug);
      if (existing) {
        existing.tasks.push(t);
      } else {
        map.set(slug, { title: t.deal_title || slug, tasks: [t] });
      }
    }
    return [...map.entries()].sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [tasks]);

  const openCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.length - openCount;

  const toggleAssignee = (assignee: string) => {
    setCollapsedAssignees(prev => {
      const next = new Set(prev);
      if (next.has(assignee)) next.delete(assignee);
      else next.add(assignee);
      return next;
    });
  };

  const handleDealClick = (dealSlug: string) => {
    if (onDealClick) {
      onDealClick(dealSlug);
    }
  };

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading tasks…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <SquareCheckBig className="h-10 w-10" style={{ color: MUTED }} />
        <h2>Unable to load tasks</h2>
        <p>The gbrain source could not be reached. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: TEXT, margin: 0 }}>
          Tasks
        </h2>
        <div style={{ fontSize: '0.85rem', color: MUTED }}>
          {openCount} open · {doneCount} completed
        </div>
      </div>

      {/* View Mode & Filter */}
      <div className="sd-chart-card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 2 }}>
          {(['assignee', 'deal'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === mode ? color : 'transparent',
                color: viewMode === mode ? '#fff' : MUTED,
                fontWeight: viewMode === mode ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {mode === 'assignee' ? 'By Assignee' : 'By Deal'}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 2 }}>
          {(['open', 'done'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: filter === f ? color : 'transparent',
                color: filter === f ? '#fff' : MUTED,
                fontWeight: filter === f ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {f === 'open' ? 'Open' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>
          No tasks found
        </div>
      ) : viewMode === 'assignee' ? (
        /* Grouped by Assignee */
        <div className="sd-stack" style={{ gap: 12 }}>
          {groupedByAssignee.map(([assignee, assigneeTasks]) => {
            const isCollapsed = collapsedAssignees.has(assignee);
            
            return (
              <div key={assignee} className="sd-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Assignee Header */}
                <div
                  onClick={() => toggleAssignee(assignee)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    background: 'rgba(0,0,0,0.02)',
                    borderBottom: isCollapsed ? 'none' : `1px solid ${BORDER}`,
                  }}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" style={{ color: MUTED }} />
                  ) : (
                    <ChevronDown className="h-4 w-4" style={{ color: MUTED }} />
                  )}
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: TEXT }}>
                    {assignee}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: MUTED }}>
                    ({assigneeTasks.length})
                  </span>
                </div>

                {/* Tasks */}
                {!isCollapsed && (
                  <div style={{ padding: '8px 16px 16px' }}>
                    {assigneeTasks.map((task, idx) => (
                      <div
                        key={`${task.deal_slug}-${idx}`}
                        style={{
                          padding: '10px 0',
                          borderBottom: idx < assigneeTasks.length - 1 ? `1px solid ${BORDER}` : 'none',
                        }}
                      >
                        {/* Task title */}
                        <div style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: task.completed ? 400 : 500, 
                          color: task.completed ? MUTED : TEXT,
                          textDecoration: task.completed ? 'line-through' : 'none',
                          marginBottom: 4,
                        }}>
                          {task.description}
                        </div>

                        {/* Deal link */}
                        {task.deal_slug && (
                          <div style={{ fontSize: '0.8rem', color: MUTED }}>
                            <span>{task.assignee || 'Unassigned'} · </span>
                            <span
                              onClick={() => handleDealClick(task.deal_slug)}
                              style={{
                                color: color,
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              {task.deal_title || task.deal_slug}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Grouped by Deal */
        <div className="sd-stack" style={{ gap: 12 }}>
          {groupedByDeal.map(([slug, { title, tasks: dealTasks }]) => (
            <div key={slug} className="sd-chart-card" style={{ padding: 16 }}>
              {/* Deal Header */}
              <div
                onClick={() => handleDealClick(slug)}
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: color,
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {title}
              </div>

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dealTasks.map((task, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: 6,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: task.completed ? 400 : 500, 
                      color: task.completed ? MUTED : TEXT,
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}>
                      {task.description}
                    </div>
                    {task.assignee && (
                      <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4 }}>
                        @{task.assignee}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
