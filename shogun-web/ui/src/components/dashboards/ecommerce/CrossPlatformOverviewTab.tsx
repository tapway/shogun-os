import { useState, useEffect } from 'react';
import { BarChart, PieChart } from '../charts';
import { MOCK_OVERVIEW, PLATFORM_COLORS, PLATFORM_COLORS_DARK } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';
const OK = 'var(--samurai-ok)';

// Helper to get platform color based on theme
const getPlatformColor = (platform: string, isDark: boolean) => {
  return isDark 
    ? PLATFORM_COLORS_DARK[platform as keyof typeof PLATFORM_COLORS_DARK] || PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS]
    : PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS];
};

export function CrossPlatformOverviewTab() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Detect theme on mount and when it changes
  useEffect(() => {
    const checkTheme = () => {
      const root = document.documentElement;
      const bg = getComputedStyle(root).getPropertyValue('--samurai-surface').trim();
      // Dark mode surfaces: #1a1a1a or #0e1424
      setIsDarkMode(bg === '#1a1a1a' || bg === '#0e1424' || bg.startsWith('#0') || bg.startsWith('#1'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => observer.disconnect();
  }, []);
  
  const d = MOCK_OVERVIEW;
  const platforms = ['All', ...d.platformBreakdown.map(p => p.name)];
  const filteredData = selectedPlatform === 'All' ? d.platformBreakdown : d.platformBreakdown.filter(p => p.name === selectedPlatform);
  const agg = selectedPlatform === 'All' ? d.aggregate : (() => {
    const p = d.platformBreakdown.find(x => x.name === selectedPlatform)!;
    return { gmv: p.gmv, orders: p.orders, aov: p.aov, conversionRate: p.convRate, returns: Math.round(p.orders * p.returnRate / 100), returnRate: p.returnRate };
  })();

  const kpis = [
    { label: 'Total GMV', value: `RM ${agg.gmv.toLocaleString()}`, color: TEXT },
    { label: 'Orders', value: agg.orders.toString(), color: TEXT },
    { label: 'AOV', value: `RM ${agg.aov.toFixed(2)}`, color: TEXT },
    { label: 'Conversion', value: `${agg.conversionRate}%`, color: TEXT },
    { label: 'Return Rate', value: `${agg.returnRate}%`, color: agg.returnRate > 3 ? DANGER : OK },
  ];

  const pieData = d.platformBreakdown.map(p => ({ name: p.name, value: p.gmv }));
  // Use bright colors in dark mode, original brand colors in light mode
  const pieColors = isDarkMode 
    ? d.platformBreakdown.map(p => PLATFORM_COLORS_DARK[p.name as keyof typeof PLATFORM_COLORS_DARK] || p.name)
    : d.platformBreakdown.map(p => PLATFORM_COLORS[p.name as keyof typeof PLATFORM_COLORS] || p.name);

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Platform Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: MUTED, marginRight: 4 }}>Platform:</span>
        {platforms.map(p => (
          <button key={p} onClick={() => setSelectedPlatform(p)}
            style={{
              padding: '5px 14px', borderRadius: 999, border: `1px solid ${BORDER}`,
              background: selectedPlatform === p ? (p === 'All' ? LIME : getPlatformColor(p, isDarkMode)) : 'transparent',
              color: selectedPlatform === p ? '#0a0a0a' : TEXT,
              fontWeight: selectedPlatform === p ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer',
            }}>{p}</button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} className="sd-kpi-card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: k.color, marginTop: 6 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Platform Comparison + Revenue Waterfall */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Revenue by Platform</h3>
          <PieChart data={pieData} colors={pieColors} unit="RM " height={240} />
        </div>
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Platform Comparison</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: MUTED }}>GMV</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: MUTED }}>Orders</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: MUTED }}>AOV</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', color: MUTED }}>Conv%</th>
              </tr></thead>
              <tbody>
                {filteredData.map(p => (
                  <tr key={p.name} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                      onClick={() => setSelectedPlatform(p.name)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '6px 10px', color: getPlatformColor(p.name, isDarkMode), fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: TEXT }}>RM {p.gmv.toLocaleString()}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: TEXT }}>{p.orders}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: TEXT }}>RM {p.aov.toFixed(0)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: p.convRate >= 3.5 ? OK : WARNING }}>{p.convRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Decisions Panel */}
      <div className="sd-chart-card" style={{ padding: 16, border: `1px solid ${LIME}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Decision Suggestions</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.aiDecisions.map(ai => (
            <div key={ai.id} style={{ padding: '12px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: TEXT }}>{ai.text}</div>
                <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 4, textTransform: 'uppercase' }}>Priority: {ai.priority} · Target: {ai.targetTab}</div>
              </div>
              <button style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {ai.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Active Alerts</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${a.severity === 'high' ? DANGER : a.severity === 'medium' ? WARNING : BORDER}`,
              background: a.severity === 'high' ? `${DANGER}11` : a.severity === 'medium' ? `${WARNING}11` : 'transparent',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: '1rem' }}>{a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🔵'}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getPlatformColor(a.platform, isDarkMode), minWidth: 80 }}>{a.platform}</span>
              <span style={{ fontSize: '0.85rem', color: TEXT, flex: 1 }}>{a.message}</span>
              <span style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>{a.tab}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
