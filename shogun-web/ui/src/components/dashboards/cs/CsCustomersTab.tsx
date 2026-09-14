import { useState, useMemo } from 'react';
import type { CsDashboardData, CsCustomer } from '../../../lib/types';
import { Search, TrendingUp, TrendingDown, Zap, ShoppingBag, MessageSquare, RotateCcw, Star, AlertTriangle, ChevronRight, Activity, DollarSign, PackageOpen } from 'lucide-react';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const CARD = 'var(--samurai-card)';

const SEGMENTS = [
  { id: 'all', label: 'All Customers' },
  { id: 'vip', label: '⭐ VIP' },
  { id: 'churn-risk', label: '⚠️ Churn Risk' },
  { id: 'high-spenders', label: '💎 High Spenders' },
  { id: 'frequent-returners', label: '🔄 Frequent Returners' },
  { id: 'new', label: '🆕 New (<90d)' },
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
    const healthLabel = c.healthScore >= 70 ? 'Healthy' : c.healthScore >= 40 ? 'At Risk' : 'Critical';

    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        {/* Header with back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSelectedCustomer(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: `1px solid ${BORDER}`, background: 'transparent',
              cursor: 'pointer', color: MUTED, fontSize: '0.82rem',
              padding: '6px 12px', borderRadius: 8,
            }}
          >
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: TEXT }}>{c.name}</h2>
        </div>

        {/* Top Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {/* Health Score Card */}
          <div style={{
            gridColumn: 'span 2',
            padding: 16, borderRadius: 12,
            background: `linear-gradient(135deg, ${healthColor}15, ${healthColor}05)`,
            border: `1px solid ${healthColor}40`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Health Score</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: healthColor, lineHeight: 1 }}>{c.healthScore}</div>
                <div style={{ fontSize: '0.82rem', color: healthColor, marginTop: 4, fontWeight: 600 }}>{healthLabel}</div>
              </div>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                border: `4px solid ${healthColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
              }}>
                <Activity size={28} style={{ color: healthColor }} />
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${c.healthScore}%`, height: '100%', background: healthColor, borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* LTV */}
          <StatCard
            icon={<DollarSign size={20} />}
            label="Lifetime Value"
            value={`RM${c.ltv.toLocaleString()}`}
            trend={c.ltv > 3000 ? 'high' : 'normal'}
            color={color}
          />
          {/* Orders */}
          <StatCard
            icon={<PackageOpen size={20} />}
            label="Total Orders"
            value={c.totalOrders.toString()}
            trend={c.totalOrders > 20 ? 'high' : 'normal'}
            color={color}
          />
          {/* Tickets */}
          <StatCard
            icon={<MessageSquare size={20} />}
            label="Support Tickets"
            value={c.ticketCount.toString()}
            trend={c.ticketCount > 3 ? 'low' : 'normal'}
            color={color}
          />
          {/* Sentiment */}
          <StatCard
            icon={<Star size={20} />}
            label="Avg Sentiment"
            value={c.avgSentiment.toFixed(1)}
            trend={c.avgSentiment >= 0 ? 'high' : 'low'}
            color={color}
          />
        </div>

        {/* Info + Tags Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Contact Info */}
          <div style={{ padding: 14, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: TEXT }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: MUTED }}>📧</span>
                <span style={{ color: TEXT }}>{c.email}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: MUTED }}>📱</span>
                <span style={{ color: TEXT }}>{c.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: MUTED }}>📅</span>
                <span style={{ color: TEXT }}>Joined {new Date(c.joinedDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ padding: 14, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: TEXT }}>Customer Tags</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.riskTags.length === 0 && c.opportunityTags.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: MUTED }}>No tags assigned</span>
              )}
              {c.riskTags.map((t) => (
                <span key={t} style={{
                  fontSize: '0.72rem', padding: '4px 10px', borderRadius: 6,
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <AlertTriangle size={12} /> {t.replace(/-/g, ' ')}
                </span>
              ))}
              {c.opportunityTags.map((t) => (
                <span key={t} style={{
                  fontSize: '0.72rem', padding: '4px 10px', borderRadius: 6,
                  background: `${color}15`, color,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Zap size={12} /> {t.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline + Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
          {/* Timeline */}
          <div style={{ padding: 14, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Interaction Timeline</h3>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {c.timeline.map((evt, i) => {
                const iconMap: Record<string, string> = {
                  order: '🛒', ticket: '🎫', return: '↩️', feedback: '⭐', chat: '💬',
                };
                const colorMap: Record<string, string> = {
                  order: color, ticket: '#f59e0b', return: '#ef4444', feedback: '#22c55e', chat: '#06b6d4',
                };
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                    {i < c.timeline.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 11, top: 22, bottom: 0,
                        width: 2, background: BORDER,
                      }} />
                    )}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: colorMap[evt.type] || color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem',
                    }}>
                      {iconMap[evt.type] || '•'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: TEXT, marginBottom: 2 }}>{evt.detail}</div>
                      <div style={{ fontSize: '0.7rem', color: MUTED }}>
                        {evt.date} · {evt.type.charAt(0).toUpperCase() + evt.type.slice(1)}
                        {evt.status && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>{evt.status}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Suggestions */}
          <div style={{ padding: 14, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: TEXT }}>Suggested Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.actionSuggestions.map((sug, i) => (
                <div key={i} style={{
                  padding: '12px', borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: TEXT, marginBottom: 4 }}>{sug.action}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 10 }}>{sug.reason}</div>
                  <button
                    onClick={() => handleAction(sug.action, c.name, sug.type)}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: color, color: '#0a0a0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Zap size={14} /> Execute Action
                  </button>
                </div>
              ))}
              {c.actionSuggestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: MUTED, fontSize: '0.82rem' }}>
                  No suggested actions at this time
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* Search + Segments */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, email, or phone…"
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, fontSize: '0.82rem',
              border: `1px solid ${BORDER}`, background: CARD, color: TEXT, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${activeSegment === seg.id ? color : BORDER}`,
                background: activeSegment === seg.id ? `${color}20` : CARD,
                color: activeSegment === seg.id ? color : MUTED,
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filteredCustomers.map((c) => {
          const healthColor = c.healthScore >= 70 ? '#22c55e' : c.healthScore >= 40 ? '#f59e0b' : '#ef4444';
          const healthLabel = c.healthScore >= 70 ? 'Healthy' : c.healthScore >= 40 ? 'At Risk' : 'Critical';

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              style={{
                padding: '16px', borderRadius: 12, cursor: 'pointer',
                background: CARD, border: `1px solid ${BORDER}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: TEXT, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
                </div>
                {/* Health Badge */}
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: `${healthColor}15`,
                  border: `1px solid ${healthColor}40`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: healthColor, lineHeight: 1 }}>{c.healthScore}</div>
                  <div style={{ fontSize: '0.58rem', color: healthColor, fontWeight: 600, textTransform: 'uppercase' }}>{healthLabel}</div>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                <MiniStat label="LTV" value={`RM${(c.ltv / 1000).toFixed(1)}k`} />
                <MiniStat label="Orders" value={c.totalOrders.toString()} />
                <MiniStat label="Tickets" value={c.ticketCount.toString()} />
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {c.riskTags.slice(0, 3).map((t) => (
                  <span key={t} style={{
                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  }}>
                    ⚠ {t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                ))}
                {c.opportunityTags.slice(0, 3).map((t) => (
                  <span key={t} style={{
                    fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                    background: `${color}12`, color,
                  }}>
                    ⚡ {t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                ))}
              </div>

              {/* Hover indicator */}
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '0.72rem', color: MUTED,
              }}>
                <span>Last interaction: {new Date(c.lastInteraction).toLocaleDateString()}</span>
                <ChevronRight size={14} style={{ color }} />
              </div>
            </div>
          );
        })}
      </div>
      {filteredCustomers.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED, fontSize: '0.85rem' }}>
          No customers match your filters
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

/* ── Helper Components ── */

function StatCard({ icon, label, value, trend, color }: {
  icon: React.ReactNode; label: string; value: string; trend: 'high' | 'low' | 'normal'; color: string;
}) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: trend === 'high' ? '#22c55e' : trend === 'low' ? '#ef4444' : MUTED }}>{icon}</span>
        <span style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{value}</div>
    </div>
  );
}
