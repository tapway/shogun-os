import { useState } from 'react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab } from '../../../lib/types';
import { CrossPlatformOverviewTab } from './CrossPlatformOverviewTab';
import { ProductIntelligenceTab } from './ProductIntelligenceTab';
import { ListingsComplianceTab } from './ListingsComplianceTab';
import { OrdersFulfillmentTab } from './OrdersFulfillmentTab';
import { MarketingContentTab } from './MarketingContentTab';
import { CompetitorWatchTab } from './CompetitorWatchTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'products', label: 'Products', icon: 'Package' },
  { id: 'listings', label: 'Listings', icon: 'Store' },
  { id: 'orders', label: 'Orders', icon: 'ShoppingCart' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone' },
  { id: 'competitors', label: 'Competitors', icon: 'Target' },
];

interface EcommerceDashboardProps {
  department: string;
  color: string;
}

export function EcommerceDashboard({ department, color }: EcommerceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && <CrossPlatformOverviewTab />}
      {activeTab === 'products' && <ProductIntelligenceTab />}
      {activeTab === 'listings' && <ListingsComplianceTab />}
      {activeTab === 'orders' && <OrdersFulfillmentTab />}
      {activeTab === 'marketing' && <MarketingContentTab />}
      {activeTab === 'competitors' && <CompetitorWatchTab />}
    </div>
  );
}
