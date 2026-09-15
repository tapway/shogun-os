import { useState } from "react";
import { DashboardSubNav } from "../DashboardSubNav";
import type { DashboardTab } from "../../../lib/types";
import { EaOverviewTab } from "./EaOverviewTab";
import { EaCalendarTab } from "./EaCalendarTab";
import { EaDocumentsTab } from "./EaDocumentsTab";

const TABS: DashboardTab[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "calendar", label: "Calendar", icon: "Calendar" },
  { id: "documents", label: "Document & Approval Flow", icon: "FileText" },
];

interface EaDashboardProps {
  department: string;
  color: string;
}

export function EaDashboard({ department, color }: EaDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="sd-dashboard">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="sd-tab-content">
        {activeTab === "overview" && <EaOverviewTab />}
        {activeTab === "calendar" && <EaCalendarTab />}
        {activeTab === "documents" && <EaDocumentsTab />}
      </div>
    </div>
  );
}
