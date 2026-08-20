import { useState } from 'react';
import { PieChart } from '../charts';
import { FinanceDetailModal } from './FinanceDetailModal';
import type { ClientConcentrationItem, FinanceDashboardStats } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmtMyr = (n: number) =>
  n >= 1_000_000 ? `RM ${(n / 1_000_000).toFixed(2)}M` : `RM ${(n / 1_000).toFixed(0)}K`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

const DONUT_COLORS = [
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

export function MarginsConcentrationTab({ stats, color }: Props) {
  const ue = stats.unitEconomics;
  const [activeClient, setActiveClient] = useState<ClientConcentrationItem | null>(null);

  const pieData = stats.clientConcentration.slice(0, 5).map((c, i) => ({
    name: c.name,
    value: c.revenue_pct,
  }));

  const ueCards = [
    { label: 'Gross Margin', value: `${(ue.gross_margin_pct || 0).toFixed(1)}%`, popout: 'Gross Margin = (Revenue − COGS) / Revenue × 100' },
    { label: 'Contribution Margin', value: `${(ue.contribution_margin_pct || 0).toFixed(1)}%`, popout: 'Contribution Margin = (Revenue − Variable Costs) / Revenue × 100' },
    { label: 'CAC', value: ue.cac > 0 ? fmtMyr(ue.cac) : '—', popout: 'Customer Acquisition Cost — total sales & marketing spend / new customers' },
    { label: 'LTV', value: ue.ltv > 0 ? fmtMyr(ue.ltv) : '—', popout: 'Customer Lifetime Value — average revenue per customer × gross margin × retention period' },
    { label: 'LTV/CAC', value: ue.ltv_cac_ratio > 0 ? `${(ue.ltv_cac_ratio || 0).toFixed(1)}x` : '—', popout: 'LTV/CAC ratio — healthy > 3x means sustainable growth' },
    { label: 'EBITDA Margin', value: `${(stats.ebitdaMargin || 0).toFixed(1)}%`, popout: 'EBITDA Margin = EBITDA / Revenue × 100' },
  ];

  return (
    <div className="sd-stack">
      {/* Unit Economics — clickable cards */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Unit Economics &amp; Margins</h3>
        <p className="sd-chart-sub">Click any card for definition and calculation</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {ueCards.map((m) => (
            <div
              key={m.label}
              style={{
                borderRadius: '0.5rem',
                background: SURFACE_2,
                padding: '0.75rem',
                cursor: 'pointer',
                border: `1px solid transparent`,
                transition: 'border-color 0.15s',
              }}
              onClick={() => {
                // Simple inline alert — could be a modal but definition is short
                window.alert(m.popout);
              }}
            >
              <div style={{ fontSize: '0.72rem', color: MUTED }}>{m.label}</div>
              <div style={{ marginTop: '0.2rem', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: TEXT }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Concentration Donut + Detail */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Revenue Concentration</h3>
          <p className="sd-chart-sub">Top 5 clients by YTD revenue — click segment for detail</p>
          {pieData.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: MUTED }}>No concentration data available yet.</p>
          ) : (
            <PieChart data={pieData} colors={DONUT_COLORS} height={250} />
          )}
        </div>

        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Client Detail</h3>
          <p className="sd-chart-sub">Click row for client breakdown — warn &gt; 20%</p>
          {stats.clientConcentration.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: MUTED }}>No concentration data available yet.</p>
          ) : (
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              {stats.clientConcentration.slice(0, 6).map((client) => (
                <button
                  key={client.name}
                  type="button"
                  onClick={() => setActiveClient(client)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, fontSize: '0.75rem', fontWeight: 500, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                    {client.name}
                  </div>
                  <div style={{ height: '0.5rem', width: '4rem', borderRadius: 999, overflow: 'hidden', background: SURFACE_2 }}>
                    <div style={{ height: '100%', borderRadius: 999, background: client.revenue_pct > 20 ? 'var(--samurai-danger)' : 'var(--samurai-ok)', width: `${Math.min(client.revenue_pct, 100)}%` }} />
                  </div>
                  <div style={{ width: '3rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: client.revenue_pct > 20 ? 'var(--samurai-danger)' : TEXT }}>
                    {(client.revenue_pct || 0).toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popout: client detail */}
      {activeClient && (
        <FinanceDetailModal
          title={activeClient.name}
          subtitle="Revenue Concentration Detail"
          onClose={() => setActiveClient(null)}
          maxWidth="32rem"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>YTD Revenue</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT, fontSize: '1.1rem' }}>{fmtMyr(activeClient.revenue_ytd)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Revenue Share</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: activeClient.revenue_pct > 20 ? 'var(--samurai-danger)' : TEXT, fontSize: '1.1rem' }}>
                {(activeClient.revenue_pct || 0).toFixed(1)}%
              </div>
            </div>
          </div>
          {activeClient.revenue_pct > 20 && (
            <div style={{ borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: `1px solid var(--samurai-danger)`, padding: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--samurai-danger)' }}>⚠ Concentration Risk</div>
              <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
                This client exceeds 20% of total revenue — single-customer exposure risk. Consider diversification strategy.
              </div>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
            <p style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.6rem' }}>Actions (sends to Koku — Finance Agent):</p>
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              {['Review Contract Terms', 'Plan Account Expansion', 'Identify Diversification Targets'].map((action) => (
                <button key={action} type="button" onClick={() => setActiveClient(null)} className="sd-btn sd-btn-secondary" style={{ justifyContent: 'flex-start', fontWeight: 500 }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        </FinanceDetailModal>
      )}
    </div>
  );
}
