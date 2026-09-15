import { useState, useEffect } from 'react';
import { BarChart, PieChart } from '../charts';
import { MOCK_ORDERS, getPlatformColor } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';
const OK = 'var(--samurai-ok)';

type SubTab = 'pipeline' | 'sla' | 'returns' | 'cost' | 'decisions';

export function OrdersFulfillmentTab() {
  const [sub, setSub] = useState<SubTab>('pipeline');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'pipeline', label: 'Order Pipeline' },
    { id: 'sla', label: 'Platform SLA' },
    { id: 'returns', label: 'Returns Analysis' },
    { id: 'cost', label: 'Fulfillment Cost' },
    { id: 'decisions', label: '🤖 AI Decisions' },
  ];

  const pipelineData = [
    { name: 'New', value: MOCK_ORDERS.pipeline.new, color: '#3b82f6' },
    { name: 'Processing', value: MOCK_ORDERS.pipeline.processing, color: WARNING },
    { name: 'Shipped', value: MOCK_ORDERS.pipeline.shipped, color: '#8b5cf6' },
    { name: 'Delivered', value: MOCK_ORDERS.pipeline.delivered, color: OK },
    { name: 'Cancelled', value: MOCK_ORDERS.pipeline.cancelled, color: MUTED },
    { name: 'Returned', value: MOCK_ORDERS.pipeline.returned, color: DANGER },
  ];

  const statusColor: Record<string, string> = { new: '#3b82f6', processing: WARNING, shipped: '#8b5cf6', delivered: OK, cancelled: MUTED, returned: DANGER };

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => { setSub(t.id); setSelectedOrder(null); }}
            style={{ padding: '6px 16px', borderRadius: 999, border: `1px solid ${BORDER}`, background: sub === t.id ? LIME : 'transparent', color: sub === t.id ? '#0a0a0a' : TEXT, fontWeight: sub === t.id ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* PIPELINE */}
      {sub === 'pipeline' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {pipelineData.map(p => (
              <div key={p.name} className="sd-kpi-card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: p.color }}>{p.value}</div>
                <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div className="sd-chart-card" style={{ padding: 16 }}>
            <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Order Distribution</h3>
            <PieChart data={pipelineData.filter(p => p.value > 0).map(p => ({ name: p.name, value: p.value }))} colors={pipelineData.filter(p => p.value > 0).map(p => p.color)} height={250} />
          </div>
          <div className="sd-chart-card" style={{ padding: 16 }}>
            <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Recent Orders</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Order ID</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Customer</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Total</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Time</th>
                </tr></thead>
                <tbody>
                  {MOCK_ORDERS.recentOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                        onClick={() => setSelectedOrder(selectedOrder === o.id ? null : o.id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem', color: LIME }}>{o.id}</td>
                      <td style={{ padding: '8px 10px', color: getPlatformColor(o.platform, isDarkMode), fontWeight: 500 }}>{o.platform}</td>
                      <td style={{ padding: '8px 10px', color: TEXT }}>{o.customer}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT, fontWeight: 600 }}>RM {o.total}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: `${statusColor[o.status] || TEXT}22`, color: statusColor[o.status] || TEXT }}>{o.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED, fontSize: '0.75rem' }}>{o.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedOrder && (() => {
              const o = MOCK_ORDERS.recentOrders.find(x => x.id === selectedOrder);
              if (!o) return null;
              return (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)' }}>
                  <div style={{ fontSize: '0.85rem', color: TEXT }}><strong>{o.id}</strong> — {o.customer}</div>
                  <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>{o.platform} · {o.items} items · RM {o.total} · {o.status}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Mark Shipped</button>
                    <button style={{ padding: '4px 12px', borderRadius: 4, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, fontSize: '0.75rem', cursor: 'pointer' }}>View Details</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* PLATFORM SLA */}
      {sub === 'sla' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Fulfillment SLA by Platform</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Within 24h</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Avg Hours</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Overdue</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Status</th>
              </tr></thead>
              <tbody>
                {MOCK_ORDERS.platformSLA.map(s => (
                  <tr key={s.platform} style={{ borderBottom: `1px solid ${BORDER}` }} onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', color: getPlatformColor(s.platform, isDarkMode), fontWeight: 600 }}>{s.platform}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: s.within24h >= 85 ? OK : WARNING, fontWeight: 600 }}>{s.within24h}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>{s.avgHours}h</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: s.overdue > 5 ? DANGER : TEXT, fontWeight: s.overdue > 5 ? 700 : 400 }}>{s.overdue}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: s.within24h >= 85 ? `${OK}22` : `${WARNING}22`, color: s.within24h >= 85 ? OK : WARNING }}>{s.within24h >= 85 ? 'ON TRACK' : 'AT RISK'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RETURNS ANALYSIS */}
      {sub === 'returns' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Return Reasons (Pareto)</h3>
          <BarChart data={MOCK_ORDERS.returnReasons} xKey="reason" yKey="count" color="#f87171" height={220} />
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Reason</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Count</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>%</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Top Platform</th>
              </tr></thead>
              <tbody>
                {MOCK_ORDERS.returnReasons.map(r => (
                  <tr key={r.reason} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 10px', color: TEXT }}>{r.reason}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>{r.count}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED }}>{r.pct}%</td>
                    <td style={{ padding: '8px 10px', color: getPlatformColor(r.topPlatform, isDarkMode), fontWeight: 500 }}>{r.topPlatform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULFILLMENT COST */}
      {sub === 'cost' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Fulfillment Cost & Margin Impact</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Avg Cost/Order</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', color: MUTED }}>Margin Impact</th>
              </tr></thead>
              <tbody>
                {MOCK_ORDERS.fulfillmentCost.map(c => (
                  <tr key={c.platform} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 10px', color: getPlatformColor(c.platform, isDarkMode), fontWeight: 600 }}>{c.platform}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>RM {c.avgCost.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: DANGER, fontWeight: 600 }}>{c.marginImpact}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI DECISIONS */}
      {sub === 'decisions' && (
        <div className="sd-chart-card" style={{ padding: 16, border: `1px solid ${LIME}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Order Decisions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_ORDERS.aiDecisions.map(ai => (
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
