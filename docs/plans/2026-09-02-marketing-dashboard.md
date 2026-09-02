# Marketing Dashboard Implementation Plan

**Date:** 2026-09-02  
**Branch:** `feat/marketing-dashboard`  
**Reference:** https://marketing.gotapway.com/dashboard (requires @gotapway.com Google SSO)

---

## Overview

Build a Marketing department dashboard for Shogun OS web portal that mirrors the structure and functionality of existing dashboards (CRM, Finance, Procurement). Since the reference dashboard requires authentication, we'll implement based on standard marketing KPIs and the established Shogun dashboard pattern.

---

## Architecture

Follow the existing dashboard architecture:

```
DashboardViewer.tsx (router)
  └─ MarketingDashboard.tsx (container with tabs)
      ├─ OverviewTab.tsx
      ├─ CampaignsTab.tsx
      ├─ ContentTab.tsx
      ├─ SocialMediaTab.tsx
      ├─ AnalyticsTab.tsx
      └─ SEOTab.tsx
```

---

## Implementation Phases

### Phase 1: Type Definitions (`shogun-web/ui/src/lib/types.ts`)

Add marketing-specific TypeScript interfaces:

```typescript
export interface MarketingDashboardStats {
  // Overview KPIs
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  leadsMTD: number;
  leadsQTD: number;
  costPerLead: number;
  roi: number;
  conversionRate: number;
  
  // Campaign performance
  campaignsByStatus: CampaignStatusEntry[];
  topCampaigns: CampaignRow[];
  campaignSpendTrend: CampaignTrendPoint[];
  
  // Channel performance
  byChannel: ChannelPerformance[];
  socialMetrics: SocialMetrics;
  
  // Content metrics
  contentPublished: number;
  contentByType: ContentByType[];
  topContent: ContentRow[];
  
  // SEO metrics
  organicTraffic: number;
  keywordRankings: KeywordRanking[];
  backlinks: number;
  
  // Risk alerts
  riskAlerts: MarketingRiskAlert[];
}

export interface CampaignStatusEntry {
  status: 'active' | 'paused' | 'completed' | 'draft';
  count: number;
  spend: number;
}

export interface CampaignRow {
  name: string;
  channel: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roi: number;
}

export interface CampaignTrendPoint {
  month: string;
  spend: number;
  leads: number;
  conversions: number;
}

export interface ChannelPerformance {
  channel: 'google_ads' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'email' | 'seo';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
}

export interface SocialMetrics {
  followers: number;
  engagement_rate: number;
  posts_mtd: number;
  viral_posts: number;
}

export interface ContentByType {
  type: 'blog' | 'video' | 'infographic' | 'case_study' | 'whitepaper';
  count: number;
  views: number;
  shares: number;
}

export interface ContentRow {
  title: string;
  type: string;
  published_at: string;
  views: number;
  shares: number;
  leads_generated: number;
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  search_volume: number;
  difficulty: number;
  trend: 'up' | 'down' | 'stable';
}

export interface MarketingRiskAlert {
  type: 'budget_overspend' | 'low_roi' | 'declining_traffic' | 'poor_cta_performance';
  level: 'warning' | 'critical';
  message: string;
  campaign?: string;
}
```

---

### Phase 2: Backend API Endpoints (`shogun-web/server/departments.py`)

Add marketing dashboard endpoint:

```python
@router.get("/{name}/dashboard/marketing-stats")
async def get_marketing_dashboard_stats(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return marketing dashboard KPIs from gbrain or mock data."""
    # 1. Verify department access
    tenant = get_tenant(db, user)
    dept = _get_dept(db, tenant.id, name)
    require_department_access(name=name, user=user, db=db)
    
    # 2. Try to fetch from gbrain (marketing source)
    # 3. Fall back to mock/demo data if gbrain unavailable
    # 4. Return MarketingDashboardStats structure
```

---

### Phase 3: Frontend Components

#### 3.1 MarketingDashboard.tsx

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';
import { DashboardSubNav } from '../DashboardSubNav';
import type { DashboardTab, MarketingDashboardStats } from '../../../lib/types';
import { OverviewTab } from './OverviewTab';
import { CampaignsTab } from './CampaignsTab';
import { ContentTab } from './ContentTab';
import { SocialMediaTab } from './SocialMediaTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SEOTab } from './SEOTab';

const TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'campaigns', label: 'Campaigns', icon: 'Megaphone' },
  { id: 'content', label: 'Content', icon: 'FileText' },
  { id: 'social', label: 'Social Media', icon: 'Share2' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart2' },
  { id: 'seo', label: 'SEO', icon: 'Search' },
];

