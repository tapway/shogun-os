export type StatusLevel = 'online' | 'degraded' | 'offline' | 'unknown' | 'pending';

export type DepartmentKey =
  // Shared (always available)
  | 'hr'
  | 'finance'
  | 'crm'
  | 'marketing'
  | 'compliance'
  | 'customer-support'
  | 'coding'
  | 'procurement'
  // General industry
  | 'projects'
  | 'product'
  // Manufacturing industry
  | 'production'
  | 'quality'
  | 'maintenance'
  | 'warehouse'
  | 'hse'
  // Retail industry
  | 'stores'
  | 'merchandising'
  | 'e-commerce'
  | 'crm-loyalty'
  | 'supply-chain'
  | 'visual-merchandising'
  // Plantation industry
  | 'facility';

export type IndustryKey = 'general' | 'manufacturing' | 'retail' | 'plantation';

export const SHARED_DEPARTMENT_KEYS: DepartmentKey[] = [
  'hr', 'finance', 'procurement', 'crm', 'marketing', 'compliance', 'customer-support', 'coding',
];

export const INDUSTRY_CATALOG: Record<
  IndustryKey,
  { label: string; description: string; icon: string; departments: DepartmentKey[] }
> = {
  general: {
    label: 'General / Services',
    description: 'Consulting, software, agencies',
    icon: '🏢',
    departments: ['projects', 'product'],
  },
  manufacturing: {
    label: 'Manufacturing',
    description: 'Factory, production, OEM',
    icon: '🏭',
    departments: ['production', 'quality', 'maintenance', 'warehouse', 'hse'],
  },
  retail: {
    label: 'Retail',
    description: 'Stores, e-commerce, omnichannel',
    icon: '🛒',
    departments: ['stores', 'merchandising', 'e-commerce', 'crm-loyalty', 'supply-chain', 'visual-merchandising'],
  },
  plantation: {
    label: 'Plantation',
    description: 'Estate, mill, agriculture',
    icon: '🌴',
    departments: ['facility'],
  },
};

export function getDepartmentsForIndustry(industry: IndustryKey): DepartmentKey[] {
  return [...SHARED_DEPARTMENT_KEYS, ...INDUSTRY_CATALOG[industry].departments];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  logo_url?: string | null;
  company_name?: string | null;
  first_login: boolean;
  must_change_password: boolean;
  company_id?: string | null;
  role?: string;
  telegram_user_id?: string | null;
  slack_user_id?: string | null;
  platform_user_ids?: Record<string, string>;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string | null;
  timezone: string;
}

export interface ProviderConfig {
  provider?: string;
  api_key?: string;
  subdomain?: string;
  base_url?: string;
  extra?: Record<string, string>;
  comms_channels?: CommsChannelConfig[];
}


export interface Department {
  key: DepartmentKey;
  name: string;
  persona: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
  status: StatusLevel;
  gateway_status?: StatusLevel;
  provider_status?: StatusLevel;
  provider_config?: ProviderConfig;
  profile_name?: string;
}

export interface OnboardingState {
  step: number;
  industry?: IndustryKey | null;
  selected_departments: DepartmentKey[];
  company?: Partial<Company>;
  department_configs?: Partial<Record<DepartmentKey, ProviderConfig>>;
  completed: boolean;
  public_url?: string | null;
  subdomain?: string | null;
  go_live?: {
    ok?: boolean;
    public_url?: string | null;
    subdomain?: string | null;
    message?: string | null;
    tunnel?: Record<string, unknown>;
  };
}

export interface BrainPage {
  slug: string;
  title: string;
  type?: string;
  summary?: string;
  updated_at?: string;
  content?: string;
  tags?: string[];
}

export interface BrainLink {
  slug: string;
  title?: string;
  link_type?: string;
}

export interface DocumentArtifact {
  id: string;
  name: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
  updated_at?: string;
  url?: string;
  preview_url?: string;
  description?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
  is_image?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
  installing?: boolean;
  version?: string;
  department_key?: string;
  author?: string;
  tags?: string[];
  related_skills?: string[];
  path?: string;
  last_modified?: string;
  size_bytes?: number;
  icon?: string;
  installed_departments?: string[];
}

