// ─── E-commerce Mock Data ──────────────────────────────────────────────
// All data is mock/demo — no live API calls.

export const PLATFORM_COLORS: Record<string, string> = {
  Shopee: '#ee4d2d',
  Lazada: '#0f146d',
  'TikTok Shop': '#000000',
  Website: '#2563eb',
};

export const MOCK_SALES_PULSE = {
  todayGMV: 18_420,
  yesterdayGMV: 16_890,
  ordersToday: 142,
  ordersYesterday: 128,
  aov: 129.72,
  conversionRate: 3.2,
  pendingOrders: 23,
  platformBreakdown: [
    { name: 'Shopee', revenue: 8_240, orders: 64, pct: 45 },
    { name: 'Lazada', revenue: 4_680, orders: 36, pct: 25 },
    { name: 'TikTok Shop', revenue: 3_120, orders: 28, pct: 17 },
    { name: 'Website', revenue: 2_380, orders: 14, pct: 13 },
  ],
  topProducts: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', units: 28, revenue: 2_520 },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', units: 22, revenue: 1_760 },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', units: 18, revenue: 1_620 },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', units: 15, revenue: 1_125 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', units: 12, revenue: 960 },
  ],
  aovTrend: [
    { day: 'Mon', value: 118 },
    { day: 'Tue', value: 124 },
    { day: 'Wed', value: 131 },
    { day: 'Thu', value: 126 },
    { day: 'Fri', value: 135 },
    { day: 'Sat', value: 142 },
    { day: 'Sun', value: 130 },
  ],
  alerts: [
    { type: 'stockout', message: 'SK-1033 Webcam 4K — Out of stock on Shopee', severity: 'high' },
    { type: 'listing', message: '3 listings suspended on Lazada — image violation', severity: 'high' },
    { type: 'sales', message: 'TikTok Shop sales down 22% vs yesterday', severity: 'medium' },
  ],
};

export const MOCK_PRODUCTS = {
  velocity: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', class: 'fast', daysCover: 12, sales30d: 342, revenue30d: 30_780 },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', class: 'fast', daysCover: 18, sales30d: 286, revenue30d: 22_880 },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', class: 'fast', daysCover: 22, sales30d: 198, revenue30d: 17_820 },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', class: 'slow', daysCover: 45, sales30d: 62, revenue30d: 4_650 },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', class: 'slow', daysCover: 52, sales30d: 48, revenue30d: 3_840 },
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', class: 'dead', daysCover: 0, sales30d: 0, revenue30d: 0 },
    { sku: 'SK-1067', name: 'Phone Grip Stand', class: 'dead', daysCover: 120, sales30d: 2, revenue30d: 30 },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', class: 'slow', daysCover: 38, sales30d: 35, revenue30d: 875 },
  ],
  margins: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', cogs: 42, price: 90, margin: 53.3, status: 'high' },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', cogs: 38, price: 80, margin: 52.5, status: 'high' },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', cogs: 55, price: 90, margin: 38.9, status: 'ok' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', cogs: 48, price: 75, margin: 36.0, status: 'ok' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', cogs: 52, price: 80, margin: 35.0, status: 'ok' },
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', cogs: 85, price: 120, margin: 29.2, status: 'low' },
    { sku: 'SK-1067', name: 'Phone Grip Stand', cogs: 8, price: 15, margin: 46.7, status: 'high' },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', cogs: 18, price: 25, margin: 28.0, status: 'low' },
  ],
  inventory: [
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', stock: 0, reorder: 20, status: 'stockout' },
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', stock: 45, reorder: 50, status: 'below' },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', stock: 82, reorder: 40, status: 'ok' },
    { sku: 'SK-1067', name: 'Phone Grip Stand', stock: 340, reorder: 30, status: 'overstock' },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', stock: 120, reorder: 30, status: 'ok' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', stock: 95, reorder: 25, status: 'ok' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', stock: 68, reorder: 20, status: 'ok' },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', stock: 210, reorder: 40, status: 'overstock' },
  ],
};

export const MOCK_LISTINGS = {
  status: [
    { platform: 'Shopee', active: 142, inactive: 8, rejected: 2, syncTime: '2 min ago', syncOk: true },
    { platform: 'Lazada', active: 138, inactive: 12, rejected: 3, syncTime: '15 min ago', syncOk: false },
    { platform: 'TikTok Shop', active: 135, inactive: 5, rejected: 0, syncTime: '8 min ago', syncOk: true },
    { platform: 'Website', active: 150, inactive: 0, rejected: 0, syncTime: '1 min ago', syncOk: true },
  ],
  compliance: [
    { sku: 'SK-1033', name: 'Webcam 4K Ultra', platform: 'Lazada', issue: 'Image non-white background', field: 'image' },
    { sku: 'SK-1067', name: 'Phone Grip Stand', platform: 'Lazada', issue: 'Title exceeds 120 chars', field: 'title' },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', platform: 'Lazada', issue: 'Missing weight field', field: 'weight' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', platform: 'Shopee', issue: 'Category mismatch', field: 'category' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', platform: 'TikTok Shop', issue: 'Description too short (<100 chars)', field: 'description' },
  ],
  priceParity: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', master: 90, shopee: 90, lazada: 89, tiktok: 90, website: 90, ok: false },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', master: 80, shopee: 80, lazada: 80, tiktok: 78, website: 80, ok: false },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', master: 90, shopee: 90, lazada: 90, tiktok: 90, website: 90, ok: true },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', master: 75, shopee: 75, lazada: 75, tiktok: 75, website: 75, ok: true },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', master: 80, shopee: 80, lazada: 80, tiktok: 80, website: 80, ok: true },
  ],
};

