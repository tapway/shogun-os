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
const SURFACE = 'var(--samurai-surface)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const GREEN = '#10b981';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const NAVY = '#1e3a5f';

function statusColor(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('on track')) return GREEN;
  if (s.includes('risk') || s.includes('hold') || s.includes('paused')) return ORANGE;
  if (s.includes('block') || s.includes('cancel') || s.includes('overdue')) return RED;
  return NAVY;
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: string }) {
  return (
    <div className="sd-kpi-card" style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '1.2rem', opacity: 0.3 }}>{icon}</span>}
      <div className="sd-kpi-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>{label}</div>
      <div className="sd-kpi-value" style={{ color, fontSize: '1.8rem', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function DonutChart({ data, title }: { data: Record<string, number>; title: string }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="sd-chart-card"><h3 className="sd-chart-title">{title}</h3><p className="sd-chart-sub">No data</p></div>;

  const colors = ['#f59e0b', '#ef4444', '#10b981', '#6b7280', '#3b82f6', '#8b5cf6'];
  let cumulative = 0;
  const segments = Object.entries(data).map(([label, value], i) => {
    const start = cumulative;
    cumulative += value;
    return { label, value, start, end: cumulative, color: colors[i % colors.length] };
  });

  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const strokeWidth = 20;

  function getArcPath(startAngle: number, endAngle: number) {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="sd-chart-card">
      <h3 className="sd-chart-title">{title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 0' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => {
            const startAngle = (seg.start / total) * 360;
            const endAngle = (seg.end / total) * 360;
            if (endAngle - startAngle < 0.5) return null;
            return <path key={i} d={getArcPath(startAngle, endAngle)} fill={seg.color} stroke={SURFACE} strokeWidth="2" />;
          })}
          <circle cx={cx} cy={cy} r={r - strokeWidth / 2} fill={SURFACE} />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
              <span style={{ color: TEXT }}>{seg.label}</span>
              <span style={{ color: MUTED, marginLeft: 'auto' }}>{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, title, barColor = '#f59e0b' }: { data: { label: string; value: number }[]; title: string; barColor?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="sd-chart-card">
      <h3 className="sd-chart-title">{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '100px', fontSize: '0.75rem', color: TEXT, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>{item.label}</span>
            <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: SURFACE_2 }}>
              <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', borderRadius: '4px', background: barColor }} />
            </div>
            <span style={{ width: '32px', fontSize: '0.75rem', color: MUTED, textAlign: 'right' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
        <h2>No project data available</h2>
        <p>Check mock data configuration.</p>
      </div>
    );
  }

  const stats: ProjectStats | undefined = statsQuery.data;
  const projects = projectsQuery.data?.projects ?? [];

  const activeCount = stats?.projects.active ?? 0;
  const totalCount = stats?.projects.total ?? 0;
  const atRiskCount = stats?.atRisk ?? 0;
  const blockedCount = stats?.blocked ?? 0;
  const overdueCount = stats?.overdue ?? 0;
  const pipelineValue = stats?.pipelineValue ?? 0;
  const overallProgress = stats?.overallProgress ?? 0;
  const tasksTotal = stats?.tasks.total ?? 0;
  const tasksOverdue = stats?.tasks.overdue ?? 0;

  const formatRm = (v: number) => v >= 1000 ? `RM ${(v / 1000).toFixed(0)}K` : `RM ${v.toFixed(0)}`;

  return (
    <div className="sd-stack">
      {/* Section header */}
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>Overview</h2>
        <p style={{ fontSize: '0.78rem', color: MUTED, margin: '4px 0 0' }}>{totalCount} total projects · {activeCount} active</p>
      </div>

      {/* KPI Row 1 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <KpiCard label="Active Projects" value={String(activeCount)} color={NAVY} icon="📊" />
        <KpiCard label="At Risk / Blocked" value={String(atRiskCount + blockedCount)} sub={`${atRiskCount} need attention`} color={RED} icon="⚠️" />
      </div>

      {/* KPI Row 2 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <KpiCard label="Overdue" value={String(overdueCount)} color={ORANGE} icon="📅" />
        <KpiCard label="Total Pipeline" value={formatRm(pipelineValue)} color={GREEN} icon="💰" />
      </div>

      {/* KPI Row 3 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard label="Total Projects" value={String(totalCount)} sub={`${activeCount} active`} color={NAVY} />
        <KpiCard label="Overall Progress" value={`${overallProgress}%`} sub="avg task completion" color={GREEN} />
        <KpiCard label="At Risk" value={String(atRiskCount)} sub={`${blockedCount} blocked`} color={ORANGE} />
      </div>

      {/* KPI Row 4 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard label="Overdue" value={String(overdueCount)} sub={`${tasksOverdue} overdue tasks`} color={ORANGE} />
        <KpiCard label="Pipeline Value" value={formatRm(pipelineValue)} sub={`across ${totalCount} projects`} color={NAVY} />
        <KpiCard label="Overdue Tasks" value={String(tasksOverdue)} sub="not done / cancelled" color={RED} />
      </div>

      {/* Charts 2x2 grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart data={stats?.projectsByHealth ?? {}} title="PROJECTS BY HEALTH" />
        <DonutChart data={stats?.portfolioByStatus ?? {}} title="PORTFOLIO BY STATUS" />
        <DonutChart data={stats?.tasksByStatus ?? {}} title={`TASKS BY STATUS (${tasksTotal})`} />
        <HorizontalBarChart
          data={(stats?.openTasksByOwner ?? []).map(o => ({ label: o.owner, value: o.count }))}
          title="OPEN TASKS BY OWNER"
          barColor="#f59e0b"
        />
      </div>

      {/* Top Projects by Progress */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">TOP PROJECTS BY PROGRESS</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
          {(stats?.topProjectsByProgress ?? []).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '180px', fontSize: '0.78rem', color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
              <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: SURFACE_2 }}>
                <div style={{ width: `${p.progress}%`, height: '100%', borderRadius: '4px', background: p.progress >= 100 ? GREEN : ORANGE }} />
              </div>
              <span style={{ width: '40px', fontSize: '0.78rem', fontWeight: 600, color: p.progress >= 100 ? GREEN : ORANGE, textAlign: 'right' }}>{p.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Slipping vs Go-Live */}
      {(stats?.slippingVsGoLive ?? []).length > 0 && (
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">SLIPPING VS GO-LIVE ({(stats?.slippingVsGoLive ?? []).length} LATE)</h3>
          <HorizontalBarChart
            data={(stats?.slippingVsGoLive ?? []).map(s => ({ label: s.name, value: s.daysLate }))}
            title=""
            barColor="#ef4444"
          />
        </div>
      )}

      {/* Project Health section */}
      <div style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: TEXT, marginBottom: '12px' }}>Project Health</h2>

        {/* Filter toolbar */}
        <div className="sd-chart-card" style={{ padding: '10px 16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: '0.78rem' }}>
            <option>All PMs</option>
          </select>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: '0.78rem' }}>
            <option>All Statuses</option>
          </select>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: '0.78rem' }}>
            <option>All Health</option>
          </select>
          <button style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: '0.78rem', cursor: 'pointer', marginLeft: 'auto' }}>
            Date Registered (Latest) ↕
          </button>
        </div>

        {/* Project cards grid */}
        <div className="grid gap-4 md:grid-cols-2" style={{ marginTop: '12px' }}>
          {projects.map((project) => {
            const healthColor = statusColor(project.overallHealth || project.status);
            const progress = project.tasks && project.tasks.length > 0
              ? Math.round((project.tasks.filter(t => t.status === 'done').length / project.tasks.length) * 100)
              : 0;
            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="sd-chart-card"
                style={{ cursor: 'pointer', padding: '16px', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: MUTED }}>{project.id}</span>
                  <span className="sd-chip" style={{ background: healthColor, color: '#fff', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px' }}>
                    {project.overallHealth || project.status || '—'}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color, margin: '0 0 8px', cursor: 'pointer' }}>{project.name}</h4>
                <div style={{ fontSize: '0.75rem', color: MUTED, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong style={{ color: TEXT }}>PM:</strong> {project.pm || '—'}</div>
                  <div><strong style={{ color: TEXT }}>Client:</strong> {project.client || '—'}</div>
                  <div><strong style={{ color: TEXT }}>Target:</strong> {project.targetEnd || 'TBD'}</div>
                  {project.valueRm != null && project.valueRm > 0 && (
                    <div><strong style={{ color: TEXT }}>Value:</strong> RM {project.valueRm.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
                  )}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: MUTED }}>Progress</span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: SURFACE_2 }}>
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: '3px', background: color }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ORANGE }}>{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
