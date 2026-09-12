import { useState, useMemo } from 'react';
import type { CsDashboardData, CsCustomer } from '../../../lib/types';
import { Search, ChevronLeft, TrendingUp, TrendingDown, Zap, ShoppingBag, MessageSquare, RotateCcw, Star, AlertTriangle } from 'lucide-react';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const CARD = 'var(--samurai-card)';

const SEGMENTS = [
  { id: 'all', label: 'All Customers' },
  { id: 'vip', label: 'VIP' },
  { id: 'churn-risk', label: 'Churn Risk' },
  { id: 'high-spenders', label: 'High Spenders' },
  { id: 'frequent-returners', label: 'Frequent Returners' },
  { id: 'new', label: 'New (<90d)' },
];

interface Props {
  data: CsDashboardData;
  color: string;
  onExecuteAction: (payload: { type: string; target: string; details?: string }) => void;
}

export function CsCustomersTab({ data, color, onExecuteAction }: Props) {
  const [searchText, setSearchText] = useState('');
  const [activeSegment, setActiveSegment] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CsCustomer | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const filteredCustomers = useMemo(() => {
    let custs = data.customers;
    if (activeSegment === 'vip') custs = custs.filter((c) => c.opportunityTags.includes('vip'));
    else if (activeSegment === 'churn-risk') custs = custs.filter((c) => c.riskTags.includes('churn-risk'));
    else if (activeSegment === 'high-spenders') custs = custs.filter((c) => c.ltv > 3000);
    else if (activeSegment === 'frequent-returners') custs = custs.filter((c) => c.ticketCount >= 4);
    else if (activeSegment === 'new') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      custs = custs.filter((c) => new Date(c.joinedDate) >= cutoff);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      custs = custs.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
      );
    }
    return custs.sort((a, b) => b.healthScore - a.healthScore);
  }, [data.customers, activeSegment, searchText]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleAction(action: string, customerName: string, type: string) {
    onExecuteAction({ type, target: customerName, details: action });
    showToast(`Action executed: ${action}`);
  }

  // Detail view
  if (selectedCustomer) {
    const c = selectedCustomer;
    const healthColor = c.healthScore >= 70 ? '#22c55e' : c.healthScore >= 40 ? '#f59e0b' : '#ef4444';

    return (
      <div className="sd-stack" style={{ gap: 14 }}>
        <button
          onClick={() => setSelectedCustomer(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED, fontSize: '0.82rem', padding: 0 }}
        >
          <ChevronLeft size={16} /> Back to list
        </button>

        {/* Profile Header */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: TEXT }}>{c.name}</h2>
              <div style={{ fontSize: '0.78rem', color: MUTED, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>📧 {c.email}</span>
                <span>📱 {c.phone}</span>
                <span>📅 Joined {c.joinedDate}</span>
              </div>
            </div>
            {/* Health Gauge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `3px solid ${healthColor}`, fontSize: '1.1rem', fontWeight: 700, color: healthColor,
              }}>
                {c.healthScore}
              </div>
              <div style={{ fontSize: '0.62rem', color: MUTED, marginTop: 2 }}>Health Score</div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
            {[
              { label: 'LTV', value: `RM${c.ltv.toLocaleString()}`, icon: <TrendingUp size={14} /> },
              { label: 'Orders', value: c.totalOrders, icon: <ShoppingBag size={14} /> },
              { label: 'Tickets', value: c.ticketCount, icon: <MessageSquare size={14} /> },
              { label: 'Avg Sentiment', value: c.avgSentiment.toFixed(1), icon: c.avgSentiment >= 0 ? <Star size={14} /> : <AlertTriangle size={14} /> },
            ].map((s) => (
              <div key={s.label} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: MUTED, marginBottom: 4 }}>
                  {s.icon} <span style={{ fontSize: '0.68rem' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: TEXT }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {c.riskTags.map((t) => (
              <span key={t} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>⚠ {t}</span>
            ))}
            {c.opportunityTags.map((t) => (
              <span key={t} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, background: `${color}15`, color }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Timeline + Actions side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Timeline */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Interaction Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {c.timeline.map((evt, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 12, position: 'relative' }}>
                  {/* Vertical line */}
                  {i < c.timeline.length - 1 && (
                    <div style={{ position: 'absolute', left: 7, top: 18, bottom: 0, width: 1, background: BORDER }} />
                  )}
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: evt.type === 'order' ? color : evt.type === 'ticket' ? '#f59e0b' : evt.type === 'return' ? '#ef4444' : '#22c55e',
                    opacity: 0.7,
                  }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: TEXT }}>{evt.detail}</div>
                    <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: 2 }}>
                      {evt.date} · {evt.type} {evt.status && `· ${evt.status}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Suggestions */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Suggested Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.actionSuggestions.map((sug, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: '0.82rem', color: TEXT, marginBottom: 4 }}>{sug.action}</div>
                  <div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 8 }}>{sug.reason}</div>
                  <button
                    onClick={() => handleAction(sug.action, c.name, sug.type)}
                    style={{
                      padding: '5px 14px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      border: 'none', background: color, color: '#0a0a0a',
                    }}
                  >
                    Execute →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="sd-stack" style={{ gap: 12 }}>
      {/* Search + Segments */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, email, phone…"
            style={{
              width: '100%', padding: '7px 10px 7px 28px', borderRadius: 6, fontSize: '0.78rem',
              border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: '0.72rem', cursor: 'pointer',
                border: `1px solid ${activeSegment === seg.id ? color : BORDER}`,
                background: activeSegment === seg.id ? `${color}20` : 'transparent',
                color: activeSegment === seg.id ? color : MUTED,
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {filteredCustomers.map((c) => {
          const healthColor = c.healthScore >= 70 ? '#22c55e' : c.healthScore >= 40 ? '#f59e0b' : '#ef4444';
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                background: CARD, border: `1px solid ${BORDER}`, transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{c.name}</div>
                  <div style={{ fontSize: '0.7rem', color: MUTED }}>{c.email}</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${healthColor}`, fontSize: '0.82rem', fontWeight: 700, color: healthColor,
                }}>
                  {c.healthScore}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: MUTED, marginBottom: 8 }}>
                <span>LTV RM{c.ltv.toLocaleString()}</span>
                <span>{c.totalOrders} orders</span>
                <span>{c.ticketCount} tickets</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {c.riskTags.map((t) => (
                  <span key={t} style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{t}</span>
                ))}
                {c.opportunityTags.map((t) => (
                  <span key={t} style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 3, background: `${color}12`, color }}>{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {filteredCustomers.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: MUTED, fontSize: '0.85rem' }}>No customers match filters</div>
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
