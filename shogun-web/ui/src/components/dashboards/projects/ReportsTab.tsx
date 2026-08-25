import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import { chartColors } from '../../../lib/palette';
import { BarChart, PieChart } from '../charts';

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

function fmtRm(value?: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value.toFixed(0)}`;
}

function healthChipClass(health?: string): string {
  const h = (health || '').toLowerCase();
  if (h.includes('on-track') || h.includes('complete')) return 'ok';
  if (h.includes('at-risk')) return 'warn';
  if (h.includes('blocked')) return 'bad';
  return 'muted';
}

function toChartData(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); // descending, top to bottom
}

/** Shorten messy source labels (e.g. "closing — UAT & DO sent to client…") for display. */
function shortLabel(name: string, max = 24): string {
  const base = name.split('\u2014')[0].trim();
  return base.length > max ? `${base.slice(0, max - 1)}\u2026` : base;
}

/** Donut + wrapping HTML legend (sorted descending). The built-in Recharts
 *  legend overflows the fixed-height chart container, so labels render as a
 *  normal flex-wrap block below the donut instead. */
function DonutWithLegend({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  const palette = chartColors(color, data.length);
  if (data.length === 0) {
    return <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.8rem', color: MUTED }}>No data.</div>;
  }
  return (
    <div>
      <PieChart data={data} color={color} height={190} innerRadius={42} outerRadius={66} showLegend={false} />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5" style={{ marginTop: '0.75rem' }}>
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5" style={{ fontSize: '0.72rem' }} title={d.name}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: palette[i % palette.length], flexShrink: 0 }} />
            <span style={{ color: TEXT, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shortLabel(d.name)}
            </span>
            <span style={{ color: MUTED }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsTab({ dept, color, onOpenProject }: Props) {
  const query = useQuery({
    queryKey: ['projects-reports', dept],
    queryFn: () => departmentsApi.reportsSummary(dept),
    refetchInterval: 120_000,
  });

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading reports…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <h2>No report data yet</h2>
        <p>Run the project dashboard sync script to import data first.</p>
      </div>
    );
  }

  const { totals, projectsByHealth, projectsByPm, projectsByStatus, projects } = query.data;

  const KPIs = [
    { label: 'Total Projects', value: String(totals.projects) },
    { label: 'Active', value: String(totals.activeProjects) },
    { label: 'Portfolio Value', value: fmtRm(totals.totalValueRm) },
    { label: 'Total Tasks', value: String(totals.tasks) },
    { label: 'Open Tasks', value: String(totals.openTasks) },
    { label: 'Overdue Tasks', value: String(totals.overdueTasks) },
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

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Portfolio Health</h3>
          <DonutWithLegend data={toChartData(projectsByHealth)} color={color} />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Projects by Status</h3>
          <DonutWithLegend data={toChartData(projectsByStatus)} color={color} />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Projects per PM</h3>
          <BarChart
            data={Object.entries(projectsByPm).map(([name, count]) => ({ name, count }))}
            xKey="name"
            yKey="count"
            color={color}
            height={240}
            interval={0}
          />
        </div>
      </div>

      {/* Portfolio table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Portfolio Report</h3>
        <p className="sd-chart-sub">Per-project health, task load, and completion — click to drill down</p>
        <div className="overflow-x-auto" style={{ maxHeight: '560px', overflowY: 'auto' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Th align="left">Project</Th>
                <Th align="left">Client</Th>
                <Th align="left">PM</Th>
                <Th align="center">Gate</Th>
                <Th align="right">Value</Th>
                <Th align="center">Tasks</Th>
                <Th align="center">Open</Th>
                <Th align="center">Overdue</Th>
                <Th align="center">Completion</Th>
                <Th align="left">Health</Th>
                <Th align="left">Last Updated</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onOpenProject(row.id)}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: i % 2 === 1 ? SURFACE_2 : undefined,
                    cursor: 'pointer',
                  }}
                  title="Open project detail"
                >
                  <td className="px-3 py-2.5 max-w-[220px] truncate" style={{ fontWeight: 600, color: TEXT }} title={row.name}>{row.name}</td>
                  <td className="px-3 py-2.5 max-w-[150px] truncate" style={{ color: MUTED }}>{row.client || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: MUTED }}>{row.pm || '—'}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: TEXT }}>{row.gate != null ? `G${row.gate}` : '—'}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: TEXT }}>{fmtRm(row.valueRm)}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: MUTED }}>{row.totalTasks}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: row.openTasks > 0 ? TEXT : MUTED }}>{row.openTasks}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: row.overdueTasks > 0 ? DANGER : MUTED, fontWeight: row.overdueTasks > 0 ? 600 : 400 }}>{row.overdueTasks}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: TEXT }}>{row.completionPct}%</td>
                  <td className="px-3 py-2.5">
                    <span className={`sd-chip ${healthChipClass(row.overallHealth)}`}>{row.overallHealth || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.75rem' }}>{fmtDate(row.sourceLastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
