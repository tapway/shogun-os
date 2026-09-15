// ─── Coding Department Mock Data ───
// All data is mock/demo — no API calls needed

export interface SprintData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPoints: number;
  daysElapsed: number;
  totalDays: number;
}

export interface PrItem {
  id: number;
  title: string;
  author: string;
  branch: string;
  status: 'open' | 'approved' | 'changes_requested' | 'merged' | 'draft';
  ciStatus: 'passing' | 'failing' | 'pending' | 'skipped';
  reviewers: string[];
  ageHours: number;
  additions: number;
  deletions: number;
  labels: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'qa' | 'done';
  priority: 'critical' | 'high' | 'medium' | 'low';
  points: number;
  labels: string[];
  sprint: string;
}

export interface DevMetric {
  name: string;
  commits: number;
  prsOpened: number;
  prsReviewed: number;
  linesAdded: number;
  linesRemoved: number;
  coverageDelta: number;
}

export interface QualityMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

export interface ReleaseItem {
  version: string;
  date: string;
  environment: 'staging' | 'production';
  status: 'deployed' | 'pending' | 'failed' | 'rolled_back';
  deployedBy: string;
  prCount: number;
}

export interface IncidentItem {
  id: string;
  title: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'active' | 'investigating' | 'resolved' | 'postmortem';
  startedAt: string;
  resolvedAt?: string;
  assignee: string;
}

export interface RetroItem {
  id: string;
  category: 'well' | 'improve' | 'action';
  text: string;
  votes: number;
  sprint: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'inactive';
  lead: string;
  team: string[];
  startDate: string;
  targetDate?: string;
  progress: number;
  techStack: string[];
  repoUrl?: string;
}

export interface ActivityUpdate {
  id: string;
  projectId: string;
  author: string;
  type: 'commit' | 'push' | 'pr' | 'deploy' | 'comment' | 'doc';
  title: string;
  summary: string;
  timestamp: string;
  branch?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
}

// ─── MOCK DATA ───

export const CURRENT_SPRINT: SprintData = {
  id: 'SP-24',
  name: 'Sprint 24 — Auth & Payments',
  startDate: '2026-09-01',
  endDate: '2026-09-14',
  totalPoints: 48,
  completedPoints: 31,
  daysElapsed: 10,
  totalDays: 14,
};

export const VELOCITY_HISTORY = [
  { sprint: 'SP-19', points: 38 },
  { sprint: 'SP-20', points: 42 },
  { sprint: 'SP-21', points: 35 },
  { sprint: 'SP-22', points: 45 },
  { sprint: 'SP-23', points: 41 },
  { sprint: 'SP-24', points: 31 }, // in progress
];

export const MOCK_PRS: PrItem[] = [
  { id: 342, title: 'feat: add JWT refresh token rotation', author: 'Aisha', branch: 'feat/jwt-refresh', status: 'open', ciStatus: 'passing', reviewers: ['Wei', 'Raj'], ageHours: 4, additions: 245, deletions: 32, labels: ['auth', 'security'] },
  { id: 341, title: 'fix: payment webhook idempotency key', author: 'Wei', branch: 'fix/webhook-idem', status: 'approved', ciStatus: 'passing', reviewers: ['Aisha'], ageHours: 18, additions: 67, deletions: 12, labels: ['payments', 'bugfix'] },
  { id: 340, title: 'refactor: extract validation middleware', author: 'Raj', branch: 'refactor/validation', status: 'changes_requested', ciStatus: 'failing', reviewers: ['Aisha', 'Wei'], ageHours: 26, additions: 189, deletions: 210, labels: ['refactor'] },
  { id: 339, title: 'feat: Stripe subscription lifecycle', author: 'Mei', branch: 'feat/stripe-subs', status: 'draft', ciStatus: 'pending', reviewers: [], ageHours: 2, additions: 412, deletions: 0, labels: ['payments', 'wip'] },
  { id: 338, title: 'ci: add E2E test matrix for auth flows', author: 'Kai', branch: 'ci/e2e-auth', status: 'open', ciStatus: 'passing', reviewers: ['Raj'], ageHours: 8, additions: 156, deletions: 8, labels: ['ci', 'testing'] },
  { id: 337, title: 'fix: rate limiter Redis connection pool', author: 'Aisha', branch: 'fix/rate-limiter', status: 'merged', ciStatus: 'passing', reviewers: ['Wei', 'Kai'], ageHours: 48, additions: 34, deletions: 18, labels: ['infra', 'bugfix'] },
  { id: 336, title: 'docs: update API versioning guide', author: 'Wei', branch: 'docs/api-versioning', status: 'merged', ciStatus: 'skipped', reviewers: ['Raj'], ageHours: 72, additions: 89, deletions: 23, labels: ['docs'] },
];

