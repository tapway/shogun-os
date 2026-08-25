import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import { DashboardSubNav } from '../DashboardSubNav';
import type { CeoDashboardStats, DashboardTab } from '../../../lib/types';
import { OverviewTab } from './OverviewTab';
import { DealsTab } from './DealsTab';
import { CompaniesTab } from './CompaniesTab';
import { TasksTab } from './TasksTab';
import { SearchTab } from './SearchTab';
import { BevZonesTab } from './BevZonesTab';
import { PartnersTab } from './PartnersTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'deals', label: 'Deals', icon: 'Briefcase' },
  { id: 'companies', label: 'Companies', icon: 'Building2' },
  { id: 'tasks', label: 'Tasks', icon: 'SquareCheckBig' },
  { id: 'search', label: 'Search', icon: 'Search' },
  { id: 'bev', label: 'BEV Zones', icon: 'Map' },
  { id: 'partners', label: 'Partners', icon: 'Users' },
];

interface CrmDashboardProps {
  department: string;
  color: string;
}

export function CrmDashboard({ department, color }: CrmDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Only the Overview tab needs the aggregated CEO stats.
  // All other tabs fetch their own data independently from gbrain.
  const statsQuery = useQuery({
    queryKey: ['dashboard-ceo-stats', department],
    queryFn: () => departmentsApi.dashboardCeoStats(department),
    refetchInterval: 120_000,
    enabled: activeTab === 'overview',
  });

  if (activeTab === 'overview' && statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
        <p>Loading CRM dashboard…</p>
      </div>
    );
  }

  const stats: CeoDashboardStats | undefined = statsQuery.data;

  if (activeTab === 'overview' && !stats) {
    return (
      <div className="sd-empty">
        <h2>Unable to load CRM dashboard data</h2>
        <p>The CRM snapshot could not be retrieved. Try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && stats && <OverviewTab dept={department} color={color} stats={stats} />}
      {activeTab === 'deals' && <DealsTab dept={department} color={color} />}
      {activeTab === 'companies' && <CompaniesTab dept={department} color={color} />}
      {activeTab === 'tasks' && <TasksTab dept={department} color={color} />}
      {activeTab === 'search' && <SearchTab dept={department} color={color} />}
      {activeTab === 'bev' && <BevZonesTab dept={department} color={color} />}
      {activeTab === 'partners' && <PartnersTab dept={department} color={color} />}
    </div>
  );
}
