import { BarChart, PieChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function ContentTab({ stats, color }: Props) {
  const KPIs = [
    { label: 'Total Published', value: stats.contentPublished.toLocaleString() },
    { label: 'Blog Posts', value: stats.contentByType.find((c) => c.type === 'blog')?.count.toString() || '0' },
    { label: 'Videos', value: stats.contentByType.find((c) => c.type === 'video')?.count.toString() || '0' },
    { label: 'Case Studies', value: stats.contentByType.find((c) => c.type === 'case_study')?.count.toString() || '0' },
  ];

  const typePieData = stats.contentByType.map((c) => ({
    name: c.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: c.count,
  }));

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

      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Content by Type</h3>
          <p className="sd-chart-sub">Distribution across formats</p>
          <PieChart data={typePieData} color={color} height={250} />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Views by Content Type</h3>
          <p className="sd-chart-sub">Engagement across formats</p>
          <BarChart
            data={stats.contentByType}
            xKey="type"
            yKey="views"
            color={color}
            height={250}
          />
        </div>
      </div>

      {/* Top content table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Top Performing Content</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Published</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th style={{ textAlign: 'right' }}>Shares</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
              </tr>
            </thead>
            <tbody>
              {stats.topContent.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{c.title}</td>
                  <td>{c.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</td>
                  <td>{c.publishedAt}</td>
                  <td style={{ textAlign: 'right' }}>{c.views.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{c.shares.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.leadsGenerated}</td>
                </tr>
              ))}
              {stats.topContent.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>No content data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
