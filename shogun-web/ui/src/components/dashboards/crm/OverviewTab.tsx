import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import type { CeoDashboardStats } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  stats: CeoDashboardStats;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

export function OverviewTab({ dept, color, stats }: Props) {
  // Fetch recent deals for the mini-list
  const dealsQuery = useQuery({
    queryKey: ['crm-deals-overview', dept],
    queryFn: () => departmentsApi.crmDealsList(dept),
    refetchInterval: 120_000,
  });

  const recentDeals = (dealsQuery.data?.deals ?? []).slice(0, 8);

  const KPIs = [
    { label: 'Sales MTD', value: `RM ${(stats.salesMTD / 1000).toFixed(0)}K` },
    { label: 'Sales QTD', value: `RM ${(stats.salesQTD / 1000).toFixed(0)}K` },
    { label: 'Sales YTD', value: `RM ${(stats.salesYTD / 1000).toFixed(0)}K` },
    { label: 'Win Rate', value: `${stats.winRate}%` },
    { label: 'Avg Deal', value: `RM ${(stats.avgDealSize / 1000).toFixed(0)}K` },
    { label: 'Active Deals', value: stats.totalActiveDeals.toString() },
    { label: 'Pipeline', value: `RM ${(stats.totalPipelineValue / 1000).toFixed(0)}K` },
    { label: 'Hot Deals', value: stats.hotDeals.toString() },
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

      {/* Recent deals mini-list */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Recent Deals</h3>
        <p className="sd-chart-sub">Latest deals from gbrain (live)</p>
        {dealsQuery.isLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div className="h-6 w-6 animate-spin rounded-full mx-auto" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
          </div>
        ) : recentDeals.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>No deals in gbrain yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Deal</Th>
                  <Th align="left">Customer</Th>
                  <Th align="left">Owner</Th>
                  <Th align="left">Stage</Th>
                  <Th align="center">Priority</Th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((deal, i) => (
                  <tr key={deal.slug} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 1 ? SURFACE_2 : undefined }}>
                    <td className="px-3 py-2.5 max-w-[200px] truncate" style={{ fontWeight: 600, color: TEXT }} title={deal.title}>
                      {deal.title}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{deal.customer || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{deal.owner || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="sd-chip muted">{deal.stage || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {deal.priority === 'Hot' ? (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: DANGER }} title="Hot" />
                      ) : deal.priority === 'Warm' ? (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: WARNING }} title="Warm" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: MUTED }} title="Cold" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
