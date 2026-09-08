import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';

interface Props {
  dept: string;
  color: string;
  onOpenProject: (projectId: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE = 'var(--samurai-surface)';
const BORDER = 'var(--samurai-border)';
const NAVY = '#1e3a5f';
const GREEN = '#10b981';
const RED = '#ef4444';
const ORANGE = '#f59e0b';
const BLUE = '#3b82f6';

interface PostProjectItem {
  id: string;
  title: string;
  description?: string;
  sourceProject?: string;
  sourceProjectId?: string;
  owner?: string;
  priority?: string;
  due?: string | null;
  status?: string;
}

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

function statusColor(status?: string): { bg: string; text: string } {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete')) return { bg: '#dcfce7', text: GREEN };
  if (s.includes('block')) return { bg: '#fee2e2', text: RED };
  if (s.includes('open')) return { bg: '#fef3c7', text: ORANGE };
  return { bg: '#f3f4f6', text: MUTED };
}

export function PostProjectTab({ dept, color, onOpenProject }: Props) {
  const query = useQuery({
    queryKey: ['projects-post-project', dept],
    queryFn: () => departmentsApi.projectsPostProject(dept),
    refetchInterval: 120_000,
  });

  const items: PostProjectItem[] = query.data?.items ?? [];

  // Calculate stats
  const stats = useMemo(() => {
    const total = items.length;
    const open = items.filter(i => (i.status || '').toLowerCase().includes('open')).length;
    const blocked = items.filter(i => (i.status || '').toLowerCase().includes('block')).length;
    const overdue = items.filter(i => i.due && new Date(i.due) < new Date() && !(i.status || '').toLowerCase().includes('done')).length;
    const done = items.filter(i => (i.status || '').toLowerCase().includes('done')).length;
    return { total, open, blocked, overdue, done };
  }, [items]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading post-project items…</p>
      </div>
    );
  }

  const statCardStyle: React.CSSProperties = {
    background: SURFACE,
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flex: '1',
    minWidth: '140px',
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 500,
    color: MUTED,
  };

  return (
    <div className="sd-stack">
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Post-Project</h2>
        <p style={{ fontSize: '0.78rem', color: MUTED, margin: 0 }}>
          {stats.open} open of {stats.total} items — follow-ups handed to the post-project team
        </p>
      </div>

      {/* Stat cards - 5 cards in a row */}
      <div className="grid gap-4 md:grid-cols-5" style={{ marginBottom: '16px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Open Items</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ORANGE }}>{stats.open}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Blocked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats.blocked}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats.overdue}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Done</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: GREEN }}>{stats.done}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>{stats.total}</div>
        </div>
      </div>

      {/* Data table */}
      <div className="sd-chart-card" style={{ padding: 0 }}>
        {items.length === 0 ? (
          <div className="sd-empty" style={{ padding: '32px 0' }}>
            <p>No post-project items.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Due</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const statusColors = statusColor(item.status);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => item.sourceProjectId && onOpenProject(item.sourceProjectId)}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        cursor: item.sourceProjectId ? 'pointer' : 'default',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: TEXT }}>{item.id}</td>
                      <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                        <div style={{ color: BLUE, textDecoration: 'underline', fontWeight: 500, marginBottom: '4px' }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '0.72rem', color: MUTED, lineHeight: '1.4' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.sourceProject ? (
                          <span style={{ color: BLUE, textDecoration: 'underline', cursor: 'pointer' }}>
                            {item.sourceProject} →
                          </span>
                        ) : (
                          <span style={{ color: MUTED }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: TEXT }}>{item.owner || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 10px',
                          borderRadius: '10px',
                          background: priorityColor(item.priority),
                          color: '#fff',
                        }}>
                          {item.priority || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: MUTED }}>{fmtDate(item.due)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 10px',
                          borderRadius: '10px',
                          background: statusColors.bg,
                          color: statusColors.text,
                        }}>
                          {item.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
