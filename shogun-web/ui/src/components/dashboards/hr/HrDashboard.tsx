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
import { EquipmentTab } from "./EquipmentTab";
import { GlobalTalentPoolTab } from "./GlobalTalentPoolTab";
import { TrainingTab } from "./TrainingTab";
import { ClosedJobsTab } from "./ClosedJobsTab";

import { TalentPoolPage } from "./TalentPoolPage";
import { CandidateDetailPage } from "./CandidateDetailPage";

/** Top-level groups — similar functions live together. */
const GROUPS: DashboardTab[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "employees", label: "Employees", icon: "Users" },
  { id: "recruitment", label: "Recruitment", icon: "Briefcase" },
  { id: "onboarding", label: "Onboarding", icon: "UserPlus" },
];

/** Second-level tabs inside the Employees group. */
const EMPLOYEE_TABS: DashboardTab[] = [
  { id: "directory", label: "Employee Directory", icon: "Users" },
  { id: "equipment", label: "Equipment Tracker", icon: "Monitor" },
  { id: "training", label: "Training & Development", icon: "GraduationCap" },
];

/** Second-level tabs inside the Recruitment group. */
const RECRUITMENT_TABS: DashboardTab[] = [
  { id: "openings", label: "Job Openings", icon: "Briefcase" },
  { id: "pipeline", label: "Recruitment Pipeline", icon: "GitBranch" },
  { id: "talentpool", label: "Talent Pool", icon: "Database" },
  { id: "closed-jobs", label: "Closed Jobs", icon: "CheckCircle2" },
];

/** Which group owns which sub-tab (keeps legacy tab ids resolvable). */
const SUB_GROUP: Record<string, string> = {};
for (const t of EMPLOYEE_TABS) SUB_GROUP[t.id] = "employees";
for (const t of RECRUITMENT_TABS) SUB_GROUP[t.id] = "recruitment";

/** Default sub-tab when opening a group. */
const DEFAULT_SUB: Record<string, string> = {
  overview: "overview",
  employees: "directory",
  recruitment: "openings",
  onboarding: "onboarding",
};

interface HrDashboardProps {
  department: string;
  color: string;
}

export function HrDashboard({ department, color }: HrDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeGroup, setActiveGroup] = useState("overview");
  const [talentPool, setTalentPool] = useState<{ id: number; job: HrJobOpening } | null>(null);
  const [candidatePage, setCandidatePage] = useState<{ id: number; candidate: HrCandidate } | null>(null);

  const statsQuery = useQuery({
    queryKey: ["dashboard-hr-stats", department],
    queryFn: () => hrApi.stats(department),
    refetchInterval: 120_000,
  });

  /** Navigate by any legacy tab id — resolves the group automatically. */
  function navigate(tabId: string) {
    if (SUB_GROUP[tabId]) {
      setActiveGroup(SUB_GROUP[tabId]);
      setActiveTab(tabId);
    } else if (DEFAULT_SUB[tabId]) {
      setActiveGroup(tabId);
      setActiveTab(DEFAULT_SUB[tabId]);
    } else {
      setActiveTab(tabId);
    }
  }

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
          navigate("pipeline");
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
      <DashboardSubNav tabs={GROUPS} active={activeGroup} onChange={navigate} />
      {activeGroup === "employees" && (
        <DashboardSubNav tabs={EMPLOYEE_TABS} active={activeTab} onChange={setActiveTab} compact />
      )}
      {activeGroup === "recruitment" && (
        <DashboardSubNav tabs={RECRUITMENT_TABS} active={activeTab} onChange={setActiveTab} compact />
      )}
      {activeTab === "overview" && <OverviewTab stats={stats} color={color} onNavigateTab={navigate} />}
      {activeTab === "directory" && <EmployeeDirectoryTab stats={stats} color={color} />}
      {activeTab === "openings" && (
        <JobOpeningsTab
          stats={stats}
          color={color}
          department={department}
          onOpenTalentPool={(j) => setTalentPool({ id: j.id, job: j })}
        />
      )}
      {activeTab === "talentpool" && <GlobalTalentPoolTab stats={stats} color={color} department={department} />}
      {activeTab === "closed-jobs" && <ClosedJobsTab stats={stats} color={color} department={department} onOpenTalentPool={(job) => { setTalentPool({ id: job.id, job }); }} />}
      {activeTab === "pipeline" && <RecruitmentPipelineTab stats={stats} color={color} department={department} />}

      {activeTab === "onboarding" && <OnboardingTab stats={stats} color={color} department={department} onChanged={() => statsQuery.refetch()} />}
      {activeTab === "equipment" && <EquipmentTab stats={stats} color={color} department={department} onChanged={() => statsQuery.refetch()} />}
      {activeTab === "training" && <TrainingTab stats={stats} color={color} department={department} onChanged={() => statsQuery.refetch()} />}

    </div>
  );
}
