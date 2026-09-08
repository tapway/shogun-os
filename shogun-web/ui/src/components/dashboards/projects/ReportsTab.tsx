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
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';
const SUCCESS = 'var(--samurai-success)';

// Color constants matching the design
const NAVY = '#1e3a5f';
const TEAL = '#0d9488';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const BLUE = '#3b82f6';

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function KpiCard({ label, value, color = NAVY }: KpiCardProps) {
  return (
    <div className="sd-kpi-card">
      <div className="sd-kpi-label">{label}</div>
      <div className="sd-kpi-value" style={{ color }}>{value}</div>
    </div>
  );
}

interface UatComplianceRow {
  project: string;
  readiness: string | null;
  items: number;
  status: string;
  flags: string[];
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

  const { totals, uatReadiness, uatCompliance } = query.data;

  const thStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 500,
    color: MUTED,
    padding: '12px 16px',
    textAlign: 'left',
  };

  return (
    <div className="sd-stack">
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>Reports & Analytics</h2>
        <p style={{ fontSize: '0.85rem', color: MUTED, margin: 0 }}>Executive overview — portfolio, delivery, support</p>
      </div>

      {/* KPI Grid - Row 1 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
        <KpiCard label="Active Projects" value={totals.activeProjects} color={NAVY} />
        <KpiCard label="Pipeline Value" value={totals.pipelineValue} color={TEAL} />
        <KpiCard label="At Risk" value={totals.atRisk} color={AMBER} />
      </div>

      {/* KPI Grid - Row 2 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
        <KpiCard label="Blocked" value={totals.blocked} color={RED} />
        <KpiCard label="Overdue Projects" value={totals.overdueProjects} color={RED} />
        <KpiCard label="Overdue Tasks" value={totals.overdueTasks} color={AMBER} />
      </div>

      {/* KPI Grid - Row 3 */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>
        <KpiCard label="Open Tickets" value={totals.openTickets} color={BLUE} />
        <KpiCard label="SLA Breached" value={totals.slaBreached} color={RED} />
      </div>

      {/* UAT Readiness Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: TEXT, margin: '0 0 16px' }}>UAT Readiness</h3>
        <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KpiCard label="UAT Readiness (Avg)" value={`${uatReadiness.avgPercent}%`} color={AMBER} />
          <KpiCard label="UAT Prepared" value={`${uatReadiness.prepared}/${totals.activeProjects}`} color={NAVY} />
          <KpiCard label="Non-Compliant" value={uatReadiness.nonCompliant} color={RED} />
          <KpiCard label="Unrealistic Threshold" value={uatReadiness.unrealisticThreshold} color={RED} />
        </div>
      </div>

      {/* UAT Smart Compliance Table */}
      <div className="sd-chart-card" style={{ background: SURFACE, padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT, margin: 0 }}>UAT Smart Compliance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE }}>
                <th style={thStyle}>Project</th>
                <th style={thStyle}>Readiness</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {(uatCompliance || []).map((row: UatComplianceRow, i: number) => (
                <tr
                  key={row.project}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: i % 2 === 1 ? 'var(--samurai-surface-2)' : undefined,
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: TEXT, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.project}
                  </td>
                  <td style={{ padding: '12px 16px', color: MUTED }}>
                    {row.readiness ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: MUTED, textAlign: 'center' }}>
                    {row.items}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '10px',
                      background: row.status === 'prepared' ? '#dcfce7' : '#fee2e2',
                      color: row.status === 'prepared' ? SUCCESS : DANGER,
                    }}>
                      {row.status === 'prepared' ? 'prepared' : 'not prepared'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {(row.flags || []).map((flag, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#fce7f3',
                          color: '#db2777',
                          fontFamily: 'monospace',
                          marginRight: idx > 0 ? '6px' : '0',
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
