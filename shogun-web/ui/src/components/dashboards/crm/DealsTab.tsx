import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmDealListItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  initialOwner?: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';
const WARNING = 'var(--samurai-warning)';

const STAGES = ['Lead', 'Prospecting', 'Qualified', 'Quote', 'Tender', 'Confirmed', 'Won'];

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

export function DealsTab({ dept, color, initialOwner = '' }: Props) {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [owner, setOwner] = useState(initialOwner);
  const [priority, setPriority] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 50;

  const query = useQuery({
    queryKey: ['crm-deals', dept, search, stage, owner, priority, source],
    queryFn: () => departmentsApi.crmDealsList(dept, search, stage, owner, priority, source),
    refetchInterval: 120_000,
  });

  // Always-complete deal list so filter dropdowns stay fully populated.
  const optionsQuery = useQuery({
    queryKey: ['crm-deals-options', dept],
    queryFn: () => departmentsApi.crmDealsList(dept),
    refetchInterval: 300_000,
  });

  const deals = query.data?.deals ?? [];
  const total = query.data?.total ?? 0;
  const allDeals = optionsQuery.data?.deals ?? [];
  const pageCount = Math.ceil(deals.length / perPage);
  const pageItems = deals.slice(page * perPage, (page + 1) * perPage);

  const owners = useMemo(() => {
    const set = new Set(allDeals.map((d) => d.owner).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allDeals]);

  const sources = useMemo(() => {
    const set = new Set(allDeals.map((d) => d.source).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allDeals]);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading deals…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <Briefcase className="h-10 w-10" style={{ color: MUTED }} />
        <h2>Unable to load deals</h2>
        <p>The gbrain source could not be reached. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Filter bar */}
      <div className="sd-chart-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: 10, top: 10, color: MUTED }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search deals by title or customer…"
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, padding: '8px 12px 8px 32px',
              fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none',
            }}
          />
        </div>
        <select
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'var(--samurai-surface)', color: TEXT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={owner}
          onChange={(e) => { setOwner(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'var(--samurai-surface)', color: TEXT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Owners</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'var(--samurai-surface)', color: TEXT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Priorities</option>
          {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(0); }}
          style={{
            padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'var(--samurai-surface)', color: TEXT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: MUTED, whiteSpace: 'nowrap' }}>{total} deals</span>
      </div>

      {/* Table */}
      {deals.length === 0 ? (
        <div className="sd-empty">
          <Briefcase className="h-10 w-10" style={{ color: MUTED }} />
          <p>No deals found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="sd-chart-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Deal</Th>
                  <Th align="left">Customer</Th>
                  <Th align="left">Owner</Th>
                  <Th align="left">Stage</Th>
                  <Th align="left">Created</Th>
                  <Th align="center">Priority</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((deal: CrmDealListItem, i: number) => (
                  <tr key={deal.slug} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 1 ? SURFACE_2 : undefined }}>
                    <td className="px-3 py-2.5 max-w-[220px] truncate" style={{ fontWeight: 600, color: TEXT }} title={deal.title}>
                      {deal.title}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{deal.customer || '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{deal.owner || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="sd-chip muted">{deal.stage || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.8rem' }}>{deal.created || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {deal.priority === 'Hot' ? (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: DANGER }} title="Hot" />
                      ) : deal.priority === 'Warm' ? (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: WARNING }} title="Warm" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: MUTED }} title="Cold" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: page === 0 ? 'transparent' : 'var(--samurai-surface)', color: page === 0 ? MUTED : TEXT,
                  cursor: page === 0 ? 'default' : 'pointer',
                }}
              >
                Prev
              </button>
              <span style={{ fontSize: '0.8rem', color: MUTED }}>
                {page + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                style={{
                  padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: page >= pageCount - 1 ? 'transparent' : 'var(--samurai-surface)',
                  color: page >= pageCount - 1 ? MUTED : TEXT,
                  cursor: page >= pageCount - 1 ? 'default' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {owners.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: MUTED, padding: '0 4px' }}>
          Owners: {owners.join(', ')}
        </div>
      )}
    </div>
  );
}
