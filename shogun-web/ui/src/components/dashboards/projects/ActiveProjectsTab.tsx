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

function healthChipClass(health?: string): string {
  const h = (health || '').toLowerCase();
  if (h.includes('on-track') || h.includes('complete')) return 'ok';
  if (h.includes('at-risk')) return 'warn';
  if (h.includes('blocked')) return 'bad';
  return 'muted';
}

export function ActiveProjectsTab({ dept, color, onOpenProject }: Props) {
  const [search, setSearch] = useState('');
  const [pmFilter, setPmFilter] = useState('');

  const query = useQuery({
    queryKey: ['projects-active', dept],
    queryFn: () => departmentsApi.projectsActive(dept),
    refetchInterval: 120_000,
  });

  const active = query.data?.projects ?? [];

  const pms = useMemo(() => {
    const set = new Set(active.map((p) => p.pm).filter(Boolean) as string[]);
    return [...set].sort();
  }, [active]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active.filter((p) => {
      if (pmFilter && p.pm !== pmFilter) return false;
      if (q && !`${p.id} ${p.name} ${p.client ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [active, pmFilter, search]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading active projects…</p>
      </div>
    );
  }

  const overdueProjects = active.filter((p) =>
    (p.tasks ?? []).some((t) => t.isOverdue),
  ).length;
  const atRisk = active.filter((p) => (p.overallHealth || '').toLowerCase().includes('at-risk')).length;

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
      {/* Summary strip */}
      <div className="sd-kpi-grid">
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">Active Projects</div>
          <div className="sd-kpi-value">{active.length}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">At Risk</div>
          <div className="sd-kpi-value" style={{ color: atRisk > 0 ? 'var(--samurai-warning)' : TEXT }}>{atRisk}</div>
        </div>
        <div className="sd-kpi-card">
          <div className="sd-kpi-label">With Overdue Tasks</div>
          <div className="sd-kpi-value" style={{ color: overdueProjects > 0 ? DANGER : TEXT }}>{overdueProjects}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: '0.9rem 1rem' }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search active projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, minWidth: '220px' }}
          />
          <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)} style={selectStyle}>
            <option value="">All PMs</option>
            {pms.map((pm) => (
              <option key={pm} value={pm}>{pm}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: MUTED }}>
            {filtered.length} of {active.length} active projects
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="sd-chart-card">
        {filtered.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>{active.length === 0 ? 'No active projects.' : 'No projects match the current filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: '620px', overflowY: 'auto' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">ID</Th>
                  <Th align="left">Project</Th>
                  <Th align="left">Client</Th>
                  <Th align="left">PM</Th>
                  <Th align="center">Gate</Th>
                  <Th align="left">Target End</Th>
                  <Th align="center">Open Tasks</Th>
                  <Th align="center">Overdue</Th>
                  <Th align="left">Health</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, i) => {
                  const openTasks = (project.tasks ?? []).filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
                  const overdue = (project.tasks ?? []).filter((t) => t.isOverdue).length;
                  return (
                    <tr
                      key={project.id}
                      onClick={() => onOpenProject(project.id)}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: i % 2 === 1 ? SURFACE_2 : undefined,
                        cursor: 'pointer',
                      }}
                      title="Open project detail"
                    >
                      <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: MUTED }}>{project.id}</td>
                      <td className="px-3 py-2.5 max-w-[240px] truncate" style={{ fontWeight: 600, color: TEXT }} title={project.name}>{project.name}</td>
                      <td className="px-3 py-2.5 max-w-[170px] truncate" style={{ color: MUTED }}>{project.client || '—'}</td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}>{project.pm || '—'}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: TEXT }}>{project.gate != null ? `G${project.gate}` : '—'}</td>
                      <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{fmtDate(project.targetEnd)}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: openTasks > 0 ? TEXT : MUTED }}>{openTasks}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: overdue > 0 ? DANGER : MUTED, fontWeight: overdue > 0 ? 600 : 400 }}>{overdue}</td>
                      <td className="px-3 py-2.5">
                        <span className={`sd-chip ${healthChipClass(project.overallHealth)}`}>{project.overallHealth || '—'}</span>
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
