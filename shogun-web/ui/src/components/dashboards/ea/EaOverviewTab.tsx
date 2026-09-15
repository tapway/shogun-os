import { useState, useEffect } from "react";

// ── Mock Data Types ──
interface Approval {
  id: number;
  doc_name: string;
  requester: string;
  exec_level: string;
  submitted_date: string;
  sla_deadline: string;
  status: string;
  is_sst_sensitive: number;
  category: string;
}

interface GovernanceEvent {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  status: string;
  agenda_finalized: number;
  papers_pending: number;
  quorum_risk: number;
  responsible_owner: string;
  compliance_notes: string;
}

interface EaRequest {
  id: number;
  request_type: string;
  requester_dept: string;
  requester_name: string;
  created_date: string;
  status: string;
  priority: string;
  description: string;
}

// ── Mock Data (loaded from DB via API in real app, hardcoded here for demo) ──
const MOCK_APPROVALS: Approval[] = [
  { id: 1, doc_name: "Vendor Contract - CloudInfra Sdn Bhd", requester: "Procurement", exec_level: "CEO", submitted_date: "2026-09-10", sla_deadline: "2026-09-13T12:00:00", status: "pending", is_sst_sensitive: 1, category: "contract" },
  { id: 2, doc_name: "Travel Authorization - Singapore Trip", requester: "Engineering", exec_level: "CTO", submitted_date: "2026-09-12", sla_deadline: "2026-09-15", status: "pending", is_sst_sensitive: 0, category: "travel" },
  { id: 3, doc_name: "Q3 Marketing Budget Amendment", requester: "Marketing", exec_level: "CFO", submitted_date: "2026-09-08", sla_deadline: "2026-09-13T06:00:00", status: "escalated", is_sst_sensitive: 1, category: "budget" },
  { id: 4, doc_name: "Office Renovation PO", requester: "Facilities", exec_level: "COO", submitted_date: "2026-09-06", sla_deadline: "2026-09-11", status: "breached", is_sst_sensitive: 1, category: "procurement" },
  { id: 5, doc_name: "SST Filing Approval - Aug 2026", requester: "Finance", exec_level: "CFO", submitted_date: "2026-09-12", sla_deadline: "2026-09-16", status: "pending", is_sst_sensitive: 1, category: "regulatory" },
];

