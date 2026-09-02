import { Search } from 'lucide-react';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function SEORankingsTab({ stats, color }: Props) {
  if (!stats.seoConnected) {
    return (
      <div className="sd-stack">
        <div className="sd-chart-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Search className="h-10 w-10 mx-auto mb-4" style={{ opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Not connected — Google Search Console API not set up.</h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.6, maxWidth: 500, margin: '0 auto' }}>
            {stats.seoMessage || 'No keyword rankings, click-through rates, or position data is available. Connect the GSC API to populate this page with real data.'}
          </p>
        </div>
      </div>
    );
  }

  // Placeholder for when GSC is connected
  return (
    <div className="sd-stack">
      <div className="sd-empty">
        <p>GSC connected — keyword rankings will appear here.</p>
      </div>
    </div>
  );
}
