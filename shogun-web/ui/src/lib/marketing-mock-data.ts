/**
 * Mock data for Marketing Dashboard (demo mode)
 * Replaces real API data with realistic demo content
 */

// Using explicit type structure without importing to avoid circular deps
export const marketingMockData = {
  mock: true,
  // Summary KPIs (status-tagged cards)
  summaryKpis: [
    {
      label: "Marketing Leads",
      value: "30",
      subtext: "of 430+ total",
      status: "live"
    },
    {
      label: "Pipeline Value",
      value: "RM 179K",
      subtext: "0.2% of RM 80.3M",
      status: "live"
    },
    {
      label: "Blog Posts",
      value: "—",
      subtext: "Pull from WP",
      status: "pending"
    },
    {
      label: "Upcoming Events",
      value: "1",
      subtext: "Lenovo PSDC Penang",
      status: "new"
    },
    {
      label: "Website Traffic",
      value: "—",
      subtext: "GA4 not connected",
      status: "broken"
    },
    {
      label: "SEO Rankings",
      value: "—",
      subtext: "GSC API not connected",
      status: "pending"
    },
    {
      label: "Social Media",
      value: "—",
      subtext: "APIs not connected",
      status: "pending"
    },
    {
      label: "Content Assets",
      value: "0",
      subtext: "None produced yet",
      status: "pending"
    }
  ],
  
  // Leads tab
  leadsDeals: [
    {
      id: "L001",
      contact: "John Tan",
      deal: "ABC Manufacturing — Quality Control & Vision AI",
      company: "ABC Manufacturing Pte Ltd",
      owner: "Sales Team A",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Manufacturing / Electronics",
      stage: "Lead",
      value: null,
      date: "2026-08-18"
    },
    {
      id: "L002",
      contact: "Sarah Lim",
      deal: "Retail Solutions — POS Integration Partner",
      company: "Retail Solutions Sdn Bhd",
      owner: "Sales Team B",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Retail Technology",
      stage: "Lead",
      value: null,
      date: "2026-08-18"
    },
    {
      id: "L003",
      contact: "David Wong",
      deal: "TechStart — Strategic Partnership",
      company: "TechStart Ventures",
      owner: "Sales Team B",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Technology / SaaS",
      stage: "Lead",
      value: null,
      date: "2026-08-10"
    },
    {
      id: "L004",
      contact: "Michelle Chen",
      deal: "Global Services — AI Practice Development",
      company: "Global Services International",
      owner: "Sales Team B",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "IT Services / Consulting",
      stage: "Lead",
      value: null,
      date: "2026-08-10"
    },
    {
      id: "L005",
      contact: "Robert Lee",
      deal: "F&B Group — Digital Transformation",
      company: "F&B Holdings Pte Ltd",
      owner: "Sales Team C",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Food & Beverage",
      stage: "Lead",
      value: null,
      date: "2026-08-10"
    },
    {
      id: "L006",
      contact: "Emily Ng",
      deal: "Software Corp — Technology Partnership",
      company: "Software Corp Malaysia",
      owner: "Sales Team B",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Software Development",
      stage: "Lead",
      value: null,
      date: "2026-08-10"
    },
    {
      id: "L007",
      contact: "Kevin Koh",
      deal: "Financial Services — Digital Platform",
      company: "Financial Services Group",
      owner: "Sales Team C",
      source: "Marketing Event",
      event: "Tech Summit 2026",
      industry: "Financial Services",
      stage: "Lead",
      value: null,
      date: "2026-08-10"
    },
    {
      id: "L008",
      contact: "Lisa Ang",
      deal: "AgriTech — Smart Farming Solution",
      company: "AgriTech Innovations",
      owner: "Sales Team A",
      source: "Website / Inbound",
      event: "not specified",
      industry: "Agriculture / Technology",
      stage: "Lead",
      value: null,
      date: "2026-08-06"
    }
  ],
  leadsTotal: 42,
  leadsPipelineValue: 179000,
  leadsContacts: 41,
  
  // Events tab
  events: [
    {
      id: "E001",
      name: "Tech Summit Penang",
      date: "2026-09-23",
      location: "Convention Centre",
      status: "upcoming",
      daysUntil: 21,
      tasks: [
        { id: "t1", label: "Book venue", done: true },
        { id: "t2", label: "Send invitations", done: true },
        { id: "t3", label: "Prepare demo booth", done: false },
        { id: "t4", label: "Print collateral", done: false }
      ]
    },
    {
      id: "E002",
      name: "AI-First Executive Forum",
      date: "2026-08-18",
      location: "City Conference Hall",
      status: "past",
      tasks: [
        { id: "t5", label: "Register attendees", done: true },
        { id: "t6", label: "Prepare pitch deck", done: true },
        { id: "t7", label: "Follow up leads", done: true },
        { id: "t8", label: "Submit expense report", done: true },
        { id: "t9", label: "Upload photos", done: true },
        { id: "t10", label: "Write recap post", done: true },
        { id: "t11", label: "Update CRM entries", done: true }
      ]
    }
  ],
  eventsRemindersNote: "A cron job runs daily at 8:00 AM MYT. It checks upcoming events and sends Telegram reminders at the intervals you set (default: 7, 3, and 1 day(s) before). Missed runs are caught up on the next execution.",
  
  // SEO Rankings tab
  seoConnected: false,
  seoMessage: "No keyword rankings, click-through rates, or position data is available. Connect the GSC API to populate this page with real data.",
  
  // Social Media tab
  socialChannels: [
    { platform: "X / Twitter", icon: "🐦", status: "not_automated" },
    { platform: "LinkedIn", icon: "💼", status: "not_automated" },
    { platform: "Facebook", icon: "📘", status: "not_automated" },
    { platform: "Instagram", icon: "📷", status: "not_automated" }
  ],
  socialNextStep: "Connect X/Twitter and LinkedIn APIs to pull follower counts, post engagement, and impressions. No data exists until APIs are integrated.",
  
  // Content tab
  contentAssets: [
    { type: "Whitepapers", count: 0, note: "None produced" },
    { type: "Case Studies", count: 0, note: "None produced" },
    { type: "Newsletters", count: 0, note: "None produced" },
    { type: "E-books / Guides", count: 0, note: "None produced" },
    { type: "Webinars", count: 0, note: "None produced" }
  ],
  contentNextStep: "Track content production manually or integrate with Google Drive / WordPress to auto-detect new content assets."
};
