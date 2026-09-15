import { useState } from 'react';
import { BarChart, LineChart, PieChart } from '../charts';
import { MOCK_SALES_PULSE, PLATFORM_COLORS } from '../../../lib/ecommerce-mock-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';

export function SalesPulseTab() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const d = MOCK_SALES_PULSE;
  const gmvChange = ((d.todayGMV - d.yesterdayGMV) / d.yesterdayGMV * 100).toFixed(1);
  const isUp = d.todayGMV >= d.yesterdayGMV;

  const kpis = [
    { label: 'Today GMV', value: `RM ${d.todayGMV.toLocaleString()}`, sub: `${isUp ? '+' : ''}${gmvChange}% vs yesterday`, color: isUp ? LIME : DANGER },
    { label: 'Orders Today', value: d.ordersToday.toString(), sub: `${d.ordersYesterday} yesterday`, color: TEXT },
    { label: 'Avg Order Value', value: `RM ${d.aov.toFixed(2)}`, sub: '7-day trend', color: TEXT },
    { label: 'Conversion Rate', value: `${d.conversionRate}%`, sub: 'All platforms', color: TEXT },
    { label: 'Pending Orders', value: d.pendingOrders.toString(), sub: 'Require fulfillment', color: WARNING },
  ];

  const pieData = d.platformBreakdown.map(p => ({ name: p.name, value: p.revenue }));
  const pieColors = Object.values(PLATFORM_COLORS);

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} className="sd-kpi-card" style={{ padding: 16, cursor: 'pointer' }}
               onClick={() => {}}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: k.color, marginTop: 6 }}>{k.value}</div>
            <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Platform Split + AOV Trend row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Revenue by Platform</h3>
          <PieChart data={pieData} colors={pieColors} unit="RM " height={220} />
        </div>
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>AOV Trend (7 Days)</h3>
          <LineChart data={d.aovTrend} xKey="day" yKey="value" color="#2563eb" unit="RM " height={220} />
        </div>
      </div>

      {/* Top Products Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Top 5 Selling Products</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Product</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Units</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {d.topProducts.map((p, i) => (
                <tr key={p.sku} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px 12px', color: LIME, fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku}</td>
                  <td style={{ padding: '8px 12px', color: TEXT, fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>{p.units}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT, fontWeight: 600 }}>RM {p.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Active Alerts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, border: `1px solid ${a.severity === 'high' ? DANGER : WARNING}`,
              background: a.severity === 'high' ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{a.severity === 'high' ? '🔴' : '🟡'}</span>
              <span style={{ fontSize: '0.85rem', color: TEXT, flex: 1 }}>{a.message}</span>
              <span style={{ fontSize: '0.75rem', color: MUTED, textTransform: 'uppercase' }}>{a.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
