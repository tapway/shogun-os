import { useState } from "react";

// ── Mock Data ──
interface Contract {
  id: number;
  vendor_name: string;
  contract_type: string;
  value_myr: number;
  start_date: string;
  expiry_date: string;
  renewal_status: string;
  performance_score: number;
  contact_person: string;
  notes: string;
}

interface Policy {
  id: number;
  policy_name: string;
  category: string;
  last_review_date: string;
  next_review_date: string;
  owner: string;
  status: string;
  version: string;
}

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

const MOCK_CONTRACTS: Contract[] = [
  { id: 1, vendor_name: "CloudInfra Sdn Bhd", contract_type: "IT Services", value_myr: 280000, start_date: "2025-01-01", expiry_date: "2026-12-31", renewal_status: "renewal_pending", performance_score: 0.85, contact_person: "Ahmad Bin Ali", notes: "Performance review scheduled Oct" },
  { id: 2, vendor_name: "SecureGuard Pte Ltd", contract_type: "Security", value_myr: 95000, start_date: "2024-06-01", expiry_date: "2026-09-30", renewal_status: "urgent_renewal", performance_score: 0.72, contact_person: "Tan Wei Ming", notes: "Expiring in 17 days - negotiate rates" },
  { id: 3, vendor_name: "OfficePlus Supplies", contract_type: "Office Supplies", value_myr: 45000, start_date: "2025-03-01", expiry_date: "2027-02-28", renewal_status: "active", performance_score: 0.91, contact_person: "Lee Mei Hua", notes: "Auto-renewal clause" },
  { id: 4, vendor_name: "TalentBridge Recruitment", contract_type: "HR Services", value_myr: 120000, start_date: "2025-07-01", expiry_date: "2026-06-30", renewal_status: "expired", performance_score: 0.65, contact_person: "Raj Patel", notes: "Underperformance - consider alternative vendors" },
  { id: 5, vendor_name: "NetConnect Telecom", contract_type: "Telecommunications", value_myr: 180000, start_date: "2024-01-01", expiry_date: "2026-12-31", renewal_status: "active", performance_score: 0.88, contact_person: "Siti Nurhaliza", notes: "Bundle discount eligible" },
  { id: 6, vendor_name: "CleanPro Facilities", contract_type: "Facilities Management", value_myr: 75000, start_date: "2025-09-01", expiry_date: "2026-08-31", renewal_status: "negotiation", performance_score: 0.78, contact_person: "Kumar Subramaniam", notes: "Rate increase requested - benchmarking" },
  { id: 7, vendor_name: "LegalEase Advisory", contract_type: "Legal Services", value_myr: 200000, start_date: "2025-04-01", expiry_date: "2027-03-31", renewal_status: "active", performance_score: 0.93, contact_person: "Wong Chee Keong", notes: "Retainer agreement" },
  { id: 8, vendor_name: "DataVault Storage", contract_type: "Cloud Storage", value_myr: 55000, start_date: "2025-11-01", expiry_date: "2026-10-31", renewal_status: "review_due", performance_score: 0.82, contact_person: "Ng Pei Yi", notes: "Usage exceeding tier - upgrade discussion" },
];

const MOCK_POLICIES: Policy[] = [
  { id: 1, policy_name: "Remote Work Policy", category: "HR", last_review_date: "2025-08-15", next_review_date: "2026-08-15", owner: "James Ong", status: "overdue", version: "v2.1" },
  { id: 2, policy_name: "Gift & Hospitality Guidelines", category: "Compliance", last_review_date: "2026-01-10", next_review_date: "2027-01-10", owner: "Legal Dept", status: "active", version: "v3.0" },
  { id: 3, policy_name: "Travel Authorization Procedure", category: "Finance", last_review_date: "2026-03-20", next_review_date: "2027-03-20", owner: "Henry Koh", status: "active", version: "v1.5" },
  { id: 4, policy_name: "Information Security Policy", category: "IT", last_review_date: "2025-11-01", next_review_date: "2026-11-01", owner: "Rajesh Kumar", status: "review_due", version: "v4.0" },
  { id: 5, policy_name: "Whistleblower Protection Policy", category: "Governance", last_review_date: "2026-05-01", next_review_date: "2027-05-01", owner: "Audit Committee", status: "active", version: "v2.0" },
  { id: 6, policy_name: "Procurement SOP", category: "Procurement", last_review_date: "2025-06-15", next_review_date: "2026-06-15", owner: "Nina Phua", status: "overdue", version: "v3.2" },
  { id: 7, policy_name: "Data Retention Policy", category: "Compliance", last_review_date: "2026-02-28", next_review_date: "2027-02-28", owner: "Legal Dept", status: "active", version: "v1.0" },
  { id: 8, policy_name: "Meeting Minutes Standard", category: "Governance", last_review_date: "2026-07-01", next_review_date: "2027-07-01", owner: "Sarah Lim", status: "active", version: "v2.5" },
];

