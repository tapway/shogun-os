import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  live: { bg: '#22c55e20', text: '#22c55e' },
  new: { bg: '#6366f120', text: '#6366f1' },
  broken: { bg: '#ef444420', text: '#ef4444' },
  pending: { bg: '#f59e0b20', text: '#f59e0b' },
  not_connected: { bg: '#94a3b820', text: '#94a3b8' },
};

export function SummaryTab({ stats }: Props) {
  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid">
        {stats.summaryKpis.map((kpi, i) => {
          const style = STATUS_STYLES[kpi.status] || STATUS_STYLES.pending;
          return (
            <div key={i} className="sd-kpi-card" style={{ position: 'relative' }}>
              <div className="sd-kpi-label">{kpi.label}</div>
              <div className="sd-kpi-value">{kpi.value}</div>
              {kpi.subtext && (
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2 }}>{kpi.subtext}</div>
              )}
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: style.bg,
                  color: style.text,
                  textTransform: 'uppercase',
                }}
              >
                {kpi.status.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
