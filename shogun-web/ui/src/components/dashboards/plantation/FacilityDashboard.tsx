import { useState, useMemo } from 'react';
import { Building2, MapPin, ClipboardCheck, FileBarChart, Settings, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab, FacilityStats, FacilityLocation, FacilityInspection } from '../../../lib/types';
import { computeMockStats, MOCK_LOCATIONS, MOCK_INSPECTIONS, MOCK_ACTION_ITEMS, MOCK_TEMPLATES } from '../../../lib/facilityMockData';
import { FacilityOverviewTab } from './FacilityOverviewTab';
import { FacilityLocationsTab } from './FacilityLocationsTab';
import { FacilityInspectTab } from './FacilityInspectTab';
import { FacilityReportsTab } from './FacilityReportsTab';
import { FacilitySettingsTab } from './FacilitySettingsTab';

/** Top-level groups */
const GROUPS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'locations', label: 'Locations', icon: 'MapPin' },
  { id: 'inspect', label: 'Inspect', icon: 'ClipboardCheck' },
  { id: 'reports', label: 'Reports', icon: 'FileBarChart' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

/** Default sub-tab when opening a group */
const DEFAULT_SUB: Record<string, string> = {
  overview: 'overview',
  locations: 'locations',
  inspect: 'inspect',
  reports: 'reports',
  settings: 'settings',
};

interface FacilityDashboardProps {
  department: string;
  color: string;
}

export function FacilityDashboard({ department, color }: FacilityDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeGroup, setActiveGroup] = useState('overview');
  const [preselectedLocationId, setPreselectedLocationId] = useState<string | null>(null);

  // Use mock data - no API call needed
  const stats: FacilityStats = useMemo(() => computeMockStats(), []);

  /** Navigate by any tab id — resolves the group automatically. */
  function navigate(tabId: string) {
    if (DEFAULT_SUB[tabId]) {
      setActiveGroup(tabId);
      setActiveTab(DEFAULT_SUB[tabId]);
    } else {
      setActiveTab(tabId);
    }
  }

  /** Navigate to Inspect tab with a pre-selected location */
  function navigateToInspect(locationId?: string) {
    if (locationId) setPreselectedLocationId(locationId);
    setActiveGroup('inspect');
    setActiveTab('inspect');
  }

  // Provide empty defaults so tabs always render (fallback only)
  const fallbackStats: FacilityStats = {
    total_locations: 0,
    avg_score: 0,
    open_actions: 0,
    overdue_inspections: 0,
    critical_alerts: 0,
    compliance_trend: [],
    score_by_type: [],
    top_violations: [],
    recent_inspections: [],
    locations: [],
    templates: [],
  };

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={GROUPS} active={activeGroup} onChange={navigate} />

      {activeTab === 'overview' && (
        <FacilityOverviewTab stats={stats} color={color} onNavigateTab={navigate} />
      )}
      {activeTab === 'locations' && (
        <FacilityLocationsTab
          stats={stats}
          color={color}
          department={department}
          onInspect={(locId) => navigateToInspect(locId)}
          onChanged={() => {}} // Mock data - no refetch needed
        />
      )}
      {activeTab === 'inspect' && (
        <FacilityInspectTab
          stats={stats}
          color={color}
          department={department}
          preselectedLocationId={preselectedLocationId}
          onClearPreselect={() => setPreselectedLocationId(null)}
          onSaved={() => {
            // Mock data - just navigate to reports
            navigate('reports');
          }}
        />
      )}
      {activeTab === 'reports' && (
        <FacilityReportsTab
          stats={stats}
          color={color}
          department={department}
          onChanged={() => {}} // Mock data - no refetch needed
        />
      )}
      {activeTab === 'settings' && (
        <FacilitySettingsTab
          stats={stats}
          color={color}
          department={department}
          onChanged={() => {}} // Mock data - no refetch needed
        />
      )}
    </div>
  );
}
