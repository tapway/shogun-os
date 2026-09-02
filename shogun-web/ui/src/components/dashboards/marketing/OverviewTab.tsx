import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, LineChart, PieChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function OverviewTab({ stats, color }: Props) {
  const KPIs = [
    { label: 'Active Campaigns', value: `${stats.activeCampaigns} / ${stats.totalCampaigns}` },
    { label: 'Leads MTD', value: stats.leadsMTD.toLocaleString() },
    { label: 'Leads QTD', value: stats.leadsQTD.toLocaleString() },
    { label: 'Cost Per Lead', value: `RM ${stats.costPerLead.toFixed(2)}` },
    { label: 'Marketing ROI', value: `${stats.marketingRoi}%` },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%` },
    { label: 'Spend MTD', value: `RM ${(stats.totalSpendMTD / 1000).toFixed(1)}K` },
    { label: 'Spend YTD', value: `RM ${(stats.totalSpendYTD / 1000).toFixed(0)}K` },
  ];

  const statusPieData = stats.campaignsByStatus.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }));

  return (
    <div className="sd-stack">
      {/* Risk Alerts */}
      {stats.riskAlerts.length > 0 && (
        <div className="sd-stack" style={{ gap: 6 }}>
          {stats.riskAlerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                alert.level === 'critical'
                  ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{alert.message}</span>
              {alert.campaign && <span className="opacity-70">({alert.campaign})</span>}
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="sd-kpi-grid">
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Campaign Spend Trend</h3>
          <p className="sd-chart-sub">Monthly spend vs leads generated</p>
          <LineChart
            data={stats.campaignSpendTrend}
            xKey="month"
            yKey="spend"
            dataKeys={['spend', 'leads']}
            labels={{ spend: 'Spend (RM)', leads: 'Leads' }}
            color={color}
            height={220}
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Campaigns by Status</h3>
          <p className="sd-chart-sub">Current campaign distribution</p>
          <PieChart data={statusPieData} color={color} height={220} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Channel Performance</h3>
          <p className="sd-chart-sub">Conversions by marketing channel</p>
          <BarChart
            data={stats.byChannel}
            xKey="channel"
            yKey="conversions"
            color={color}
            height={220}
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Top Campaigns by ROI</h3>
          <p className="sd-chart-sub">Highest returning campaigns</p>
          <BarChart
            data={stats.topCampaigns.slice(0, 6)}
            xKey="name"
            yKey="roi"
            color={color}
            unit="%"
            height={220}
          />
        </div>
      </div>
    </div>
  );
}
