import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function SocialMediaTab({ stats, color }: Props) {
  return (
    <div className="sd-stack">
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.7 }}>Channel status · No automation connected</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {stats.socialChannels.map((ch, i) => (
          <div key={i} className="sd-chart-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{ch.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{ch.platform}</div>
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 600,
              background: ch.status === 'automated' ? '#22c55e20' : '#ef444420',
              color: ch.status === 'automated' ? '#22c55e' : '#ef4444',
            }}>
              {ch.status === 'automated' ? 'Automated' : 'Not automated'}
            </span>
            {ch.followers !== undefined && (
              <div style={{ marginTop: 8, fontSize: '0.8rem', opacity: 0.6 }}>
                {ch.followers.toLocaleString()} followers
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sd-chart-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Next step</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{stats.socialNextStep}</div>
      </div>
    </div>
  );
}