export interface SkillDetail {
  skill: Skill;
  skill_md: string;
}

export interface GeneratedSkill {
  id?: string;
  name: string;
  description: string;
  skill_md?: string;
  instruction?: string;
  department?: string;
  category?: string;
  validation_errors?: string[];
}

export interface SkillIntakeResponse {
  is_ready: boolean;
  follow_up_question?: string;
  missing_aspects?: string[];
  summary?: string;
  suggested_name?: string;
}

export interface CronJob {
  id: string;
  department: string;
  name: string;
  schedule: string;
  prompt: string;
  skill_id?: string;
  enabled: boolean;
  last_run?: string;
  created_at?: string;
  // Delivery target — which comms channel the cron output is posted to
  deliver_channel_id?: string;   // CommsChannelConfig.id
  deliver_channel_name?: string; // Convenience: channel name (e.g. "HR Telegram")
}

export interface CommsChannelConfig {
  id?: string;
  key: 'telegram' | 'slack' | 'discord' | 'whatsapp' | 'teams' | 'email' | 'signal' | 'matrix' | 'mattermost' | 'line' | 'sms' | 'webhooks' | 'google_chat' | 'dingtalk' | 'feishu' | 'wecom' | 'weixin' | 'homeassistant' | 'irc' | 'ntfy' | 'simplex' | 'yuanbao' | 'qqbot' | 'bluebubbles';
  name: string;
  enabled: boolean;
  join_url?: string;
  bot_token?: string;
  channel_id?: string;
  webhook_url?: string;
  extra_id?: string;
  allowed_users?: string;
  credentials?: Record<string, string>;
  status?: 'connected' | 'disconnected' | 'configured' | 'error';
  // Live connection test results (populated by backend /comms/test endpoint)
  last_tested_at?: string;       // ISO timestamp of last test
  last_test_status?: 'ok' | 'error' | 'untested';
  bot_username?: string;         // Discovered bot username (e.g. @my_dept_bot)
  bot_name?: string;             // Discovered bot display name
  last_error?: string;           // Last error message if status is 'error'
}



export interface ConnectorField {
  field: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  hint?: string;
}

