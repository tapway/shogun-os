import { BarChart } from '../charts';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function SocialMediaTab({ stats, color }: Props) {
  const sm = stats.socialMetrics;

  const KPIs = [
    { label: 'Total Followers', value: sm.followers.toLocaleString() },
    { label: 'Engagement Rate', value: `${sm.engagementRate}%` },
    { label: 'Posts MTD', value: sm.postsMtd.toString() },
    { label: 'Viral Posts', value: sm.viralPosts.toString() },
  ];

  // Filter social channels from byChannel
  const socialChannels = stats.byChannel.filter((c) =>
    ['facebook', 'instagram', 'linkedin', 'tiktok'].includes(c.channel.toLowerCase())
  );

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
          <h3 className="sd-chart-title">Social Channel Impressions</h3>
          <p className="sd-chart-sub">Reach across platforms</p>
          <BarChart
            data={socialChannels}
            xKey="channel"
            yKey="impressions"
            color={color}
            height={250}
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Social Channel Engagement</h3>
          <p className="sd-chart-sub">Clicks & conversions by platform</p>
          <BarChart
            data={socialChannels}
            xKey="channel"
            yKey="clicks"
            dataKeys={['clicks', 'conversions']}
            labels={{ clicks: 'Clicks', conversions: 'Conversions' }}
            color={color}
            height={250}
          />
        </div>
      </div>

      {/* Channel detail table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Social Platform Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th style={{ textAlign: 'right' }}>Impressions</th>
                <th style={{ textAlign: 'right' }}>Clicks</th>
                <th style={{ textAlign: 'right' }}>CTR</th>
                <th style={{ textAlign: 'right' }}>Conversions</th>
                <th style={{ textAlign: 'right' }}>CPA</th>
              </tr>
            </thead>
            <tbody>
              {socialChannels.map((ch, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{ch.channel}</td>
                  <td style={{ textAlign: 'right' }}>RM {ch.spend.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{ch.impressions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{ch.clicks.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{ch.ctr}%</td>
                  <td style={{ textAlign: 'right' }}>{ch.conversions.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>RM {ch.cpa.toFixed(2)}</td>
                </tr>
              ))}
              {socialChannels.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', opacity: 0.5 }}>No social channel data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
