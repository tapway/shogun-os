/**
 * Procurement Dashboard Mock Data (Demo Branch)
 * 
 * This file contains realistic mock data with variance for testing the procurement dashboard.
 * No gbrain connection - all data is static for demo purposes.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SupplierQuote {
  supplier_name: string;
  amount: number;
  lead_time_days: number;
  warranty_years?: number;
  rating?: number;
  past_orders?: number;
  quotation_file_url?: string;
  selected?: boolean;
}

export interface PurchaseRequisitionItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number;
  selected_supplier: SupplierQuote;
  alternative_quotes: SupplierQuote[];
  selection_reason: string;
}

export interface PurchaseRequisition {
  pr_number: string;
  project_name: string;
  requester: string;
  department: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  justification: string;
  status: 'Draft' | 'Pending Finance Approval' | 'Approved' | 'Rejected' | 'Clarification Requested' | 'Converted to PO';
  items: PurchaseRequisitionItem[];
  total_amount: number;
  created_at: string;
  finance_approved_by?: string;
  finance_approved_at?: string;
  finance_notes?: string;
  finance_rejection_reason?: string;
  template_version: string;
}

export interface PurchaseOrder {
  po_number: string;
  parent_pr: string;
  supplier_name: string;
  supplier_contact: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total_amount: number;
  order_date: string;
  payment_terms: string;
  delivery_address: string;
  status: 'Draft' | 'Sent to Vendor' | 'Acknowledged' | 'Partially Delivered' | 'Fully Delivered';
  emailed_at?: string;
  template_version: string;
}

export interface ProgressTrackerProject {
  project_id: string;
  project_name: string;
  pr_number: string;
  requester: string;
  department: string;
  created_at: string;
  overall_progress: number; // 0-100
  completed_steps: number;
  total_steps: number;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  blocked_reason?: string;
  blocked_since?: string;
  hardware_items: ProgressTrackerHardwareItem[];
}

export interface ProgressTrackerHardwareItem {
  item_id: string;
  name: string;
  quantity: number;
  unit: string;
  selected_supplier: {
    name: string;
    contact: string;
    quotation_amount: number;
    lead_time_days: number;
    rating?: number;
  };
  current_step_index: number;
  steps: ProgressStep[];
}

export interface ProgressStep {
  id: string;
  name: string;
  type: 'internal' | 'vendor';
  department?: 'sales' | 'procurement' | 'finance';
  sla_days?: number;
  vendor_name?: string;
  estimated_days?: number;
  actual_days?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface SupplierHistoryEntry {
  id: string;
  item_name: string;
  supplier_name: string;
  last_price: number;
  last_order_date: string;
  orders_count: number;
  avg_lead_time_days: number;
  rating: number;
  total_spent: number;
}

export interface ThreeWayMatchRecord {
  match_id: string;
  po_number: string;
  supplier_name: string;
  po_amount: number;
  dn_amount?: number;
  invoice_amount?: number;
  po_quantity: number;
  dn_quantity?: number;
  invoice_quantity?: number;
  status: 'pending' | 'matched' | 'mismatch' | 'partial';
  mismatches?: Array<{
    field: string;
    po_value: string | number;
    dn_value?: string | number;
    invoice_value?: string | number;
    difference?: string | number;
  }>;
  matched_at?: string;
  approved_by?: string;
}

export interface BarcodeBatch {
  batch_id: string;
  po_number: string;
  generated_at: string;
  generated_by: string;
  items: Array<{
    item_name: string;
    barcode_code: string;
    scanned: boolean;
    scanned_at?: string;
    scanned_by?: string;
  }>;
  total_items: number;
  scanned_count: number;
}

export interface TemplateVersion {
  version: string;
  active: boolean;
  created_at: string;
  created_by: string;
  changelog: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────

export const MOCK_PRS: PurchaseRequisition[] = [
  {
    pr_number: "PR-2025-001",
    project_name: "Office Renovation - KL HQ",
    requester: "Ahmad bin Hassan",
    department: "Sales",
    priority: "High",
    justification: "Replacement for outdated equipment in new office space expansion",
    status: "Approved",
    items: [
      {
        id: "item-001",
        name: "Dell XPS 15 Laptop",
        quantity: 5,
        unit: "units",
        estimated_price: 12500,
        selected_supplier: {
          supplier_name: "TechWorld Sdn Bhd",
          amount: 12500,
          lead_time_days: 14,
          warranty_years: 2,
          rating: 4.5,
          past_orders: 5,
          selected: true,
        },
        alternative_quotes: [
          {
            supplier_name: "CompAsia",
            amount: 13200,
            lead_time_days: 7,
            warranty_years: 1,
            rating: 4.2,
            past_orders: 2,
            selected: false,
          },
          {
            supplier_name: "ArmTech Solutions",
            amount: 11800,
            lead_time_days: 28,
            warranty_years: 3,
            rating: undefined,
            past_orders: 0,
            selected: false,
          },
        ],
        selection_reason: "Best balance of price, lead time, and supplier track record (5 past orders, 4.5★ rating)",
      },
      {
        id: "item-002",
        name: "Ergonomic Office Chair",
        quantity: 20,
        unit: "units",
        estimated_price: 8400,
        selected_supplier: {
          supplier_name: "OfficePro Malaysia",
          amount: 8400,
          lead_time_days: 28,
          warranty_years: 1,
          rating: 4.0,
          past_orders: 3,
          selected: true,
        },
        alternative_quotes: [
          {
            supplier_name: "ChairMaster Sdn Bhd",
            amount: 9200,
            lead_time_days: 14,
            warranty_years: 2,
            rating: 4.3,
            past_orders: 1,
            selected: false,
          },
        ],
        selection_reason: "Despite longer lead time, offers best unit price for bulk order (RM 420/unit vs RM 460/unit)",
      },
    ],
    total_amount: 20900,
    created_at: "2025-10-01T10:30:00Z",
    finance_approved_by: "Sarah Lim",
    finance_approved_at: "2025-10-02T14:20:00Z",
    finance_notes: "Budget confirmed for Q4 CAPEX allocation",
    template_version: "v1.2",
  },
  {
    pr_number: "PR-2025-002",
    project_name: "Server Room Upgrade",
    requester: "Rajesh Kumar",
    department: "IT Infrastructure",
    priority: "Urgent",
    justification: "Current servers at 95% capacity, risk of service outage",
    status: "Pending Finance Approval",
    items: [
      {
        id: "item-003",
        name: "Dell PowerEdge R750 Server",
        quantity: 2,
        unit: "units",
        estimated_price: 45000,
        selected_supplier: {
          supplier_name: "Dell Technologies Malaysia",
          amount: 45000,
          lead_time_days: 21,
          warranty_years: 3,
          rating: 4.8,
          past_orders: 8,
          selected: true,
        },
        alternative_quotes: [
          {
            supplier_name: "HP Enterprise",
            amount: 47500,
            lead_time_days: 18,
            warranty_years: 3,
            rating: 4.6,
            past_orders: 4,
            selected: false,
          },
        ],
        selection_reason: "Preferred vendor with excellent support history and competitive pricing",
      },
    ],
    total_amount: 45000,
    created_at: "2025-10-05T09:15:00Z",
    template_version: "v1.2",
  },
  {
    pr_number: "PR-2025-003",
    project_name: "Marketing Department Refresh",
    requester: "Lisa Wong",
    department: "Marketing",
    priority: "Medium",
    justification: "Upgrade design team workstations for video editing",
    status: "Rejected",
    items: [
      {
        id: "item-004",
        name: "Apple MacBook Pro 16\"",
        quantity: 3,
        unit: "units",
        estimated_price: 28500,
        selected_supplier: {
          supplier_name: "Apple Authorized Reseller",
          amount: 28500,
          lead_time_days: 10,
          warranty_years: 1,
          rating: 4.9,
          past_orders: 2,
          selected: true,
        },
        alternative_quotes: [],
        selection_reason: "Only authorized reseller with stock available",
      },
    ],
    total_amount: 28500,
    created_at: "2025-09-28T11:00:00Z",
    finance_rejection_reason: "Budget exceeded for Q3. Please resubmit in Q4 planning cycle.",
    template_version: "v1.1",
  },
  {
    pr_number: "PR-2025-004",
    project_name: "Warehouse Equipment",
    requester: "Mohd Faisal",
    department: "Operations",
    priority: "High",
    justification: "Replace broken pallet jacks and add new shelving units",
    status: "Converted to PO",
    items: [
      {
        id: "item-005",
        name: "Electric Pallet Jack",
        quantity: 3,
        unit: "units",
        estimated_price: 9000,
        selected_supplier: {
          supplier_name: "Toyota Material Handling",
          amount: 9000,
          lead_time_days: 30,
          warranty_years: 2,
          rating: 4.7,
          past_orders: 6,
          selected: true,
        },
        alternative_quotes: [
          {
            supplier_name: "Crown Equipment",
            amount: 9800,
            lead_time_days: 25,
            warranty_years: 2,
            rating: 4.5,
            past_orders: 2,
            selected: false,
          },
        ],
        selection_reason: "Lower cost and proven reliability in warehouse environment",
      },
      {
        id: "item-006",
        name: "Heavy Duty Shelving Unit",
        quantity: 10,
        unit: "units",
        estimated_price: 4500,
        selected_supplier: {
          supplier_name: "Storage Solutions MY",
          amount: 4500,
          lead_time_days: 14,
          warranty_years: 5,
          rating: 4.4,
          past_orders: 4,
          selected: true,
        },
        alternative_quotes: [],
        selection_reason: "Best warranty period and competitive pricing",
      },
    ],
    total_amount: 13500,
    created_at: "2025-09-20T08:45:00Z",
    finance_approved_by: "Tan Wei Ming",
    finance_approved_at: "2025-09-21T16:30:00Z",
    finance_notes: "Approved under maintenance budget",
    template_version: "v1.2",
  },
  {
    pr_number: "PR-2025-005",
    project_name: "HR Training Room Setup",
    requester: "Priya Nair",
    department: "Human Resources",
    priority: "Medium",
    justification: "New training room setup for employee development programs",
    status: "Clarification Requested",
    items: [
      {
        id: "item-007",
        name: "Projector Epson EB-X50",
        quantity: 1,
        unit: "unit",
        estimated_price: 2800,
        selected_supplier: {
          supplier_name: "Epson Malaysia",
          amount: 2800,
          lead_time_days: 7,
          warranty_years: 2,
          rating: 4.3,
          past_orders: 3,
          selected: true,
        },
        alternative_quotes: [
          {
            supplier_name: "BenQ Official",
            amount: 2650,
            lead_time_days: 5,
            warranty_years: 2,
            rating: 4.1,
            past_orders: 1,
            selected: false,
          },
        ],
        selection_reason: "Higher lumens output suitable for large training room",
      },
      {
        id: "item-008",
        name: "Whiteboard Magnetic 120x90cm",
        quantity: 2,
        unit: "units",
        estimated_price: 600,
        selected_supplier: {
          supplier_name: "Office Supplies Direct",
          amount: 600,
          lead_time_days: 3,
          warranty_years: undefined,
          rating: 3.9,
          past_orders: 12,
          selected: true,
        },
        alternative_quotes: [],
        selection_reason: "Fastest delivery and frequent supplier",
      },
    ],
    total_amount: 3400,
    created_at: "2025-10-08T13:20:00Z",
    finance_notes: "Please clarify if projector includes mounting bracket and HDMI cables",
    template_version: "v1.2",
  },
];

export const MOCK_POS: PurchaseOrder[] = [
  {
    po_number: "PO-2025-0042",
    parent_pr: "PR-2025-001",
    supplier_name: "TechWorld Sdn Bhd",
    supplier_contact: "sarah@techworld.my",
    items: [
      {
        name: "Dell XPS 15 Laptop",
        quantity: 5,
        unit_price: 2500,
        total: 12500,
      },
    ],
    total_amount: 12500,
    order_date: "2025-10-03",
    payment_terms: "50% upfront, 50% on delivery",
    delivery_address: "Level 15, Menara UOA, Bangsar South, 59200 Kuala Lumpur",
    status: "Fully Delivered",
    emailed_at: "2025-10-03T09:20:00Z",
    template_version: "v1.0",
  },
  {
    po_number: "PO-2025-0043",
    parent_pr: "PR-2025-001",
    supplier_name: "OfficePro Malaysia",
    supplier_contact: "orders@officepro.com.my",
    items: [
      {
        name: "Ergonomic Office Chair",
        quantity: 20,
        unit_price: 420,
        total: 8400,
      },
    ],
    total_amount: 8400,
    order_date: "2025-10-03",
    payment_terms: "100% upfront",
    delivery_address: "Level 15, Menara UOA, Bangsar South, 59200 Kuala Lumpur",
    status: "Partially Delivered",
    emailed_at: "2025-10-03T09:25:00Z",
    template_version: "v1.0",
  },
  {
    po_number: "PO-2025-0044",
    parent_pr: "PR-2025-004",
    supplier_name: "Toyota Material Handling",
    supplier_contact: "sales@toyota-mh.com.my",
    items: [
      {
        name: "Electric Pallet Jack",
        quantity: 3,
        unit_price: 3000,
        total: 9000,
      },
    ],
    total_amount: 9000,
    order_date: "2025-09-22",
    payment_terms: "30% deposit, 70% before delivery",
    delivery_address: "Warehouse Block C, Shah Alam Industrial Park, 40000 Shah Alam",
    status: "Sent to Vendor",
    emailed_at: "2025-09-22T10:00:00Z",
    template_version: "v1.0",
  },
  {
    po_number: "PO-2025-0045",
    parent_pr: "PR-2025-004",
    supplier_name: "Storage Solutions MY",
    supplier_contact: "info@storagesolutions.my",
    items: [
      {
        name: "Heavy Duty Shelving Unit",
        quantity: 10,
        unit_price: 450,
        total: 4500,
      },
    ],
    total_amount: 4500,
    order_date: "2025-09-22",
    payment_terms: "50% upfront, 50% on delivery",
    delivery_address: "Warehouse Block C, Shah Alam Industrial Park, 40000 Shah Alam",
    status: "Fully Delivered",
    emailed_at: "2025-09-22T10:05:00Z",
    template_version: "v1.0",
  },
];

export const MOCK_PROGRESS_TRACKER: ProgressTrackerProject[] = [
  {
    project_id: "proj-001",
    project_name: "Office Renovation - KL HQ",
    pr_number: "PR-2025-001",
    requester: "Ahmad bin Hassan",
    department: "Sales",
    created_at: "2025-10-01T10:30:00Z",
    overall_progress: 68,
    completed_steps: 11,
    total_steps: 16,
    status: "in_progress",
    hardware_items: [
      {
        item_id: "hw-001",
        name: "Dell XPS 15 Laptop",
        quantity: 5,
        unit: "units",
        selected_supplier: {
          name: "TechWorld Sdn Bhd",
          contact: "sarah@techworld.my",
          quotation_amount: 12500,
          lead_time_days: 14,
          rating: 4.5,
        },
        current_step_index: 12,
        steps: [
          { id: "step-001", name: "Hardware List Received", type: "internal", department: "sales", sla_days: 1, status: "completed", started_at: "2025-10-01T10:30:00Z", completed_at: "2025-10-01T11:00:00Z" },
          { id: "step-002", name: "Search Supplier History", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-01T11:00:00Z", completed_at: "2025-10-01T14:00:00Z", notes: "Found 3 past suppliers" },
          { id: "step-003", name: "Request Quotation", type: "internal", department: "procurement", sla_days: 2, status: "completed", started_at: "2025-10-01T14:00:00Z", completed_at: "2025-10-03T09:00:00Z", notes: "Sent RFQ to 3 suppliers" },
          { id: "step-004", name: "Create PR", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:00:00Z", completed_at: "2025-10-03T10:30:00Z" },
          { id: "step-005", name: "Finance Confirmation", type: "internal", department: "finance", sla_days: 3, status: "completed", started_at: "2025-10-03T10:30:00Z", completed_at: "2025-10-02T14:20:00Z", notes: "Approved by Sarah Lim" },
          { id: "step-006", name: "Receive PR Back", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-02T14:20:00Z", completed_at: "2025-10-02T15:00:00Z" },
          { id: "step-007", name: "Prepare PO", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-02T15:00:00Z", completed_at: "2025-10-03T09:00:00Z" },
          { id: "step-008", name: "Boss Sign", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:00:00Z", completed_at: "2025-10-03T09:15:00Z" },
          { id: "step-009", name: "Send PO to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:15:00Z", completed_at: "2025-10-03T09:20:00Z" },
          { id: "step-010", name: "Proforma Invoice", type: "vendor", vendor_name: "TechWorld Sdn Bhd", estimated_days: 7, actual_days: 6, status: "completed", started_at: "2025-10-03T09:20:00Z", completed_at: "2025-10-09T11:00:00Z" },
          { id: "step-011", name: "Down Payment", type: "internal", department: "finance", sla_days: 2, status: "completed", started_at: "2025-10-09T11:00:00Z", completed_at: "2025-10-10T16:00:00Z" },
          { id: "step-012", name: "Payment Slip to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-10T16:00:00Z", completed_at: "2025-10-11T09:00:00Z" },
          { id: "step-013", name: "Delivery Note + Items", type: "vendor", vendor_name: "TechWorld Sdn Bhd", estimated_days: 14, actual_days: 13, status: "completed", started_at: "2025-10-11T09:00:00Z", completed_at: "2025-10-24T14:00:00Z" },
          { id: "step-014", name: "Generate & Scan Barcode", type: "internal", department: "procurement", sla_days: 1, status: "in_progress", started_at: "2025-10-24T14:00:00Z", notes: "Scanning in progress" },
          { id: "step-015", name: "Final Invoice", type: "vendor", vendor_name: "TechWorld Sdn Bhd", estimated_days: 3, status: "pending" },
          { id: "step-016", name: "Balance Payment", type: "internal", department: "finance", sla_days: 3, status: "pending" },
        ],
      },
      {
        item_id: "hw-002",
        name: "Ergonomic Office Chair",
        quantity: 20,
        unit: "units",
        selected_supplier: {
          name: "OfficePro Malaysia",
          contact: "orders@officepro.com.my",
          quotation_amount: 8400,
          lead_time_days: 28,
          rating: 4.0,
        },
        current_step_index: 9,
        steps: [
          { id: "step-017", name: "Hardware List Received", type: "internal", department: "sales", sla_days: 1, status: "completed", started_at: "2025-10-01T10:30:00Z", completed_at: "2025-10-01T11:00:00Z" },
          { id: "step-018", name: "Search Supplier History", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-01T11:00:00Z", completed_at: "2025-10-01T14:00:00Z" },
          { id: "step-019", name: "Request Quotation", type: "internal", department: "procurement", sla_days: 2, status: "completed", started_at: "2025-10-01T14:00:00Z", completed_at: "2025-10-03T09:00:00Z" },
          { id: "step-020", name: "Create PR", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:00:00Z", completed_at: "2025-10-03T10:30:00Z" },
          { id: "step-021", name: "Finance Confirmation", type: "internal", department: "finance", sla_days: 3, status: "completed", started_at: "2025-10-03T10:30:00Z", completed_at: "2025-10-02T14:20:00Z" },
          { id: "step-022", name: "Receive PR Back", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-02T14:20:00Z", completed_at: "2025-10-02T15:00:00Z" },
          { id: "step-023", name: "Prepare PO", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-02T15:00:00Z", completed_at: "2025-10-03T09:00:00Z" },
          { id: "step-024", name: "Boss Sign", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:00:00Z", completed_at: "2025-10-03T09:15:00Z" },
          { id: "step-025", name: "Send PO to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-03T09:15:00Z", completed_at: "2025-10-03T09:25:00Z" },
          { id: "step-026", name: "Proforma Invoice", type: "vendor", vendor_name: "OfficePro Malaysia", estimated_days: 5, status: "in_progress", started_at: "2025-10-03T09:25:00Z", notes: "Expected Oct 8" },
          { id: "step-027", name: "Down Payment", type: "internal", department: "finance", sla_days: 2, status: "pending" },
          { id: "step-028", name: "Payment Slip to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-029", name: "Delivery Note + Items", type: "vendor", vendor_name: "OfficePro Malaysia", estimated_days: 28, status: "pending", notes: "⚠️ Long lead time (4 weeks)" },
          { id: "step-030", name: "Generate & Scan Barcode", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-031", name: "Final Invoice", type: "vendor", vendor_name: "OfficePro Malaysia", estimated_days: 3, status: "pending" },
          { id: "step-032", name: "Balance Payment", type: "internal", department: "finance", sla_days: 3, status: "pending" },
        ],
      },
    ],
  },
  {
    project_id: "proj-002",
    project_name: "Server Room Upgrade",
    pr_number: "PR-2025-002",
    requester: "Rajesh Kumar",
    department: "IT Infrastructure",
    created_at: "2025-10-05T09:15:00Z",
    overall_progress: 31,
    completed_steps: 5,
    total_steps: 16,
    status: "blocked",
    blocked_reason: "Waiting for Finance approval",
    blocked_since: "2025-10-05T09:15:00Z",
    hardware_items: [
      {
        item_id: "hw-003",
        name: "Dell PowerEdge R750 Server",
        quantity: 2,
        unit: "units",
        selected_supplier: {
          name: "Dell Technologies Malaysia",
          contact: "enterprise@dell.com.my",
          quotation_amount: 45000,
          lead_time_days: 21,
          rating: 4.8,
        },
        current_step_index: 5,
        steps: [
          { id: "step-033", name: "Hardware List Received", type: "internal", department: "sales", sla_days: 1, status: "completed", started_at: "2025-10-05T09:15:00Z", completed_at: "2025-10-05T10:00:00Z" },
          { id: "step-034", name: "Search Supplier History", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-05T10:00:00Z", completed_at: "2025-10-05T11:30:00Z" },
          { id: "step-035", name: "Request Quotation", type: "internal", department: "procurement", sla_days: 2, status: "completed", started_at: "2025-10-05T11:30:00Z", completed_at: "2025-10-06T16:00:00Z" },
          { id: "step-036", name: "Create PR", type: "internal", department: "procurement", sla_days: 1, status: "completed", started_at: "2025-10-06T16:00:00Z", completed_at: "2025-10-06T17:00:00Z" },
          { id: "step-037", name: "Finance Confirmation", type: "internal", department: "finance", sla_days: 3, status: "blocked", started_at: "2025-10-06T17:00:00Z", notes: "Awaiting CFO review (high value >RM 40K)" },
          { id: "step-038", name: "Receive PR Back", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-039", name: "Prepare PO", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-040", name: "Boss Sign", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-041", name: "Send PO to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-042", name: "Proforma Invoice", type: "vendor", vendor_name: "Dell Technologies Malaysia", estimated_days: 5, status: "pending" },
          { id: "step-043", name: "Down Payment", type: "internal", department: "finance", sla_days: 2, status: "pending" },
          { id: "step-044", name: "Payment Slip to Supplier", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-045", name: "Delivery Note + Items", type: "vendor", vendor_name: "Dell Technologies Malaysia", estimated_days: 21, status: "pending" },
          { id: "step-046", name: "Generate & Scan Barcode", type: "internal", department: "procurement", sla_days: 1, status: "pending" },
          { id: "step-047", name: "Final Invoice", type: "vendor", vendor_name: "Dell Technologies Malaysia", estimated_days: 3, status: "pending" },
          { id: "step-048", name: "Balance Payment", type: "internal", department: "finance", sla_days: 3, status: "pending" },
        ],
      },
    ],
  },
];

export const MOCK_SUPPLIER_HISTORY: SupplierHistoryEntry[] = [
  {
    id: "hist-001",
    item_name: "Dell XPS 15 Laptop",
    supplier_name: "TechWorld Sdn Bhd",
    last_price: 2500,
    last_order_date: "2025-09-15",
    orders_count: 5,
    avg_lead_time_days: 12,
    rating: 4.5,
    total_spent: 62500,
  },
  {
    id: "hist-002",
    item_name: "Dell XPS 15 Laptop",
    supplier_name: "CompAsia",
    last_price: 2640,
    last_order_date: "2025-08-20",
    orders_count: 2,
    avg_lead_time_days: 7,
    rating: 4.2,
    total_spent: 15840,
  },
  {
    id: "hist-003",
    item_name: "Ergonomic Office Chair",
    supplier_name: "OfficePro Malaysia",
    last_price: 420,
    last_order_date: "2025-09-01",
    orders_count: 3,
    avg_lead_time_days: 21,
    rating: 4.0,
    total_spent: 25200,
  },
  {
    id: "hist-004",
    item_name: "Monitor Arm Dual",
    supplier_name: "ArmTech Solutions",
    last_price: 500,
    last_order_date: "2025-07-10",
    orders_count: 1,
    avg_lead_time_days: 10,
    rating: 4.3,
    total_spent: 2500,
  },
  {
    id: "hist-005",
    item_name: "Electric Pallet Jack",
    supplier_name: "Toyota Material Handling",
    last_price: 3000,
    last_order_date: "2025-06-15",
    orders_count: 6,
    avg_lead_time_days: 28,
    rating: 4.7,
    total_spent: 54000,
  },
  {
    id: "hist-006",
    item_name: "Heavy Duty Shelving Unit",
    supplier_name: "Storage Solutions MY",
    last_price: 450,
    last_order_date: "2025-08-05",
    orders_count: 4,
    avg_lead_time_days: 14,
    rating: 4.4,
    total_spent: 18000,
  },
  {
    id: "hist-007",
    item_name: "Projector Epson EB-X50",
    supplier_name: "Epson Malaysia",
    last_price: 2800,
    last_order_date: "2025-05-20",
    orders_count: 3,
    avg_lead_time_days: 7,
    rating: 4.3,
    total_spent: 8400,
  },
  {
    id: "hist-008",
    item_name: "Whiteboard Magnetic 120x90cm",
    supplier_name: "Office Supplies Direct",
    last_price: 300,
    last_order_date: "2025-09-25",
    orders_count: 12,
    avg_lead_time_days: 3,
    rating: 3.9,
    total_spent: 7200,
  },
  {
    id: "hist-009",
    item_name: "Dell PowerEdge R750 Server",
    supplier_name: "Dell Technologies Malaysia",
    last_price: 22500,
    last_order_date: "2025-04-10",
    orders_count: 8,
    avg_lead_time_days: 21,
    rating: 4.8,
    total_spent: 180000,
  },
  {
    id: "hist-010",
    item_name: "Apple MacBook Pro 16\"",
    supplier_name: "Apple Authorized Reseller",
    last_price: 9500,
    last_order_date: "2025-03-15",
    orders_count: 2,
    avg_lead_time_days: 10,
    rating: 4.9,
    total_spent: 19000,
  },
];

export const MOCK_THREE_WAY_MATCHES: ThreeWayMatchRecord[] = [
  {
    match_id: "match-001",
    po_number: "PO-2025-0042",
    supplier_name: "TechWorld Sdn Bhd",
    po_amount: 12500,
    dn_amount: 12500,
    invoice_amount: 12500,
    po_quantity: 5,
    dn_quantity: 5,
    invoice_quantity: 5,
    status: "matched",
    matched_at: "2025-10-26T11:30:00Z",
    approved_by: "Sarah Lim",
  },
  {
    match_id: "match-002",
    po_number: "PO-2025-0045",
    supplier_name: "Storage Solutions MY",
    po_amount: 4500,
    dn_amount: 4500,
    invoice_amount: 4500,
    po_quantity: 10,
    dn_quantity: 10,
    invoice_quantity: 10,
    status: "matched",
    matched_at: "2025-10-10T14:20:00Z",
    approved_by: "Tan Wei Ming",
  },
  {
    match_id: "match-003",
    po_number: "PO-2025-0043",
    supplier_name: "OfficePro Malaysia",
    po_amount: 8400,
    dn_amount: 4200,
    invoice_amount: undefined,
    po_quantity: 20,
    dn_quantity: 10,
    invoice_quantity: undefined,
    status: "partial",
    mismatches: [
      {
        field: "Quantity",
        po_value: 20,
        dn_value: 10,
        difference: "10 units pending delivery",
      },
    ],
  },
  {
    match_id: "match-004",
    po_number: "PO-2025-0044",
    supplier_name: "Toyota Material Handling",
    po_amount: 9000,
    dn_amount: undefined,
    invoice_amount: undefined,
    po_quantity: 3,
    dn_quantity: undefined,
    invoice_quantity: undefined,
    status: "pending",
  },
];

export const MOCK_BARCODE_BATCHES: BarcodeBatch[] = [
  {
    batch_id: "batch-001",
    po_number: "PO-2025-0042",
    generated_at: "2025-10-24T14:00:00Z",
    generated_by: "Ahmad bin Hassan",
    items: [
      { item_name: "Dell XPS 15 Laptop #1", barcode_code: "PO-2025-0042-001", scanned: true, scanned_at: "2025-10-24T14:05:00Z", scanned_by: "Ahmad bin Hassan" },
      { item_name: "Dell XPS 15 Laptop #2", barcode_code: "PO-2025-0042-002", scanned: true, scanned_at: "2025-10-24T14:06:00Z", scanned_by: "Ahmad bin Hassan" },
      { item_name: "Dell XPS 15 Laptop #3", barcode_code: "PO-2025-0042-003", scanned: true, scanned_at: "2025-10-24T14:07:00Z", scanned_by: "Ahmad bin Hassan" },
      { item_name: "Dell XPS 15 Laptop #4", barcode_code: "PO-2025-0042-004", scanned: false },
      { item_name: "Dell XPS 15 Laptop #5", barcode_code: "PO-2025-0042-005", scanned: false },
    ],
    total_items: 5,
    scanned_count: 3,
  },
  {
    batch_id: "batch-002",
    po_number: "PO-2025-0045",
    generated_at: "2025-10-08T10:00:00Z",
    generated_by: "Mohd Faisal",
    items: [
      { item_name: "Heavy Duty Shelving Unit #1", barcode_code: "PO-2025-0045-001", scanned: true, scanned_at: "2025-10-08T10:05:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #2", barcode_code: "PO-2025-0045-002", scanned: true, scanned_at: "2025-10-08T10:06:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #3", barcode_code: "PO-2025-0045-003", scanned: true, scanned_at: "2025-10-08T10:07:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #4", barcode_code: "PO-2025-0045-004", scanned: true, scanned_at: "2025-10-08T10:08:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #5", barcode_code: "PO-2025-0045-005", scanned: true, scanned_at: "2025-10-08T10:09:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #6", barcode_code: "PO-2025-0045-006", scanned: true, scanned_at: "2025-10-08T10:10:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #7", barcode_code: "PO-2025-0045-007", scanned: true, scanned_at: "2025-10-08T10:11:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #8", barcode_code: "PO-2025-0045-008", scanned: true, scanned_at: "2025-10-08T10:12:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #9", barcode_code: "PO-2025-0045-009", scanned: true, scanned_at: "2025-10-08T10:13:00Z", scanned_by: "Mohd Faisal" },
      { item_name: "Heavy Duty Shelving Unit #10", barcode_code: "PO-2025-0045-010", scanned: true, scanned_at: "2025-10-08T10:14:00Z", scanned_by: "Mohd Faisal" },
    ],
    total_items: 10,
    scanned_count: 10,
  },
];

export const MOCK_TEMPLATE_VERSIONS: Record<string, TemplateVersion[]> = {
  pr: [
    {
      version: "v1.2",
      active: true,
      created_at: "2025-10-01T08:00:00Z",
      created_by: "admin",
      changelog: "Added justification field, multi-item support, supplier comparison section",
    },
    {
      version: "v1.1",
      active: false,
      created_at: "2025-09-15T10:00:00Z",
      created_by: "admin",
      changelog: "Added priority field, improved formatting",
    },
    {
      version: "v1.0",
      active: false,
      created_at: "2025-09-01T09:00:00Z",
      created_by: "admin",
      changelog: "Initial version",
    },
  ],
  po: [
    {
      version: "v1.0",
      active: true,
      created_at: "2025-09-01T09:00:00Z",
      created_by: "admin",
      changelog: "Initial version with standard PO format",
    },
  ],
};

// ─── Helper Functions ───────────────────────────────────────────────────────────

export function getMockStats() {
  return {
    totalActiveProjects: MOCK_PROGRESS_TRACKER.length,
    blockedCount: MOCK_PROGRESS_TRACKER.filter(p => p.status === 'blocked').length,
    onTrackCount: MOCK_PROGRESS_TRACKER.filter(p => p.status === 'in_progress').length,
    avgLeadTimeDays: 14.2,
    totalPRs: MOCK_PRS.length,
    approvedPRs: MOCK_PRS.filter(pr => pr.status === 'Approved').length,
    pendingPRs: MOCK_PRS.filter(pr => pr.status === 'Pending Finance Approval').length,
    totalPOs: MOCK_POS.length,
    totalSpendMTD: 20900 + 4500 + 13500,
    supplierHistoryCount: MOCK_SUPPLIER_HISTORY.length,
    matchedInvoices: MOCK_THREE_WAY_MATCHES.filter(m => m.status === 'matched').length,
    pendingMatches: MOCK_THREE_WAY_MATCHES.filter(m => m.status === 'pending').length,
    barcodeBatches: MOCK_BARCODE_BATCHES.length,
    totalItemsScanned: MOCK_BARCODE_BATCHES.reduce((sum, b) => sum + b.scanned_count, 0),
  };
}
