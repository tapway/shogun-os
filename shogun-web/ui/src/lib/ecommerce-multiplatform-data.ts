// ─── Multi-Platform E-commerce Mock Data ──────────────────────────────
// 4 platforms: Shopee, Lazada, TikTok Shop, Website — all mock/demo data.

export const PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Website'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_COLORS: Record<string, string> = {
  Shopee: '#ee4d2d',
  Lazada: '#0f146d',
  'TikTok Shop': '#000000',
  Website: '#2563eb',
};

// Bright variants for dark mode only
export const PLATFORM_COLORS_DARK: Record<string, string> = {
  Shopee: '#ff6b6b',      // Bright red
  Lazada: '#5c7cfa',      // Bright blue
  'TikTok Shop': '#909090', // Light gray
  Website: '#4dabf7',     // Light blue
};

// Theme-aware platform color getter — use in ALL ecommerce components
export const getPlatformColor = (platform: string, isDarkMode: boolean): string => {
  if (isDarkMode) {
    return PLATFORM_COLORS_DARK[platform as keyof typeof PLATFORM_COLORS_DARK]
      || PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS]
      || '#888';
  }
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#888';
};

// ─── Tab 1: Cross-Platform Overview ────────────────────────────────────
export const MOCK_OVERVIEW = {
  aggregate: {
    gmv: 48_420,
    orders: 382,
    aov: 126.75,
    conversionRate: 3.4,
    returns: 35,
    returnRate: 9.2,
  },
  platformBreakdown: [
    { name: 'Shopee', gmv: 18_240, orders: 142, aov: 128.45, convRate: 3.8, returnRate: 3.2 },
    { name: 'Lazada', gmv: 12_680, orders: 98, aov: 129.39, convRate: 3.1, returnRate: 2.8 },
    { name: 'TikTok Shop', gmv: 9_120, orders: 78, aov: 116.92, convRate: 4.2, returnRate: 4.1 },
    { name: 'Website', gmv: 8_380, orders: 64, aov: 130.94, convRate: 2.8, returnRate: 1.5 },
  ],
  revenueWaterfall: [
    { name: 'Shopee', value: 18_240 },
    { name: 'Lazada', value: 12_680 },
    { name: 'TikTok Shop', value: 9_120 },
    { name: 'Website', value: 8_380 },
  ],
  alerts: [
    { severity: 'high', platform: 'Lazada', message: '3 listings suspended — image violation', tab: 'listings' },
    { severity: 'high', platform: 'Shopee', message: 'SK-1033 out of stock', tab: 'products' },
    { severity: 'medium', platform: 'TikTok Shop', message: 'Return rate spiked to 4.1%', tab: 'orders' },
    { severity: 'medium', platform: 'Website', message: 'Conversion rate dropped 0.5% vs yesterday', tab: 'overview' },
    { severity: 'low', platform: 'All', message: '9.9 Mega Sale campaign ended — review ROI', tab: 'marketing' },
  ],
  aiDecisions: [
    { id: 'ai-1', text: 'Shopee AOV dropped 12% vs last week — bundle SK-1001 + SK-1042 for RM 160 (save RM 10)', action: 'Create Bundle', targetTab: 'marketing', priority: 'high' },
    { id: 'ai-2', text: 'TikTok return rate 4.1% driven by "changed mind" — add size guide to top 5 SKUs', action: 'Update Listings', targetTab: 'listings', priority: 'medium' },
    { id: 'ai-3', text: 'Website conversion lagging at 2.8% — test free shipping threshold at RM 80', action: 'Run A/B Test', targetTab: 'marketing', priority: 'medium' },
  ],
};