export const MOCK_TASKS: TaskItem[] = [
  { id: 'COD-301', title: 'Implement OAuth2 PKCE flow', assignee: 'Aisha', status: 'in_progress', priority: 'critical', points: 8, labels: ['auth', 'security'], sprint: 'SP-24' },
  { id: 'COD-302', title: 'Stripe webhook signature verification', assignee: 'Wei', status: 'review', priority: 'high', points: 5, labels: ['payments'], sprint: 'SP-24' },
  { id: 'COD-303', title: 'Rate limiting per-tenant configuration', assignee: 'Raj', status: 'in_progress', priority: 'high', points: 5, labels: ['infra'], sprint: 'SP-24' },
  { id: 'COD-304', title: 'E2E tests for password reset flow', assignee: 'Kai', status: 'qa', priority: 'medium', points: 3, labels: ['testing', 'auth'], sprint: 'SP-24' },
  { id: 'COD-305', title: 'Database migration: add audit_log table', assignee: 'Mei', status: 'done', priority: 'high', points: 5, labels: ['db', 'audit'], sprint: 'SP-24' },
  { id: 'COD-306', title: 'API response caching layer', assignee: 'Aisha', status: 'ready', priority: 'medium', points: 5, labels: ['performance'], sprint: 'SP-24' },
  { id: 'COD-307', title: 'Update OpenAPI spec for v2 endpoints', assignee: 'Wei', status: 'backlog', priority: 'low', points: 3, labels: ['docs', 'api'], sprint: 'SP-24' },
  { id: 'COD-308', title: 'Fix timezone handling in billing cron', assignee: 'Raj', status: 'done', priority: 'critical', points: 3, labels: ['bugfix', 'billing'], sprint: 'SP-24' },
  { id: 'COD-309', title: 'Add health check endpoint for k8s', assignee: 'Kai', status: 'done', priority: 'medium', points: 2, labels: ['infra'], sprint: 'SP-24' },
  { id: 'COD-310', title: 'Subscription plan upgrade/downgrade logic', assignee: 'Mei', status: 'in_progress', priority: 'high', points: 8, labels: ['payments'], sprint: 'SP-24' },
  { id: 'COD-311', title: 'Migrate legacy session store to Redis', assignee: 'Aisha', status: 'backlog', priority: 'medium', points: 5, labels: ['infra', 'migration'], sprint: 'SP-25' },
  { id: 'COD-312', title: 'Add Sentry error grouping rules', assignee: 'Kai', status: 'ready', priority: 'low', points: 2, labels: ['observability'], sprint: 'SP-24' },
];

export const MOCK_DEV_METRICS: DevMetric[] = [
  { name: 'Aisha', commits: 34, prsOpened: 8, prsReviewed: 12, linesAdded: 2840, linesRemoved: 890, coverageDelta: 2.1 },
  { name: 'Wei', commits: 28, prsOpened: 6, prsReviewed: 10, linesAdded: 1920, linesRemoved: 640, coverageDelta: 1.4 },
  { name: 'Raj', commits: 22, prsOpened: 5, prsReviewed: 8, linesAdded: 1560, linesRemoved: 1120, coverageDelta: -0.3 },
  { name: 'Mei', commits: 19, prsOpened: 4, prsReviewed: 6, linesAdded: 1340, linesRemoved: 280, coverageDelta: 0.8 },
  { name: 'Kai', commits: 25, prsOpened: 7, prsReviewed: 9, linesAdded: 980, linesRemoved: 310, coverageDelta: 1.1 },
];

