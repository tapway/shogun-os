import { useState, useMemo, useRef, useEffect } from 'react';
import type { CsDashboardData, CsMessage } from '../../../lib/types';
import { Search, Filter, Send, MoreHorizontal, CheckSquare, Square, X, Tag, UserPlus, Archive } from 'lucide-react';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const CARD = 'var(--samurai-card)';

const PLATFORM_ICONS: Record<string, string> = {
  shopee: '🟠', lazada: '🔵', tiktok: '⚫', whatsapp: '🟢', woocommerce: '🟣', shopify: '🛒',
};

interface Props {
  data: CsDashboardData;
  color: string;
  onMarkRead: (id: string) => void;
  onFlag: (msgId: string, flag: string) => void;
  onBulkAction: (payload: { ids: string[]; action: string; value?: string }) => void;
}

export function CsInboxTab({ data, color, onMarkRead, onFlag, onBulkAction }: Props) {
  const [selectedMsg, setSelectedMsg] = useState<CsMessage | null>(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterFlag, setFilterFlag] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [sentMessages, setSentMessages] = useState<Record<string, { from: 'agent'; text: string; time: string }[]>>({});
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thread to bottom when new messages are sent
  useEffect(() => {
    if (selectedMsg && sentMessages[selectedMsg.id]?.length) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sentMessages, selectedMsg]);

  const filteredMessages = useMemo(() => {
    let msgs = data.messages;
    if (filterPlatform !== 'all') msgs = msgs.filter((m) => m.platform === filterPlatform);
    if (filterFlag !== 'all') msgs = msgs.filter((m) => m.flag === filterFlag);
    if (searchText) {
      const q = searchText.toLowerCase();
      msgs = msgs.filter((m) =>
        m.sender.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q) ||
        m.orderId.toLowerCase().includes(q),
      );
    }
    // Sort: critical first, then important, then by timestamp desc
    return [...msgs].sort((a, b) => {
      const flagOrder = { critical: 0, important: 1, normal: 2 };
      if (flagOrder[a.flag] !== flagOrder[b.flag]) return flagOrder[a.flag] - flagOrder[b.flag];
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [data.messages, filterPlatform, filterFlag, searchText]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function handleSelectMsg(msg: CsMessage) {
    setSelectedMsg(msg);
    if (msg.unread) onMarkRead(msg.id);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  function handleBulk(action: string, value?: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onBulkAction({ ids, action, value });
    showToast(`${action} applied to ${ids.length} message(s)`);
    setSelectedIds(new Set());
    setBulkMenuOpen(false);
  }

  function handleSendReply() {
    if (!replyText.trim() || !selectedMsg) return;
    const newMsg = { from: 'agent' as const, text: replyText.trim(), time: new Date().toISOString() };
    setSentMessages((prev) => ({
      ...prev,
      [selectedMsg.id]: [...(prev[selectedMsg.id] || []), newMsg],
    }));
    showToast(`Reply sent to ${selectedMsg.sender}`);
    setReplyText('');
  }

  function handleFlagChange(msgId: string, newFlag: string) {
    onFlag(msgId, newFlag);
    showToast(`Flag updated to ${newFlag}`);
  }

  return (
    <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 220px)', minHeight: 500 }}>
      {/* ── Left: Message Feed ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* Filters */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search messages…"
              style={{
                width: '100%', padding: '6px 10px 6px 28px', borderRadius: 6, fontSize: '0.78rem',
                border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, outline: 'none',
              }}
            />
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}
          >
            <option value="all">All Platforms</option>
            {['shopee', 'lazada', 'tiktok', 'whatsapp', 'woocommerce', 'shopify'].map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterFlag}
            onChange={(e) => setFilterFlag(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}
          >
            <option value="all">All Flags</option>
            <option value="critical">🔴 Critical</option>
            <option value="important">🟡 Important</option>
            <option value="normal">⚪ Normal</option>
          </select>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, background: `${color}10` }}>
            <span style={{ fontSize: '0.78rem', color: TEXT }}>{selectedIds.size} selected</span>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
                style={{ padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${color}`, background: `${color}20`, color }}
              >
                Actions ▾
              </button>
              {bulkMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 10,
                  background: 'var(--samurai-bg)', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', minWidth: 160,
                }}>
                  {[
                    { label: 'Mark as Read', action: 'mark_read' },
                    { label: 'Assign to Sarah', action: 'assign', value: 'Sarah' },
                    { label: 'Assign to Aiman', action: 'assign', value: 'Aiman' },
                    { label: 'Tag: Urgent', action: 'tag', value: 'urgent' },
                    { label: 'Archive', action: 'archive' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleBulk(item.action, item.value)}
                      style={{ display: 'block', width: '100%', padding: '8px 14px', fontSize: '0.78rem', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', color: TEXT }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setSelectedIds(new Set())} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Message List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredMessages.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>No messages match filters</div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMsg(msg)}
                style={{
                  display: 'flex', gap: 10, padding: '10px 12px', cursor: 'pointer',
                  borderBottom: `1px solid ${BORDER}`,
                  background: selectedMsg?.id === msg.id ? `${color}10` : msg.unread ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderLeft: msg.flag === 'critical' ? '3px solid #ef4444' : msg.flag === 'important' ? '3px solid #f59e0b' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = msg.unread ? 'rgba(255,255,255,0.03)' : 'transparent'; }}
              >
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(msg.id); }} style={{ paddingTop: 2, cursor: 'pointer' }}>
                  {selectedIds.has(msg.id) ? <CheckSquare size={14} style={{ color }} /> : <Square size={14} style={{ color: MUTED }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.9rem' }}>{PLATFORM_ICONS[msg.platform] || '💬'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: msg.unread ? 600 : 400, color: TEXT }}>{msg.sender}</span>
                    {msg.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.65rem', color: MUTED, marginLeft: 'auto', flexShrink: 0 }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: msg.unread ? TEXT : MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.preview}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 4, background: `${BORDER}`, color: MUTED }}>{msg.orderId}</span>
                    {msg.tags.slice(0, 3).map((t) => (
                      <span key={t} style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 4, background: `${color}15`, color }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '6px 12px', borderTop: `1px solid ${BORDER}`, fontSize: '0.68rem', color: MUTED, textAlign: 'center' }}>
          {filteredMessages.length} of {data.messages.length} messages
        </div>
      </div>

      {/* ── Right: Thread Panel ── */}
      {selectedMsg ? (
        <div style={{ width: 380, display: 'flex', flexDirection: 'column', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Thread Header */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>{PLATFORM_ICONS[selectedMsg.platform]}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{selectedMsg.sender}</span>
              </div>
              <button onClick={() => setSelectedMsg(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: MUTED, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>Order: {selectedMsg.orderId}</span>
              <span>·</span>
              <span>Sentiment: {selectedMsg.sentiment > 0 ? '😊' : selectedMsg.sentiment < -0.5 ? '😠' : '😐'} {selectedMsg.sentiment.toFixed(1)}</span>
            </div>
            {/* Flag Override */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {(['critical', 'important', 'normal'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFlagChange(selectedMsg.id, f)}
                  style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: '0.65rem', cursor: 'pointer',
                    border: `1px solid ${selectedMsg.flag === f ? (f === 'critical' ? '#ef4444' : f === 'important' ? '#f59e0b' : BORDER) : BORDER}`,
                    background: selectedMsg.flag === f ? (f === 'critical' ? 'rgba(239,68,68,0.15)' : f === 'important' ? 'rgba(245,158,11,0.15)' : 'transparent') : 'transparent',
                    color: selectedMsg.flag === f ? (f === 'critical' ? '#ef4444' : f === 'important' ? '#f59e0b' : TEXT) : MUTED,
                  }}
                >
                  {f === 'critical' ? '🔴' : f === 'important' ? '🟡' : '⚪'} {f}
                </button>
              ))}
            </div>
            {selectedMsg.flagReason && (
              <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 6, fontStyle: 'italic' }}>
                Auto-flag: {selectedMsg.flagReason}
              </div>
            )}
          </div>

          {/* Thread Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...selectedMsg.thread, ...(sentMessages[selectedMsg.id] || [])].map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: t.from === 'agent' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: '0.8rem', lineHeight: 1.4,
                  background: t.from === 'agent' ? `${color}20` : 'rgba(255,255,255,0.06)',
                  color: TEXT,
                  borderBottomRightRadius: t.from === 'agent' ? 4 : 12,
                  borderBottomLeftRadius: t.from === 'customer' ? 4 : 12,
                }}>
                  {t.text}
                </div>
                <span style={{ fontSize: '0.6rem', color: MUTED, marginTop: 2 }}>
                  {t.from === 'agent' ? 'You' : selectedMsg.sender} · {new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Reply Composer */}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {['Thanks for reaching out!', 'Let me check on that.', 'Your refund has been processed.'].map((tpl) => (
                <button
                  key={tpl}
                  onClick={() => setReplyText(tpl)}
                  style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', cursor: 'pointer', border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED }}
                >
                  {tpl.slice(0, 20)}…
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder="Type a reply…"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem',
                  border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, outline: 'none',
                }}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, cursor: replyText.trim() ? 'pointer' : 'default',
                  border: 'none', background: replyText.trim() ? color : BORDER, color: '#0a0a0a', fontWeight: 600,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ width: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, color: MUTED, fontSize: '0.85rem' }}>
          Select a message to view thread
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '10px 20px', borderRadius: 8,
          background: color, color: '#0a0a0a', fontSize: '0.82rem', fontWeight: 600, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease',
        }}>
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}
