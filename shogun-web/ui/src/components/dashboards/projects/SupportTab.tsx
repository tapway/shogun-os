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
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const OPEN_STATUSES = ['Open', 'In Progress', 'Waiting for Customer'];

function statusChipClass(status?: string): string {
  if (!status) return 'muted';
  if (status === 'Closed' || status === 'Resolved') return 'ok';
  if (status === 'Open' || status === 'In Progress') return 'warn';
  return 'muted';
}

export function SupportTab({ dept, color }: Props) {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [search, setSearch] = useState('');
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
  const stats = statsQuery.data;

  const customers = useMemo(() => {
    const set = new Set(allTickets.map((t) => t.customer).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allTickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (customerFilter && t.customer !== customerFilter) return false;
      if (q && !`${t.id} ${t.title ?? ''} ${t.customer ?? ''} ${t.assignedTo ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTickets, statusFilter, priorityFilter, customerFilter, search]);

  if (ticketsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading support tickets…</p>
      </div>
    );
  }

  if (ticketsQuery.isError) {
    return (
      <div className="sd-empty">
        <h2>No support data synced yet</h2>
        <p>Run the project dashboard sync script to import support tickets.</p>
      </div>
    );
  }

  const openCount = stats?.totals.open ?? allTickets.filter((t) => OPEN_STATUSES.includes(t.status || '')).length;
  const newReplies = stats?.totals.newReplies ?? 0;

  const KPIs = [
    { label: 'Total Tickets', value: String(stats?.totals.tickets ?? allTickets.length) },
    { label: 'Open', value: String(openCount), danger: openCount > 0 },
    { label: 'Closed / Resolved', value: String(stats?.totals.closedOrResolved ?? 0) },
    { label: 'New Replies', value: String(newReplies), danger: newReplies > 0 },
  ];

  const selectStyle: React.CSSProperties = {
    background: SURFACE_2,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '0.5rem',
    padding: '0.4rem 0.6rem',
    fontSize: '0.8rem',
  };

  return (
    <div className="sd-stack">
      {/* KPI cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value" style={kpi.danger ? { color: DANGER } : undefined}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: '0.9rem 1rem' }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...selectStyle, minWidth: '220px' }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All statuses</option>
            {[...new Set(allTickets.map((t) => t.status).filter(Boolean) as string[])].sort().map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={selectStyle}>
            <option value="">All priorities</option>
            {['P1', 'P2', 'P3', 'P4'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={selectStyle}>
            <option value="">All customers</option>
            {customers.map((cu) => (
              <option key={cu} value={cu}>{cu}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: MUTED }}>
            {filtered.length} of {allTickets.length} tickets
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="sd-chart-card">
        {filtered.length === 0 ? (
          <div className="sd-empty" style={{ padding: '24px 0' }}>
            <p>No tickets match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: '620px', overflowY: 'auto' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">ID</Th>
                  <Th align="left">Title</Th>
                  <Th align="left">Customer</Th>
                  <Th align="center">Priority</Th>
                  <Th align="left">Assigned</Th>
                  <Th align="left">Opened</Th>
                  <Th align="left">Last Updated</Th>
                  <Th align="left">Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket, i) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelected(ticket)}
                    style={{
                      borderBottom: `1px solid ${BORDER}`,
                      background: i % 2 === 1 ? SURFACE_2 : undefined,
                      cursor: 'pointer',
                    }}
                    title="Open ticket detail"
                  >
                    <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: MUTED }}>{ticket.id}</td>
                    <td className="px-3 py-2.5 max-w-[280px]" style={{ color: TEXT }}>
                      <div className="truncate" title={ticket.title}>
                        {ticket.title || '—'}
                        {ticket.newReply && <span className="sd-chip bad" style={{ marginLeft: '0.4rem', fontSize: '0.6rem' }}>reply</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate" style={{ color: MUTED }}>{ticket.customer || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${ticket.priority === 'P1' || ticket.priority === 'P2' ? 'bad' : ticket.priority === 'P3' ? 'warn' : 'muted'}`}>
                        {ticket.priority || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{ticket.assignedTo || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.75rem' }}>{fmtDate(ticket.opened)}</td>
                    <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.75rem' }}>{fmtDate(ticket.lastUpdated)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`sd-chip ${statusChipClass(ticket.status)}`}>{ticket.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