// ─── Tab 2: Product Intelligence ───────────────────────────────────────
export const MOCK_PRODUCTS = {
  velocityMargin: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', velocity: 342, margin: 53.3, revenue: 30_780, platforms: ['Shopee', 'Lazada', 'TikTok Shop', 'Website'], daysCover: 12 },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', velocity: 286, margin: 52.5, revenue: 22_880, platforms: ['Shopee', 'Lazada', 'Website'], daysCover: 18 },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', velocity: 198, margin: 38.9, revenue: 17_820, platforms: ['Shopee', 'Lazada', 'TikTok Shop'], daysCover: 22 },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', velocity: 62, margin: 36.0, revenue: 4_650, platforms: ['Shopee', 'Website'], daysCover: 45 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', velocity: 48, margin: 35.0, revenue: 3_840, platforms: ['Lazada', 'TikTok Shop'], daysCover: 52 },
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', velocity: 0, margin: 29.2, revenue: 0, platforms: ['Lazada'], daysCover: 0 },
    { sku: 'SK-1067', name: 'Phone Grip Stand', velocity: 2, margin: 46.7, revenue: 30, platforms: ['Shopee'], daysCover: 120 },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', velocity: 35, margin: 28.0, revenue: 875, platforms: ['Shopee', 'Lazada', 'Website'], daysCover: 38 },
  ],
  priceParity: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', master: 90, shopee: 90, lazada: 89, tiktok: 90, website: 90 },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', master: 80, shopee: 80, lazada: 80, tiktok: 78, website: 80 },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', master: 90, shopee: 90, lazada: 90, tiktok: 90, website: 90 },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', master: 75, shopee: 75, lazada: 75, tiktok: null, website: 75 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', master: 80, shopee: null, lazada: 80, tiktok: 80, website: 80 },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', master: 25, shopee: 25, lazada: 24, tiktok: null, website: 25 },
  ],
  stockHeatmap: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', shopee: 12, lazada: 18, tiktok: 8, website: 7 },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', shopee: 30, lazada: 25, tiktok: null, website: 27 },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', shopee: 45, lazada: 38, tiktok: 37, website: null },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', shopee: 50, lazada: null, tiktok: null, website: 45 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', shopee: null, lazada: 30, tiktok: 22, website: 16 },
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', shopee: null, lazada: 0, tiktok: null, website: null },
    { sku: 'SK-1067', name: 'Phone Grip Stand', shopee: 340, lazada: null, tiktok: null, website: null },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', shopee: 80, lazada: 65, tiktok: null, website: 65 },
  ],
  aiDecisions: [
    { id: 'ai-p1', text: 'SK-1033 dead on all platforms (0 sales, 0 stock) — delist or clearance at 30% off?', actions: ['Delist', 'Clearance 30%', 'Snooze'], priority: 'high' },
    { id: 'ai-p2', text: 'SK-1067 overstocked (340 units, 120 days cover) — bundle with SK-1001 or run flash sale', actions: ['Bundle', 'Flash Sale', 'Hold'], priority: 'medium' },
    { id: 'ai-p3', text: 'SK-1055 missing from TikTok Shop — competitor selling similar at RM 69', actions: ['List on TikTok', 'Match Price', 'Skip'], priority: 'medium' },
  ],
};

