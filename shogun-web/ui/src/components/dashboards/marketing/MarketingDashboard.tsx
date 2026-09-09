import { useState } from 'react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab } from '../../../lib/types';
import { marketingMockData } from '../../../lib/marketing-mock-data';
import { SummaryTab } from './SummaryTab';
import { LeadsTab } from './LeadsTab';
import { EventsTab } from './EventsTab';
import { SEORankingsTab } from './SEORankingsTab';
import { SocialMediaTab } from './SocialMediaTab';
import { ContentTab } from './ContentTab';

const TABS: DashboardTab[] = [
  { id: 'summary', label: 'Summary', icon: 'LayoutDashboard' },
  { id: 'leads', label: 'Leads', icon: 'UserPlus' },
  { id: 'events', label: 'Events', icon: 'Calendar' },
  { id: 'seo', label: 'SEO Rankings', icon: 'Search' },
  { id: 'social', label: 'Social Media', icon: 'Share2' },
  { id: 'content', label: 'Content', icon: 'FileText' },
];

interface MarketingDashboardProps {
  department: string;
  color: string;
}

export function MarketingDashboard({ department, color }: MarketingDashboardProps) {
  const [activeTab, setActiveTab] = useState('summary');

  // Use mock data directly (no API call in demo mode)
  const stats = marketingMockData as any;

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'summary' && <SummaryTab stats={stats} color={color} />}
        {activeTab === 'leads' && <LeadsTab stats={stats} color={color} />}
        {activeTab === 'events' && <EventsTab stats={stats} color={color} />}
        {activeTab === 'seo' && <SEORankingsTab stats={stats} color={color} />}
        {activeTab === 'social' && <SocialMediaTab stats={stats} color={color} />}
        {activeTab === 'content' && <ContentTab stats={stats} color={color} />}
      </div>
    </div>
  );
}