const MOCK_EVENTS: GovernanceEvent[] = [
  { id: 1, title: "Q3 Board Meeting", event_type: "board", event_date: "2026-09-25", status: "agenda_finalized", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Sarah Lim", compliance_notes: "Quarterly financials + strategic review" },
  { id: 2, title: "Audit Committee Session", event_type: "committee", event_date: "2026-09-18", status: "papers_pending", agenda_finalized: 1, papers_pending: 1, quorum_risk: 0, responsible_owner: "Henry Koh", compliance_notes: "Internal audit findings review" },
  { id: 3, title: "AGM 2026", event_type: "agm", event_date: "2026-10-15", status: "planned", agenda_finalized: 0, papers_pending: 1, quorum_risk: 1, responsible_owner: "Dato' Ahmad Razak", compliance_notes: "Annual general meeting - quorum verification needed" },
  { id: 4, title: "SST Return Filing - Sep 2026", event_type: "regulatory", event_date: "2026-09-30", status: "compliance_ready", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Grace Lim", compliance_notes: "Service tax return submission" },
];

const MOCK_REQUESTS: EaRequest[] = [
  { id: 1, request_type: "travel", requester_dept: "Engineering", requester_name: "Samuel Ho", created_date: "2026-09-13T08:00:00", status: "new", priority: "high", description: "Flight booking to Penang for client demo" },
  { id: 2, request_type: "room_booking", requester_dept: "Marketing", requester_name: "Emma Chong", created_date: "2026-09-13T05:00:00", status: "in_progress", priority: "normal", description: "Boardroom A for product launch prep" },
  { id: 3, request_type: "visitor", requester_dept: "Sales", requester_name: "Oliver Chan", created_date: "2026-09-13T09:00:00", status: "new", priority: "high", description: "VIP client from Japan - security clearance needed" },
  { id: 4, request_type: "meeting_prep", requester_dept: "Executive Office", requester_name: "Sarah Lim", created_date: "2026-09-13T07:00:00", status: "in_progress", priority: "urgent", description: "Board pack compilation for Sep 25" },
];

// ── Helper Functions ──
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Components ──

function ApprovalDetailModal({ approval, onClose }: { approval: Approval; onClose: () => void }) {
  const daysLeft = getDaysUntil(approval.sla_deadline);
  const isBreached = daysLeft < 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{approval.doc_name}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
            <span className="text-[var(--samurai-muted)]">Requester</span>
            <span className="font-medium">{approval.requester}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
            <span className="text-[var(--samurai-muted)]">Approval Level</span>
            <span className="font-medium">{approval.exec_level}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
            <span className="text-[var(--samurai-muted)]">Submitted</span>
            <span className="font-medium">{new Date(approval.submitted_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
            <span className="text-[var(--samurai-muted)]">SLA Deadline</span>
            <span className={`font-medium ${isBreached ? 'text-red-500' : daysLeft <= 1 ? 'text-yellow-500' : 'text-green-500'}`}>
              {isBreached ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
            <span className="text-[var(--samurai-muted)]">Category</span>
            <span className="font-medium capitalize">{approval.category}</span>
          </div>
          {approval.is_sst_sensitive === 1 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
              ⚠️ SST-Sensitive Document — Ensure tax compliance before approval
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity">
            Open Document
          </button>
          <button className="flex-1 py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}

function EventPrepModal({ event, onClose }: { event: GovernanceEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{event.title}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-[var(--samurai-bg)] rounded space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--samurai-muted)]">Date</span>
              <span className="font-medium">{new Date(event.event_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--samurai-muted)]">Type</span>
              <span className="font-medium capitalize">{event.event_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--samurai-muted)]">Owner</span>
              <span className="font-medium">{event.responsible_owner}</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-[var(--samurai-fg)] mb-2">Compliance Checklist</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)]">
                <input type="checkbox" checked={event.agenda_finalized === 1} readOnly className="accent-[var(--samurai-lime)]" />
                <span className="text-sm">Agenda Finalized</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)]">
                <input type="checkbox" checked={event.papers_pending === 0} readOnly className="accent-[var(--samurai-lime)]" />
                <span className="text-sm">Board Papers Distributed</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)]">
                <input type="checkbox" checked={event.quorum_risk === 0} readOnly className="accent-[var(--samurai-lime)]" />
                <span className="text-sm">Quorum Confirmed</span>
              </label>
            </div>
          </div>
          
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
            💡 {event.compliance_notes}
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Tab Component ──
export function EaOverviewTab() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GovernanceEvent | null>(null);
  const [requestFilter, setRequestFilter] = useState<string>("all");

  // Calculate stats
  const pendingApprovals = MOCK_APPROVALS.filter(a => a.status === "pending").length;
  const breachedApprovals = MOCK_APPROVALS.filter(a => a.status === "breached").length;
  const urgentRequests = MOCK_REQUESTS.filter(r => r.priority === "urgent" || r.priority === "high").length;
  const upcomingEvents = MOCK_EVENTS.filter(e => getDaysUntil(e.event_date) <= 30).length;

  const filteredRequests = requestFilter === "all" 
    ? MOCK_REQUESTS 
    : MOCK_REQUESTS.filter(r => r.status === requestFilter);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Pending Approvals</p>
          <p className="text-3xl font-bold text-[var(--samurai-fg)]">{pendingApprovals}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">{breachedApprovals} breached SLA</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Urgent Requests</p>
          <p className="text-3xl font-bold text-[var(--samurai-fg)]">{urgentRequests}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">High priority items</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Governance Events</p>
          <p className="text-3xl font-bold text-[var(--samurai-fg)]">{upcomingEvents}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">Next 30 days</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">SLA Compliance</p>
          <p className="text-3xl font-bold text-[var(--samurai-lime)]">87%</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">Target: 95%</p>
        </div>
      </div>

      {/* Two Column Layout: Approvals + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Pipeline */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Approval Pipeline</h3>
            <span className="text-xs text-[var(--samurai-muted)]">{MOCK_APPROVALS.length} total</span>
          </div>
          <div className="space-y-2">
            {MOCK_APPROVALS.map((approval) => {
              const daysLeft = getDaysUntil(approval.sla_deadline);
              const isBreached = daysLeft < 0;
              const isUrgent = daysLeft <= 1 && !isBreached;
              
              return (
                <button
                  key={approval.id}
                  onClick={() => setSelectedApproval(approval)}
                  className="w-full p-3 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-[var(--samurai-fg)] truncate pr-2">
                      {approval.doc_name}
                    </span>
                    {approval.is_sst_sensitive === 1 && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">SST</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span>{approval.requester} → {approval.exec_level}</span>
                    <span className={isBreached ? 'text-red-500' : isUrgent ? 'text-yellow-500' : ''}>
                      {isBreached ? 'BREACHED' : `${daysLeft}d left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Governance Events */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Upcoming Governance Events</h3>
            <span className="text-xs text-[var(--samurai-muted)]">Next 90 days</span>
          </div>
          <div className="space-y-2">
            {MOCK_EVENTS.map((event) => {
              const daysUntil = getDaysUntil(event.event_date);
              const statusBadge = event.agenda_finalized && !event.papers_pending && !event.quorum_risk
                ? { color: "green", label: "Ready" }
                : event.quorum_risk
                ? { color: "red", label: "Quorum Risk" }
                : event.papers_pending
                ? { color: "yellow", label: "Papers Pending" }
                : { color: "blue", label: "In Progress" };
              
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full p-3 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-[var(--samurai-fg)]">{event.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded bg-${statusBadge.color}-500/20 text-${statusBadge.color}-500`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span className="capitalize">{event.event_type}</span>
                    <span>{daysUntil} days • {new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request Volume & Quick Actions */}
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Active EA Requests</h3>
          <div className="flex gap-2">
            {["all", "new", "in_progress", "completed"].map((filter) => (
              <button
                key={filter}
                onClick={() => setRequestFilter(filter)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  requestFilter === filter
                    ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
                    : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
                }`}
              >
                {filter.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--samurai-border)] text-left">
                <th className="pb-2 text-[var(--samurai-muted)] font-medium">Type</th>
                <th className="pb-2 text-[var(--samurai-muted)] font-medium">Requester</th>
                <th className="pb-2 text-[var(--samurai-muted)] font-medium">Priority</th>
                <th className="pb-2 text-[var(--samurai-muted)] font-medium">Status</th>
                <th className="pb-2 text-[var(--samurai-muted)] font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="border-b border-[var(--samurai-border)]/50 hover:bg-[var(--samurai-bg)] transition-colors">
                  <td className="py-2 capitalize">{req.request_type.replace("_", " ")}</td>
                  <td className="py-2">{req.requester_name} ({req.requester_dept})</td>
                  <td className="py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      req.priority === "urgent" ? "bg-red-500/20 text-red-500" :
                      req.priority === "high" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-[var(--samurai-bg)] text-[var(--samurai-muted)]"
                    }`}>
                      {req.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 capitalize">{req.status.replace("_", " ")}</td>
                  <td className="py-2 text-[var(--samurai-muted)]">{req.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedApproval && <ApprovalDetailModal approval={selectedApproval} onClose={() => setSelectedApproval(null)} />}
      {selectedEvent && <EventPrepModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