// ─── Tab 3: Listings & Compliance ──────────────────────────────────────
export const MOCK_LISTINGS = {
  platformHealth: [
    { platform: 'Shopee', active: 142, inactive: 8, rejected: 2, syncTime: '2 min ago', syncOk: true, complianceScore: 94 },
    { platform: 'Lazada', active: 138, inactive: 12, rejected: 3, syncTime: '15 min ago', syncOk: false, complianceScore: 87 },
    { platform: 'TikTok Shop', active: 135, inactive: 5, rejected: 0, syncTime: '8 min ago', syncOk: true, complianceScore: 96 },
    { platform: 'Website', active: 150, inactive: 0, rejected: 0, syncTime: '1 min ago', syncOk: true, complianceScore: 99 },
  ],
  complianceIssues: [
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', platform: 'Lazada', issue: 'Image non-white background', field: 'image', severity: 'high' },
    { sku: 'SK-1067', name: 'Phone Grip Stand', platform: 'Lazada', issue: 'Title exceeds 120 chars', field: 'title', severity: 'medium' },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', platform: 'Lazada', issue: 'Missing weight field', field: 'weight', severity: 'medium' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', platform: 'Shopee', issue: 'Category mismatch', field: 'category', severity: 'low' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', platform: 'TikTok Shop', issue: 'Description too short (<100 chars)', field: 'description', severity: 'medium' },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', platform: 'Lazada', issue: 'Price mismatch vs master', field: 'price', severity: 'high' },
  ],
  listingGaps: [
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', missingFrom: ['TikTok Shop'], competitorPresent: true },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', missingFrom: ['Shopee'], competitorPresent: true },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', missingFrom: ['TikTok Shop'], competitorPresent: false },
  ],
  seoDistribution: [
    { range: '90-100', count: 45 },
    { range: '80-89', count: 62 },
    { range: '70-79', count: 28 },
    { range: '60-69', count: 12 },
    { range: '<60', count: 3 },
  ],
  aiDecisions: [
    { id: 'ai-l1', text: '5 Lazada listings have non-white bg images — auto-fix with background removal?', actions: ['Preview Fix', 'Apply All', 'Skip'], priority: 'high' },
    { id: 'ai-l2', text: 'SK-1055 not listed on TikTok Shop where competitors sell similar — list now?', actions: ['List Now', 'Review First', 'Skip'], priority: 'medium' },
    { id: 'ai-l3', text: '3 listings with SEO score <60 — regenerate titles and descriptions?', actions: ['Regenerate', 'Manual Edit', 'Skip'], priority: 'low' },
  ],
};

// ─── Tab 4: Orders & Fulfillment ───────────────────────────────────────
export const MOCK_ORDERS = {
  pipeline: { new: 23, processing: 18, shipped: 45, delivered: 312, cancelled: 8, returned: 12 },
  platformSLA: [
    { platform: 'Shopee', within24h: 88, avgHours: 14.2, overdue: 3 },
    { platform: 'Lazada', within24h: 79, avgHours: 22.8, overdue: 8 },
    { platform: 'TikTok Shop', within24h: 85, avgHours: 16.5, overdue: 4 },
    { platform: 'Website', within24h: 92, avgHours: 11.3, overdue: 1 },
  ],
  returnReasons: [
    { reason: 'Wrong item received', count: 12, pct: 34.3, topPlatform: 'Shopee' },
    { reason: 'Defective product', count: 9, pct: 25.7, topPlatform: 'Lazada' },
    { reason: 'Changed mind', count: 8, pct: 22.9, topPlatform: 'TikTok Shop' },
    { reason: 'Size mismatch', count: 4, pct: 11.4, topPlatform: 'Website' },
    { reason: 'Late delivery', count: 2, pct: 5.7, topPlatform: 'Lazada' },
  ],
  fulfillmentCost: [
    { platform: 'Shopee', avgCost: 5.20, marginImpact: -4.1 },
    { platform: 'Lazada', avgCost: 6.80, marginImpact: -5.3 },
    { platform: 'TikTok Shop', avgCost: 4.90, marginImpact: -4.2 },
    { platform: 'Website', avgCost: 7.50, marginImpact: -5.7 },
  ],
  recentOrders: [
    { id: 'SH-20260913-001', platform: 'Shopee', customer: 'Ahmad R.', items: 2, total: 170, status: 'new', time: '10 min ago' },
    { id: 'LZ-20260913-042', platform: 'Lazada', customer: 'Sarah L.', items: 1, total: 90, status: 'processing', time: '25 min ago' },
    { id: 'TK-20260913-018', platform: 'TikTok Shop', customer: 'Wei Jie', items: 3, total: 245, status: 'shipped', time: '1 hr ago' },
    { id: 'WS-20260913-005', platform: 'Website', customer: 'Priya K.', items: 1, total: 75, status: 'delivered', time: '2 hr ago' },
    { id: 'SH-20260912-188', platform: 'Shopee', customer: 'Hafiz M.', items: 4, total: 320, status: 'delivered', time: '5 hr ago' },
    { id: 'LZ-20260912-156', platform: 'Lazada', customer: 'Nurul A.', items: 2, total: 155, status: 'returned', time: '8 hr ago' },
  ],
  aiDecisions: [
    { id: 'ai-o1', text: 'TikTok return rate 4.1% — top reason "changed mind". Add size guide to top 5 SKUs?', actions: ['Add Size Guide', 'Review Returns', 'Dismiss'], priority: 'high' },
    { id: 'ai-o2', text: 'Lazada SLA at 79% — 8 overdue orders. Prioritize fulfillment queue?', actions: ['Prioritize', 'Extend SLA', 'Ignore'], priority: 'high' },
    { id: 'ai-o3', text: 'Website shipping cost RM 7.50/order — negotiate bulk rate with PosLaju?', actions: ['Get Quote', 'Switch Carrier', 'Absorb'], priority: 'medium' },
  ],
};

