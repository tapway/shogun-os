import { useState } from 'react';
import { Home, Camera, FileText, FileScan } from 'lucide-react';
import { UnitRegistrationTab } from './UnitRegistrationTab';
import { DailyInspectionTab } from './DailyInspectionTab';
import { InspectionRecordsTab } from './InspectionRecordsTab';
import { EstateLegalScanTab } from './EstateLegalScanTab';

const TABS = [
  { id: 'units', label: 'Unit Registration', icon: Home },
  { id: 'inspect', label: 'Daily Inspection', icon: Camera },
  { id: 'records', label: 'Inspection Records', icon: FileText },
  { id: 'scan', label: 'Legal Doc Scanning', icon: FileScan },
] as const;

type TabId = typeof TABS[number]['id'];

interface PlantationDashboardProps {
  department: string;
  color: string;
}

export function PlantationDashboard({ department, color }: PlantationDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('units');

  return (
    <div className="space-y-4">
      <div className="sd-subnav-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sd-subnav-pill ${active ? 'active' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'units' && <UnitRegistrationTab />}
      {activeTab === 'inspect' && <DailyInspectionTab />}
      {activeTab === 'records' && <InspectionRecordsTab />}
      {activeTab === 'scan' && <EstateLegalScanTab department={department} color={color} />}
    </div>
  );
}
