import { LineChart, BarChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function AnalyticsTab({ stats, color }: Props) {
  const KPIs = [
    { label: 'Total Leads', value: stats.totalLeads.toLocaleString() },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%` },
    { label: 'Cost Per Lead', value: `RM ${stats.costPerLead.toFixed(2)}` },
    { label: 'Marketing ROI', value: `${stats.marketingRoi}%` },
    { label: 'Organic Traffic', value: stats.organicTraffic.toLocaleString() },
    { label: 'Traffic Growth', value: `${stats.organicTrafficGrowth > 0 ? '+' : ''}${stats.organicTrafficGrowth}%` },
  ];

  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid">
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Spend vs Leads trend */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 2 }}>
          <h3 className="sd-chart-title">Spend vs Leads vs Conversions</h3>
          <p className="sd-chart-sub">Monthly marketing funnel performance</p>
          <LineChart
            data={stats.campaignSpendTrend}
            xKey="month"
            yKey="spend"
            dataKeys={['spend', 'leads', 'conversions']}
            labels={{ spend: 'Spend (RM)', leads: 'Leads', conversions: 'Conversions' }}
            color={color}
            height={280}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Channel CPA Comparison</h3>
          <p className="sd-chart-sub">Cost per acquisition by channel</p>
          <BarChart
            data={stats.byChannel}
            xKey="channel"
            yKey="cpa"
            color={color}
            unit="RM "
            height={280}
          />
        </div>
      </div>

      {/* CTR comparison */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Click-Through Rates</h3>
          <p className="sd-chart-sub">CTR by marketing channel</p>
          <BarChart
            data={stats.byChannel}
            xKey="channel"
            yKey="ctr"
            color={color}
            unit="%"
            height={220}
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Channel Spend Distribution</h3>
          <p className="sd-chart-sub">Budget allocation across channels</p>
          <BarChart
            data={stats.byChannel}
            xKey="channel"
            yKey="spend"
            color={color}
            unit="RM "
            height={220}
          />
        </div>
      </div>
    </div>
  );
}