export const MOCK_ORDERS = {
  pipeline: { new: 23, processing: 18, shipped: 45, delivered: 312, cancelled: 8, returned: 12 },
  sla: { within24h: 82, within48h: 12, overdue: 6, avgHandlingHours: 18.4 },
  returns: [
    { platform: 'Shopee', rate: 3.2, count: 14, topReason: 'Wrong item received', refundRM: 1_240 },
    { platform: 'Lazada', rate: 2.8, count: 10, topReason: 'Defective product', refundRM: 890 },
    { platform: 'TikTok Shop', rate: 4.1, count: 8, topReason: 'Changed mind', refundRM: 620 },
    { platform: 'Website', rate: 1.5, count: 3, topReason: 'Size mismatch', refundRM: 280 },
  ],
  delivery: { onTimeRate: 91.2, avgDays: 3.4, failedCount: 7 },
  recentOrders: [
    { id: 'SH-20260913-001', platform: 'Shopee', customer: 'Ahmad R.', items: 2, total: 170, status: 'new', time: '10 min ago' },
    { id: 'LZ-20260913-042', platform: 'Lazada', customer: 'Sarah L.', items: 1, total: 90, status: 'processing', time: '25 min ago' },
    { id: 'TK-20260913-018', platform: 'TikTok Shop', customer: 'Wei Jie', items: 3, total: 245, status: 'shipped', time: '1 hr ago' },
    { id: 'WS-20260913-005', platform: 'Website', customer: 'Priya K.', items: 1, total: 75, status: 'delivered', time: '2 hr ago' },
    { id: 'SH-20260912-188', platform: 'Shopee', customer: 'Hafiz M.', items: 4, total: 320, status: 'delivered', time: '5 hr ago' },
  ],
};

export const MOCK_MARKETING = {
  campaigns: [
    { name: '9.9 Mega Sale', platform: 'Shopee', dates: 'Sep 1–9', budget: 5_000, spent: 4_820, revenue: 28_400, roi: 4.89, status: 'completed' },
    { name: 'Back to School', platform: 'Lazada', dates: 'Aug 15–Sep 5', budget: 3_000, spent: 2_950, revenue: 15_200, roi: 4.15, status: 'completed' },
    { name: 'Tech Week Flash', platform: 'TikTok Shop', dates: 'Sep 10–17', budget: 2_500, spent: 1_200, revenue: 8_600, roi: 6.17, status: 'active' },
    { name: 'Weekend Special', platform: 'Website', dates: 'Sep 13–14', budget: 800, spent: 0, revenue: 0, roi: 0, status: 'scheduled' },
  ],
  promoRecommendations: [
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', suggestedDiscount: 15, predictedUplift: 28, reason: 'Slow mover with healthy margin' },
    { sku: 'SK-1089', name: 'Cable Organizer Bag', suggestedDiscount: 20, predictedUplift: 35, reason: 'Dead stock clearance candidate' },
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', suggestedDiscount: 10, predictedUplift: 18, reason: 'High velocity — bundle opportunity' },
  ],
  contentPipeline: { videoScripts: 8, socialPosts: 24, banners: 6, descriptions: 42 },
  bundles: [
    { pair: ['SK-1001', 'SK-1042'], names: 'Wireless Earbuds Pro + USB-C Hub', coPurchaseRate: 22, suggestedDiscount: 12 },
    { pair: ['SK-1018', 'SK-1055'], names: 'Mechanical Keyboard + Laptop Stand', coPurchaseRate: 18, suggestedDiscount: 10 },
    { pair: ['SK-1023', 'SK-1001'], names: 'Webcam 1080p + Earbuds Pro', coPurchaseRate: 15, suggestedDiscount: 8 },
  ],
};

export const MOCK_COMPETITORS = {
  priceGaps: [
    { sku: 'SK-1001', name: 'Wireless Earbuds Pro', yourPrice: 90, marketAvg: 85, diff: 5.9, status: 'above' },
    { sku: 'SK-1042', name: 'USB-C Hub 7-in-1', yourPrice: 80, marketAvg: 82, diff: -2.4, status: 'below' },
    { sku: 'SK-1018', name: 'Mechanical Keyboard', yourPrice: 90, marketAvg: 95, diff: -5.3, status: 'below' },
    { sku: 'SK-1055', name: 'Laptop Stand Aluminium', yourPrice: 75, marketAvg: 72, diff: 4.2, status: 'above' },
    { sku: 'SK-1023', name: 'Webcam 1080p HD', yourPrice: 80, marketAvg: 78, diff: 2.6, status: 'ok' },
  ],
  marketShare: [
    { category: 'Audio', yourRank: 3, totalSellers: 48, sharePct: 8.2 },
    { category: 'Computer Accessories', yourRank: 5, totalSellers: 124, sharePct: 4.1 },
    { category: 'Office Setup', yourRank: 2, totalSellers: 32, sharePct: 12.5 },
  ],
  sentiment: {
    yourRating: 4.6,
    competitorAvg: 4.3,
    reviewCount: 1_248,
    topPositive: ['Fast shipping', 'Good packaging', 'Value for money'],
    topNegative: ['Item not as described', 'Slow response from seller', 'Colour mismatch'],
  },
  opportunities: [
    { type: 'stockout', message: 'Competitor "TechZone" out of stock on SK-1018 (Mechanical Keyboard)', time: '2 hr ago' },
    { type: 'price_drop', message: 'Competitor "GadgetHub" dropped SK-1001 price by 12%', time: '5 hr ago' },
    { type: 'new_product', message: 'New entrant "ByteGear" listed 15 products in Audio category', time: '1 day ago' },
  ],
};
