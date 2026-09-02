import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  stable: '#94a3b8',
};

export function SEOTab({ stats, color }: Props) {
  const KPIs = [
    { label: 'Organic Traffic', value: stats.organicTraffic.toLocaleString() },
    { label: 'Traffic Growth', value: `${stats.organicTrafficGrowth > 0 ? '+' : ''}${stats.organicTrafficGrowth}%` },
    { label: 'Backlinks', value: stats.backlinks.toLocaleString() },
    { label: 'Domain Authority', value: stats.domainAuthority.toString() },
    { label: 'Tracked Keywords', value: stats.keywordRankings.length.toString() },
    { label: 'Top 10 Keywords', value: stats.keywordRankings.filter((k) => k.position <= 10).length.toString() },
  ];

  // Build a simple trend chart from keyword positions (top 10 keywords by volume)
  const topKeywords = [...stats.keywordRankings]
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 10);

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

      {/* Organic traffic trend (reuse campaign spend trend as proxy for organic growth) */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 2 }}>
          <h3 className="sd-chart-title">Lead Generation Trend</h3>
          <p className="sd-chart-sub">Monthly leads from all channels (proxy for organic growth)</p>
          <LineChart
            data={stats.campaignSpendTrend}
            xKey="month"
            yKey="leads"
            color={color}
            height={250}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Keyword Position Distribution</h3>
          <p className="sd-chart-sub">Top tracked keywords by search volume</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto' }}>
            {topKeywords.map((kw, i) => {
              const Icon = TREND_ICONS[kw.trend];
              return (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--samurai-border)' }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{kw.keyword}</span>
                  <span style={{ opacity: 0.6, fontSize: '0.75rem', marginRight: 8 }}>Vol: {kw.searchVolume.toLocaleString()}</span>
                  <span
                    className="flex items-center gap-1"
                    style={{
                      fontWeight: 700,
                      color: kw.position <= 3 ? '#22c55e' : kw.position <= 10 ? color : 'var(--samurai-muted)',
                      minWidth: 40,
                      justifyContent: 'flex-end',
                    }}
                  >
                    #{kw.position}
                    <Icon className="h-3 w-3" style={{ color: TREND_COLORS[kw.trend] }} />
                  </span>
                </div>
              );
            })}
            {topKeywords.length === 0 && (
              <p style={{ textAlign: 'center', opacity: 0.5, padding: 20 }}>No keyword data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Full keyword table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">All Tracked Keywords</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th style={{ textAlign: 'right' }}>Position</th>
                <th style={{ textAlign: 'right' }}>Search Volume</th>
                <th style={{ textAlign: 'right' }}>Difficulty</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {stats.keywordRankings.map((kw, i) => {
                const Icon = TREND_ICONS[kw.trend];
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{kw.keyword}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: kw.position <= 3 ? '#22c55e' : kw.position <= 10 ? color : undefined }}>
                      #{kw.position}
                    </td>
                    <td style={{ textAlign: 'right' }}>{kw.searchVolume.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          background: kw.difficulty > 70 ? '#ef444420' : kw.difficulty > 40 ? '#f59e0b20' : '#22c55e20',
                          color: kw.difficulty > 70 ? '#ef4444' : kw.difficulty > 40 ? '#f59e0b' : '#22c55e',
                        }}
                      >
                        {kw.difficulty}
                      </span>
                    </td>
                    <td>
                      <Icon className="h-4 w-4" style={{ color: TREND_COLORS[kw.trend] }} />
                    </td>
                  </tr>
                );
              })}
              {stats.keywordRankings.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>No keyword tracking data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