// ─── Tab 5: Marketing & Content Studio ─────────────────────────────────
export const MOCK_MARKETING = {
  campaigns: [
    { name: '9.9 Mega Sale', platform: 'Shopee', dates: 'Sep 1–9', budget: 5_000, spent: 4_820, revenue: 28_400, roi: 4.89, status: 'completed' },
    { name: 'Back to School', platform: 'Lazada', dates: 'Aug 15–Sep 5', budget: 3_000, spent: 2_950, revenue: 15_200, roi: 4.15, status: 'completed' },
    { name: 'Tech Week Flash', platform: 'TikTok Shop', dates: 'Sep 10–17', budget: 2_500, spent: 1_200, revenue: 8_600, roi: 6.17, status: 'active' },
    { name: 'Weekend Special', platform: 'Website', dates: 'Sep 13–14', budget: 800, spent: 0, revenue: 0, roi: 0, status: 'scheduled' },
  ],
  promoOpportunities: [
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', score: 82, velocity: 'slow', margin: 36, bestPlatform: 'Website', suggestedDiscount: 15, predictedUplift: 28 },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', score: 78, velocity: 'slow', margin: 28, bestPlatform: 'Shopee', suggestedDiscount: 20, predictedUplift: 35 },
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', score: 91, velocity: 'fast', margin: 53, bestPlatform: 'TikTok Shop', suggestedDiscount: 10, predictedUplift: 18 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', score: 65, velocity: 'slow', margin: 35, bestPlatform: 'Lazada', suggestedDiscount: 12, predictedUplift: 22 },
  ],
  contentPerformance: [
    { type: 'Video Scripts', shopee: 4.2, lazada: 3.8, tiktok: 6.1, website: 2.9 },
    { type: 'Social Posts', shopee: 2.1, lazada: 1.9, tiktok: 4.8, website: 1.5 },
    { type: 'Banners', shopee: 3.5, lazada: 3.2, tiktok: 2.8, website: 3.9 },
    { type: 'Descriptions', shopee: 1.8, lazada: 2.0, tiktok: 1.5, website: 2.2 },
  ],
  bundles: [
    { pair: ['SK-1001', 'SK-1042'], names: 'Earbuds + USB-C Hub', coPurchaseRate: 22, suggestedDiscount: 12, bestPlatform: 'Shopee' },
    { pair: ['SK-1018', 'SK-1055'], names: 'Keyboard + Laptop Stand', coPurchaseRate: 18, suggestedDiscount: 10, bestPlatform: 'Website' },
    { pair: ['SK-1023', 'SK-1001'], names: 'Webcam + Earbuds', coPurchaseRate: 15, suggestedDiscount: 8, bestPlatform: 'TikTok Shop' },
  ],
  aiDecisions: [
    { id: 'ai-m1', text: 'Tech Week Flash on TikTok has 6.17x ROI — increase budget by 20%?', actions: ['Increase Budget', 'Keep Current', 'Pause'], priority: 'high' },
    { id: 'ai-m2', text: 'SK-1055 slow mover with 36% margin — promote on Website with 15% discount?', actions: ['Create Promo', 'Adjust Discount', 'Skip'], priority: 'medium' },
    { id: 'ai-m3', text: 'Bundle Earbuds+Hub has 22% co-purchase rate — create combo listing on Shopee?', actions: ['Create Bundle', 'Test First', 'Skip'], priority: 'medium' },
  ],
};

