import { useState } from 'react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab } from '../../../lib/types';
import { OverviewTab } from './OverviewTab';
import { ProjectsTab } from './ProjectsTab';
import { ActiveProjectsTab } from './ActiveProjectsTab';
import { TasksTab } from './TasksTab';
import { PlanTab } from './PlanTab';
import { ReportsTab } from './ReportsTab';
import { SupportTab } from './SupportTab';
import { ProjectDetailModal } from './ProjectDetailModal';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'projects', label: 'Projects', icon: 'Kanban' },
  { id: 'active', label: 'Active', icon: 'Activity' },
  { id: 'tasks', label: 'Tasks', icon: 'SquareCheckBig' },
  { id: 'plan', label: 'Plan', icon: 'CalendarClock' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
  { id: 'support', label: 'Support', icon: 'LifeBuoy' },
];

interface ProjectsDashboardProps {
  department: string;
  color: string;
}

export function ProjectsDashboard({ department, color }: ProjectsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const openProject = (projectId: string) => setSelectedProjectId(projectId);
  const closeProject = () => setSelectedProjectId(null);

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <OverviewTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'active' && (
        <ActiveProjectsTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'tasks' && (
        <TasksTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'plan' && (
        <PlanTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab dept={department} color={color} onOpenProject={openProject} />
      )}
      {activeTab === 'support' && <SupportTab dept={department} color={color} />}

      {selectedProjectId && (
        <ProjectDetailModal
          dept={department}
          color={color}
          projectId={selectedProjectId}
          onClose={closeProject}
        />
      )}
    </div>
  );
}