export const QUALITY_METRICS: QualityMetric[] = [
  { label: 'Test Coverage', value: 84.2, target: 85, unit: '%', trend: 'up' },
  { label: 'Code Smells', value: 23, target: 20, unit: '', trend: 'down' },
  { label: 'Security Vulns', value: 2, target: 0, unit: '', trend: 'flat' },
  { label: 'Duplication', value: 3.1, target: 5, unit: '%', trend: 'up' },
  { label: 'Tech Debt', value: 18, target: 15, unit: 'hrs', trend: 'down' },
  { label: 'Avg PR Age', value: 14, target: 24, unit: 'hrs', trend: 'up' },
];

export const MOCK_RELEASES: ReleaseItem[] = [
  { version: 'v2.14.0', date: '2026-09-12', environment: 'production', status: 'deployed', deployedBy: 'Aisha', prCount: 12 },
  { version: 'v2.14.1', date: '2026-09-13', environment: 'staging', status: 'deployed', deployedBy: 'Wei', prCount: 3 },
  { version: 'v2.13.2', date: '2026-09-08', environment: 'production', status: 'rolled_back', deployedBy: 'Raj', prCount: 2 },
  { version: 'v2.13.1', date: '2026-09-05', environment: 'production', status: 'deployed', deployedBy: 'Kai', prCount: 5 },
  { version: 'v2.13.0', date: '2026-09-01', environment: 'production', status: 'deployed', deployedBy: 'Aisha', prCount: 18 },
  { version: 'v2.12.3', date: '2026-08-28', environment: 'production', status: 'deployed', deployedBy: 'Mei', prCount: 4 },
];

export const MOCK_INCIDENTS: IncidentItem[] = [
  { id: 'INC-089', title: 'Payment processing timeout on high load', severity: 'P1', status: 'investigating', startedAt: '2026-09-13T09:15:00Z', assignee: 'Wei' },
  { id: 'INC-088', title: 'Redis cluster failover caused 2min outage', severity: 'P0', status: 'resolved', startedAt: '2026-09-11T14:30:00Z', resolvedAt: '2026-09-11T14:47:00Z', assignee: 'Aisha' },
  { id: 'INC-087', title: 'Stale cache serving old pricing data', severity: 'P2', status: 'postmortem', startedAt: '2026-09-09T11:00:00Z', resolvedAt: '2026-09-09T12:30:00Z', assignee: 'Raj' },
  { id: 'INC-086', title: 'Email notification queue backup', severity: 'P2', status: 'resolved', startedAt: '2026-09-07T08:20:00Z', resolvedAt: '2026-09-07T09:45:00Z', assignee: 'Kai' },
];

export const MOCK_RETRO_ITEMS: RetroItem[] = [
  { id: 'r1', category: 'well', text: 'CI pipeline improvements cut build time by 40%', votes: 5, sprint: 'SP-23' },
  { id: 'r2', category: 'well', text: 'Pair programming sessions caught 3 critical bugs early', votes: 4, sprint: 'SP-23' },
  { id: 'r3', category: 'improve', text: 'PR reviews take too long (>48h avg)', votes: 6, sprint: 'SP-23' },
  { id: 'r4', category: 'improve', text: 'Need better staging environment parity', votes: 3, sprint: 'SP-23' },
  { id: 'r5', category: 'action', text: 'Set up CODEOWNERS for auto-assign', votes: 7, sprint: 'SP-23' },
  { id: 'r6', category: 'action', text: 'Add PR template with checklist', votes: 5, sprint: 'SP-23' },
  { id: 'r7', category: 'well', text: 'New onboarding docs helped Mei ramp up fast', votes: 4, sprint: 'SP-23' },
  { id: 'r8', category: 'improve', text: 'Flaky E2E tests causing false CI failures', votes: 5, sprint: 'SP-23' },
];

export const SKILL_MATRIX = [
  { name: 'Aisha', skills: { React: 4, Python: 5, DevOps: 4, DB: 3, Security: 5, Testing: 4 } },
  { name: 'Wei', skills: { React: 3, Python: 4, DevOps: 3, DB: 5, Security: 3, Testing: 3 } },
  { name: 'Raj', skills: { React: 5, Python: 3, DevOps: 2, DB: 4, Security: 2, Testing: 4 } },
  { name: 'Mei', skills: { React: 2, Python: 4, DevOps: 3, DB: 3, Security: 2, Testing: 3 } },
  { name: 'Kai', skills: { React: 3, Python: 3, DevOps: 5, DB: 2, Security: 3, Testing: 5 } },
];

