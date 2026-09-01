import { BarChart, LineChart } from '../charts';
import type { CeoDashboardStats } from '../../../lib/types';
import { CrmIcon } from './CrmIcons';

interface Props { stats: CeoDashboardStats; color: string }

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const WARN = 'var(--samurai-warn, #f59e0b)';

// Distinct colors for each manager in stacked bar
const MANAGER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function PipelineForecastTab({ stats, color }: Props) {
  const KPIs = [
    {
      label: 'Weighted Pipeline',
      value: `RM ${(stats.weightedPipelineValue / 1_000_000).toFixed(1)}M`,
      detail: `Total pipeline: RM ${(stats.totalPipelineValue / 1_000_000).toFixed(1)}M`,
    },
    {
      label: 'Pipeline Coverage',
      value: `${stats.pipelineCoverage}×`,
      detail: stats.pipelineCoverage >= 3 ? 'Above 3× benchmark' : 'Below 3× benchmark',
    },
    {
      label: 'Win Rate (YTD)',
      value: `${stats.winRate}%`,
      detail: 'Industry avg: 20-30%',
    },
    {
      label: 'Active Deals',
      value: stats.totalActiveDeals.toString(),
      detail: `${stats.hotDeals} hot · ${stats.warmDeals} warm · ${stats.coldDeals} cold`,
    },
  ];

  // Pipeline by stage chart data
  const stageData = stats.byStage
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);

  // Monthly forecast vs actual (combine byMonth and wonByMonth)
  const allMonths = new Set([
    ...stats.byMonth.map(m => m.month),
    ...stats.wonByMonth.map(m => m.month),
  ]);
  const forecastVsActual = Array.from(allMonths)
    .sort()
    .map(month => {
      const forecast = stats.byMonth.find(m => m.month === month)?.value || 0;
      const actual = stats.wonByMonth.find(m => m.month === month)?.value || 0;
      return { month, forecast, actual };
    });

  // Calculate gap
  const totalForecast = stats.byMonth.reduce((sum, m) => sum + m.value, 0);
  const totalActual = stats.wonByMonth.reduce((sum, m) => sum + m.value, 0);
  const gap = totalForecast - totalActual;

  // $$ to close by period — build per-manager breakdown for stacked bars
  const periods = ['This Month', 'This Quarter', 'Next Quarter', 'This Year'] as const;
  const managerKeys = [...new Set(stats.byManager.filter(m => m.deals > 0).map(m => m.owner))];
  
  const periodData = periods.map(period => {
    const row: Record<string, string | number> = { period };
    let total = 0;
    for (const mgr of managerKeys) {
      const m = stats.byManager.find(bm => bm.owner === mgr);
      let val = 0;
      if (period === 'This Month') val = m?.closeThisMonth || 0;
      else if (period === 'This Quarter') val = m?.closeThisQ || 0;
      else if (period === 'Next Quarter') val = m?.closeNextQ || 0;
      else if (period === 'This Year') val = m?.closeThisYear || 0;
      row[mgr] = val;
      total += val;
    }
    row['total'] = total;
    return row;
  }).sort((a, b) => (b.total as number) - (a.total as number));

  // At-risk deals (top 5 by value, daysInStage > 30)
  const atRiskDeals = stats.topDeals
    .filter(d => d.daysInStage > 30)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 6 }}>
              {kpi.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Pipeline by Stage</h3>
          <p className="sd-chart-sub">Click bar to filter</p>
          <BarChart
            data={stageData}
            xKey="stage"
            yKey="value"
            color={color}
            unit="RM "
            height={240}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Orderbook Forecast</h3>
          <p className="sd-chart-sub">Pipeline forecast vs actual closed value</p>
          <LineChart
            data={forecastVsActual}
            xKey="month"
            yKey="forecast"
            dataKeys={['forecast', 'actual']}
            labels={{ forecast: 'Forecast', actual: 'Actual Closed' }}
            colors={[color, '#10b981']}
            unit="RM "
            height={240}
          />
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 8, textAlign: 'center' }}>
            Gap: RM {(gap / 1_000_000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">$$ to Close by Period</h3>
          <p className="sd-chart-sub">Stacked by sales manager</p>
          <BarChart
            data={periodData}
            xKey="period"
            yKey="total"
            dataKeys={managerKeys}
            colors={MANAGER_COLORS.slice(0, managerKeys.length)}
            labels={Object.fromEntries(managerKeys.map(k => [k, k]))}
            stacked
            unit="RM "
            height={260}
          />
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
            {managerKeys.map((mgr, i) => (
              <div key={mgr} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: TEXT }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: MANAGER_COLORS[i % MANAGER_COLORS.length] }} />
                {mgr}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Breakdown Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          At-Risk Breakdown by Sales Manager
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Manager</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>At-Risk Deals</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>At-Risk Value</th>
              </tr>
            </thead>
            <tbody>
              {stats.atRiskByManager
                .sort((a, b) => b.atRiskValue - a.atRiskValue)
                .map((manager) => (
                  <tr key={manager.owner} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                      {manager.owner}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {manager.atRiskDeals}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      RM {manager.atRiskValue >= 1_000_000
                        ? `${(manager.atRiskValue / 1_000_000).toFixed(1)}M`
                        : `${(manager.atRiskValue / 1000).toFixed(0)}K`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Deals List */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          At-Risk Deals
        </h3>
        {atRiskDeals.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
            No deals stalled &gt;30 days
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atRiskDeals.map((deal) => (
              <div key={deal.slug} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: 6,
                border: `1px solid ${WARN}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>
                    {deal.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: MUTED }}>
                    {deal.owner ? deal.owner.substring(0, 3).toUpperCase() : 'N/A'} · {deal.daysInStage}d stalled
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
                    RM {deal.amount >= 1_000_000
                      ? `${(deal.amount / 1_000_000).toFixed(1)}M`
                      : `${(deal.amount / 1000).toFixed(0)}K`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
