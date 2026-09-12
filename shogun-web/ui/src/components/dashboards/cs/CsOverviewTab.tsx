import { useState } from 'react';
import type { CsDashboardData } from '../../../lib/types';
import { AlertTriangle, Clock, TrendingUp, TrendingDown, Zap, Activity, MessageSquare, CheckCircle2 } from 'lucide-react';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const LIME = 'var(--samurai-lime)';

interface Props {
  data: CsDashboardData;
  color: string;
  onNavigateTab: (tab: string) => void;
}

export function CsOverviewTab({ data, color, onNavigateTab }: Props) {
  const [trendMetric, setTrendMetric] = useState<'volume' | 'responseTime' | 'csat'>('volume');
  const { kpis, urgentQueue, channelHealth, trends, aiInsight } = data;

  const volumeDelta = kpis.todayVolume - kpis.yesterdayVolume;
  const volumePct = kpis.yesterdayVolume > 0 ? Math.round((volumeDelta / kpis.yesterdayVolume) * 100) : 0;

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* ── KPI Snapshot Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <KpiCard
          label="Open Tickets"
          value={kpis.openTickets}
          icon={<MessageSquare size={16} />}
          color={color}
          onClick={() => onNavigateTab('inbox')}
        />
        <KpiCard
          label="Avg Response"
          value={`${kpis.avgResponseMinutes}m`}
          icon={<Clock size={16} />}
          color={color}
          onClick={() => onNavigateTab('inbox')}
        />
        <KpiCard
          label="CSAT Score"
          value={`${kpis.csatScore}%`}
          icon={<CheckCircle2 size={16} />}
          color={color}
          onClick={() => onNavigateTab('customers')}
        />
        <KpiCard
          label="SLA Compliance"
          value={`${kpis.slaCompliancePct}%`}
          icon={<Activity size={16} />}
          color={color}
          onClick={() => onNavigateTab('inbox')}
        />
        <KpiCard
          label="Today's Volume"
          value={kpis.todayVolume}
          subtext={
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: volumeDelta >= 0 ? '#ef4444' : '#22c55e' }}>
              {volumeDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {volumeDelta >= 0 ? '+' : ''}{volumePct}% vs yesterday
            </span>
          }
          icon={<Zap size={16} />}
          color={color}
          onClick={() => onNavigateTab('inbox')}
        />
        <KpiCard
          label="Unread Messages"
          value={kpis.unreadMessages}
          icon={<MessageSquare size={16} />}
          color={color}
          highlight={kpis.unreadMessages > 10}
          onClick={() => onNavigateTab('inbox')}
        />
      </div>

      {/* ── Urgent Attention Queue ── */}
      <div style={{ background: 'var(--samurai-card)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: TEXT }}>Urgent Attention</h3>
          <span style={{ fontSize: '0.72rem', color: MUTED, marginLeft: 'auto' }}>{urgentQueue.length} items</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {urgentQueue.map((item) => (
            <div
              key={item.id}
              onClick={() => onNavigateTab('inbox')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${item.priority === 'critical' ? 'rgba(239,68,68,0.3)' : BORDER}`,
                background: item.priority === 'critical' ? 'rgba(239,68,68,0.06)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = item.priority === 'critical' ? 'rgba(239,68,68,0.06)' : 'transparent')}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: item.priority === 'critical' ? '#ef4444' : '#f59e0b',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: MUTED }}>
                  {item.customer} · {item.channel} · {item.id}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: item.minutesLeft < 60 ? '#ef4444' : '#f59e0b' }}>
                  {item.minutesLeft < 60 ? `${item.minutesLeft}m left` : `${Math.round(item.minutesLeft / 60)}h left`}
                </div>
                <div style={{ fontSize: '0.65rem', color: MUTED }}>{item.type.replace(/_/g, ' ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Channel Health + Trends Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Channel Health Pulse */}
        <div style={{ background: 'var(--samurai-card)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: TEXT }}>Channel Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {channelHealth.map((ch) => (
              <div
                key={ch.platform}
                onClick={() => onNavigateTab('inbox')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: ch.status === 'green' ? '#22c55e' : ch.status === 'yellow' ? '#f59e0b' : '#ef4444',
                }} />
                <span style={{ flex: 1, fontSize: '0.8rem', color: TEXT, textTransform: 'capitalize' }}>{ch.platform}</span>
                <span style={{ fontSize: '0.72rem', color: MUTED }}>
                  {ch.status === 'red' ? ch.lastSync : `${ch.backlog} pending`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Sparklines */}
        <div style={{ background: 'var(--samurai-card)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: TEXT }}>7-Day Trends</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['volume', 'responseTime', 'csat'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMetric(m)}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', cursor: 'pointer',
                    border: `1px solid ${trendMetric === m ? color : BORDER}`,
                    background: trendMetric === m ? `${color}20` : 'transparent',
                    color: trendMetric === m ? color : MUTED,
                  }}
                >
                  {m === 'volume' ? 'Volume' : m === 'responseTime' ? 'Response' : 'CSAT'}
                </button>
              ))}
            </div>
          </div>
          <MiniSparkline data={trends[trendMetric]} labels={trends.dates} color={color} />
        </div>
      </div>

      {/* ── AI Insight Banner ── */}
      <div
        onClick={() => onNavigateTab(aiInsight.actionTab)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          borderRadius: 10, cursor: 'pointer',
          background: `${LIME}12`, border: `1px solid ${LIME}40`,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = `${LIME}20`)}
        onMouseLeave={(e) => (e.currentTarget.style.background = `${LIME}12`)}
      >
        <Zap size={18} style={{ color: LIME, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.82rem', color: TEXT }}>{aiInsight.text}</div>
          <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>Click to view in Product Feedback →</div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function KpiCard({ label, value, subtext, icon, color, highlight, onClick }: {
  label: string; value: string | number; subtext?: React.ReactNode; icon: React.ReactNode; color: string; highlight?: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
        background: highlight ? 'rgba(239,68,68,0.06)' : 'var(--samurai-card)',
        border: `1px solid ${highlight ? 'rgba(239,68,68,0.3)' : BORDER}`,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = highlight ? 'rgba(239,68,68,0.3)' : BORDER)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color: MUTED }}>{icon}</span>
        <span style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: TEXT }}>{value}</div>
      {subtext && <div style={{ marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

function MiniSparkline({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  // Chart area with padding for axes
  const padL = 36;
  const padB = 20;
  const padT = 8;
  const padR = 8;
  const svgW = 400;
  const svgH = 140;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const points = data.map((v, i) => {
    const x = padL + (i / (data.length - 1)) * chartW;
    const y = padT + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');

  // Y-axis ticks (4 steps)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = min + (range * i) / 4;
    const y = padT + chartH - (i / 4) * chartH;
    return { val: Math.round(val), y };
  });

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={padL} y1={t.y} x2={svgW - padR} y2={t.y} stroke={BORDER} strokeWidth="0.5" strokeDasharray="3,3" />
        ))}

        {/* Y-axis line */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />

        {/* X-axis line */}
        <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke={BORDER} strokeWidth="1" />

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={padL - 5} y={t.y + 3} textAnchor="end" fontSize="9" fill={MUTED}>{t.val}</text>
        ))}

        {/* Data line */}
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data dots */}
        {data.map((v, i) => {
          const x = padL + (i / (data.length - 1)) * chartW;
          const y = padT + chartH - ((v - min) / range) * chartH;
          return (
            <circle key={i} cx={x} cy={y} r="3.5" fill={color} opacity="0.8">
              <title>{`${labels[i]}: ${v}`}</title>
            </circle>
          );
        })}

        {/* X-axis labels */}
        {labels.map((l, i) => {
          const x = padL + (i / (labels.length - 1)) * chartW;
          return (
            <text key={i} x={x} y={padT + chartH + 15} textAnchor="middle" fontSize="9" fill={MUTED}>{l}</text>
          );
        })}
      </svg>
    </div>
  );
}