const MOCK_APPROVALS: Approval[] = [
  { id: 1, doc_name: "Vendor Contract - CloudInfra Sdn Bhd", requester: "Procurement", exec_level: "CEO", submitted_date: "2026-09-10", sla_deadline: "2026-09-13T12:00:00", status: "pending", is_sst_sensitive: 1, category: "contract" },
  { id: 2, doc_name: "Travel Authorization - Singapore Trip", requester: "Engineering", exec_level: "CTO", submitted_date: "2026-09-12", sla_deadline: "2026-09-15", status: "pending", is_sst_sensitive: 0, category: "travel" },
  { id: 3, doc_name: "Q3 Marketing Budget Amendment", requester: "Marketing", exec_level: "CFO", submitted_date: "2026-09-08", sla_deadline: "2026-09-13T06:00:00", status: "escalated", is_sst_sensitive: 1, category: "budget" },
  { id: 4, doc_name: "New Hire Offer - Senior Dev", requester: "HR", exec_level: "CTO", submitted_date: "2026-09-11", sla_deadline: "2026-09-14", status: "signed", is_sst_sensitive: 0, category: "hr" },
  { id: 5, doc_name: "Office Renovation PO", requester: "Facilities", exec_level: "COO", submitted_date: "2026-09-06", sla_deadline: "2026-09-11", status: "breached", is_sst_sensitive: 1, category: "procurement" },
  { id: 6, doc_name: "SST Filing Approval - Aug 2026", requester: "Finance", exec_level: "CFO", submitted_date: "2026-09-12", sla_deadline: "2026-09-16", status: "pending", is_sst_sensitive: 1, category: "regulatory" },
  { id: 7, doc_name: "Gift Hospitality - Client Dinner", requester: "Sales", exec_level: "CEO", submitted_date: "2026-09-13", sla_deadline: "2026-09-14", status: "pending", is_sst_sensitive: 1, category: "gift" },
  { id: 8, doc_name: "Policy Update - Remote Work", requester: "HR", exec_level: "COO", submitted_date: "2026-09-09", sla_deadline: "2026-09-16", status: "in_review", is_sst_sensitive: 0, category: "policy" },
];

// ── Helper Functions ──
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRenewalStatusColor(status: string): string {
  switch (status) {
    case "urgent_renewal": return "text-red-500";
    case "expired": return "text-red-600";
    case "renewal_pending": return "text-yellow-500";
    case "negotiation": return "text-orange-500";
    case "review_due": return "text-yellow-600";
    case "active": return "text-green-500";
    default: return "text-[var(--samurai-muted)]";
  }
}

function getPolicyStatusColor(status: string): string {
  switch (status) {
    case "overdue": return "text-red-500";
    case "review_due": return "text-yellow-500";
    case "active": return "text-green-500";
    default: return "text-[var(--samurai-muted)]";
  }
}

