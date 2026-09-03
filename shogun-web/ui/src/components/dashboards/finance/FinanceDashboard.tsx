import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab, FinanceDashboardStats } from '../../../lib/types';
import { ExecutiveOverviewTab } from './ExecutiveOverviewTab';
import { CashFlowTab } from './CashFlowTab';
import { AssetTab } from './AssetTab';
import { ArCollectionsTab } from './ArCollectionsTab';
import { ApPaymentsTab } from './ApPaymentsTab';
import { BvaUnitEconomicsTab } from './BvaUnitEconomicsTab';
import { MarginsConcentrationTab } from './MarginsConcentrationTab';
import { FinanceDocScanTab } from './FinanceDocScanTab';

const TABS: DashboardTab[] = [
  { id: 'overview',  label: 'Overview',                  icon: 'LayoutDashboard' },
  { id: 'cashflow',  label: 'Cash Flow',                 icon: 'Waves' },
  { id: 'cash',      label: 'Assets',                    icon: 'TrendingUp' },
  { id: 'ar',        label: 'AR & Collections',          icon: 'Receipt' },
  { id: 'ap',        label: 'AP & Payments',             icon: 'CreditCard' },
  { id: 'bva',       label: 'Budget vs Actuals',         icon: 'BarChart3' },
  { id: 'margins',   label: 'Margins & Concentration',    icon: 'PieChart' },
  { id: 'scan',      label: 'Document Scanning',         icon: 'FileScan' },
];

interface FinanceDashboardProps {
  department: string;
  color: string;
}

export function FinanceDashboard({ department, color }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const statsQuery = useQuery({
    queryKey: ['dashboard-finance-stats', department],
    queryFn: () => departmentsApi.dashboardFinanceStats(department),
    refetchInterval: 120_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
        <p>Loading Finance dashboard…</p>
      </div>
    );
  }

  const stats: FinanceDashboardStats | undefined = statsQuery.data;

  if (!stats) {
    return (
      <div className="sd-empty">
        <h2>Unable to load Finance dashboard data</h2>
        <p>The finance snapshot could not be retrieved. Check that the accounting bridge is connected, then refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {stats.dataSource === 'empty' && (
        <div className="sd-empty" style={{ marginBottom: '1rem' }}>
          📡 Waiting for accounting data — no live connection to QBO yet. Check the accounting bridge
          configuration and credentials, then refresh the page.
        </div>
      )}
      {stats.mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ DEMO DATA — some figures loaded from sample data. Connect QBO for live financials.
        </div>
      )}
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'overview'  && <ExecutiveOverviewTab stats={stats} color={color} />}
        {activeTab === 'cashflow' && <CashFlowTab stats={stats} color={color} />}
        {activeTab === 'cash'     && <AssetTab stats={stats} color={color} />}
        {activeTab === 'ar'       && <ArCollectionsTab stats={stats} color={color} department={department} />}
        {activeTab === 'ap'       && <ApPaymentsTab stats={stats} color={color} />}
        {activeTab === 'bva'      && <BvaUnitEconomicsTab stats={stats} color={color} />}
        {activeTab === 'margins'  && <MarginsConcentrationTab stats={stats} color={color} />}
        {activeTab === 'scan'     && <FinanceDocScanTab department={department} color={color} />}
      </div>
    </div>
  );
}