export interface Connector {
  id: string;
  name: string;
  category: string;
  description: string;
  logo_icon: string;
  status: "disconnected" | "connecting" | "connected";
  connected_at?: string;
  config_summary?: string;
  docs_url?: string;
  instructions?: string[];
  required_fields?: ConnectorField[];
  recommended_fields?: ConnectorField[];
  credentials?: Record<string, string>;
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments?: unknown;
  result?: unknown;
  status?: 'running' | 'done' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at?: string;
  attachments?: ChatAttachment[];
  tool_calls?: ChatToolCall[];
  streaming?: boolean;
  session_id?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  message_count: number;
  has_tools?: boolean;
  messages: ChatMessage[];
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
  keepSignedIn?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export const DEPARTMENT_CATALOG: Record<
  DepartmentKey,
  Omit<Department, 'active' | 'status' | 'gateway_status' | 'provider_status' | 'provider_config'>
> = {
  // ── Shared departments ──
  hr: {
    key: 'hr',
    name: 'HR',
    persona: 'Jinzai',
    description: 'People ops, leave, recruitment, and policy guidance.',
    color: '#ec4899',
    icon: 'Users',
    profile_name: 'hr-manager',
  },
  finance: {
    key: 'finance',
    name: 'Finance',
    persona: 'Koku',
    description: 'Budgets, expenses, grants, and financial reporting.',
    color: '#10b981',
    icon: 'Wallet',
    profile_name: 'finance-manager',
  },
  crm: {
    key: 'crm',
    name: 'CRM',
    persona: 'Eigyo',
    description: 'Pipeline, accounts, and sales intelligence.',
    color: '#3b82f6',
    icon: 'Handshake',
    profile_name: 'crm-manager',
  },
  marketing: {
    key: 'marketing',
    name: 'Marketing',
    persona: 'Kokuchi',
    description: 'Campaigns, content, and brand messaging.',
    color: '#f59e0b',
    icon: 'Megaphone',
    profile_name: 'marketing-manager',
  },
  compliance: {
    key: 'compliance',
    name: 'Compliance',
    persona: 'Junshu',
    description: 'Policies, audits, and regulatory tracking.',
    color: '#8b5cf6',
    icon: 'Shield',
    profile_name: 'compliance-manager',
  },
  'customer-support': {
    key: 'customer-support',
    name: 'Customer Support',
    persona: 'Shien',
    description: 'Tickets, SLAs, and customer success workflows.',
    color: '#06b6d4',
    icon: 'LifeBuoy',
    profile_name: 'customer-support-manager',
  },
  coding: {
    key: 'coding',
    name: 'Coding',
    persona: 'Gijutsu',
    description: 'Codebase ops, deployments, and technical delivery.',
    color: '#6366f1',
    icon: 'Code2',
    profile_name: 'coding-manager',
  },
  procurement: {
    key: 'procurement',
    name: 'Procurement',
    persona: 'Chotatsu',
    description: 'Purchase orders, vendors, and contract lifecycle.',
    color: '#ef4444',
    icon: 'Package',
    profile_name: 'procurement-manager',
  },
  // ── General industry ──
  projects: {
    key: 'projects',
    name: 'Projects',
    persona: 'Keikaku',
    description: 'Delivery plans, scrum cadences, and milestones.',
    color: '#f97316',
    icon: 'Kanban',
    profile_name: 'projects-manager',
  },
  product: {
    key: 'product',
    name: 'Product',
    persona: 'Seihin',
    description: 'Roadmaps, research, and product decisions.',
    color: '#14b8a6',
    icon: 'Boxes',
    profile_name: 'product-manager',
  },
  // ── Manufacturing industry ──
  production: {
    key: 'production',
    name: 'Production',
    persona: 'Kojo',
    description: 'Factory floor operations, OEE, work orders.',
    color: '#0ea5e9',
    icon: 'Factory',
    profile_name: 'production-manager',
  },
  quality: {
    key: 'quality',
    name: 'Quality',
    persona: 'Kensa',
    description: 'QC inspections, NCRs, CAPA, lot traceability.',
    color: '#22c55e',
    icon: 'CheckCircle',
    profile_name: 'quality-manager',
  },
  maintenance: {
    key: 'maintenance',
    name: 'Maintenance',
    persona: 'Shuri',
    description: 'PM, breakdowns, spare parts, MTBF/MTTR.',
    color: '#eab308',
    icon: 'Wrench',
    profile_name: 'maintenance-manager',
  },
  warehouse: {
    key: 'warehouse',
    name: 'Warehouse',
    persona: 'Soko',
    description: 'Inventory, shipping, cycle counts.',
    color: '#a855f7',
    icon: 'Warehouse',
    profile_name: 'warehouse-manager',
  },
  hse: {
    key: 'hse',
    name: 'HSE',
    persona: 'Anzen',
    description: 'Safety, incidents, permits, environmental monitoring.',
    color: '#dc2626',
    icon: 'AlertTriangle',
    profile_name: 'hse-manager',
  },
  // ── Retail industry ──
  stores: {
    key: 'stores',
    name: 'Stores',
    persona: 'Tenpo',
    description: 'Store operations, daily sales, customer experience.',
    color: '#0284c7',
    icon: 'Store',
    profile_name: 'stores-manager',
  },
  merchandising: {
    key: 'merchandising',
    name: 'Merchandising',
    persona: 'Shohin',
    description: 'Buying, assortment, pricing, product performance.',
    color: '#7c3aed',
    icon: 'ShoppingBag',
    profile_name: 'merchandising-manager',
  },
  'e-commerce': {
    key: 'e-commerce',
    name: 'E-commerce',
    persona: 'Denshi',
    description: 'Online store, marketplace ops, listings, orders.',
    color: '#2563eb',
    icon: 'ShoppingCart',
    profile_name: 'ecommerce-manager',
  },
  'crm-loyalty': {
    key: 'crm-loyalty',
    name: 'CRM/Loyalty',
    persona: 'Kokyaku',
    description: 'Loyalty programs, customer segmentation.',
    color: '#059669',
    icon: 'Gift',
    profile_name: 'crm-loyalty-manager',
  },
  'supply-chain': {
    key: 'supply-chain',
    name: 'Supply Chain',
    persona: 'Ryutsu',
    description: 'DC to store replenishment, distribution.',
    color: '#d97706',
    icon: 'Truck',
    profile_name: 'supply-chain-manager',
  },
  'visual-merchandising': {
    key: 'visual-merchandising',
    name: 'Visual Merchandising',
    persona: 'Hyoji',
    description: 'Shelf layouts, planograms, display compliance.',
    color: '#9333ea',
    icon: 'LayoutGrid',
    profile_name: 'vm-manager',
  },
  // ── Plantation industry ──
  'facility': {
    key: 'facility',
    name: 'Facility Management',
    persona: 'Eizen',
    description: 'Facility management, quarters inspection, document scanning, site conditions.',
    color: '#16a34a',
    icon: 'Trees',
    profile_name: 'facility-manager',
  },
};

export const DEPARTMENT_KEYS = Object.keys(DEPARTMENT_CATALOG) as DepartmentKey[];

// ─── Dashboard Types ───

export interface DashboardTab {
  id: string;
  label: string;
  icon: string;
}

// ─── Staff Management Types ───

export interface StaffAssignment {
  department: string;
  title: string;
  department_name?: string;
  department_id?: number;
  user_id?: number;
  id?: number;
}

export interface StaffMember {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'hr_manager' | 'department_admin' | 'user';
  first_login: boolean;
  is_temporary_password: boolean;
  created_at?: string;
  assignments: StaffAssignment[];
  phone?: string;
  slack_user_id?: string;
  telegram_user_id?: string;
  employee_id?: string;
  manager_name?: string;
  manager_id?: number;
  avatar_url?: string;
  source?: string;
  last_synced_at?: string;
}

export interface AccessInfo {
  role: string;
  assigned_departments: { department: string; title: string; department_name: string }[];
  has_access: boolean;
}

export interface CreateStaffPayload {
  email: string;
  name: string;
  role: string;
  assignments: { department: string; title: string }[];
  phone?: string;
  slack_user_id?: string;
  telegram_user_id?: string;
  employee_id?: string;
  manager_email?: string;
}

export interface DashboardConfig {
  enabled: boolean;
  tabs: DashboardTab[];
}

export interface ManagerEntry {
  owner: string;
  salesMTD: number;
  salesQTD: number;
  salesYTD: number;
  deals: number;
  wonDeals: number;
  pipelineValue: number;
  weightedPipeline: number;
  closeThisMonth: number;
  closeThisQ: number;
  closeNextQ: number;
  closeThisYear: number;
  winRate: number;
}

export interface PartnerStatsEntry {
  partner: string;
  booking: number;
  dealsWon: number;
  pipelineDeals: number;
  pipelineValue: number;
  winRate: number;
  avgDealSize: number;
  primaryOwner: string;
}

export interface FunnelEntry {
  stage: string;
  count: number;
  value: number;
}

export interface MonthEntry {
  month: string;
  value: number;
}

export interface PriorityEntry {
  priority: string;
  count: number;
}

export interface ProductEntry {
  product: string;
  value: number;
  count: number;
}

export interface ManagerRiskEntry {
  owner: string;
  atRiskDeals: number;
  atRiskValue: number;
}

export interface PartnerRiskEntry {
  partner: string;
  atRiskDeals: number;
  atRiskValue: number;
  primaryOwner: string;
}

export interface DealRow {
  slug: string;
  title: string;
  customer: string;
  amount: number;
  stage: string;
  priority: string;
  owner: string;
  partner: string | null;
  closeDate: string;
  winProbability: number;
  daysInStage: number;
  hot: boolean;
}

export interface ChatInboxRow {
  customer: string;
  platform: 'Shopee' | 'Lazada' | 'FB Messenger' | 'WhatsApp';
  lastMessage: string;
  responseMinutes: number;
  status: 'AI Handling' | 'Escalated to Human' | 'Resolved';
}

export interface ChatToOrderTrendEntry {
  week: string;
  shopee: number;
  lazada: number;
  fbMessenger: number;
  whatsapp: number;
}

export interface CeoDashboardStats {
  salesMTD: number;
  salesQTD: number;
  salesYTD: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  pipelineCoverage: number;
  winRate: number;
  avgDealSize: number;
  salesCycleDays: number;
  totalActiveDeals: number;
  hotDeals: number;
  warmDeals: number;
  coldDeals: number;
  wonDeals: number;
  byManager: ManagerEntry[];
  byPartner: PartnerStatsEntry[];
  byStage: FunnelEntry[];
  byMonth: MonthEntry[];
  byPriority: PriorityEntry[];
  wonByMonth: MonthEntry[];
  byProduct: ProductEntry[];
  atRiskByManager: ManagerRiskEntry[];
  atRiskByPartner: PartnerRiskEntry[];
  byManagerByPartner: { owner: string; partner: string; deals: number }[];
  topDeals: DealRow[];
  // Omnichannel Chat & Response SLA (spec §2.3)
  channelVolume: { shopee: number; lazada: number; fbMessenger: number; whatsapp: number };
  avgResponseMinutes: number;
  slaCompliancePct: number;
  aiResolutionPct: number;
  chatToOrderPct: number;
  chatToOrderTrend: ChatToOrderTrendEntry[];
  chatInbox: ChatInboxRow[];
}

// ─── CRM list/search types (gbrain live data) ───

export interface CrmDealListItem {
  slug: string;
  title: string;
  customer?: string;
  owner?: string;
  stage?: string;
  created?: string;
  source?: string;
  amount?: number;
  priority?: string;
  compiled_truth?: string;
}

export interface CrmCompanyItem {
  slug: string;
  title: string;
  industry?: string;
  website?: string;
  source?: string;
  first_seen?: string;
}

export interface CrmTaskItem {
  description: string;
  assignee: string;
  completed: boolean;
  deal_slug: string;
  deal_title: string;
}

export interface CrmSearchResult {
  slug: string;
  title: string;
  frontmatter: Record<string, unknown>;
  category: 'companies' | 'deals' | 'unknown';
}

export interface BevZone {
  zoneId: string;
  name: string;
  cameraIds: string[];
  calibrationType: 'cartesian' | 'geo';
  bounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
  origin?: { x: string; y: string };
  rois?: unknown[];
  tripwires?: unknown[];
}

export const TIMEZONES = [
  'Asia/Kuala_Lumpur',
  'Asia/Singapore',
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'UTC',
];

// ─── Finance Dashboard Types ───

export interface FinanceRiskAlert {
  type: 'concentration' | 'overrun' | 'ar_overdue';
  level: 'warning' | 'critical';
  message: string;
}

export interface FinanceTrendPoint {
  month: string;
  revenue?: number;
  opex?: number;
  net?: number;
  cash?: number;
  netFlow?: number;
}

export interface BankAccount {
  name: string;
  currency: string;
  balance: number;
  balance_myr: number;
  last_reconciled?: string;
}

export interface FxPosition {
  currency: string;
  long: number;
  short: number;
  net: number;
  bnm_fea_compliant: boolean;
}

export interface AssetCategory {
  name: string;
  amount: number;
  icon: string;       // lucide icon name
  sub_items?: { name: string; amount: number }[];
}

export interface AssetTrendPoint {
  month: string;
  current: number;
  non_current: number;
}

export interface Forecast13wScenario {
  week: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

export interface ArAgingBuckets {
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

export interface DunningItem {
  invoice_no: string;
  customer: string;
  due_date: string;
  amount: number;
  aging_days: number;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  dunning_status: string;
}

export interface ApBillItem {
  bill_no: string;
  vendor: string;
  due_date: string;
  amount: number;
  match_status: 'Matched' | 'PO Mismatch' | 'Missing GRN';
  approval_status: 'Pending' | 'Approved' | 'Paid' | 'On Hold';
}

// ─── Email Templates ───

export interface EmailTemplate {
  id: string;
  name: string;
  scenario: string;
  subject_template: string;
  body_template: string;
}

export interface EmailDraftRequest {
  template_id: string;
  context: {
    company?: string;
    amount_due?: string | number;
    overdue_days?: string | number;
    invoice_no?: string;
    [key: string]: string | number | undefined;
  };
  custom_instructions?: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  source: 'llm' | 'template';
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface ApAgingBucket {
  label: string;
  amount: number;
}

export interface MonthlyPlTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
}

export interface CashFlowForecastPoint {
  month: string;
  total: number;   // central forecast
  low: number;     // conservative (downside)
  high: number;    // optimistic (upside)
}

export interface BurnTrendPoint {
  month: string;
  burn: number;    // total expenses for the month
}

export interface CashFlowBreakdownItem {
  category: string;
  actual_ytd: number;
  actual_mtd: number;
  pct_of_total: number;
}

export interface CashFlowBreakdown {
  income: CashFlowBreakdownItem[];
  expenses: CashFlowBreakdownItem[];
  income_total_ytd: number;
  income_total_mtd: number;
  expense_total_ytd: number;
  expense_total_mtd: number;
}

export interface BvaLineItem {
  section: string;
  account_name: string;
  budget_annual: number;
  budget_ytd: number;
  actual_ytd: number;
  variance: number;
  variance_pct: number;
  monthly_budget?: number[];
  match_confidence?: 'high' | 'medium' | 'low' | 'none';
}

export interface UnitEconomics {
  gross_margin_pct: number;
  contribution_margin_pct: number;
  cac: number;
  ltv: number;
  ltv_cac_ratio: number;
}

export interface ClientConcentrationItem {
  name: string;
  revenue_ytd: number;
  revenue_pct: number;
}

export interface FinanceDashboardStats {
  // Mock flag — true when data loaded from examples/*.json (demo mode)
  mock?: boolean;
  // Tab 1 — Executive Pulse
  totalLiquidCash: number;
  netMonthlyBurn: number;
  cashRunwayMonths: number;
  runwayStatus: 'healthy' | 'caution' | 'critical' | 'unknown';
  revenueMTD: number;
  revenueYTD: number;
  grossMargin: number;
  ebitdaMargin: number;
  unpaidStatutory: number;
  riskAlerts: FinanceRiskAlert[];
  revenueOpexTrend: FinanceTrendPoint[];
  cashFlowTrend: FinanceTrendPoint[];
  // Overview tab — additional QBO-live KPIs
  totalLiabilities: number;
  totalEquity: number;
  debtToEquity: number;
  equityRatio: number;
  arToApCoverage: number;
  netWorkingCapital: number;
  grossWorkingCapital: number;
  grossProfitMargin: number;
  totalCurrentLiabilities: number;
  apAgingByTarget: ApAgingBucket[];
  monthlyPlTrend: MonthlyPlTrendPoint[];
  // Cash Flow tab
  arAgingByTarget: ApAgingBucket[];
  cashFlowForecast: CashFlowForecastPoint[];
  burnTrend: BurnTrendPoint[];
  cashFlowBreakdown: CashFlowBreakdown;
  // Tab 2 — Assets
  bankAccounts: BankAccount[];
  fxPositions: FxPosition[];
  forecast13w: { conservative: Forecast13wScenario[]; expected: Forecast13wScenario[]; optimistic: Forecast13wScenario[] };
  fixedOpex: number;
  variableOpex: number;
  // Asset tab
  currentAssets: AssetCategory[];
  nonCurrentAssets: AssetCategory[];
  assetTrend: AssetTrendPoint[];
  totalCurrentAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  // Tab 3 — AR & AP
  totalAR: number;
  arOverdue30: number;
  dso: number;
  totalAP: number;
  apOverdue: number;
  dpo: number;
  arAging: ArAgingBuckets;
  dunningQueue: DunningItem[];
  arInvoices: DunningItem[];
  apBills: ApBillItem[];
  // Tab 4 — BvA & Unit Economics
  bvaLineItems: BvaLineItem[];
  unitEconomics: UnitEconomics;
  clientConcentration: ClientConcentrationItem[];
}

// ─── Procurement Dashboard Types ───

export type ProcurementRiskAlertType = 'safety_breach' | 'dead_stock' | 'lead_time_delay';

export interface ProcurementRiskAlert {
  type: ProcurementRiskAlertType;
  level: 'warning' | 'critical';
  message: string;
}

export interface InventoryValuationByCategory {
  category: string;
  value: number;
}

export interface ProcurementSpendTrendPoint {
  month: string;
  spend?: number;
  budget?: number;
}

export interface SkuItem {
  sku: string;
  item_name: string;
  category: string;
  unit_cost: number;
  current_qty: number;
  safety_reorder_point: number;
  location_bin: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked';
}

export interface AbcParetoClass {
  class_label: 'A' | 'B' | 'C';
  sku_count: number;
  sku_pct: number;
  capital_value: number;
  value_pct: number;
}

export interface ExecutiveApprovalRow {
  po_number: string;
  vendor: string;
  order_date: string;
  total_amount: number;
  requester_dept: string;
  threshold_myr: number;
  approval_status: 'Pending Executive Approval' | 'Approved' | 'Rejected' | 'Clarification Requested';
}

export interface DeadSlowStockItem {
  sku: string;
  item_name: string;
  category: string;
  current_qty: number;
  days_since_last_movement: number;
  months_of_cover: number;
  total_tied_value: number;
  action_recommendation: '25% Promo Discount' | 'Vendor Clearance Return' | 'Bundle Promo with Top SKU' | 'Scrap / Write-off';
}

export interface WarehouseBinCapacity {
  location: string;
  used: number;
  capacity: number;
  utilisation_pct: number;
}

export interface StockMovementEntry {
  timestamp: string;
  sku: string;
  item_name: string;
  movement_type: '+ Receive' | '- Issue' | '~ Adjustment' | '! Damage' | '↺ Return';
  quantity: number;
  reference_id: string;
  location_id: string;
  actor: string;
}

export interface MovementTypeDistribution {
  movement_type: string;
  count: number;
  quantity: number;
}

export interface PoPipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface PurchaseOrderRow {
  po_number: string;
  vendor: string;
  order_date: string;
  expected_delivery: string;
  total_amount: number;
  fulfillment_status: 'Draft' | 'Pending Approval' | 'Issued to Vendor' | 'Partially Received' | 'Fully Received & Billed';
  approval_status: 'Draft' | 'Pending Approval' | 'Approved' | 'Issued' | 'Cancelled';
}

export interface VendorScorecardRow {
  vendor: string;
  preferred_category: string;
  ytd_spend: number;
  on_time_delivery_rate: number;
  quality_acceptance_rate: number;
  sla_status: 'Top Tier' | 'Satisfactory' | 'Under Review';
}

export interface VendorSpendShare {
  vendor: string;
  spend: number;
  spend_pct: number;
}

export interface AccountingBridgeStatus {
  enabled: boolean;
  provider: 'Bukku' | 'QBO' | 'Xero' | 'None';
  connected: boolean;
  last_sync?: string;
}

export interface PoBillConversionRow {
  po_number: string;
  vendor: string;
  date_received: string;
  total_amount: number;
  sync_status: 'Ready to Sync' | 'Synced to Bukku' | 'Sync Error';
}

export interface GlValuationReconciliationRow {
  account_code: string;
  physical_stock_value: number;
  gl_book_value: number;
  variance: number;
  variance_pct: number;
  reconciliation_status: 'Reconciled' | 'Variance Flagged';
}

// Tab 6 — Purchase Requisitions (PR)
export interface PurchaseRequisition {
  pr_number: string;
  requester: string;
  department: string;
  item_description: string;
  category: string;
  estimated_amount: number;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Converted to RFQ/PO' | 'Rejected';
  created_at: string;
  justification?: string;
}

// Tab 7 — RFQ & Vendor Sourcing
export interface RfqVendorQuote {
  vendor: string;
  unit_price: number;
  total_amount: number;
  lead_time_days: number;
  payment_terms: string;
  sla_status: string;
  selected?: boolean;
}

export interface RfqComparison {
  rfq_id: string;
  pr_number: string;
  item_description: string;
  category: string;
  target_qty: number;
  budget_myr: number;
  status: 'Open Sourcing' | 'Vendor Selected' | 'PO Issued';
  quotes: RfqVendorQuote[];
}

// Tab 8 — Barcode Tagging & Scan Counter
export interface BarcodeStockUnit {
  barcode_id: string;
  sku: string;
  item_name: string;
  serial_no: string;
  location_bin: string;
  status: 'In Store' | 'Issued' | 'Returned' | 'Quarantine';
  assigned_to?: string;
  last_scan_timestamp: string;
}

export interface BarcodeBatchLog {
  batch_id: string;
  action_type: 'GRN Receipt Tagging' | 'Stock Issuance (Scan OUT)' | 'Stock Return (Scan IN)';
  reference_id: string;
  actor: string;
  timestamp: string;
  total_items: number;
  units: BarcodeStockUnit[];
}

// Tab 9 — 3-Way Match Verification
export interface ThreeWayMatchItem {
  match_id: string;
  po_number: string;
  grn_number: string;
  invoice_number: string;
  vendor: string;
  po_amount: number;
  grn_received_amount: number;
  invoice_amount: number;
  variance_amount: number;
  variance_pct: number;
  match_status: '100% Match' | 'Within Tolerance' | 'Variance Exceeded';
  ap_approval_status: 'Pending AP Review' | 'Approved for Payment' | 'Flagged to Procurement';
}

export interface ProcurementDashboardStats {
  // Mock flag — true when data loaded from examples/procurement-mock.json (demo mode)
  mock?: boolean;
  // Tab 1 — Executive Procurement & Reorder Pulse
  totalInventoryValuation: number;
  totalActiveSkus: number;
  lowStockAlerts: number;
  deadSlowStockCapital: number;
  openPoCount: number;
  openPoValue: number;
  procurementSpendMtd: number;
  procurementSpendBudgetMtd: number;
  riskAlerts: ProcurementRiskAlert[];
  valuationByCategory: InventoryValuationByCategory[];
  spendVsBudgetTrend: ProcurementSpendTrendPoint[];
  // Tab 2 — Inventory Catalog & Dead/Slow Stock
  skuCatalog: SkuItem[];
  deadSlowStock: DeadSlowStockItem[];
  warehouseBinCapacity: WarehouseBinCapacity[];
  // Tab 3 — Stock Movement Audit Log
  stockMovements: StockMovementEntry[];
  movementTypeDistribution: MovementTypeDistribution[];
  shrinkageFlagItems: string[];
  // Tab 4 — Purchase Orders & Vendor Scorecard
  poPipeline: PoPipelineStage[];
  activePurchaseOrders: PurchaseOrderRow[];
  executiveApprovalQueue: ExecutiveApprovalRow[];
  vendorScorecard: VendorScorecardRow[];
  vendorSpendConcentration: VendorSpendShare[];
  // Tab 5 — Accounting Bridge & Valuation Reconciliation
  accountingBridge: AccountingBridgeStatus;
  poBillConversionQueue: PoBillConversionRow[];
  glValuationReconciliation: GlValuationReconciliationRow[];
  // Tab 6 — Purchase Requisitions (PR)
  purchaseRequisitions?: PurchaseRequisition[];
  // Tab 7 — RFQ & Vendor Sourcing
  rfqComparisons?: RfqComparison[];
  // Tab 8 — Barcode Tagging & Scan Counter
  barcodeBatches?: BarcodeBatchLog[];
  // Tab 9 — 3-Way Match Verification
  threeWayMatches?: ThreeWayMatchItem[];
}
