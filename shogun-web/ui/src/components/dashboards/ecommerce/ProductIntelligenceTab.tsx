import { useState } from 'react';
import { MOCK_PRODUCTS, PLATFORM_COLORS } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';
const OK = 'var(--samurai-ok)';

type SubTab = 'matrix' | 'price' | 'stock' | 'decisions';

export function ProductIntelligenceTab() {
  const [sub, setSub] = useState<SubTab>('matrix');
  const [filterPlatform, setFilterPlatform] = useState<string>('All');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'matrix', label: 'Velocity × Margin' },
    { id: 'price', label: 'Price Parity' },
    { id: 'stock', label: 'Stock Heatmap' },
    { id: 'decisions', label: '🤖 AI Decisions' },
  ];

  const platforms = ['All', 'Shopee', 'Lazada', 'TikTok Shop', 'Website'];
  const filteredProducts = filterPlatform === 'All'
    ? MOCK_PRODUCTS.velocityMargin
    : MOCK_PRODUCTS.velocityMargin.filter(p => p.platforms.includes(filterPlatform));

  const heatColor = (days: number | null) => {
    if (days === null) return 'transparent';
    if (days === 0) return DANGER;
    if (days < 14) return WARNING;
    if (days > 90) return '#8b5cf6';
    return OK;
  };

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Platform Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: MUTED, marginRight: 4 }}>Platform:</span>
        {platforms.map(p => (
          <button key={p} onClick={() => setFilterPlatform(p)}
            style={{
              padding: '5px 14px', borderRadius: 999, border: `1px solid ${BORDER}`,
              background: filterPlatform === p ? (p === 'All' ? LIME : (PLATFORM_COLORS[p] || LIME)) : 'transparent',
              color: filterPlatform === p ? '#0a0a0a' : TEXT,
              fontWeight: filterPlatform === p ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer',
            }}>{p}</button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => { setSub(t.id); setExpandedSku(null); }}
            style={{
              padding: '6px 16px', borderRadius: 999, border: `1px solid ${BORDER}`,
              background: sub === t.id ? LIME : 'transparent',
              color: sub === t.id ? '#0a0a0a' : TEXT,
              fontWeight: sub === t.id ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer',
            }}>{t.label}</button>
        ))}
      </div>

      {/* VELOCITY × MARGIN MATRIX */}
      {sub === 'matrix' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Product Velocity × Margin Matrix</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Product</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>30d Sales</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Margin %</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Revenue</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Platforms</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Days Cover</th>
              </tr></thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.sku} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                      onClick={() => setExpandedSku(expandedSku === p.sku ? null : p.sku)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem', color: LIME }}>{p.sku}</td>
                    <td style={{ padding: '8px 10px', color: TEXT, fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: p.velocity === 0 ? DANGER : TEXT }}>{p.velocity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: p.margin >= 40 ? OK : p.margin >= 20 ? TEXT : DANGER, fontWeight: 600 }}>{p.margin.toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>RM {p.revenue.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                        {p.platforms.map(pl => (
                          <span key={pl} title={pl} style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[pl] || MUTED }} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: p.daysCover === 0 ? DANGER : p.daysCover > 90 ? '#8b5cf6' : TEXT, fontWeight: p.daysCover === 0 || p.daysCover > 90 ? 700 : 400 }}>
                      {p.daysCover === 0 ? '—' : p.daysCover}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expandedSku && (() => {
            const p = filteredProducts.find(x => x.sku === expandedSku);
            if (!p) return null;
            return (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)' }}>
                <div style={{ fontSize: '0.85rem', color: TEXT }}><strong>{p.name}</strong> ({p.sku})</div>
                <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>
                  Listed on: {p.platforms.join(', ')} · 30d Revenue: RM {p.revenue.toLocaleString()} · Margin: {p.margin.toFixed(1)}% · Days Cover: {p.daysCover === 0 ? 'Stockout' : `${p.daysCover} days`}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* PRICE PARITY */}
      {sub === 'price' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="sd-chart-title" style={{ margin: 0 }}>Cross-Platform Price Parity</h3>
            <button style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Sync All Prices</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Product</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Master</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: '#ee4d2d' }}>Shopee</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: '#0f146d' }}>Lazada</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: TEXT }}>TikTok</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: '#2563eb' }}>Website</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Status</th>
              </tr></thead>
              <tbody>
                {MOCK_PRODUCTS.priceParity.map(p => {
                  const mismatch = (p.shopee !== null && p.shopee !== p.master) || (p.lazada !== null && p.lazada !== p.master) || (p.tiktok !== null && p.tiktok !== p.master) || (p.website !== null && p.website !== p.master);
                  return (
                    <tr key={p.sku} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 10px', color: TEXT }}>{p.name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED }}>RM {p.master}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: p.shopee === null ? MUTED : p.shopee !== p.master ? DANGER : TEXT, fontWeight: p.shopee !== null && p.shopee !== p.master ? 700 : 400 }}>{p.shopee === null ? '—' : `RM ${p.shopee}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: p.lazada === null ? MUTED : p.lazada !== p.master ? DANGER : TEXT, fontWeight: p.lazada !== null && p.lazada !== p.master ? 700 : 400 }}>{p.lazada === null ? '—' : `RM ${p.lazada}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: p.tiktok === null ? MUTED : p.tiktok !== p.master ? DANGER : TEXT, fontWeight: p.tiktok !== null && p.tiktok !== p.master ? 700 : 400 }}>{p.tiktok === null ? '—' : `RM ${p.tiktok}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: p.website === null ? MUTED : p.website !== p.master ? DANGER : TEXT, fontWeight: p.website !== null && p.website !== p.master ? 700 : 400 }}>{p.website === null ? '—' : `RM ${p.website}`}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: mismatch ? `${DANGER}22` : `${OK}22`, color: mismatch ? DANGER : OK }}>
                          {mismatch ? 'MISMATCH' : 'MATCHED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK HEATMAP */}
      {sub === 'stock' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Stock Coverage Heatmap (Days of Cover)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Product</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: '#ee4d2d' }}>Shopee</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: '#0f146d' }}>Lazada</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: TEXT }}>TikTok</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: '#2563eb' }}>Website</th>
              </tr></thead>
              <tbody>
                {MOCK_PRODUCTS.stockHeatmap.map(p => (
                  <tr key={p.sku} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 10px', color: TEXT }}>{p.name}</td>
                    {[p.shopee, p.lazada, p.tiktok, p.website].map((days, i) => (
                      <td key={i} style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {days === null ? <span style={{ color: MUTED }}>—</span> : (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                            background: `${heatColor(days)}22`, color: heatColor(days),
                          }}>{days === 0 ? 'OOS' : `${days}d`}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.75rem', color: MUTED }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: `${DANGER}44`, marginRight: 4 }} />Stockout</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: `${WARNING}44`, marginRight: 4 }} />&lt;14 days</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: `${OK}44`, marginRight: 4 }} />Healthy</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#8b5cf644', marginRight: 4 }} />&gt;90 days</span>
          </div>
        </div>
      )}

      {/* AI DECISIONS */}
      {sub === 'decisions' && (
        <div className="sd-chart-card" style={{ padding: 16, border: `1px solid ${LIME}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Product Decisions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_PRODUCTS.aiDecisions.map(ai => (
              <div key={ai.id} style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)' }}>
                <div style={{ fontSize: '0.85rem', color: TEXT, marginBottom: 10 }}>{ai.text}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ai.actions.map(action => (
                    <button key={action} style={{
                      padding: '5px 14px', borderRadius: 6, border: action === ai.actions[0] ? 'none' : `1px solid ${BORDER}`,
                      background: action === ai.actions[0] ? LIME : 'transparent',
                      color: action === ai.actions[0] ? '#0a0a0a' : TEXT,
                      fontSize: '0.8rem', fontWeight: action === ai.actions[0] ? 600 : 400, cursor: 'pointer',
                    }}>{action}</button>
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
