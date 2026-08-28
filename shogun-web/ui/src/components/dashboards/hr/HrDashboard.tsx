import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { departmentsApi, hrApi } from "../../../lib/api";
import { DashboardSubNav } from "../DashboardSubNav";
import type { DashboardTab, HrCandidate, HrDashboardStats, HrJobOpening } from "../../../lib/types";
import { OverviewTab } from "./OverviewTab";
import { EmployeeDirectoryTab } from "./EmployeeDirectoryTab";
import { JobOpeningsTab } from "./JobOpeningsTab";
import { RecruitmentPipelineTab } from "./RecruitmentPipelineTab";
import { OnboardingTab } from "./OnboardingTab";
import { LeaveTrackerTab } from "./LeaveTrackerTab";
import { PerformanceTab } from "./PerformanceTab";
import { EquipmentTab } from "./EquipmentTab";
import { TrainingTab } from "./TrainingTab";
import { MeetingsTab } from "./MeetingsTab";
import { TalentPoolPage } from "./TalentPoolPage";
import { CandidateDetailPage } from "./CandidateDetailPage";

const TABS: DashboardTab[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "directory", label: "Employee Directory", icon: "Users" },
  { id: "openings", label: "Job Openings", icon: "Briefcase" },
  { id: "pipeline", label: "Recruitment Pipeline", icon: "GitBranch" },
  { id: "onboarding", label: "Onboarding", icon: "UserPlus" },
  { id: "leave", label: "Leave Tracker", icon: "Calendar" },
  { id: "performance", label: "Performance Reviews", icon: "TrendingUp" },
  { id: "equipment", label: "Equipment Tracker", icon: "Monitor" },
  { id: "training", label: "Training & Development", icon: "GraduationCap" },
  { id: "meetings", label: "Meetings", icon: "CalendarClock" },
];

interface HrDashboardProps {
  department: string;
  color: string;
}

export function HrDashboard({ department, color }: HrDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [talentPool, setTalentPool] = useState<{ id: number; job: HrJobOpening } | null>(null);
  const [candidatePage, setCandidatePage] = useState<{ id: number; candidate: HrCandidate } | null>(null);

  const statsQuery = useQuery({
    queryKey: ["dashboard-hr-stats", department],
    queryFn: () => hrApi.stats(department),
    refetchInterval: 120_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div
          className="h-7 w-7 animate-spin rounded-full"
          style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: "transparent" }}
        />
        <p>Loading HR dashboard…</p>
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="sd-empty">
        <h2>HR Dashboard</h2>
        <p>Unable to load HR data. Run `python scripts/sync-notion-hr.py` to sync from Notion.</p>
      </div>
    );
  }

  const stats: HrDashboardStats = statsQuery.data;

  if (candidatePage) {
    return (
      <CandidateDetailPage
        candidateId={candidatePage.id}
        fallbackCandidate={candidatePage.candidate}
        stats={stats}
        color={color}
        department={department}
        onBack={() => setCandidatePage(null)}
        onAddedToPipeline={() => {
          setCandidatePage(null);
          setTalentPool(null);
          setActiveTab("pipeline");
        }}
      />
    );
  }

  if (talentPool) {
    return (
      <TalentPoolPage
        jobId={talentPool.id}
        fallbackJob={talentPool.job}
        stats={stats}
        color={color}
        department={department}
        onBack={() => setTalentPool(null)}
        onOpenCandidate={(c) => setCandidatePage({ id: c.id, candidate: c })}
      />
    );
  }

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" && <OverviewTab stats={stats} color={color} onNavigateTab={setActiveTab} />}
      {activeTab === "directory" && <EmployeeDirectoryTab stats={stats} color={color} />}
      {activeTab === "openings" && (
        <JobOpeningsTab
          stats={stats}
          color={color}
          department={department}
          onOpenTalentPool={(j) => setTalentPool({ id: j.id, job: j })}
        />
      )}
      {activeTab === "pipeline" && <RecruitmentPipelineTab stats={stats} color={color} department={department} />}
      {activeTab === "onboarding" && <OnboardingTab stats={stats} color={color} />}
      {activeTab === "leave" && <LeaveTrackerTab stats={stats} color={color} />}
      {activeTab === "performance" && <PerformanceTab stats={stats} color={color} />}
      {activeTab === "equipment" && <EquipmentTab stats={stats} color={color} />}
      {activeTab === "training" && <TrainingTab stats={stats} color={color} />}
      {activeTab === "meetings" && <MeetingsTab stats={stats} color={color} />}
    </div>
  );
}