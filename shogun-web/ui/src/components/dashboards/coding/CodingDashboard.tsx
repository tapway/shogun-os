import { useState } from 'react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab } from '../../../lib/types';
import { CodingOverviewTab } from './CodingOverviewTab';
import { ProjectsTab } from './ProjectsTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'projects', label: 'Projects', icon: 'FolderGit' },
];

interface CodingDashboardProps {
  department: string;
  color: string;
}

export function CodingDashboard({ department, color }: CodingDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && (
        <CodingOverviewTab dept={department} color={color} onNavigateTab={setActiveTab} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab dept={department} color={color} />
      )}
    </div>
  );
}
