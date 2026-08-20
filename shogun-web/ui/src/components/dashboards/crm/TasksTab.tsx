import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SquareCheckBig } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmTaskItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

type FilterMode = 'all' | 'open' | 'done';

export function TasksTab({ dept, color }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [assignee, setAssignee] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['crm-tasks', dept, filter, assignee],
    queryFn: () => {
      const completed = filter === 'open' ? false : filter === 'done' ? true : undefined;
      return departmentsApi.crmTasksList(dept, completed, assignee);
    },
    refetchInterval: 120_000,
  });

  const tasks = query.data?.tasks ?? [];

  // Group by deal
  const grouped = useMemo(() => {
    const map = new Map<string, CrmTaskItem[]>();
    for (const t of tasks) {
      const arr = map.get(t.deal_slug) ?? [];
      arr.push(t);
      map.set(t.deal_slug, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  const assignees = useMemo(() => {
    const set = new Set(tasks.map((t) => t.assignee).filter(Boolean));
    return [...set].sort();
  }, [tasks]);

  const openCount = tasks.filter((t) => !t.completed).length;
  const doneCount = tasks.length - openCount;

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

  const toggle = (slug: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className="sd-stack">
      {/* Filter bar */}
      <div className="sd-chart-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 2 }}>
          {(['all', 'open', 'done'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', fontSize: '0.8rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: filter === f ? color : 'transparent', color: filter === f ? '#fff' : MUTED,
                fontWeight: filter === f ? 600 : 400, transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? 'All' : f === 'open' ? `Open (${openCount})` : `Done (${doneCount})`}
            </button>
          ))}
        </div>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'var(--samurai-surface)', color: TEXT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Assignees</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: MUTED, whiteSpace: 'nowrap' }}>{tasks.length} tasks</span>
      </div>

      {/* Task list grouped by deal */}
      {tasks.length === 0 ? (
        <div className="sd-empty">
          <SquareCheckBig className="h-10 w-10" style={{ color: MUTED }} />
          <p>No tasks found. Tasks are parsed from deal markdown in gbrain.</p>
        </div>
      ) : (
        <div className="sd-stack" style={{ gap: 8 }}>
          {grouped.map(([slug, items]) => {
            const isCollapsed = collapsed.has(slug);
            const dealTitle = items[0]?.deal_title || slug;
            const dealOpen = items.filter((t) => !t.completed).length;
            return (
              <div key={slug} className="sd-chart-card" style={{ padding: '12px 16px' }}>
                <div
                  onClick={() => toggle(slug)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ fontSize: '0.7rem', color: MUTED, width: 16, textAlign: 'center' }}>
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ fontWeight: 600, color: TEXT, fontSize: '0.9rem', flex: 1 }}>{dealTitle}</span>
                  <span className="sd-chip muted" style={{ fontSize: '0.7rem' }}>
                    {dealOpen} open / {items.length} total
                  </span>
                </div>
                {!isCollapsed && (
                  <div style={{ marginTop: 8, marginLeft: 24 }}>
                    {items.map((t, i) => (
                      <div
                        key={`${t.deal_slug}::${t.description}::${i}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                          borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 16, height: 16, borderRadius: 4, border: `2px solid ${t.completed ? color : BORDER}`,
                            background: t.completed ? color : 'transparent', flexShrink: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {t.completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
                              <path d="M9 11l3 3L22 4" />
                            </svg>
                          )}
                        </span>
                        <span
                          style={{ flex: 1, color: TEXT, fontSize: '0.85rem',
                            textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.6 : 1 }}
                        >
                          {t.description.replace(/\*\*(.+?)\*\*/g, '$1')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: MUTED, whiteSpace: 'nowrap' }}>
                          {t.assignee || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