export const ON_CALL = {
  current: 'Wei',
  shiftEnd: '2026-09-14T09:00:00Z',
  next: 'Raj',
  escalationPath: ['Wei → Aisha → Raj → Engineering Lead'],
};

export const MOCK_PROJECTS: ProjectItem[] = [
  { id: 'PROJ-001', name: 'Auth 2.0 Migration', description: 'Migrate legacy auth to OAuth2 with PKCE, MFA support, and session management', status: 'active', lead: 'Aisha', team: ['Aisha', 'Wei', 'Kai'], startDate: '2026-08-01', targetDate: '2026-09-30', progress: 72, techStack: ['Python', 'Redis', 'PostgreSQL'], repoUrl: 'github.com/shogun/auth-service' },
  { id: 'PROJ-002', name: 'Payment Gateway Integration', description: 'Stripe subscription billing with webhook handling and dunning management', status: 'active', lead: 'Wei', team: ['Wei', 'Mei', 'Raj'], startDate: '2026-08-15', targetDate: '2026-10-15', progress: 58, techStack: ['Python', 'Stripe API', 'Redis'], repoUrl: 'github.com/shogun/billing-service' },
  { id: 'PROJ-003', name: 'API Rate Limiting Framework', description: 'Per-tenant rate limiting with configurable tiers and burst allowance', status: 'active', lead: 'Raj', team: ['Raj', 'Aisha'], startDate: '2026-09-01', targetDate: '2026-09-25', progress: 35, techStack: ['Python', 'Redis', 'FastAPI'], repoUrl: 'github.com/shogun/rate-limiter' },
  { id: 'PROJ-004', name: 'Mobile App v1', description: 'React Native mobile app for iOS and Android with offline sync', status: 'pending', lead: 'Mei', team: ['Mei', 'Kai'], startDate: '2026-10-01', targetDate: '2027-01-31', progress: 0, techStack: ['React Native', 'TypeScript', 'SQLite'], repoUrl: 'github.com/shogun/mobile-app' },
  { id: 'PROJ-005', name: 'Analytics Dashboard', description: 'Real-time analytics with clickstream tracking and cohort analysis', status: 'active', lead: 'Kai', team: ['Kai', 'Raj', 'Mei'], startDate: '2026-07-15', targetDate: '2026-09-20', progress: 88, techStack: ['React', 'D3.js', 'ClickHouse'], repoUrl: 'github.com/shogun/analytics-ui' },
  { id: 'PROJ-006', name: 'Legacy API Deprecation', description: 'Phase out v1 API endpoints with migration guide and sunset notices', status: 'inactive', lead: 'Aisha', team: ['Aisha', 'Wei'], startDate: '2026-06-01', targetDate: '2026-08-31', progress: 100, techStack: ['Python', 'FastAPI'], repoUrl: 'github.com/shogun/api-v1' },
  { id: 'PROJ-007', name: 'Infrastructure Monitoring', description: 'Prometheus + Grafana setup with custom metrics and alerting rules', status: 'active', lead: 'Kai', team: ['Kai', 'Aisha'], startDate: '2026-08-20', targetDate: '2026-09-30', progress: 45, techStack: ['Prometheus', 'Grafana', 'Kubernetes'], repoUrl: 'github.com/shogun/infra-monitoring' },
  { id: 'PROJ-008', name: 'Customer Portal Redesign', description: 'Modernize customer-facing portal with improved UX and self-service features', status: 'pending', lead: 'Mei', team: ['Mei', 'Raj'], startDate: '2026-10-15', targetDate: '2026-12-31', progress: 0, techStack: ['React', 'Tailwind', 'Node.js'], repoUrl: 'github.com/shogun/customer-portal' },
];

