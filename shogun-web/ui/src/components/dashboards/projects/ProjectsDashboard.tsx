import { useState } from 'react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab } from '../../../lib/types';
import { OverviewTab } from './OverviewTab';
import { ProjectsTab } from './ProjectsTab';
import { TasksTab } from './TasksTab';
import { ProjectDetailModal } from './ProjectDetailModal';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'projects', label: 'Projects', icon: 'Kanban' },
  { id: 'tasks', label: 'Tasks', icon: 'SquareCheckBig' },
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
      {activeTab === 'tasks' && (
        <TasksTab dept={department} color={color} onOpenProject={openProject} />
      )}

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
