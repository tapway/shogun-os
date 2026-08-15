import { useState } from 'react';
import { FileScan, Home, Search } from 'lucide-react';
import { DocumentScanningTab } from './DocumentScanningTab';
import { SiteInspectionTab } from './SiteInspectionTab';
import { StoredDocumentsTab } from './StoredDocumentsTab';

const TABS = [
  { id: 'scan', label: 'Document Scanning', icon: FileScan },
  { id: 'inspect', label: 'Site Inspection', icon: Home },
  { id: 'stored', label: 'Stored Documents', icon: Search },
] as const;

type TabId = typeof TABS[number]['id'];

interface PlantationDashboardProps {
  department: string;
  color: string;
}

export function PlantationDashboard({ department, color }: PlantationDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('scan');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'border-b-2 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              style={active ? { borderColor: color } : {}}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'scan' && <DocumentScanningTab color={color} />}
      {activeTab === 'inspect' && <SiteInspectionTab color={color} />}
      {activeTab === 'stored' && <StoredDocumentsTab color={color} />}
    </div>
  );
}
