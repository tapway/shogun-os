import { useState, useMemo } from 'react';
import type { CsDashboardData, CsFeedback } from '../../../lib/types';
import { AlertTriangle, TrendingUp, FileText, Zap, ChevronDown, ChevronUp, Star, CheckCircle2 } from 'lucide-react';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const CARD = 'var(--samurai-card)';

const ISSUE_LABELS: Record<string, string> = {
  sizing: 'Sizing',
  'quality-defect': 'Quality',
  'wrong-item': 'Wrong Item',
  'shipping-damage': 'Ship Damage',
  'description-mismatch': 'Desc Mismatch',
  packaging: 'Packaging',
};

const PLATFORM_ICONS: Record<string, string> = {
  shopee: '🟠', lazada: '🔵', tiktok: '⚫', whatsapp: '🟢', woocommerce: '🟣', shopify: '🛒',
};

interface Props {
  data: CsDashboardData;
  color: string;
  onExecuteAction: (payload: { type: string; target: string; details?: string }) => void;
}

export function CsFeedbackTab({ data, color, onExecuteAction }: Props) {
  const [view, setView] = useState<'matrix' | 'trends' | 'digest' | 'feed'>('matrix');
  const [filterIssue, setFilterIssue] = useState('all');
  const [expandedDigest, setExpandedDigest] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const { feedback, issueMatrix, feedbackTrends, weeklyDigest, actionTemplates } = data;

  const filteredFeedback = useMemo(() => {
    if (filterIssue === 'all') return feedback;
    return feedback.filter((f) => f.issueTag === filterIssue);
  }, [feedback, filterIssue]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleAction(issueType: string, sku: string) {
    const tmpl = actionTemplates[issueType];
    if (!tmpl) return;
    onExecuteAction({ type: issueType, target: sku, details: tmpl.label });
    showToast(`Action executed: ${tmpl.label} for ${sku}`);
  }

  const VIEWS = [
    { id: 'matrix' as const, label: 'Issue Matrix', icon: <AlertTriangle size={13} /> },
    { id: 'trends' as const, label: 'Trend Analysis', icon: <TrendingUp size={13} /> },
    { id: 'digest' as const, label: 'Weekly Digest', icon: <FileText size={13} /> },
    { id: 'feed' as const, label: 'Feedback Feed', icon: <Star size={13} /> },
  ];

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* View Switcher */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer',
              border: `1px solid ${view === v.id ? color : BORDER}`,
              background: view === v.id ? `${color}20` : 'transparent',
              color: view === v.id ? color : MUTED,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* ── Issue Matrix View ── */}
      {view === 'matrix' && (
        <div className="sd-stack" style={{ gap: 12 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Issue Classification Matrix</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${BORDER}`, color: MUTED, fontWeight: 500 }}>Product</th>
                  {issueMatrix.issueTypes.map((it) => (
                    <th key={it} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: `1px solid ${BORDER}`, color: MUTED, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {ISSUE_LABELS[it] || it}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '6px 8px', borderBottom: `1px solid ${BORDER}`, color: MUTED, fontWeight: 500 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {issueMatrix.products.map((prod) => {
                  const total = Object.values(prod.issues).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={prod.sku}>
                      <td style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
                        <div>{prod.name}</div>
                        <div style={{ fontSize: '0.65rem', color: MUTED }}>{prod.sku}</div>
                      </td>
                      {issueMatrix.issueTypes.map((it) => {
                        const count = prod.issues[it] || 0;
                        const intensity = Math.min(count / 3, 1);
                        return (
                          <td
                            key={it}
                            onClick={() => { if (count > 0) { setFilterIssue(it); setView('feed'); } }}
                            style={{
                              textAlign: 'center', padding: '8px', borderBottom: `1px solid ${BORDER}`,
                              background: count > 0 ? `rgba(239,68,68,${intensity * 0.3})` : 'transparent',
                              color: count > 0 ? '#ef4444' : MUTED,
                              fontWeight: count > 0 ? 600 : 400,
                              cursor: count > 0 ? 'pointer' : 'default',
                            }}
                          >
                            {count || '—'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', padding: '8px', borderBottom: `1px solid ${BORDER}`, fontWeight: 600, color: TEXT }}>
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: 8 }}>Click any cell with issues to filter feedback feed</div>
          </div>

          {/* Quick Action Panel per Issue Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {Object.entries(actionTemplates).map(([issueType, tmpl]) => (
              <div key={issueType} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                  {ISSUE_LABELS[issueType] || issueType}
                </div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 8 }}>{tmpl.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {tmpl.actions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(issueType, 'all-affected')}
                      style={{
                        padding: '4px 10px', borderRadius: 4, fontSize: '0.68rem', cursor: 'pointer',
                        border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}15`)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      → {act}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trends View ── */}
      {view === 'trends' && (
        <div className="sd-stack" style={{ gap: 12 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Issue Volume by Category (Last 10 Days)</h3>
            <StackedBarChart trends={feedbackTrends} color={color} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Pareto: Top products by negative feedback */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Top Products by Negative Feedback</h3>
              <ParetoChart feedback={feedback} color={color} />
            </div>
            {/* Sentiment vs Rating Scatter */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Sentiment vs Rating</h3>
              <SentimentScatter feedback={feedback} color={color} />
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly Digest View ── */}
      {view === 'digest' && (
        <div className="sd-stack" style={{ gap: 10 }}>
          <div style={{ fontSize: '0.78rem', color: MUTED, marginBottom: 4 }}>Period: {weeklyDigest.period}</div>
          {weeklyDigest.topIssues.map((issue, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedDigest(expandedDigest === i ? null : i)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i === 0 ? 'rgba(239,68,68,0.15)' : i === 1 ? 'rgba(245,158,11,0.15)' : `${color}15`,
                  color: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : color,
                  fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: TEXT }}>{issue.issue}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>
                    {issue.count} reports · {issue.affectedSkus.length} SKUs affected
                  </div>
                </div>
                {expandedDigest === i ? <ChevronUp size={16} style={{ color: MUTED }} /> : <ChevronDown size={16} style={{ color: MUTED }} />}
              </div>
              {expandedDigest === i && (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 2 }}>Affected SKUs</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {issue.affectedSkus.map((s) => (
                        <span key={s} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: TEXT }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 2 }}>Root Cause</div>
                    <div style={{ fontSize: '0.82rem', color: TEXT }}>{issue.rootCause}</div>
                  </div>
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Zap size={14} style={{ color }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>Recommended Action</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: TEXT, marginBottom: 8 }}>{issue.suggestion}</div>
                    <button
                      onClick={() => {
                        onExecuteAction({ type: 'digest-action', target: issue.issue, details: issue.suggestion });
                        showToast(`Action logged: ${issue.suggestion}`);
                      }}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        border: 'none', background: color, color: '#0a0a0a',
                      }}
                    >
                      Execute Action →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback Feed View ── */}
      {view === 'feed' && (
        <div className="sd-stack" style={{ gap: 10 }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: MUTED }}>Filter:</span>
            <button
              onClick={() => setFilterIssue('all')}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', cursor: 'pointer',
                border: `1px solid ${filterIssue === 'all' ? color : BORDER}`,
                background: filterIssue === 'all' ? `${color}20` : 'transparent',
                color: filterIssue === 'all' ? color : MUTED,
              }}
            >
              All
            </button>
            {issueMatrix.issueTypes.map((it) => (
              <button
                key={it}
                onClick={() => setFilterIssue(it)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.7rem', cursor: 'pointer',
                  border: `1px solid ${filterIssue === it ? color : BORDER}`,
                  background: filterIssue === it ? `${color}20` : 'transparent',
                  color: filterIssue === it ? color : MUTED,
                }}
              >
                {ISSUE_LABELS[it] || it}
              </button>
            ))}
          </div>

          {/* Feedback cards */}
          {filteredFeedback.map((fb) => (
            <div key={fb.id} style={{
              padding: '12px 14px', borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`,
              borderLeft: fb.rating <= 2 ? '3px solid #ef4444' : fb.rating >= 4 ? '3px solid #22c55e' : '3px solid #f59e0b',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{PLATFORM_ICONS[fb.platform] || '💬'}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: TEXT }}>{fb.productName}</span>
                  <span style={{ fontSize: '0.65rem', color: MUTED }}>{fb.sku}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: TEXT, lineHeight: 1.4, marginBottom: 6 }}>"{fb.text}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {fb.issueTag && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      {ISSUE_LABELS[fb.issueTag] || fb.issueTag}
                    </span>
                  )}
                  {fb.resolved && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={10} /> Resolved
                    </span>
                  )}
                  <span style={{ fontSize: '0.65rem', color: MUTED }}>
                    Sentiment: {fb.sentiment.toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>
                  {new Date(fb.timestamp).toLocaleDateString()}
                </span>
              </div>
              {/* Action buttons for unresolved items with issue tags */}
              {!fb.resolved && fb.issueTag && actionTemplates[fb.issueTag] && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => handleAction(fb.issueTag, fb.sku)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      border: 'none', background: color, color: '#0a0a0a',
                    }}
                  >
                    ⚡ {actionTemplates[fb.issueTag].label}
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredFeedback.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: MUTED, fontSize: '0.85rem' }}>No feedback matches filter</div>
          )}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '10px 20px', borderRadius: 8,
          background: color, color: '#0a0a0a', fontSize: '0.82rem', fontWeight: 600, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}

/* ── Chart Helper Components ── */

function StackedBarChart({ trends, color }: { trends: { dates: string[]; sizing: number[]; qualityDefect: number[]; wrongItem: number[]; shippingDamage: number[]; descriptionMismatch: number[] }; color: string }) {
  const categories = [
    { key: 'sizing', color: '#ef4444', label: 'Sizing' },
    { key: 'qualityDefect', color: '#f59e0b', label: 'Quality' },
    { key: 'wrongItem', color: '#8b5cf6', label: 'Wrong Item' },
    { key: 'shippingDamage', color: '#ec4899', label: 'Ship Damage' },
    { key: 'descriptionMismatch', color: '#06b6d4', label: 'Desc Mismatch' },
  ] as const;

  const maxTotal = Math.max(...trends.dates.map((_, i) =>
    categories.reduce((sum, cat) => sum + (trends[cat.key]?.[i] || 0), 0)
  ));

  const padL = 36;
  const padB = 24;
  const padT = 8;
  const padR = 8;
  const svgW = 400;
  const svgH = 120;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const barW = chartW / trends.dates.length;

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round((maxTotal * i) / 4);
    const y = padT + chartH - (i / 4) * chartH;
    return { val, y };
  });

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={padL} y1={t.y} x2={svgW - padR} y2={t.y} stroke={BORDER} strokeWidth="0.5" strokeDasharray="3,3" />
        ))}
        {/* Y-axis */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />
        {/* X-axis */}
        <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />
        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={padL - 5} y={t.y + 3} textAnchor="end" fontSize="9" fill={MUTED}>{t.val}</text>
        ))}
        {/* Bars */}
        {trends.dates.map((date, i) => {
          let yOffset = padT + chartH;
          return (
            <g key={i}>
              {categories.map((cat) => {
                const val = trends[cat.key]?.[i] || 0;
                const barH = maxTotal > 0 ? (val / maxTotal) * chartH : 0;
                yOffset -= barH;
                return val > 0 ? (
                  <rect key={cat.key} x={padL + i * barW + 2} y={yOffset} width={barW - 4} height={barH} fill={cat.color} rx="1">
                    <title>{`${date} — ${cat.label}: ${val}`}</title>
                  </rect>
                ) : null;
              })}
              {/* X-axis label */}
              <text x={padL + i * barW + barW / 2} y={padT + chartH + 15} textAnchor="middle" fontSize="8" fill={MUTED}>{date}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {categories.map((cat) => (
          <span key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: MUTED }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
            {cat.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ParetoChart({ feedback, color }: { feedback: CsFeedback[]; color: string }) {
  const productCounts = feedback
    .filter((f) => f.rating <= 3)
    .reduce((acc, f) => { acc[f.productName] = (acc[f.productName] || 0) + 1; return acc; }, {} as Record<string, number>);
  const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = sorted[0]?.[1] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(([name, count], i) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 130, fontSize: '0.75rem', color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{name}</span>
          <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: i < 2 ? '#ef4444' : color, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ width: 24, fontSize: '0.75rem', fontWeight: 600, color: TEXT, textAlign: 'right' }}>{count}</span>
        </div>
      ))}
      {sorted.length === 0 && <div style={{ fontSize: '0.78rem', color: MUTED, textAlign: 'center', padding: 20 }}>No negative feedback data</div>}
    </div>
  );
}

function SentimentScatter({ feedback, color }: { feedback: CsFeedback[]; color: string }) {
  const padL = 36;
  const padB = 24;
  const padT = 10;
  const padR = 10;
  const svgW = 400;
  const svgH = 180;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  // Rating axis: 1-5 (x), Sentiment axis: -1 to 1 (y)
  const xScale = (rating: number) => padL + ((rating - 1) / 4) * chartW;
  const yScale = (sentiment: number) => padT + chartH / 2 - (sentiment * chartH / 2) * 0.9;

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        <line x1={padL} y1={yScale(0)} x2={svgW - padR} y2={yScale(0)} stroke={BORDER} strokeWidth="0.5" strokeDasharray="3,3" />
        <line x1={padL} y1={yScale(0.5)} x2={svgW - padR} y2={yScale(0.5)} stroke={BORDER} strokeWidth="0.5" strokeDasharray="3,3" />
        <line x1={padL} y1={yScale(-0.5)} x2={svgW - padR} y2={yScale(-0.5)} stroke={BORDER} strokeWidth="0.5" strokeDasharray="3,3" />

        {/* Y-axis */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />
        {/* X-axis */}
        <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />

        {/* Y-axis labels */}
        <text x={padL - 5} y={yScale(1) + 3} textAnchor="end" fontSize="9" fill={MUTED}>1.0</text>
        <text x={padL - 5} y={yScale(0) + 3} textAnchor="end" fontSize="9" fill={MUTED}>0</text>
        <text x={padL - 5} y={yScale(-1) + 3} textAnchor="end" fontSize="9" fill={MUTED}>-1.0</text>

        {/* X-axis labels (ratings 1-5) */}
        {[1, 2, 3, 4, 5].map((r) => (
          <text key={r} x={xScale(r)} y={padT + chartH + 15} textAnchor="middle" fontSize="9" fill={MUTED}>★{r}</text>
        ))}

        {/* Axis titles */}
        <text x={svgW / 2} y={svgH - 2} textAnchor="middle" fontSize="9" fill={MUTED}>Rating</text>
        <text x={8} y={padT + chartH / 2} textAnchor="middle" fontSize="9" fill={MUTED} transform={`rotate(-90, 8, ${padT + chartH / 2})`}>Sentiment</text>

        {/* Points */}
        {feedback.map((f, i) => {
          const cx = xScale(f.rating);
          const cy = yScale(f.sentiment);
          const dotColor = f.rating <= 2 ? '#ef4444' : f.rating >= 4 ? '#22c55e' : '#f59e0b';
          return (
            <circle key={i} cx={cx} cy={cy} r="4" fill={dotColor} opacity="0.8">
              <title>{`${f.productName}: ★${f.rating}, sentiment ${f.sentiment.toFixed(1)}`}</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, justifyContent: 'center' }}>
        {[
          { color: '#ef4444', label: 'Low Rating' },
          { color: '#f59e0b', label: 'Mid Rating' },
          { color: '#22c55e', label: 'High Rating' },
        ].map((l) => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: MUTED }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} /> {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
