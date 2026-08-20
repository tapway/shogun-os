import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmSearchResult } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

type CatFilter = 'all' | 'companies' | 'deals' | 'unknown';

const CAT_LABELS: Record<CatFilter, string> = {
  all: 'All',
  companies: 'Companies',
  deals: 'Deals',
  unknown: 'Other',
};

export function SearchTab({ dept, color }: Props) {
  const [input, setInput] = useState('');
  const [query2, setQuery2] = useState('');
  const [cat, setCat] = useState<CatFilter>('all');

  // Debounce input → query
  useEffect(() => {
    const t = setTimeout(() => setQuery2(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const query = useQuery({
    queryKey: ['crm-search', dept, query2],
    queryFn: () => departmentsApi.crmSearch(dept, query2),
    enabled: query2.length > 2,
    refetchInterval: 0,
  });

  const results = query.data?.results ?? [];
  const filtered = cat === 'all' ? results : results.filter((r) => r.category === cat);

  const catCounts = results.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="sd-stack">
      {/* Search bar */}
      <div className="sd-chart-card" style={{ position: 'relative' }}>
        <SearchIcon className="h-5 w-5" style={{ position: 'absolute', left: 16, top: 14, color: MUTED }} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search deals, companies, emails… (min 3 characters)"
          autoFocus
          style={{
            width: '100%', padding: '12px 12px 12px 44px', fontSize: '0.95rem', borderRadius: 8,
            border: `1px solid ${BORDER}`, outline: 'none', color: TEXT, background: 'var(--samurai-surface)',
          }}
        />
      </div>

      {/* Category filter chips */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'companies', 'deals', 'unknown'] as CatFilter[]).map((c) => {
            const count = c === 'all' ? results.length : catCounts[c] || 0;
            if (c !== 'all' && count === 0) return null;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: '4px 12px', fontSize: '0.75rem', borderRadius: 16, border: `1px solid ${BORDER}`,
                  background: cat === c ? color : 'var(--samurai-surface)', color: cat === c ? '#fff' : MUTED,
                  cursor: 'pointer', fontWeight: cat === c ? 600 : 400, transition: 'all 0.15s',
                }}
              >
                {CAT_LABELS[c]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {input.trim().length <= 2 ? (
        <div className="sd-empty">
          <SearchIcon className="h-10 w-10" style={{ color: MUTED }} />
          <p>Type at least 3 characters to search gbrain.</p>
        </div>
      ) : query.isLoading ? (
        <div className="sd-empty">
          <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
          <p>Searching…</p>
        </div>
      ) : query.isError ? (
        <div className="sd-empty">
          <p>Search failed. Try again.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sd-empty">
          <p>No results for "{query2}".</p>
        </div>
      ) : (
        <div className="sd-stack" style={{ gap: 4 }}>
          {filtered.map((r: CrmSearchResult, i: number) => {
            const fm = r.frontmatter || {};
            const subtitle =
              (fm['industry'] as string) ||
              (fm['customer'] as string) ||
              (fm['from'] as string) ||
              (fm['website'] as string) ||
              r.slug;
            return (
              <div
                key={r.slug}
                className="sd-chart-card"
                style={{
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  background: i % 2 === 1 ? SURFACE_2 : undefined,
                }}
              >
                <span
                  style={{
                    fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                    padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                    background: r.category === 'companies' ? 'var(--samurai-surface-2)' : r.category === 'deals' ? `${color}22` : 'transparent',
                    color: r.category === 'companies' ? MUTED : r.category === 'deals' ? color : MUTED,
                    border: r.category === 'unknown' ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  {r.category}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: TEXT, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subtitle}
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', color: MUTED, fontFamily: 'monospace', flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.slug}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
