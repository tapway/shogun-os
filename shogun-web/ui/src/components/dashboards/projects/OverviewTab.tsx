import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import type { ProjectStats } from '../../../lib/types';

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

function statusChipClass(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('commission') || s.includes('done') || s.includes('complete') || s.includes('won')) return 'ok';
  if (s.includes('active') || s.includes('progress')) return 'ok';
  if (s.includes('hold') || s.includes('risk') || s.includes('overdue')) return 'warn';
  if (s.includes('cancel') || s.includes('lost')) return 'bad';
  return 'muted';
}

export function OverviewTab({ dept, color, onOpenProject }: Props) {
  const statsQuery = useQuery({
    queryKey: ['projects-stats', dept],
    queryFn: () => departmentsApi.projectsStats(dept),
    refetchInterval: 120_000,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects-list-overview', dept],
    queryFn: () => departmentsApi.projectsList(dept),
    refetchInterval: 120_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading projects…</p>
      </div>
    );
  }

  if (statsQuery.isError) {
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

  const stats: ProjectStats | undefined = statsQuery.data;
  const projects = projectsQuery.data?.projects ?? [];
  const byPm = new Map<string, number>();
  for (const p of projects) {
    if (p.pm) byPm.set(p.pm, (byPm.get(p.pm) ?? 0) + 1);
  }
  const topPms = [...byPm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const completionRate = stats && stats.tasks.total > 0
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
    : 0;

  const KPIs = [
    { label: 'Total Projects', value: String(stats?.projects.total ?? 0) },
    { label: 'Active Projects', value: String(stats?.projects.active ?? 0) },
    { label: 'Total Tasks', value: String(stats?.tasks.total ?? 0) },
    { label: 'Tasks Done', value: String(stats?.tasks.completed ?? 0) },
    { label: 'Overdue Tasks', value: String(stats?.tasks.overdue ?? 0) },
    { label: 'Completion', value: `${completionRate}%` },
  ];

  return (
    <div className="sd-stack">
      {/* KPI cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Project list */}
        <div className="sd-chart-card lg:col-span-2">
          <h3 className="sd-chart-title">Projects</h3>
          <p className="sd-chart-sub">Click a project to drill down into goals, tasks, and risks</p>
          {projectsQuery.isLoading ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div className="h-6 w-6 animate-spin rounded-full mx-auto" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
            </div>
          ) : projects.length === 0 ? (
            <div className="sd-empty" style={{ padding: '24px 0' }}>
              <p>No projects synced yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <Th align="left">ID</Th>
                    <Th align="left">Project</Th>
                    <Th align="left">Client</Th>
                    <Th align="left">PM</Th>
                    <Th align="center">Gate</Th>
                    <Th align="left">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, i) => (
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
                      <td className="px-3 py-2.5 max-w-[160px] truncate" style={{ color: MUTED }}>{project.client || '—'}</td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}>{project.pm || '—'}</td>
                      <td className="px-3 py-2.5 text-center" style={{ color: TEXT }}>{project.gate != null ? `G${project.gate}` : '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`sd-chip ${statusChipClass(project.status)}`}>{project.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* By PM */}
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">By Project Manager</h3>
          <p className="sd-chart-sub">Projects per PM</p>
          {topPms.length === 0 ? (
            <div className="sd-empty" style={{ padding: '24px 0' }}>
              <p>No PM data.</p>
            </div>
          ) : (
            <div className="sd-stack" style={{ gap: '0.5rem' }}>
              {topPms.map(([pm, count]) => {
                const max = topPms[0][1];
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={pm}>
                    <div className="flex justify-between" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: TEXT, fontWeight: 500 }}>{pm}</span>
                      <span style={{ color: MUTED }}>{count}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: SURFACE_2 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