// ── Modal Components ──
function ContractDetailModal({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const daysUntilExpiry = getDaysUntil(contract.expiry_date);
  const isUrgent = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry < 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{contract.vendor_name}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--samurai-bg)] rounded">
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Contract Type</p>
              <p className="font-medium">{contract.contract_type}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Value (MYR)</p>
              <p className="font-medium">{contract.value_myr.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Start Date</p>
              <p className="font-medium">{new Date(contract.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Expiry Date</p>
              <p className={`font-medium ${isExpired ? 'text-red-500' : isUrgent ? 'text-yellow-500' : ''}`}>
                {new Date(contract.expiry_date).toLocaleDateString()}
                {isExpired && " (EXPIRED)"}
                {isUrgent && ` (${daysUntilExpiry} days)`}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Renewal Status</span>
              <span className={`font-medium capitalize ${getRenewalStatusColor(contract.renewal_status)}`}>
                {contract.renewal_status.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Performance Score</span>
              <span className="font-medium">{(contract.performance_score * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Contact Person</span>
              <span className="font-medium">{contract.contact_person}</span>
            </div>
          </div>
          
          <div className="p-3 bg-[var(--samurai-bg)] rounded text-sm">
            <p className="text-[var(--samurai-muted)] text-xs mb-1">Notes</p>
            <p>{contract.notes}</p>
          </div>
          
          {contract.performance_score < 0.7 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
              ⚠️ Low performance score — Consider vendor evaluation or alternative sourcing.
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity">
            {isExpired || isUrgent ? "Initiate Renewal" : "View Contract"}
          </button>
          <button className="flex-1 py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            Vendor Performance
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyReviewModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const daysUntilReview = getDaysUntil(policy.next_review_date);
  const isOverdue = daysUntilReview < 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{policy.policy_name}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--samurai-bg)] rounded">
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Category</p>
              <p className="font-medium">{policy.category}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Version</p>
              <p className="font-medium">{policy.version}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Owner</p>
              <p className="font-medium">{policy.owner}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Status</p>
              <p className={`font-medium capitalize ${getPolicyStatusColor(policy.status)}`}>
                {policy.status.replace("_", " ")}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Last Review</span>
              <span className="font-medium">{new Date(policy.last_review_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Next Review</span>
              <span className={`font-medium ${isOverdue ? 'text-red-500' : daysUntilReview <= 30 ? 'text-yellow-500' : ''}`}>
                {new Date(policy.next_review_date).toLocaleDateString()}
                {isOverdue && ` (${Math.abs(daysUntilReview)} days overdue)`}
              </span>
            </div>
          </div>
          
          {isOverdue && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
              ⚠️ Mandatory review overdue — Initiate review workflow immediately.
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity">
            {isOverdue ? "Trigger Review" : "View Document"}
          </button>
          <button className="flex-1 py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            Version History
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab Component ──
export function EaDocumentsTab() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");

  const filteredApprovals = approvalFilter === "all"
    ? MOCK_APPROVALS
    : MOCK_APPROVALS.filter(a => a.status === approvalFilter);

  const filteredContracts = contractFilter === "all"
    ? MOCK_CONTRACTS
    : MOCK_CONTRACTS.filter(c => c.renewal_status === contractFilter);

  // Calculate stats
  const urgentContracts = MOCK_CONTRACTS.filter(c => {
    const days = getDaysUntil(c.expiry_date);
    return days <= 30 && days > 0;
  }).length;
  const expiredContracts = MOCK_CONTRACTS.filter(c => getDaysUntil(c.expiry_date) < 0).length;
  const overduePolicies = MOCK_POLICIES.filter(p => p.status === "overdue").length;
  const pendingApprovals = MOCK_APPROVALS.filter(a => a.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Pending Approvals</p>
          <p className="text-3xl font-bold text-[var(--samurai-fg)]">{pendingApprovals}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">In signature pipeline</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Urgent Renewals</p>
          <p className="text-3xl font-bold text-yellow-500">{urgentContracts}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">Expiring within 30 days</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Expired Contracts</p>
          <p className="text-3xl font-bold text-red-500">{expiredContracts}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">Require immediate action</p>
        </div>
        <div className="p-4 bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg">
          <p className="text-sm text-[var(--samurai-muted)] mb-1">Overdue Policies</p>
          <p className="text-3xl font-bold text-red-500">{overduePolicies}</p>
          <p className="text-xs text-[var(--samurai-muted)] mt-1">Mandatory review missed</p>
        </div>
      </div>

      {/* Signature Pipeline (Kanban-style) */}
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Signature Authority Pipeline</h3>
          <div className="flex gap-2">
            {["all", "pending", "in_review", "signed", "breached"].map((filter) => (
              <button
                key={filter}
                onClick={() => setApprovalFilter(filter)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  approvalFilter === filter
                    ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
                    : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
                }`}
              >
                {filter.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredApprovals.map((approval) => {
            const daysLeft = getDaysUntil(approval.sla_deadline);
            const isBreached = daysLeft < 0;
            
            return (
              <div
                key={approval.id}
                className="p-3 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm text-[var(--samurai-fg)] truncate pr-2">
                    {approval.doc_name}
                  </span>
                  {approval.is_sst_sensitive === 1 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded shrink-0">SST</span>
                  )}
                </div>
                <div className="text-xs text-[var(--samurai-muted)] space-y-1">
                  <p>{approval.requester} → {approval.exec_level}</p>
                  <p className={isBreached ? 'text-red-500' : daysLeft <= 1 ? 'text-yellow-500' : ''}>
                    {isBreached ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                  </p>
                  <p className="capitalize">{approval.status.replace("_", " ")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column: Contracts + Policies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Lifecycle Dashboard */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Contract Lifecycle</h3>
            <select 
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="text-xs bg-[var(--samurai-bg)] border border-[var(--samurai-border)] rounded px-2 py-1 text-[var(--samurai-fg)]"
            >
              <option value="all">All Status</option>
              <option value="urgent_renewal">Urgent Renewal</option>
              <option value="expired">Expired</option>
              <option value="renewal_pending">Renewal Pending</option>
              <option value="active">Active</option>
            </select>
          </div>
          
          <div className="space-y-2">
            {filteredContracts.map((contract) => {
              const daysUntilExpiry = getDaysUntil(contract.expiry_date);
              const isUrgent = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
              const isExpired = daysUntilExpiry < 0;
              
              return (
                <button
                  key={contract.id}
                  onClick={() => setSelectedContract(contract)}
                  className={`w-full p-3 border rounded transition-all text-left ${
                    isExpired 
                      ? "border-red-500/50 bg-red-500/5 hover:border-red-500" 
                      : isUrgent
                      ? "border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500"
                      : "border-[var(--samurai-border)] hover:border-[var(--samurai-lime)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-[var(--samurai-fg)]">{contract.vendor_name}</span>
                    <span className={`text-xs capitalize ${getRenewalStatusColor(contract.renewal_status)}`}>
                      {contract.renewal_status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span>{contract.contract_type} • MYR {contract.value_myr.toLocaleString()}</span>
                    <span>
                      {isExpired ? "EXPIRED" : isUrgent ? `${daysUntilExpiry}d left` : new Date(contract.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Policy Version Control */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)] mb-4">Policy Document Control</h3>
          <div className="space-y-2">
            {MOCK_POLICIES.map((policy) => {
              const daysUntilReview = getDaysUntil(policy.next_review_date);
              const isOverdue = daysUntilReview < 0;
              
              return (
                <button
                  key={policy.id}
                  onClick={() => setSelectedPolicy(policy)}
                  className={`w-full p-3 border rounded transition-all text-left ${
                    isOverdue 
                      ? "border-red-500/50 bg-red-500/5 hover:border-red-500" 
                      : "border-[var(--samurai-border)] hover:border-[var(--samurai-lime)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-[var(--samurai-fg)]">{policy.policy_name}</span>
                    <span className={`text-xs capitalize ${getPolicyStatusColor(policy.status)}`}>
                      {policy.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span>{policy.category} • {policy.version} • {policy.owner}</span>
                    <span>
                      {isOverdue ? `${Math.abs(daysUntilReview)}d overdue` : `Review: ${new Date(policy.next_review_date).toLocaleDateString()}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedContract && <ContractDetailModal contract={selectedContract} onClose={() => setSelectedContract(null)} />}
      {selectedPolicy && <PolicyReviewModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />}
    </div>
  );
}
