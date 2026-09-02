import { useState } from 'react';
import { LineChart, BarChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  paused: '#f59e0b',
  completed: '#6366f1',
  draft: '#94a3b8',
};

export function CampaignsTab({ stats, color }: Props) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? stats.topCampaigns
    : stats.topCampaigns.filter((c) => c.status.toLowerCase() === filter);

  return (
    <div className="sd-stack">
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'active', 'paused', 'completed', 'draft'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              fontSize: '0.78rem',
              cursor: 'pointer',
              border: `1px solid ${filter === f ? color : 'var(--samurai-border)'}`,
              background: filter === f ? `${color}20` : 'transparent',
              color: filter === f ? color : 'var(--samurai-muted)',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Spend trend chart */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 2 }}>
          <h3 className="sd-chart-title">Spend vs Conversions Trend</h3>
          <p className="sd-chart-sub">Monthly campaign performance</p>
          <LineChart
            data={stats.campaignSpendTrend}
            xKey="month"
            yKey="spend"
            dataKeys={['spend', 'conversions']}
            labels={{ spend: 'Spend (RM)', conversions: 'Conversions' }}
            color={color}
            height={250}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Spend by Status</h3>
          <p className="sd-chart-sub">Budget allocation</p>
          <BarChart
            data={stats.campaignsByStatus}
            xKey="status"
            yKey="spend"
            color={color}
            unit="RM "
            height={250}
          />
        </div>
      </div>

      {/* Campaign table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Campaign Performance</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th style={{ textAlign: 'right' }}>Impressions</th>
                <th style={{ textAlign: 'right' }}>Clicks</th>
                <th style={{ textAlign: 'right' }}>Conversions</th>
                <th style={{ textAlign: 'right' }}>ROI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.channel}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#fff',
                        background: STATUS_COLORS[c.status.toLowerCase()] || '#94a3b8',
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>RM {c.spend.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{c.impressions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{c.clicks.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{c.conversions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: c.roi >= 100 ? '#22c55e' : c.roi >= 0 ? color : '#ef4444' }}>
                    {c.roi}%
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', opacity: 0.5 }}>No campaigns match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
