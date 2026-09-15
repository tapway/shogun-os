import { useState } from 'react';
import { LineChart } from '../charts';
import { MOCK_COMPETITORS, PLATFORM_COLORS } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

type SubTab = 'price' | 'share' | 'sentiment' | 'opportunities' | 'decisions';

export function CompetitorWatchTab() {
  const [sub, setSub] = useState<SubTab>('price');

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'price', label: 'Price Position' },
    { id: 'share', label: 'Market Share Trend' },
    { id: 'sentiment', label: 'Sentiment' },
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'decisions', label: '🤖 AI Decisions' },
  ];

  const gapColor = (status: string) => status === 'above' ? DANGER : status === 'below' ? OK : TEXT;

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            style={{ padding: '6px 16px', borderRadius: 999, border: `1px solid ${BORDER}`, background: sub === t.id ? LIME : 'transparent', color: sub === t.id ? '#0a0a0a' : TEXT, fontWeight: sub === t.id ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* PRICE POSITION */}
      {sub === 'price' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Your Price vs Market Average</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Product</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Your Price</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Market Avg</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Diff</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Position</th>
              </tr></thead>
              <tbody>
                {MOCK_COMPETITORS.pricePosition.map((p, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }} onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', color: TEXT }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', color: PLATFORM_COLORS[p.platform] || TEXT, fontWeight: 500 }}>{p.platform}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT, fontWeight: 600 }}>RM {p.yourPrice}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED }}>RM {p.marketAvg}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: gapColor(p.status), fontWeight: 600 }}>{p.diff > 0 ? '+' : ''}{p.diff.toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: `${gapColor(p.status)}22`, color: gapColor(p.status) }}>
                        {p.status === 'above' ? 'ABOVE' : p.status === 'below' ? 'BELOW' : 'ON PAR'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MARKET SHARE TREND */}
      {sub === 'share' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Market Share Trend by Platform (%)</h3>
          <LineChart
            data={MOCK_COMPETITORS.marketShareTrend}
            xKey="month"
            yKey="shopee"
            dataKeys={['shopee', 'lazada', 'tiktok', 'website']}
            labels={{ shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok Shop', website: 'Website' }}
            colors={['#ee4d2d', '#0f146d', '#000000', '#2563eb']}
            unit="%"
            height={280}
          />
        </div>
      )}

      {/* SENTIMENT */}
      {sub === 'sentiment' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {MOCK_COMPETITORS.sentiment.map(s => (
              <div key={s.platform} className="sd-kpi-card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: PLATFORM_COLORS[s.platform] || MUTED, textTransform: 'uppercase' }}>{s.platform}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.yourRating >= s.competitorAvg ? OK : WARNING, marginTop: 6 }}>⭐ {s.yourRating}</div>
                <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>vs competitor avg {s.competitorAvg}</div>
                <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 2 }}>{s.reviews.toLocaleString()} reviews</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* OPPORTUNITIES */}
      {sub === 'opportunities' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Competitor Opportunity Feed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_COMPETITORS.opportunities.map((o, i) => (
              <div key={i} style={{ padding: '12px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                   onMouseEnter={e => e.currentTarget.style.borderColor = LIME} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                <span style={{ fontSize: '1.2rem' }}>{o.type === 'stockout' ? '🔴' : o.type === 'price_drop' ? '📉' : o.type === 'new_product' ? '🆕' : '💬'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: TEXT }}>{o.message}</div>
                  <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 2 }}>
                    <span style={{ color: PLATFORM_COLORS[o.platform] || MUTED, fontWeight: 500 }}>{o.platform}</span> · {o.time}
                  </div>
                </div>
                <button style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{o.action}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI DECISIONS */}
      {sub === 'decisions' && (
        <div className="sd-chart-card" style={{ padding: 16, border: `1px solid ${LIME}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Competitor Decisions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_COMPETITORS.aiDecisions.map(ai => (
              <div key={ai.id} style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)' }}>
                <div style={{ fontSize: '0.85rem', color: TEXT, marginBottom: 10 }}>{ai.text}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ai.actions.map(action => (
                    <button key={action} style={{ padding: '5px 14px', borderRadius: 6, border: action === ai.actions[0] ? 'none' : `1px solid ${BORDER}`, background: action === ai.actions[0] ? LIME : 'transparent', color: action === ai.actions[0] ? '#0a0a0a' : TEXT, fontSize: '0.8rem', fontWeight: action === ai.actions[0] ? 600 : 400, cursor: 'pointer' }}>{action}</button>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 8, textTransform: 'uppercase' }}>Priority: {ai.priority}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
