import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { departmentsApi } from "../../../lib/api";
import { DashboardSubNav } from "../DashboardSubNav";
import type {
  DashboardTab,
  ExecutiveApprovalRow,
  ProcurementDashboardStats,
} from "../../../lib/types";
import { ExecutiveProcurementPulseTab } from "./ExecutiveProcurementPulseTab";
import { InventoryCatalogTab } from "./InventoryCatalogTab";
import { PurchaseOrdersVendorTab } from "./PurchaseOrdersVendorTab";
import { PurchaseRequisitionsTab } from "./PurchaseRequisitionsTab";
import { BarcodeScanCounterTab } from "./BarcodeScanCounterTab";
import { ThreeWayMatchTab } from "./ThreeWayMatchTab";
import {
  ProcurementActionModal,
  type ProcurementActionType,
} from "./ProcurementActionModal";

const TABS: DashboardTab[] = [
  { id: "pulse", label: "Overview", icon: "LayoutDashboard" },
  { id: "progress", label: "Progress Tracker", icon: "Timer" },
  { id: "requisitions", label: "Purchase Requisitions", icon: "FileText" },
  { id: "po", label: "POs & Vendors", icon: "ClipboardList" },
  { id: "history", label: "Supplier & Item History", icon: "Database" },
  { id: "matching", label: "3-Way Invoice Match", icon: "ShieldCheck" },
  { id: "barcode", label: "Barcode & Asset Tagging", icon: "Warehouse" },
];

interface ProcurementDashboardProps {
  department: string;
  color: string;
}

export function ProcurementDashboard({
  department,
  color,
}: ProcurementDashboardProps) {
  const [activeTab, setActiveTab] = useState("pulse");
  const [modalAction, setModalAction] = useState<ProcurementActionType | null>(
    null,
  );
  const [modalEntity, setModalEntity] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [overrideApprovalQueue, setOverrideApprovalQueue] = useState<
    ExecutiveApprovalRow[] | null
  >(null);

  const handleAction = (actionType: string, entity: unknown) => {
    if (actionType === "create_rfq") {
      setActiveTab("sourcing");
      return;
    }
    setModalAction(actionType as ProcurementActionType);
    setModalEntity(entity as Record<string, unknown> | null);
  };

  const handleActionCompleted = (
    actionType: ProcurementActionType,
    entity: Record<string, unknown> | null,
  ) => {
    if (!entity || !entity.po_number) return;
    const poNum = entity.po_number as string;
    let newStatus: ExecutiveApprovalRow["approval_status"] | null = null;
    if (actionType === "approve_po") newStatus = "Approved";
    else if (actionType === "reject_po") newStatus = "Rejected";
    else if (actionType === "request_clarification")
      newStatus = "Clarification Requested";
    else if (actionType === "reply_clarification")
      newStatus = "Pending Executive Approval";

    if (newStatus) {
      const base =
        overrideApprovalQueue ?? statsQuery.data?.executiveApprovalQueue ?? [];
      setOverrideApprovalQueue(
        base.map((item) =>
          item.po_number === poNum
            ? { ...item, approval_status: newStatus! }
            : item,
        ),
      );
    }
  };

  const statsQuery = useQuery({
    queryKey: ["dashboard-procurement-stats", department],
    queryFn: () => departmentsApi.dashboardProcurementStats(department),
    refetchInterval: 120_000,
  });

  if (statsQuery.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
        <p>Loading Procurement dashboard…</p>
      </div>
    );
  }

  const rawStats: ProcurementDashboardStats | undefined = statsQuery.data;

  if (!rawStats) {
    return (
      <div className="sd-empty">
        <h2>Unable to load Procurement dashboard data</h2>
        <p>The procurement snapshot could not be retrieved. Try refreshing the page.</p>
      </div>
    );
  }

  const stats: ProcurementDashboardStats = {
    ...rawStats,
    executiveApprovalQueue:
      overrideApprovalQueue ?? rawStats.executiveApprovalQueue ?? [],
  };

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "pulse" && (
        <ExecutiveProcurementPulseTab
          stats={stats}
          color={color}
          onNavigateTab={setActiveTab}
        />
      )}
      {activeTab === "progress" && (
        <div className="sd-empty">
          <h2>Progress Tracker</h2>
          <p>End-to-end procurement lifecycle tracking (to be built)</p>
        </div>
      )}
      {activeTab === "requisitions" && (
        <PurchaseRequisitionsTab stats={stats} onAction={handleAction} />
      )}
      {activeTab === "po" && (
        <PurchaseOrdersVendorTab
          stats={stats}
          color={color}
          onAction={handleAction}
        />
      )}
      {activeTab === "history" && (
        <InventoryCatalogTab
          stats={stats}
          color={color}
          onAction={handleAction}
        />
      )}
      {activeTab === "matching" && (
        <ThreeWayMatchTab stats={stats} onAction={handleAction} />
      )}
      {activeTab === "barcode" && (
        <BarcodeScanCounterTab stats={stats} color={color} />
      )}

      <ProcurementActionModal
        open={modalAction !== null}
        onClose={() => {
          setModalAction(null);
          setModalEntity(null);
        }}
        actionType={modalAction ?? "draft_po"}
        entity={modalEntity}
        department={department}
        onActionCompleted={handleActionCompleted}
      />
    </div>
  );
}
