import { useState } from 'react';
import { MOCK_RELEASES, type ReleaseItem } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const STATUS_COLORS: Record<string, string> = {
  deployed: '#10b981',
  pending: '#f59e0b',
  failed: '#ef4444',
  rolled_back: '#9ca3af',
};

interface Props {
  dept: string;
  color: string;
}

export function ReleasesTab({ dept, color }: Props) {
  const [releases] = useState(MOCK_RELEASES);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseItem | null>(null);
  const [envFilter, setEnvFilter] = useState<'all' | 'production' | 'staging'>('all');

  const filtered = releases.filter(r => envFilter === 'all' || r.environment === envFilter);

  return (
    <div className="sd-stack" style={{ gap: 12 }}>
      {/* Environment Filter */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'production', 'staging'] as const).map(env => (
          <button
            key={env}
            onClick={() => setEnvFilter(env)}
            style={{
              padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
              border: `1px solid ${envFilter === env ? color : BORDER}`,
              background: envFilter === env ? `${color}18` : 'transparent',
              color: envFilter === env ? color : MUTED,
              textTransform: 'capitalize',
            }}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Release Timeline */}
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: BORDER, borderRadius: 99 }} />

        {filtered.map((release, idx) => (
          <div
            key={`${release.version}-${idx}`}
            className="sd-card interactive"
            onClick={() => setSelectedRelease(release)}
            style={{
              marginBottom: 10, padding: '12px 16px',
              position: 'relative',
            }}
          >
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -19, top: 16,
              width: 12, height: 12, borderRadius: '50%',
              background: STATUS_COLORS[release.status],
              border: '2px solid var(--samurai-bg)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: TEXT }}>{release.version}</span>
                  <span style={{
                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99,
                    background: `${STATUS_COLORS[release.status]}20`,
                    color: STATUS_COLORS[release.status],
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {release.status.replace('_', ' ')}
                  </span>
                  <span style={{
                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99,
                    background: release.environment === 'production' ? '#3b82f620' : '#f59e0b20',
                    color: release.environment === 'production' ? '#3b82f6' : '#f59e0b',
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {release.environment}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: MUTED }}>
                  {release.date} · Deployed by {release.deployedBy} · {release.prCount} PRs
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="sd-btn sd-btn-primary">🏷️ Create Release</button>
        <button className="sd-btn sd-btn-secondary">📋 Generate Changelog</button>
        <button className="sd-btn sd-btn-ghost">📊 Deploy Frequency</button>
      </div>

      {/* Release Detail Modal */}
      {selectedRelease && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelectedRelease(null)}>
          <div className="sd-card" style={{ width: '90%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace', color: TEXT }}>{selectedRelease.version}</h3>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>{selectedRelease.date}</div>
              </div>
              <button className="sd-btn sd-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedRelease(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: '0.8rem' }}>
              <div><span style={{ color: MUTED }}>Environment:</span> <span style={{ color: TEXT, textTransform: 'capitalize' }}>{selectedRelease.environment}</span></div>
              <div><span style={{ color: MUTED }}>Status:</span> <span style={{ color: STATUS_COLORS[selectedRelease.status] }}>{selectedRelease.status.replace('_', ' ')}</span></div>
              <div><span style={{ color: MUTED }}>Deployed By:</span> <span style={{ color: TEXT }}>{selectedRelease.deployedBy}</span></div>
              <div><span style={{ color: MUTED }}>PRs Included:</span> <span style={{ color: TEXT }}>{selectedRelease.prCount}</span></div>
            </div>

            {/* Mock Changelog */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT, marginBottom: 8 }}>Changelog</div>
              <div style={{ fontSize: '0.75rem', color: MUTED, lineHeight: 1.6 }}>
                <div>✨ feat: JWT refresh token rotation</div>
                <div>✨ feat: Stripe subscription lifecycle</div>
                <div>🐛 fix: Payment webhook idempotency</div>
                <div>🐛 fix: Rate limiter Redis pool</div>
                <div>♻️ refactor: Extract validation middleware</div>
                <div>🔧 ci: E2E test matrix for auth</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedRelease.status === 'deployed' && selectedRelease.environment === 'production' && (
                <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}>⏪ Rollback</button>
              )}
              <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>📋 Copy Changelog</button>
              <button className="sd-btn sd-btn-ghost" style={{ fontSize: '0.75rem' }}>🔗 View on GitHub</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
