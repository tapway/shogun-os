import { useState, useEffect } from 'react';
import { BarChart } from '../charts';
import { MOCK_MARKETING, getPlatformColor } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

type SubTab = 'campaigns' | 'promos' | 'content' | 'bundles' | 'decisions';

export function MarketingContentTab() {
  const [sub, setSub] = useState<SubTab>('campaigns');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [generating, setGenerating] = useState(false);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'campaigns', label: 'Campaign ROI' },
    { id: 'promos', label: 'Promo Opportunities' },
    { id: 'content', label: 'Content Performance' },
    { id: 'bundles', label: 'Bundle Builder' },
    { id: 'decisions', label: '🤖 AI Decisions' },
  ];

  const handleGenerate = () => { setGenerating(true); setTimeout(() => setGenerating(false), 2500); };
  const statusColor: Record<string, string> = { completed: OK, active: '#3b82f6', scheduled: WARNING };

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            style={{ padding: '6px 16px', borderRadius: 999, border: `1px solid ${BORDER}`, background: sub === t.id ? LIME : 'transparent', color: sub === t.id ? '#0a0a0a' : TEXT, fontWeight: sub === t.id ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* CAMPAIGNS */}
      {sub === 'campaigns' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Campaign ROI by Platform</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Campaign</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Budget</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Revenue</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>ROI</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Status</th>
              </tr></thead>
              <tbody>
                {MOCK_MARKETING.campaigns.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', color: TEXT, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: getPlatformColor(c.platform, isDarkMode) }}>{c.platform}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED }}>RM {c.budget.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: OK, fontWeight: 600 }}>RM {c.revenue.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: c.roi > 4 ? OK : TEXT, fontWeight: 600 }}>{c.roi > 0 ? `${c.roi.toFixed(1)}x` : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: `${statusColor[c.status] || TEXT}22`, color: statusColor[c.status] || TEXT }}>{c.status.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROMO OPPORTUNITIES */}
      {sub === 'promos' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="sd-chart-title" style={{ margin: 0 }}>AI Promo Opportunities</h3>
            <button onClick={handleGenerate} disabled={generating} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1 }}>
              {generating ? 'Analyzing…' : 'Regenerate'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {MOCK_MARKETING.promoOpportunities.map((p, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 8, border: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = LIME} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{p.name}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: `${LIME}22`, color: LIME }}>Score: {p.score}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.8rem' }}>
                  <span style={{ color: MUTED }}>Velocity:</span><span style={{ color: TEXT }}>{p.velocity}</span>
                  <span style={{ color: MUTED }}>Margin:</span><span style={{ color: TEXT }}>{p.margin}%</span>
                  <span style={{ color: MUTED }}>Best Platform:</span><span style={{ color: getPlatformColor(p.bestPlatform, isDarkMode), fontWeight: 500 }}>{p.bestPlatform}</span>
                  <span style={{ color: MUTED }}>Suggested:</span><span style={{ color: WARNING, fontWeight: 600 }}>{p.suggestedDiscount}% off</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: OK, marginTop: 8, fontWeight: 600 }}>Predicted uplift: +{p.predictedUplift}%</div>
                <button style={{ marginTop: 10, width: '100%', padding: '5px 0', borderRadius: 4, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Create Promo on {p.bestPlatform}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT PERFORMANCE */}
      {sub === 'content' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Content Engagement by Platform (%)</h3>
          <BarChart
            data={MOCK_MARKETING.contentPerformance}
            xKey="type"
            yKey="shopee"
            dataKeys={['shopee', 'lazada', 'tiktok', 'website']}
            labels={{ shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok', website: 'Website' }}
            colors={[getPlatformColor('Shopee', isDarkMode), getPlatformColor('Lazada', isDarkMode), getPlatformColor('TikTok Shop', isDarkMode), getPlatformColor('Website', isDarkMode)]}
            height={240}
          />
        </div>
      )}

      {/* BUNDLES */}
      {sub === 'bundles' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Cross-Sell Bundle Recommendations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_MARKETING.bundles.map((b, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 8, border: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = LIME} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{b.names}</div>
                  <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>Co-purchase: {b.coPurchaseRate}% · Best on: <span style={{ color: getPlatformColor(b.bestPlatform, isDarkMode) }}>{b.bestPlatform}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: WARNING }}>{b.suggestedDiscount}% off</div>
                  <button style={{ marginTop: 6, padding: '4px 12px', borderRadius: 4, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Create on {b.bestPlatform}</button>
                </div>
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
            <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Marketing Decisions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_MARKETING.aiDecisions.map(ai => (
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
