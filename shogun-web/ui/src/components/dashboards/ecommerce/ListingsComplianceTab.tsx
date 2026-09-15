import { useState, useEffect } from 'react';
import { BarChart } from '../charts';
import { MOCK_LISTINGS, getPlatformColor } from '../../../lib/ecommerce-multiplatform-data';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';
const OK = 'var(--samurai-ok)';

type SubTab = 'health' | 'compliance' | 'gaps' | 'seo' | 'decisions';

export function ListingsComplianceTab() {
  const [sub, setSub] = useState<SubTab>('health');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const [syncing, setSyncing] = useState<string | null>(null);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'health', label: 'Platform Health' },
    { id: 'compliance', label: 'Compliance Queue' },
    { id: 'gaps', label: 'Listing Gaps' },
    { id: 'seo', label: 'SEO Distribution' },
    { id: 'decisions', label: '🤖 AI Decisions' },
  ];

  const handleSync = (platform: string) => { setSyncing(platform); setTimeout(() => setSyncing(null), 2000); };
  const severityColor: Record<string, string> = { high: DANGER, medium: WARNING, low: MUTED };

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            style={{ padding: '6px 16px', borderRadius: 999, border: `1px solid ${BORDER}`, background: sub === t.id ? LIME : 'transparent', color: sub === t.id ? '#0a0a0a' : TEXT, fontWeight: sub === t.id ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* PLATFORM HEALTH */}
      {sub === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {MOCK_LISTINGS.platformHealth.map(p => (
            <div key={p.platform} className="sd-chart-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: getPlatformColor(p.platform, isDarkMode) }}>{p.platform}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.syncOk ? OK : DANGER }} title={p.syncOk ? 'Sync OK' : 'Sync Failed'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700, color: OK }}>{p.active}</div><div style={{ fontSize: '0.7rem', color: MUTED }}>Active</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700, color: WARNING }}>{p.inactive}</div><div style={{ fontSize: '0.7rem', color: MUTED }}>Inactive</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.2rem', fontWeight: 700, color: DANGER }}>{p.rejected}</div><div style={{ fontSize: '0.7rem', color: MUTED }}>Rejected</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: MUTED }}>Compliance Score</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: p.complianceScore >= 90 ? OK : WARNING }}>{p.complianceScore}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: BORDER, marginBottom: 10 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${p.complianceScore}%`, background: p.complianceScore >= 90 ? OK : WARNING }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: 8 }}>Last sync: {p.syncTime}</div>
              <button onClick={() => handleSync(p.platform)} disabled={syncing === p.platform}
                style={{ width: '100%', padding: '6px 0', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: syncing === p.platform ? 'wait' : 'pointer', opacity: syncing === p.platform ? 0.6 : 1 }}>
                {syncing === p.platform ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* COMPLIANCE QUEUE */}
      {sub === 'compliance' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="sd-chart-title" style={{ margin: 0 }}>Compliance Issues ({MOCK_LISTINGS.complianceIssues.length})</h3>
            <button style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Fix All Issues</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead><tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Product</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Platform</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', color: MUTED }}>Issue</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Severity</th>
                <th style={{ textAlign: 'center', padding: '8px 10px', color: MUTED }}>Action</th>
              </tr></thead>
              <tbody>
                {MOCK_LISTINGS.complianceIssues.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }} onMouseEnter={e => e.currentTarget.style.background = 'var(--samurai-hover-ui)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem', color: LIME }}>{c.sku}</td>
                    <td style={{ padding: '8px 10px', color: TEXT }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: getPlatformColor(c.platform, isDarkMode), fontWeight: 500 }}>{c.platform}</td>
                    <td style={{ padding: '8px 10px', color: TEXT }}>{c.issue}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: `${severityColor[c.severity]}22`, color: severityColor[c.severity] }}>{c.severity.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, fontSize: '0.75rem', cursor: 'pointer' }}>Fix</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LISTING GAPS */}
      {sub === 'gaps' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Listing Gap Analysis</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_LISTINGS.listingGaps.map((g, i) => (
              <div key={i} style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{g.name} ({g.sku})</div>
                  <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>Missing from: <span style={{ color: WARNING }}>{g.missingFrom.join(', ')}</span>{g.competitorPresent && ' · ⚠️ Competitors present'}</div>
                </div>
                <button style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: LIME, color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  List on {g.missingFrom[0]}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO DISTRIBUTION */}
      {sub === 'seo' && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>SEO Score Distribution</h3>
          <BarChart data={MOCK_LISTINGS.seoDistribution} xKey="range" yKey="count" color="#2563eb" height={220} />
        </div>
      )}

      {/* AI DECISIONS */}
      {sub === 'decisions' && (
        <div className="sd-chart-card" style={{ padding: 16, border: `1px solid ${LIME}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <h3 className="sd-chart-title" style={{ margin: 0, color: LIME }}>AI Listing Decisions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_LISTINGS.aiDecisions.map(ai => (
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
