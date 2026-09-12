import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { csApi } from '../../../lib/api';
import { DashboardSubNav } from '../DashboardSubNav';
import type { CsDashboardData, DashboardTab } from '../../../lib/types';
import { CsOverviewTab } from './CsOverviewTab';
import { CsInboxTab } from './CsInboxTab';
import { CsCustomersTab } from './CsCustomersTab';
import { CsFeedbackTab } from './CsFeedbackTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: '📊 Overview', icon: 'LayoutDashboard' },
  { id: 'inbox', label: '💬 Channel Inbox', icon: 'MessageSquare' },
  { id: 'customers', label: '👥 Customer Insights', icon: 'Users' },
  { id: 'feedback', label: '🗣️ Product Feedback', icon: 'MessageCircle' },
];

interface CsDashboardProps {
  department: string;
  color: string;
}

export function CsDashboard({ department, color }: CsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const dataQuery = useQuery({
    queryKey: ['dashboard-cs-data', department],
    queryFn: () => csApi.dashboardData(department),
    refetchInterval: 60_000,
  });

  // Mutations for interactive actions
  const markReadMut = useMutation({
    mutationFn: (msgId: string) => csApi.markRead(department, msgId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-cs-data', department] }),
  });

  const flagMut = useMutation({
    mutationFn: ({ msgId, flag }: { msgId: string; flag: string }) => csApi.flagMessage(department, msgId, flag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-cs-data', department] }),
  });

  const bulkActionMut = useMutation({
    mutationFn: (payload: { ids: string[]; action: string; value?: string }) => csApi.bulkAction(department, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-cs-data', department] }),
  });

  const executeActionMut = useMutation({
    mutationFn: (payload: { type: string; target: string; details?: string }) => csApi.executeAction(department, payload),
  });

  if (dataQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
        <p>Loading Customer Support dashboard…</p>
      </div>
    );
  }

  if (!dataQuery.data) {
    return (
      <div className="sd-empty">
        <h2>Customer Support Dashboard</h2>
        <p>Unable to load CS data. Check that cs-dashboard-mock.json exists.</p>
      </div>
    );
  }

  const data: CsDashboardData = dataQuery.data;

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <CsOverviewTab
          data={data}
          color={color}
          onNavigateTab={setActiveTab}
        />
      )}
      {activeTab === 'inbox' && (
        <CsInboxTab
          data={data}
          color={color}
          onMarkRead={(id) => markReadMut.mutate(id)}
          onFlag={(msgId, flag) => flagMut.mutate({ msgId, flag })}
          onBulkAction={(payload) => bulkActionMut.mutate(payload)}
        />
      )}
      {activeTab === 'customers' && (
        <CsCustomersTab
          data={data}
          color={color}
          onExecuteAction={(payload) => executeActionMut.mutate(payload)}
        />
      )}
      {activeTab === 'feedback' && (
        <CsFeedbackTab
          data={data}
          color={color}
          onExecuteAction={(payload) => executeActionMut.mutate(payload)}
        />
      )}
    </div>
  );
}