// ─── Tab 6: Competitor Watch ───────────────────────────────────────────
export const MOCK_COMPETITORS = {
  pricePosition: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', yourPrice: 90, marketAvg: 85, diff: 5.9, status: 'above', platform: 'Shopee' },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', yourPrice: 80, marketAvg: 82, diff: -2.4, status: 'below', platform: 'Lazada' },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', yourPrice: 90, marketAvg: 95, diff: -5.3, status: 'below', platform: 'TikTok Shop' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', yourPrice: 75, marketAvg: 72, diff: 4.2, status: 'above', platform: 'Website' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', yourPrice: 80, marketAvg: 78, diff: 2.6, status: 'ok', platform: 'Lazada' },
  ],
  marketShareTrend: [
    { month: 'Apr', shopee: 7.2, lazada: 3.8, tiktok: 2.1, website: 1.5 },
    { month: 'May', shopee: 7.5, lazada: 4.0, tiktok: 2.4, website: 1.6 },
    { month: 'Jun', shopee: 7.8, lazada: 4.1, tiktok: 2.8, website: 1.7 },
    { month: 'Jul', shopee: 8.0, lazada: 4.0, tiktok: 3.2, website: 1.8 },
    { month: 'Aug', shopee: 8.1, lazada: 4.1, tiktok: 3.5, website: 1.8 },
    { month: 'Sep', shopee: 8.2, lazada: 4.1, tiktok: 3.8, website: 1.9 },
  ],
  sentiment: [
    { platform: 'Shopee', yourRating: 4.7, competitorAvg: 4.3, reviews: 482 },
    { platform: 'Lazada', yourRating: 4.5, competitorAvg: 4.2, reviews: 356 },
    { platform: 'TikTok Shop', yourRating: 4.4, competitorAvg: 4.1, reviews: 248 },
    { platform: 'Website', yourRating: 4.8, competitorAvg: 4.5, reviews: 162 },
  ],
  opportunities: [
    { type: 'stockout', platform: 'Shopee', message: 'Competitor "TechZone" OOS on SK-1018 (Mechanical Keyboard)', time: '2 hr ago', action: 'Boost Ad Spend' },
    { type: 'price_drop', platform: 'Lazada', message: 'Competitor "GadgetHub" dropped SK-1001 price by 12%', time: '5 hr ago', action: 'Match Price' },
    { type: 'new_product', platform: 'TikTok Shop', message: 'New entrant "ByteGear" listed 15 products in Audio', time: '1 day ago', action: 'Monitor' },
    { type: 'review_spike', platform: 'Website', message: 'Competitor "AudioPro" got 20 negative reviews this week', time: '3 hr ago', action: 'Highlight Quality' },
  ],
  aiDecisions: [
    { id: 'ai-c1', text: 'Competitor TechZone OOS on SK-1018 (Shopee) — boost ad spend for this SKU?', actions: ['Boost Ads', 'Monitor Only', 'Ignore'], priority: 'high' },
    { id: 'ai-c2', text: 'GadgetHub dropped SK-1001 price 12% on Lazada — match or hold?', actions: ['Match Price', 'Hold & Monitor', 'Counter-Promo'], priority: 'high' },
    { id: 'ai-c3', text: 'ByteGear entered TikTok Audio category — monitor their pricing strategy?', actions: ['Set Alert', 'Full Analysis', 'Ignore'], priority: 'medium' },
  ],
};
