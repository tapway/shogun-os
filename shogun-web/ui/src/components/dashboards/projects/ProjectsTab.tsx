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

function fmtRm(value?: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value.toFixed(0)}`;
}

function statusChipClass(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('commission') || s.includes('done') || s.includes('complete') || s.includes('won')) return 'ok';
  if (s.includes('active') || s.includes('progress')) return 'ok';
  if (s.includes('hold') || s.includes('risk') || s.includes('overdue')) return 'warn';
  if (s.includes('cancel') || s.includes('lost')) return 'bad';
  return 'muted';
}

export function ProjectsTab({ dept, color, onOpenProject }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['projects-list', dept],
    queryFn: () => departmentsApi.projectsList(dept),
    refetchInterval: 120_000,
  });

  const allProjects = query.data?.projects ?? [];

  const statuses = useMemo(() => {
    const set = new Set(allProjects.map((p) => p.status).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allProjects]);

  const pms = useMemo(() => {
    const set = new Set(allProjects.map((p) => p.pm).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (pmFilter && p.pm !== pmFilter) return false;
      if (q && !`${p.id} ${p.name} ${p.client ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProjects, statusFilter, pmFilter, search]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading projects…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="sd-empty">
        <h2>No project data synced yet</h2>
        <p>
          Run <code>scripts/sync-project-dashboard.py</code> with <code>PROJECT_DASHBOARD_API_URL</code> set
          to import projects from the external tracker.
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

  return (
    <div className="sd-stack">
      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: '0.9rem 1rem' }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, minWidth: '220px' }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)} style={selectStyle}>
            <option value="">All PMs</option>
            {pms.map((pm) => (
              <option key={pm} value={pm}>{pm}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: MUTED }}>
            {filtered.length} of {allProjects.length} projects
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="sd-chart-card">
        {filtered.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>No projects match the current filters.</p>
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
                  <Th align="right">Value</Th>
                  <Th align="left">Target End</Th>
                  <Th align="center">Tasks</Th>
                  <Th align="left">Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, i) => {
                  const openTasks = (project.tasks ?? []).filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
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
                      <td className="px-3 py-2.5 max-w-[260px] truncate" style={{ fontWeight: 600, color: TEXT }} title={project.name}>{project.name}</td>
                      <td className="px-3 py-2.5 max-w-[170px] truncate" style={{ color: MUTED }}>{project.client || '—'}</td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}>{project.pm || '—'}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: TEXT }}>{project.gate != null ? `G${project.gate}` : '—'}</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: TEXT, fontWeight: 500 }}>{fmtRm(project.valueRm)}</td>
                      <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{fmtDate(project.targetEnd)}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: openTasks > 0 ? TEXT : MUTED }}>{openTasks}</td>
                      <td className="px-3 py-2.5">
                        <span className={`sd-chip ${statusChipClass(project.status)}`}>{project.status || '—'}</span>
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
