import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import type { SupportTicketItem } from '../../../lib/types';
import { TicketDetailModal } from './TicketDetailModal';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE = 'var(--samurai-surface)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const NAVY = '#1e3a5f';
const BLUE = '#3b82f6';
const GREEN = '#10b981';
const RED = '#ef4444';
const ORANGE = '#f59e0b';

interface SupportStats {
  openTickets?: number;
  slaBreaches?: number;
  criticalCount?: number;
  waitingCustomer?: number;
  avgResponseHours?: number;
  openByCustomer?: Record<string, number>;
  openByCategory?: Record<string, number>;
  workloadByAssignee?: Record<string, number>;
}

function HorizontalBarChart({ data, color }: { data: Record<string, number>; color: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {entries.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: TEXT, minWidth: '80px', textAlign: 'right' }}>{label}</span>
          <div style={{ flex: 1, height: '20px', background: SURFACE_2, borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: '4px' }} />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: TEXT, minWidth: '20px' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function SupportTab({ dept, color }: Props) {
  const [tab, setTab] = useState<'tickets' | 'email'>('tickets');
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<SupportTicketItem | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['support-tickets', dept],
    queryFn: () => departmentsApi.supportTickets(dept),
    refetchInterval: 120_000,
  });

  const statsQuery = useQuery({
    queryKey: ['support-stats', dept],
    queryFn: () => departmentsApi.supportStats(dept),
    refetchInterval: 120_000,
  });

  const allTickets = ticketsQuery.data?.tickets ?? [];
  const stats = statsQuery.data as SupportStats | undefined;

  // Extract unique values for filters
  const customers = useMemo(() => [...new Set(allTickets.map(t => t.customer).filter(Boolean))].sort(), [allTickets]);
  const categories = useMemo(() => [...new Set(allTickets.map(t => t.category).filter(Boolean))].sort(), [allTickets]);
  const tiers = useMemo(() => [...new Set(allTickets.map(t => t.tier).filter(Boolean))].sort(), [allTickets]);
  const statuses = useMemo(() => [...new Set(allTickets.map(t => t.status).filter(Boolean))].sort(), [allTickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTickets.filter(t => {
      if (customerFilter && t.customer !== customerFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (tierFilter && t.tier !== tierFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (q && !`${t.id} ${t.title ?? ''} ${t.customer ?? ''} ${t.reporter ?? ''} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTickets, search, customerFilter, priorityFilter, categoryFilter, tierFilter, statusFilter]);

  if (ticketsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading support tickets…</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.8rem',
    minWidth: '140px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  const statCardStyle: React.CSSProperties = {
    background: SURFACE,
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flex: '1',
    minWidth: '140px',
  };

  return (
    <div className="sd-stack">
      {/* Header */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: NAVY, margin: '0 0 16px' }}>Support Dashboard</h2>

      {/* KPI Cards - 5 cards */}
      <div className="grid gap-4 md:grid-cols-5" style={{ marginBottom: '16px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Open Tickets</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: NAVY }}>{stats?.openTickets ?? 0}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>SLA Breaches</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: RED }}>{stats?.slaBreaches ?? 0}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Critical (P1+P2)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ORANGE }}>{stats?.criticalCount ?? 0}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Waiting Customer</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: BLUE }}>{stats?.waitingCustomer ?? 0}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: '8px' }}>Avg Response (H)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: GREEN }}>{stats?.avgResponseHours?.toFixed(1) ?? '0.0'}</div>
        </div>
      </div>

      {/* Horizontal Bar Charts - 3 across */}
      <div className="grid gap-4 lg:grid-cols-3" style={{ marginBottom: '16px' }}>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Open by Customer</h3>
          <HorizontalBarChart data={stats?.openByCustomer ?? {}} color={BLUE} />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Open by Category</h3>
          <HorizontalBarChart data={stats?.openByCategory ?? {}} color={GREEN} />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Workload by Assignee</h3>
          <HorizontalBarChart data={stats?.workloadByAssignee ?? {}} color={ORANGE} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setTab('tickets')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: tab === 'tickets' ? NAVY : '#f3f4f6',
            color: tab === 'tickets' ? '#fff' : MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🎫 Tickets
        </button>
        <button
          onClick={() => setTab('email')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: tab === 'email' ? NAVY : '#f3f4f6',
            color: tab === 'email' ? '#fff' : MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ✉️ Email Inbox
        </button>
      </div>

      {tab === 'tickets' && (
        <>
          {/* Search & Filter Panel */}
          <div className="sd-chart-card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Search</label>
              <input
                type="text"
                placeholder="Search by ticket ID, title, customer, reporter, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...selectStyle, width: '100%', minWidth: 'auto' }}
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label style={labelStyle}>Customer</label>
                <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Customers</option>
                  {customers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Priorities</option>
                  {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tier</label>
                <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Tiers</option>
                  {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Statuses</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="sd-chart-card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: NAVY, margin: 0 }}>All Tickets</h3>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>{filtered.length} of {allTickets.length}</span>
            </div>
            {filtered.length === 0 ? (
              <div className="sd-empty" style={{ padding: '32px 0' }}>
                <p>No tickets match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', width: '40px' }}><input type="checkbox" /></th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Customer</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Title</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Priority</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Tier</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Assigned</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Last Reply</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Last Activity</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>SLA</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Age</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ticket, i) => (
                      <tr
                        key={ticket.id}
                        onClick={() => setSelected(ticket)}
                        style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                      >
                        <td style={{ padding: '12px 16px' }}><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: BLUE, fontWeight: 600 }}>{ticket.id}</td>
                        <td style={{ padding: '12px 16px', color: MUTED }}>{ticket.customer || '—'}</td>
                        <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                          <div className="truncate" style={{ color: TEXT }} title={ticket.title}>{ticket.title || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px',
                            background: BLUE, color: '#fff',
                          }}>
                            {ticket.priority || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: MUTED }}>{ticket.category || '—'}</td>
                        <td style={{ padding: '12px 16px', color: MUTED }}>{ticket.tier || '—'}</td>
                        <td style={{ padding: '12px 16px', color: MUTED }}>{ticket.assignedTo || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: MUTED }}>{ticket.lastReply || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: MUTED }}>{ticket.lastActivity || '—'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {(ticket as any).slaMet ? (
                            <span style={{ color: GREEN }}>✅</span>
                          ) : (
                            <span style={{ color: RED }}>🔴</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: MUTED }}>{(ticket as any).age || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px',
                            background: ticket.status === 'Closed' ? '#f3f4f6' : ticket.status === 'In Progress' ? '#fef3c7' : ticket.status === 'Open' ? '#dbeafe' : '#f3f4f6',
                            color: ticket.status === 'Closed' ? MUTED : ticket.status === 'In Progress' ? ORANGE : ticket.status === 'Open' ? BLUE : MUTED,
                          }}>
                            {ticket.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'email' && (
        <EmailInboxView dept={dept} color={color} />
      )}

      {selected && <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Email Inbox View ────────────────────────────────────────────────────────

interface EmailItem {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  timestamp: string;
  unread: boolean;
  isNewTicket: boolean;
  body?: string;
}

const MOCK_EMAILS: EmailItem[] = [
  { id: '1', subject: 'Re: [Support] [TS-2026-371] 1ST FLOOR DOOR CANNOT CLOSE DUE TO SENSOR PROBLEM - URGENT', sender: 'Tapway Support', senderEmail: 'support@gotapway.com', timestamp: 'Mon, 7 Sep 2026 00:28:58 -0700', unread: false, isNewTicket: false },
  { id: '2', subject: '[Tapway] Please moderate: "Technical Support Engineer (On-site Support) - Contract"', sender: 'Site Mailer', senderEmail: 'site-39c73e45@em0001.sitemailerservice.com', timestamp: 'Mon, 07 Sep 2026 06:10:44 +0000 (UTC)', unread: true, isNewTicket: true, body: 'A new comment on the post "Technical Support Engineer (On-site Support) - Contract" is waiting for your approval.\n\nhttps://gotapway.com/technology-team/technical-support-engineer-on-site-support-contract\n\nAuthor: jiliokvip\nIP address: 152.0.45.0.46.121' },
  { id: '3', subject: '[Tapway] Please moderate: "AI Vision in Southeast Asia: $25.7B Market by 2030"', sender: 'Site Mailer', senderEmail: 'site-39c73e45@em0001.sitemailerservice.com', timestamp: 'Mon, 07 Sep 2026 05:31:26 +0000 (UTC)', unread: true, isNewTicket: true, body: 'Market research report on AI Vision adoption across Southeast Asia.' },
  { id: '4', subject: 'Re:INC-09729 | REID and Recognition Zone Alignment Issue', sender: 'Payne Zhai via Support', senderEmail: 'support@gotapway.com', timestamp: 'Mon, 7 Sep 2026 12:24:11 +0800', unread: false, isNewTicket: true, body: 'Follow-up on recognition zone alignment issue.' },
  { id: '5', subject: 'INC-09729 | Re: REID and Recognition Zone Alignment Issue', sender: 'HelpDesk via Support', senderEmail: 'support@gotapway.com', timestamp: 'Mon, 7 Sep 2026 11:30:27 +0800', unread: false, isNewTicket: true, body: 'Internal escalation for INC-09729.' },
  { id: '6', subject: 'REID and Recognition Zone Alignment Issue', sender: 'Abdul Azeem', senderEmail: 'azeem@gotapway.com', timestamp: 'Mon, 7 Sep 2026 11:27:37 +0800', unread: true, isNewTicket: true, body: 'Initial report of REID alignment issue at client site.' },
];

function EmailInboxView({ dept, color }: { dept: string; color: string }) {
  const [newTicketEmail, setNewTicketEmail] = useState<EmailItem | null>(null);

  return (
    <div className="sd-stack">
      {/* Header */}
      <div className="sd-chart-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: NAVY, margin: 0 }}>support@gotapway.com — Recent Emails</h3>
        <button style={{ background: 'none', border: 'none', color: BLUE, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
      </div>

      {/* Email list */}
      <div className="sd-chart-card" style={{ padding: 0 }}>
        {MOCK_EMAILS.map((email, i) => (
          <div
            key={email.id}
            onClick={() => email.isNewTicket && setNewTicketEmail(email)}
            style={{
              padding: '14px 20px',
              borderBottom: i < MOCK_EMAILS.length - 1 ? `1px solid ${BORDER}` : 'none',
              background: email.unread ? '#f0f7ff' : '#fff',
              cursor: email.isNewTicket ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {/* Subject line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {email.unread && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: BLUE, flexShrink: 0 }} />}
              <span style={{
                flex: 1,
                fontSize: '0.85rem',
                fontWeight: email.unread ? 700 : 400,
                color: email.unread ? NAVY : TEXT,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {email.subject}
              </span>
              {email.isNewTicket && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: GREEN,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}>
                  🎫 New Ticket
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: MUTED, flexShrink: 0 }}>{email.timestamp}</span>
            </div>
            {/* Sender line */}
            <div style={{ fontSize: '0.75rem', color: MUTED, paddingLeft: email.unread ? '16px' : 0 }}>
              {email.sender} &lt;{email.senderEmail}&gt;
            </div>
          </div>
        ))}
      </div>

      {/* New Ticket Modal */}
      {newTicketEmail && (
        <NewTicketFromEmailModal email={newTicketEmail} onClose={() => setNewTicketEmail(null)} dept={dept} />
      )}
    </div>
  );
}

// ─── New Ticket from Email Modal ─────────────────────────────────────────────

function NewTicketFromEmailModal({ email, onClose, dept }: { email: EmailItem; onClose: () => void; dept: string }) {
  const [title, setTitle] = useState(email.subject);
  const [priority, setPriority] = useState('P3');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState(email.body || '');

  const selectStyle: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '0.85rem',
    flex: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block',
  };

  function handleCreate() {
    // In a real app, this would call an API to create the ticket
    console.log('Creating ticket:', { title, priority, category, description, sourceEmail: email.id });
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: SURFACE_2,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: NAVY, margin: 0 }}>New Ticket from Email</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: MUTED, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Email preview */}
        <div style={{ margin: '20px 24px', padding: '14px 16px', background: SURFACE_2, borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: NAVY, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.subject}
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED }}>
            {email.sender} &lt;{email.senderEmail}&gt;
          </div>
        </div>

        {/* Form fields */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ ...selectStyle, width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={selectStyle}>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                <option value="Other">Other</option>
                <option value="Network">Network</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              style={{ ...selectStyle, width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '10px 16px' }}>Cancel</button>
            <button onClick={handleCreate} style={{ background: NAVY, border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: '10px 24px', borderRadius: '8px' }}>Create Ticket</button>
          </div>
        </div>
      </div>
    </div>
  );
}
