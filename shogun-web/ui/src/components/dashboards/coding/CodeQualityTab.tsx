import { useState } from 'react';
import { QUALITY_METRICS, MOCK_DEV_METRICS } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

interface Props {
  dept: string;
  color: string;
}

export function CodeQualityTab({ dept, color }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (metric: typeof QUALITY_METRICS[0]) => {
    // For coverage/duplication, up is good. For smells/debt/vulns, down is good.
    const goodUp = ['Test Coverage', 'Duplication'];
    const isGood = goodUp.includes(metric.label) ? metric.trend === 'up' : metric.trend === 'down';
    if (metric.trend === 'flat') return MUTED;
    return isGood ? '#10b981' : '#ef4444';
  };

  const isAtTarget = (metric: typeof QUALITY_METRICS[0]) => {
    const goodUp = ['Test Coverage', 'Duplication'];
    if (goodUp.includes(metric.label)) return metric.value >= metric.target;
    return metric.value <= metric.target;
  };

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* Quality Gate Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        {QUALITY_METRICS.map(m => {
          const atTarget = isAtTarget(m);
          const pct = Math.min(100, Math.round((m.value / m.target) * 100));
          return (
            <div
              key={m.label}
              className="sd-card interactive"
              onClick={() => setSelectedMetric(selectedMetric === m.label ? null : m.label)}
              style={{
                padding: '14px 16px',
                borderColor: selectedMetric === m.label ? color : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.72rem', color: MUTED }}>{m.label}</span>
                <span style={{ fontSize: '0.72rem', color: getTrendColor(m), fontWeight: 600 }}>
                  {getTrendIcon(m.trend)}
                </span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: TEXT }}>
                {m.value}{m.unit}
              </div>
              <div style={{ fontSize: '0.65rem', color: atTarget ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                Target: {m.target}{m.unit} {atTarget ? '✓' : '⚠'}
              </div>
              {/* Mini progress bar */}
              <div style={{ height: 3, background: 'var(--samurai-surface-2)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: atTarget ? '#10b981' : '#f59e0b',
                  transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Detail for Selected Metric */}
      {selectedMetric && (() => {
        const m = QUALITY_METRICS.find(q => q.label === selectedMetric);
        if (!m) return null;
        return (
          <div className="sd-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: TEXT }}>{m.label} — Detail</h4>
            <p style={{ fontSize: '0.78rem', color: MUTED, margin: '0 0 12px' }}>
              Current: {m.value}{m.unit} · Target: {m.target}{m.unit} · Trend: {m.trend}
            </p>
            {m.label === 'Test Coverage' && (
              <div style={{ fontSize: '0.78rem', color: TEXT }}>
                <div style={{ marginBottom: 6 }}>📁 Coverage by module:</div>
                {[
                  { mod: 'auth/', cov: 92 },
                  { mod: 'payments/', cov: 87 },
                  { mod: 'api/', cov: 81 },
                  { mod: 'utils/', cov: 78 },
                  { mod: 'middleware/', cov: 71 },
                ].map(item => (
                  <div key={item.mod} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 100, fontFamily: 'monospace', fontSize: '0.72rem' }}>{item.mod}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--samurai-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.cov}%`, background: item.cov >= 80 ? '#10b981' : '#f59e0b', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: MUTED, width: 30, textAlign: 'right' }}>{item.cov}%</span>
                  </div>
                ))}
              </div>
            )}
            {m.label === 'Code Smells' && (
              <div style={{ fontSize: '0.78rem', color: TEXT }}>
                <div style={{ marginBottom: 6 }}>🔍 Top offenders:</div>
                {[
                  { file: 'src/payments/stripe.ts', issue: 'Function too long (85 lines)' },
                  { file: 'src/auth/jwt.ts', issue: 'Duplicate code block' },
                  { file: 'src/api/middleware.ts', issue: 'Unused parameter' },
                ].map(item => (
                  <div key={item.file} style={{ padding: '4px 0', borderBottom: `1px solid ${BORDER}`, fontSize: '0.75rem' }}>
                    <span style={{ fontFamily: 'monospace', color }}>{item.file}</span>{' '}
                    <span style={{ color: MUTED }}>— {item.issue}</span>
                  </div>
                ))}
              </div>
            )}
            {m.label !== 'Test Coverage' && m.label !== 'Code Smells' && (
              <p style={{ fontSize: '0.75rem', color: MUTED }}>Click other metrics to see detailed breakdowns.</p>
            )}
          </div>
        );
      })()}

      {/* Coverage Delta by Developer */}
      <div className="sd-card" style={{ padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: TEXT }}>Coverage Impact by Developer (This Sprint)</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK_DEV_METRICS.map(dev => (
            <div key={dev.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ width: 60, fontSize: '0.78rem', color: TEXT, fontWeight: 600 }}>{dev.name}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--samurai-surface-2)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: BORDER,
                }} />
                <div style={{
                  position: 'absolute',
                  left: dev.coverageDelta >= 0 ? '50%' : `${50 + dev.coverageDelta * 10}%`,
                  width: `${Math.abs(dev.coverageDelta) * 10}%`,
                  height: '100%',
                  background: dev.coverageDelta >= 0 ? '#10b981' : '#ef4444',
                  borderRadius: 99,
                }} />
              </div>
              <span style={{
                width: 50, textAlign: 'right', fontSize: '0.72rem', fontWeight: 600,
                color: dev.coverageDelta >= 0 ? '#10b981' : '#ef4444',
              }}>
                {dev.coverageDelta > 0 ? '+' : ''}{dev.coverageDelta}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
