import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase, X } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmDealListItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  initialOwner?: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

// Stage colors
const STAGE_COLORS: Record<string, string> = {
  'Won': '#10b981',
  'Closed Won': '#10b981',
  'Lead': '#6366f1',
  'Prospecting': '#8b5cf6',
  'Qualified': '#3b82f6',
  'Quote': '#f59e0b',
  'Tender': '#f97316',
  'Confirmed': '#06b6d4',
  'POC': '#ec4899',
  'Proposal': '#84cc16',
};

// Priority icons
const PRIORITY_ICONS: Record<string, string> = {
  'High': '🔥',
  'Hot': '🔥',
  'Medium': '⚡',
  'Warm': '⚡',
  'Low': '❄',
  'Cold': '❄',
};

export function DealsTab({ dept, color, initialOwner = '' }: Props) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(initialOwner);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<CrmDealListItem | null>(null);

  const query = useQuery({
    queryKey: ['crm-deals', dept, search, stageFilter, ownerFilter, priorityFilter],
    queryFn: () => departmentsApi.crmDealsList(dept, search, stageFilter, ownerFilter, priorityFilter, ''),
    refetchInterval: 120_000,
  });

  const deals = query.data?.deals ?? [];
  const total = query.data?.total ?? 0;

  // Extract unique values for filters
  const stages = useMemo(() => {
    const set = new Set(deals.map(d => d.stage).filter(Boolean) as string[]);
    return [...set].sort();
  }, [deals]);

  const owners = useMemo(() => {
    const set = new Set(deals.map(d => d.owner).filter(Boolean) as string[]);
    return [...set].sort();
  }, [deals]);

  const priorities = useMemo(() => {
    const set = new Set(deals.map(d => d.priority).filter(Boolean) as string[]);
    return [...set].sort();
  }, [deals]);

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

  // If a deal is selected, show detail view
  if (selectedDeal) {
    return (
      <DealDetailView 
        deal={selectedDeal} 
        color={color}
        onBack={() => setSelectedDeal(null)}
      />
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: TEXT, margin: 0 }}>
          Deals
        </h2>
        <span style={{ fontSize: '0.85rem', color: MUTED }}>
          {total} deal{total !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Search and Filters */}
      <div className="sd-chart-card" style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: 10, top: 10, color: MUTED }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              padding: '8px 12px 8px 32px',
              fontSize: '0.85rem',
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              outline: 'none',
            }}
          />
        </div>
        
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            color: TEXT,
            cursor: 'pointer',
          }}
        >
          <option value="">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            color: TEXT,
            cursor: 'pointer',
          }}
        >
          <option value="">All Owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            color: TEXT,
            cursor: 'pointer',
          }}
        >
          <option value="">All Priorities</option>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Deal Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: 12 
      }}>
        {deals.map((deal) => (
          <div
            key={deal.slug}
            onClick={() => setSelectedDeal(deal)}
            style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: 'rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER}
          >
            {/* Title */}
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              color: TEXT, 
              marginBottom: 8,
              lineHeight: 1.3,
            }}>
              {deal.title}
            </div>

            {/* Stage badge */}
            {deal.stage && (
              <div style={{ 
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#fff',
                background: STAGE_COLORS[deal.stage] || MUTED,
                marginBottom: 8,
              }}>
                {deal.stage}
              </div>
            )}

            {/* Owner */}
            {deal.owner && (
              <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 4 }}>
                @{deal.owner}
              </div>
            )}

            {/* Partner */}
            {deal.customer && (
              <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 4 }}>
                🤝 {deal.customer}
              </div>
            )}

            {/* Priority & Amount row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {deal.priority && (
                <span style={{ fontSize: '0.8rem', color: MUTED }}>
                  {PRIORITY_ICONS[deal.priority] || ''} {deal.priority}
                </span>
              )}
              {deal.amount != null && deal.amount > 0 && (
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
                  RM {deal.amount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {deals.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>
          No deals found matching your filters
        </div>
      )}
    </div>
  );
}

// Deal Detail View Component
function DealDetailView({ 
  deal, 
  color, 
  onBack 
}: { 
  deal: CrmDealListItem; 
  color: string;
  onBack: () => void;
}) {
  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Back button */}
      <button 
        onClick={onBack}
        style={{
          padding: '8px 16px',
          fontSize: '0.85rem',
          color: color,
          background: 'transparent',
          border: `1px solid ${color}`,
          borderRadius: 6,
          cursor: 'pointer',
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← Back to Deals
      </button>

      {/* Title */}
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, margin: 0 }}>
        {deal.title}
      </h2>

      {/* Details Grid */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16 
        }}>
          <DetailField label="Stage" value={deal.stage || '—'} />
          <DetailField label="Owner" value={deal.owner || '—'} />
          <DetailField label="Customer" value={deal.customer || '—'} />
          <DetailField label="Partner" value={deal.source || '—'} />
          <DetailField 
            label="Amount" 
            value={deal.amount != null && deal.amount > 0 ? `MYR ${deal.amount.toLocaleString()}` : '—'} 
          />
          <DetailField label="Priority" value={deal.priority || '—'} />
          <DetailField label="Created" value={deal.created || '—'} />
        </div>
      </div>

      {/* Raw Content */}
      {deal.compiled_truth && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Raw Content</h3>
          <div style={{ 
            fontSize: '0.85rem', 
            color: TEXT, 
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            lineHeight: 1.6,
            maxHeight: 500,
            overflowY: 'auto',
          }}>
            {deal.compiled_truth}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  const MUTED = 'var(--samurai-muted)';
  const TEXT = 'var(--samurai-text)';
  
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: TEXT }}>
        {value}
      </div>
    </div>
  );
}
