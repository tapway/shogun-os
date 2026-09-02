import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab, MarketingDashboardStats } from '../../../lib/types';
import { OverviewTab } from './OverviewTab';
import { CampaignsTab } from './CampaignsTab';
import { ContentTab } from './ContentTab';
import { SocialMediaTab } from './SocialMediaTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SEOTab } from './SEOTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'campaigns', label: 'Campaigns', icon: 'Megaphone' },
  { id: 'content', label: 'Content', icon: 'FileText' },
  { id: 'social', label: 'Social Media', icon: 'Share2' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'seo', label: 'SEO', icon: 'Search' },
];

interface MarketingDashboardProps {
  department: string;
  color: string;
}

export function MarketingDashboard({ department, color }: MarketingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const statsQuery = useQuery({
    queryKey: ['dashboard-marketing-stats', department],
    queryFn: () => departmentsApi.dashboardMarketingStats(department),
    refetchInterval: 120_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
        <p>Loading Marketing dashboard…</p>
      </div>
    );
  }

  const stats: MarketingDashboardStats | undefined = statsQuery.data;

  if (!stats) {
    return (
      <div className="sd-empty">
        <h2>Unable to load Marketing dashboard data</h2>
        <p>The marketing snapshot could not be retrieved. Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {stats.mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ DEMO DATA — figures loaded from sample data. Connect marketing integrations for live metrics.
        </div>
      )}
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'overview' && <OverviewTab stats={stats} color={color} />}
        {activeTab === 'campaigns' && <CampaignsTab stats={stats} color={color} />}
        {activeTab === 'content' && <ContentTab stats={stats} color={color} />}
        {activeTab === 'social' && <SocialMediaTab stats={stats} color={color} />}
        {activeTab === 'analytics' && <AnalyticsTab stats={stats} color={color} />}
        {activeTab === 'seo' && <SEOTab stats={stats} color={color} />}
      </div>
    </div>
  );
}