export function MarketingDashboard({ department, color }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const statsQuery = useQuery({
    queryKey: ['dashboard-marketing-stats', department],
    queryFn: () => departmentsApi.dashboardMarketingStats(department),
    refetchInterval: 120_000,
  });
  
  // Loading, error, empty states (follow Finance pattern)
  // Render tabs based on activeTab state
}
```

#### 3.2 Tab Components (6 tabs)

Each tab component follows the established pattern:
- Accept `stats` and `color` props
- Display relevant subset of data
- Use shared chart components from `dashboards/charts/`
- Include empty states and loading indicators

**Tabs to implement:**
1. **OverviewTab** — Executive summary with key KPIs
2. **CampaignsTab** — Campaign performance table + spend trend
3. **ContentTab** — Content library with engagement metrics
4. **SocialMediaTab** — Social channel performance
5. **AnalyticsTab** — Traffic, conversion funnels, ROI analysis
6. **SEOTab** — Keyword rankings, organic traffic, backlinks

---

### Phase 4: Register Dashboard Component

Update `DashboardViewer.tsx`:

```tsx
import { MarketingDashboard } from './marketing/MarketingDashboard';

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType<...>> = {
  crm: CrmDashboard,
  finance: FinanceDashboard,
  procurement: ProcurementDashboard,
  facility: PlantationDashboard,
  projects: ProjectsDashboard,
  marketing: MarketingDashboard,  // ← Add this
};
```

---

### Phase 5: Mock Data (Demo Mode)

Create example JSON files for demo/testing:

```json
// examples/marketing-dashboard-mock.json
{
  "mock": true,
  "totalCampaigns": 24,
  "activeCampaigns": 8,
  "totalLeads": 1847,
  "leadsMTD": 234,
  ...
}
```

---

## File Structure

```
shogun-web/
├── ui/
│   ├── src/
│   │   ├── components/
│   │   │   └── dashboards/
│   │   │       ├── DashboardViewer.tsx (modify)
│   │   │       └── marketing/
│   │   │           ├── MarketingDashboard.tsx (new)
│   │   │           ├── OverviewTab.tsx (new)
│   │   │           ├── CampaignsTab.tsx (new)
│   │   │           ├── ContentTab.tsx (new)
│   │   │           ├── SocialMediaTab.tsx (new)
│   │   │           ├── AnalyticsTab.tsx (new)
│   │   │           └── SEOTab.tsx (new)
│   │   └── lib/
│   │       ├── types.ts (modify - add types)
│   │       └── api.ts (modify - add API method)
├── server/
│   └── departments.py (modify - add endpoint)
└── examples/
    └── marketing-dashboard-mock.json (new)
```

---

## Verification Steps

1. **TypeScript compilation**: `npm run build` (no errors)
2. **Visual inspection**: Run portal, navigate to Marketing dashboard
3. **Mock data toggle**: Verify demo mode warning banner appears
4. **Tab navigation**: All 6 tabs switch correctly
5. **Responsive layout**: Charts resize properly
6. **Error handling**: Show appropriate messages when data unavailable

---

## Dependencies

- Existing chart components (`dashboards/charts/`)
- DashboardSubNav component
- @tanstack/react-query (already in use)
- Lucide React icons (already in use)

---

## Notes

- Follow the **Finance dashboard pattern** for mock data warnings
- Use **lime accent color** (`var(--samurai-lime)`) for active states
- Maintain **consistent spacing** with other dashboards (use `sd-stack`, `sd-empty` classes)
- Implement **proper loading states** with spinner animation
- Add **risk alerts** section in Overview tab (like Finance)
- Support **dark mode** via CSS variables

---

## Out of Scope (Future Enhancements)

- Live integration with Google Ads/Facebook Ads APIs
- GBrain marketing source queries
- Campaign creation/editing workflows
- A/B testing analytics
- Multi-touch attribution modeling

---

## Estimated Effort

- **Phase 1 (Types)**: 30 min
- **Phase 2 (Backend)**: 45 min
- **Phase 3 (Frontend)**: 3-4 hours
- **Phase 4 (Registration)**: 10 min
- **Phase 5 (Mock Data)**: 30 min
- **Testing & Polish**: 1 hour

**Total: ~6-7 hours**

---

## Next Steps

1. ✅ Create feature branch `feat/marketing-dashboard`
2. ⏳ Implement Phase 1-5
3. ⏳ Run `npm run build` to verify compilation
4. ⏳ Start portal and visually verify
5. ⏳ Commit changes (one commit per phase)
6. ⏳ Push branch and create PR

---

**Decision Log:**
- Chose 6-tab structure to match marketing department scope from scrum config
- Included SEO tab due to explicit mention in marketing brain domain terms
- Mock data approach follows Finance dashboard precedent
- No live API integrations in MVP — focus on UI/UX first
