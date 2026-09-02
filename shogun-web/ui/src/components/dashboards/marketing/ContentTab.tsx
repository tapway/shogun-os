import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function ContentTab({ stats, color }: Props) {
  return (
    <div className="sd-stack">
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.7 }}>Content assets · Nothing produced yet</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {stats.contentAssets.map((asset, i) => (
          <div key={i} className="sd-chart-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: asset.count > 0 ? color : 'var(--samurai-muted)', marginBottom: 4 }}>
              {asset.count}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{asset.type}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{asset.note}</div>
          </div>
        ))}
      </div>

      <div className="sd-chart-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Next step</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{stats.contentNextStep}</div>
      </div>
    </div>
  );
}
