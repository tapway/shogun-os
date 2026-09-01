import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2 } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { CrmCompanyItem } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

export function CompaniesTab({ dept, color }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CrmCompanyItem | null>(null);

  const query = useQuery({
    queryKey: ['crm-companies', dept, search],
    queryFn: () => departmentsApi.crmCompaniesList(dept, search, ''),
    refetchInterval: 120_000,
  });

  const companies = query.data?.companies ?? [];

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading companies…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <Building2 className="h-10 w-10" style={{ color: MUTED }} />
        <h2>Unable to load companies</h2>
        <p>The gbrain source could not be reached. Try refreshing.</p>
      </div>
    );
  }

  // If a company is selected, show detail view
  if (selectedCompany) {
    return (
      <CompanyDetailView 
        company={selectedCompany} 
        color={color}
        onBack={() => setSelectedCompany(null)}
      />
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: TEXT, margin: 0 }}>
          Companies
        </h2>
      </div>

      {/* Search */}
      <div className="sd-chart-card" style={{ padding: 12 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: 10, top: 10, color: MUTED }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: 12,
              padding: '8px 12px 8px 32px',
              fontSize: '0.85rem',
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              outline: 'none',
              color: TEXT,
            }}
          />
        </div>
      </div>

      {/* Company Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: 12 
      }}>
        {companies.map((company) => (
          <div
            key={company.slug}
            onClick={() => setSelectedCompany(company)}
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
            {/* Company Name */}
            <div style={{ 
              fontSize: '0.95rem', 
              fontWeight: 600, 
              color: TEXT, 
              marginBottom: 6,
              lineHeight: 1.3,
            }}>
              "{company.title}"
            </div>

            {/* Slug */}
            <div style={{ 
              fontSize: '0.75rem', 
              color: MUTED,
              fontFamily: 'monospace',
            }}>
              {company.slug}
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>
          No companies found matching your search
        </div>
      )}
    </div>
  );
}

// Company Detail View Component
function CompanyDetailView({ 
  company, 
  color, 
  onBack 
}: { 
  company: CrmCompanyItem; 
  color: string;
  onBack: () => void;
}) {
  // For now, we don't have deal association data in CrmCompanyItem
  // This would need backend support to fetch deals by company
  const dealCount = 0;

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
        }}
      >
        ← Back to Companies
      </button>

      {/* Company Info */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, margin: 0 }}>
          "{company.title}"
        </h2>
        <div style={{ 
          fontSize: '0.85rem', 
          color: MUTED, 
          fontFamily: 'monospace',
          marginTop: 4,
        }}>
          {company.slug}
        </div>
      </div>

      {/* Additional Details (if available) */}
      {(company.industry || company.website || company.source || company.first_seen) && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}>
            {company.industry && (
              <DetailField label="Industry" value={company.industry} />
            )}
            {company.website && (
              <DetailField label="Website" value={company.website} />
            )}
            {company.source && (
              <DetailField label="Source" value={company.source} />
            )}
            {company.first_seen && (
              <DetailField label="First Seen" value={company.first_seen} />
            )}
          </div>
        </div>
      )}

      {/* Deals Section */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>
          Deals ({dealCount})
        </h3>
        {dealCount === 0 ? (
          <div style={{ 
            padding: 20, 
            textAlign: 'center', 
            color: MUTED,
            fontSize: '0.85rem',
          }}>
            No deals associated with this company.
          </div>
        ) : (
          <div style={{ color: MUTED, fontSize: '0.85rem' }}>
            Deal association coming soon...
          </div>
        )}
      </div>
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