export const MOCK_ACTIVITIES: ActivityUpdate[] = [
  { id: 'act-001', projectId: 'PROJ-001', author: 'Aisha', type: 'commit', title: 'Implement JWT refresh token rotation', summary: 'Added secure token rotation with blacklist for revoked tokens. Implements RFC 8725 recommendations.', timestamp: '2026-09-14T08:30:00Z', branch: 'feat/jwt-refresh', filesChanged: 8, additions: 245, deletions: 32 },
  { id: 'act-002', projectId: 'PROJ-001', author: 'Wei', type: 'push', title: 'Pushed 3 commits to feat/mfa-totp', summary: 'Added TOTP generation, QR code display, and backup codes. Ready for review.', timestamp: '2026-09-14T07:15:00Z', branch: 'feat/mfa-totp', filesChanged: 5, additions: 178, deletions: 12 },
  { id: 'act-003', projectId: 'PROJ-002', author: 'Wei', type: 'pr', title: 'PR #341: Payment webhook idempotency', summary: 'Fixed duplicate webhook processing by implementing idempotency key storage. Adds retry logic for failed deliveries.', timestamp: '2026-09-13T16:45:00Z', branch: 'fix/webhook-idem', filesChanged: 4, additions: 67, deletions: 12 },
  { id: 'act-004', projectId: 'PROJ-002', author: 'Mei', type: 'commit', title: 'Add subscription lifecycle handlers', summary: 'Implemented handle_subscription_created, updated, cancelled, and expired events with proper state transitions.', timestamp: '2026-09-13T14:20:00Z', branch: 'feat/stripe-subs', filesChanged: 12, additions: 412, deletions: 0 },
  { id: 'act-005', projectId: 'PROJ-003', author: 'Raj', type: 'push', title: 'Pushed sliding window rate limiter', summary: 'Implemented Redis-based sliding window counter with per-tenant configuration. Supports burst allowance up to 2x base limit.', timestamp: '2026-09-13T11:30:00Z', branch: 'feat/sliding-window', filesChanged: 6, additions: 234, deletions: 45 },
  { id: 'act-006', projectId: 'PROJ-005', author: 'Kai', type: 'deploy', title: 'Deployed v2.14.0 to production', summary: 'Released cohort analysis feature and real-time dashboard updates. All health checks passing.', timestamp: '2026-09-12T18:00:00Z', branch: 'main', filesChanged: 0, additions: 0, deletions: 0 },
  { id: 'act-007', projectId: 'PROJ-005', author: 'Raj', type: 'comment', title: 'Review comment on PR #338', summary: 'Suggested using useMemo for expensive D3 calculations. Performance improved by 40% after applying.', timestamp: '2026-09-12T15:30:00Z', branch: 'feat/cohort-analysis' },
  { id: 'act-008', projectId: 'PROJ-007', author: 'Kai', type: 'doc', title: 'Updated monitoring runbook', summary: 'Added troubleshooting steps for common Prometheus scrape failures and Grafana dashboard loading issues.', timestamp: '2026-09-12T10:00:00Z', branch: 'main' },
  { id: 'act-009', projectId: 'PROJ-001', author: 'Kai', type: 'commit', title: 'Add E2E tests for auth flows', summary: 'Created comprehensive test matrix covering login, logout, password reset, and MFA enrollment. Uses Playwright.', timestamp: '2026-09-11T16:45:00Z', branch: 'ci/e2e-auth', filesChanged: 7, additions: 156, deletions: 8 },
  { id: 'act-010', projectId: 'PROJ-003', author: 'Aisha', type: 'pr', title: 'PR #342: Redis connection pool config', summary: 'Optimized connection pool settings for high-throughput scenarios. Reduced latency by 23% under load.', timestamp: '2026-09-11T14:20:00Z', branch: 'fix/rate-limiter', filesChanged: 3, additions: 34, deletions: 18 },
  { id: 'act-011', projectId: 'PROJ-002', author: 'Raj', type: 'push', title: 'Pushed invoice generation feature', summary: 'Automatic PDF invoice generation post-payment. Includes line items, taxes, and discount breakdown.', timestamp: '2026-09-11T09:30:00Z', branch: 'feat/invoices', filesChanged: 9, additions: 289, deletions: 34 },
  { id: 'act-012', projectId: 'PROJ-007', author: 'Aisha', type: 'commit', title: 'Add custom business metrics', summary: 'Tracking signup_funnel, activation_rate, and churn_risk_score. Exported to Grafana dashboards.', timestamp: '2026-09-10T17:00:00Z', branch: 'feat/business-metrics', filesChanged: 11, additions: 198, deletions: 23 },
];
