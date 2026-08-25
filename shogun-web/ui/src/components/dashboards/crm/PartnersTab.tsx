import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmPartnerItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

export function PartnersTab({ dept, color }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 50;

  const query = useQuery({
    queryKey: ['crm-partners', dept, search],
    queryFn: () => departmentsApi.crmPartnersList(dept, search),
    refetchInterval: 120_000,
  });

  const partners = query.data?.partners ?? [];
  const pageCount = Math.ceil(partners.length / perPage);
  const pageItems = partners.slice(page * perPage, (page + 1) * perPage);

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading partners…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <Users className="h-10 w-10" style={{ color: MUTED }} />
        <h2>Unable to load partners</h2>
        <p>The gbrain source could not be reached. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Filter bar */}
      <div className="sd-chart-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: 10, top: 10, color: MUTED }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search partners…"
            style={{
              width: '100%', padding: '8px 12px 8px 32px', fontSize: '0.85rem', borderRadius: 8,
              border: `1px solid ${BORDER}`, outline: 'none', color: TEXT,
            }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: MUTED, whiteSpace: 'nowrap' }}>{partners.length} partners</span>
      </div>

      {/* Table */}
      {partners.length === 0 ? (
        <div className="sd-empty">
          <Users className="h-10 w-10" style={{ color: MUTED }} />
          <p>No partners found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="sd-chart-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">Partner</Th>
                  <Th align="left">Type</Th>
                  <Th align="left">Country</Th>
                  <Th align="left">Website</Th>
                  <Th align="left">Source</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c: CrmPartnerItem, i: number) => (
                  <tr key={c.slug} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 1 ? SURFACE_2 : undefined }}>
                    <td className="px-3 py-2.5 max-w-[200px] truncate" style={{ fontWeight: 600, color: TEXT }} title={c.title}>
                      {c.title}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.type ? <span className="sd-chip muted">{c.type}</span> : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: MUTED }}>{c.country || '—'}</td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate">
                      {c.website ? (
                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer"
                          style={{ color, fontSize: '0.8rem', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {c.website}
                        </a>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.source ? <span className="sd-chip muted">{c.source}</span> : <span style={{ color: MUTED }}>—</span>}
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
              <span style={{ fontSize: '0.8rem', color: MUTED }}>{page + 1} / {pageCount}</span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                style={{
                  padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: page >= pageCount - 1 ? 'transparent' : 'var(--samurai-surface)',
                  color: page >= pageCount - 1 ? MUTED : TEXT, cursor: page >= pageCount - 1 ? 'default' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}