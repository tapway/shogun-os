import { useEffect, useState } from 'react';
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

/** Debounce a string value so expensive queries don't fire per keystroke. */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function PartnersTab({ dept, color }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 50;
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['crm-partners', dept, debouncedSearch],
    queryFn: () => departmentsApi.crmPartnersList(dept, debouncedSearch),
    refetchInterval: 120_000,
  });

  const partners = query.data?.partners ?? [];
  const pageCount = Math.max(1, Math.ceil(partners.length / perPage));
  // Clamp page when a refetch shrinks the list (e.g. 3 / 1 with empty body).
  const clampedPage = Math.min(page, pageCount - 1);
  const pageItems = partners.slice(clampedPage * perPage, (clampedPage + 1) * perPage);

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
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0); // new filter → first page
            }}
            placeholder="Search partners…"
            className="sd-input"
            style={{ paddingLeft: 34 }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: MUTED }}>
          {partners.length} partner{partners.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table */}
      <div className="sd-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 640 }}>
            <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
              <tr>
                <Th align="left">Partner</Th>
                <Th align="left">Type</Th>
                <Th align="left">Country</Th>
                <Th align="left">Website</Th>
                <Th align="left">Source</Th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: MUTED }}>
                    No partners found.
                  </td>
                </tr>
              )}
              {pageItems.map((p) => (
                <PartnerRow key={p.slug} partner={p} color={color} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            style={{
              padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`,
              background: clampedPage === 0 ? 'transparent' : 'var(--samurai-surface)', color: clampedPage === 0 ? MUTED : TEXT,
              cursor: clampedPage === 0 ? 'default' : 'pointer',
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.8rem', color: MUTED }}>{clampedPage + 1} / {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={clampedPage >= pageCount - 1}
            style={{
              padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`,
              background: clampedPage >= pageCount - 1 ? 'transparent' : 'var(--samurai-surface)',
              color: clampedPage >= pageCount - 1 ? MUTED : TEXT, cursor: clampedPage >= pageCount - 1 ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function PartnerRow({ partner, color }: { partner: CrmPartnerItem; color: string }) {
  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
      <td className="px-3 py-2.5" style={{ color: TEXT }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 500 }}>{partner.title || partner.slug}</div>
        <div style={{ fontSize: '0.72rem', color: MUTED }}>{partner.slug}</div>
      </td>
      <td className="px-3 py-2.5" style={{ color: TEXT, fontSize: '0.82rem' }}>
        {partner.type || '—'}
      </td>
      <td className="px-3 py-2.5" style={{ color: TEXT, fontSize: '0.82rem' }}>
        {partner.country || '—'}
      </td>
      <td className="px-3 py-2.5" style={{ color: TEXT, fontSize: '0.82rem' }}>
        {partner.website ? (
          <a href={partner.website} target="_blank" rel="noopener noreferrer" style={{ color }}>
            {partner.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span style={{ color: MUTED }}>—</span>
        )}
      </td>
      <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.82rem' }}>
        {partner.source || '—'}
      </td>
    </tr>
  );
}
