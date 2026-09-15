/**
 * Mock data for Facility Management dashboard demonstration.
 * Provides realistic historical data across all location types.
 */

import type { FacilityLocation, FacilityInspection, FacilityActionItem, FacilityTemplate, FacilityStats } from './types';

// ── Location Types Reference ────────────────────────────────────────────────
export const LOCATION_TYPES = [
  { value: 'factory_floor', label: 'Factory / Production Floor', icon: '🏭' },
  { value: 'hostel', label: 'Staff Quarters / Hostel', icon: '🏠' },
  { value: 'canteen', label: 'Canteen / Kitchen', icon: '🍽️' },
  { value: 'toilet', label: 'Toilet / Washroom', icon: '🚿' },
  { value: 'warehouse', label: 'Warehouse / Storage', icon: '📦' },
  { value: 'workshop', label: 'Workshop / Maintenance', icon: '🔧' },
  { value: 'parking', label: 'Parking Area', icon: '🅿️' },
  { value: 'construction', label: 'Construction Site', icon: '🏗️' },
  { value: 'office', label: 'Office Space', icon: '🏢' },
  { value: 'clinic', label: 'Clinic / Medical', icon: '🏥' },
] as const;

// ── Mock Locations (12 diverse facilities) ───────────────────────────────────
export const MOCK_LOCATIONS: FacilityLocation[] = [
  {
    id: 1,
    tenant_id: 1,
    name: 'Factory A - Production Line 1',
    location_type: 'factory_floor',
    site_name: 'Main Estate',
    area_sqm: 2500,
    responsible_person: 'Ahmad Razak',
    inspection_frequency: 'weekly',
    last_inspection_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 78,
    last_overall_rating: 'Good',
    status: 'active',
    notes: 'High-traffic production area',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    tenant_id: 1,
    name: 'Block C Unit 12 - Staff Quarters',
    location_type: 'hostel',
    site_name: 'Workers Housing',
    area_sqm: 45,
    responsible_person: 'Siti Nurhaliza',
    inspection_frequency: 'monthly',
    last_inspection_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 65,
    last_overall_rating: 'Moderate',
    status: 'active',
    notes: '4-person occupancy',
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    tenant_id: 1,
    name: 'Main Canteen - Kitchen Area',
    location_type: 'canteen',
    site_name: 'Central Complex',
    area_sqm: 180,
    responsible_person: 'Lim Wei Ming',
    inspection_frequency: 'daily',
    last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 88,
    last_overall_rating: 'Excellent',
    status: 'active',
    notes: 'Serves 500+ meals daily',
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    tenant_id: 1,
    name: 'Warehouse B - Cold Storage',
    location_type: 'warehouse',
    site_name: 'Logistics Hub',
    area_sqm: 800,
    responsible_person: 'Rajesh Kumar',
    inspection_frequency: 'weekly',
    last_inspection_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 52,
    last_overall_rating: 'Moderate',
    status: 'active',
    notes: 'Temperature-controlled zone',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    tenant_id: 1,
    name: 'Workshop 2 - Electrical Bay',
    location_type: 'workshop',
    site_name: 'Maintenance Block',
    area_sqm: 320,
    responsible_person: 'Tan Ah Meng',
    inspection_frequency: 'weekly',
    last_inspection_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 71,
    last_overall_rating: 'Good',
    status: 'active',
    notes: 'High-voltage equipment area',
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    tenant_id: 1,
    name: 'Block A - Public Toilets Level 1',
    location_type: 'toilet',
    site_name: 'Admin Building',
    area_sqm: 65,
    responsible_person: 'Fatimah Ali',
    inspection_frequency: 'daily',
    last_inspection_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 43,
    last_overall_rating: 'Poor',
    status: 'active',
    notes: 'High-traffic public facility',
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    tenant_id: 1,
    name: 'Construction Zone C - Foundation',
    location_type: 'construction',
    site_name: 'New Expansion',
    area_sqm: 5000,
    responsible_person: 'Chen Li Hua',
    inspection_frequency: 'weekly',
    last_inspection_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 69,
    last_overall_rating: 'Moderate',
    status: 'active',
    notes: 'Active construction site',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    tenant_id: 1,
    name: 'Parking Lot P3 - Employee Section',
    location_type: 'parking',
    site_name: 'Main Compound',
    area_sqm: 3200,
    responsible_person: 'Security Team',
    inspection_frequency: 'monthly',
    last_inspection_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 82,
    last_overall_rating: 'Excellent',
    status: 'active',
    notes: '200+ vehicle capacity',
    created_at: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    tenant_id: 1,
    name: 'Office Tower Level 5 - Open Plan',
    location_type: 'office',
    site_name: 'HQ Building',
    area_sqm: 1200,
    responsible_person: 'Nurul Izzah',
    inspection_frequency: 'monthly',
    last_inspection_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 91,
    last_overall_rating: 'Excellent',
    status: 'active',
    notes: '120 workstations',
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 10,
    tenant_id: 1,
    name: 'Factory B - Assembly Line 3',
    location_type: 'factory_floor',
    site_name: 'Main Estate',
    area_sqm: 1800,
    responsible_person: 'Kumar Selvam',
    inspection_frequency: 'weekly',
    last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 85,
    last_overall_rating: 'Excellent',
    status: 'active',
    notes: 'Electronics assembly',
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 11,
    tenant_id: 1,
    name: 'Clinic - Emergency Room',
    location_type: 'clinic',
    site_name: 'Medical Center',
    area_sqm: 95,
    responsible_person: 'Dr. Sarah Lim',
    inspection_frequency: 'daily',
    last_inspection_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    last_overall_score: 38,
    last_overall_rating: 'Poor',
    status: 'active',
    notes: 'Critical care area - URGENT attention needed',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 12,
    tenant_id: 1,
    name: 'Block D Unit 5 - Family Quarters',
    location_type: 'hostel',
    site_name: 'Workers Housing',
    area_sqm: 68,
    responsible_person: 'Azman Hassan',
    inspection_frequency: 'monthly',
    last_inspection_date: null,
    last_overall_score: null,
    last_overall_rating: null,
    status: 'active',
    notes: 'Never inspected - NEW registration',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ── Mock Inspection History (30 records spanning 6 months) ───────────────────
export const MOCK_INSPECTIONS: FacilityInspection[] = (() => {
  const inspections: FacilityInspection[] = [];
  const baseDate = new Date();

  // Helper to generate inspection scores based on location type trends
  const genScore = (baseScore: number, variance: number) =>
    Math.max(20, Math.min(98, baseScore + (Math.random() - 0.5) * variance));

  // Generate 2-4 inspections per location over 6 months
  MOCK_LOCATIONS.forEach((loc) => {
    if (!loc.last_inspection_date && loc.id === 12) return; // Skip never-inspected

    const numInspections = Math.floor(Math.random() * 3) + 2;
    const baseScore = loc.last_overall_score || 70;

    for (let i = 0; i < numInspections; i++) {
      const daysAgo = Math.floor((i * 25) + (Math.random() * 10));
      const inspectionDate = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const cleanliness = genScore(baseScore, 15);
      const assets = genScore(baseScore + 5, 12);
      const safety = genScore(baseScore - 5, 18);
      const ppe = loc.location_type === 'factory_floor' || loc.location_type === 'construction' || loc.location_type === 'workshop'
        ? genScore(baseScore, 20)
        : null;
      const hygiene = loc.location_type === 'canteen' || loc.location_type === 'toilet' || loc.location_type === 'clinic'
        ? genScore(baseScore, 15)
        : null;

      const overall = [cleanliness, assets, safety, ...(ppe ? [ppe] : []), ...(hygiene ? [hygiene] : [])]
        .filter(Boolean)
        .reduce((a, b) => a + b, 0) / ([cleanliness, assets, safety].length + (ppe ? 1 : 0) + (hygiene ? 1 : 0));

      const rating = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : overall >= 40 ? 'Moderate' : overall >= 20 ? 'Poor' : 'Critical';

      // Map location to real photos
      const locationPhotos: Record<number, Array<{ url: string; filename: string }>> = {
        1: [ // Factory A - Production Line 1
          { url: '/mock/factory/f1.png', filename: 'factory_production_wide.jpg' },
          { url: '/mock/factory/df1.jpg', filename: 'factory_production_detail.jpg' },
        ],
        2: [ // Block C Unit 12 - Staff Quarters
          { url: '/mock/hostel/h1.png', filename: 'hostel_quarters_wide.jpg' },
          { url: '/mock/hostel/dh1.jpg', filename: 'hostel_quarters_detail.jpg' },
        ],
        4: [ // Warehouse B - Cold Storage
          { url: '/mock/warehouse/w1.jpg', filename: 'warehouse_storage_wide.jpg' },
          { url: '/mock/warehouse/dw1.jpg', filename: 'warehouse_storage_detail.jpg' },
        ],
        6: [ // Block A - Public Toilets Level 1
          { url: '/mock/toilet/pt1.jpg', filename: 'toilet_facility_wide.jpg' },
          { url: '/mock/toilet/pt2.jpg', filename: 'toilet_facility_detail.jpg' },
        ],
      };
      const photosForLocation = locationPhotos[loc.id] || [
        { url: '/mock/factory/f1.png', filename: `inspection_${daysAgo}d_ago_wide.jpg` },
        { url: '/mock/factory/df1.jpg', filename: `inspection_${daysAgo}d_ago_detail.jpg` },
      ];

      inspections.push({
        id: inspections.length + 1,
        tenant_id: 1,
        location_id: loc.id,
        inspected_by: ['Ahmad Razak', 'Siti Nurhaliza', 'Lim Wei Ming', 'Rajesh Kumar', 'Tan Ah Meng'][Math.floor(Math.random() * 5)],
        inspection_date: inspectionDate.toISOString(),
        photos: photosForLocation,
        location_type_snapshot: loc.location_type,
        scores: {
          cleanliness: { score: Math.round(cleanliness), rating: cleanliness >= 80 ? 'Excellent' : cleanliness >= 60 ? 'Good' : cleanliness >= 40 ? 'Moderate' : 'Poor' },
          assets: { score: Math.round(assets), rating: assets >= 80 ? 'Excellent' : assets >= 60 ? 'Good' : assets >= 40 ? 'Moderate' : 'Poor' },
          safety: { score: Math.round(safety), rating: safety >= 80 ? 'Excellent' : safety >= 60 ? 'Good' : safety >= 40 ? 'Moderate' : 'Poor' },
          ...(ppe && { ppe: { score: Math.round(ppe), rating: ppe >= 80 ? 'Excellent' : ppe >= 60 ? 'Good' : ppe >= 40 ? 'Moderate' : 'Poor' } }),
          ...(hygiene && { hygiene: { score: Math.round(hygiene), rating: hygiene >= 80 ? 'Excellent' : hygiene >= 60 ? 'Good' : hygiene >= 40 ? 'Moderate' : 'Poor' } }),
        },
        overall_score: Math.round(overall),
        overall_rating: rating,
        checklist_results: [
          { item: 'Fire extinguisher visible and accessible', pass: Math.random() > 0.2, critical: true, category: 'safety' },
          { item: 'Floor clean and free of debris', pass: Math.random() > 0.3, category: 'cleanliness' },
          { item: 'Emergency exit signs illuminated', pass: Math.random() > 0.25, critical: true, category: 'safety' },
          { item: 'Tools/equipment stored properly', pass: Math.random() > 0.4, category: 'assets' },
          { item: 'Adequate ventilation', pass: Math.random() > 0.35, category: 'safety' },
          ...(ppe ? [{ item: 'PPE worn by all personnel', pass: Math.random() > 0.3, category: 'ppe' }] : []),
          ...(hygiene ? [{ item: 'Sanitation supplies adequate', pass: Math.random() > 0.3, category: 'hygiene' }] : []),
        ],
        action_items: [],
        ai_raw_response: 'Mock inspection generated for demo',
        created_at: inspectionDate.toISOString(),
      });
    }
  });

  // ── Specific toilet inspections with real photos ──
  // Sept 7, 2026 - CLEAN inspection (pt1.jpg, pt2.jpg)
  inspections.push({
    id: 9001,
    tenant_id: 1,
    location_id: 6,
    inspected_by: 'Fatimah Ali',
    inspection_date: new Date(2026, 8, 7, 9, 30, 0).toISOString(), // Sept 7, 2026 9:30 AM
    photos: [
      { url: '/mock/toilet/pt1.jpg', filename: 'toilet_wide_sept7.jpg' },
      { url: '/mock/toilet/pt2.jpg', filename: 'toilet_detail_sept7.jpg' },
    ],
    location_type_snapshot: 'toilet',
    scores: {
      cleanliness: { score: 92, rating: 'Excellent' },
      assets: { score: 88, rating: 'Excellent' },
      safety: { score: 95, rating: 'Excellent' },
      hygiene: { score: 90, rating: 'Excellent' },
    },
    overall_score: 91,
    overall_rating: 'Excellent',
    checklist_results: [
      { item: 'Urinals clean, no stains or odour', pass: true, critical: true, category: 'cleanliness' },
      { item: 'Toilet bowls clean and flushed', pass: true, critical: true, category: 'cleanliness' },
      { item: 'Floor tiles clean, no muddy footprints', pass: true, category: 'cleanliness' },
      { item: 'Frosted glass partitions free of handprints', pass: true, category: 'cleanliness' },
      { item: 'Sinks clean, no overflow or debris', pass: true, category: 'cleanliness' },
      { item: 'Mirror clean, no smudges', pass: true, category: 'cleanliness' },
      { item: 'Soap dispensers filled and functional', pass: true, category: 'hygiene' },
      { item: 'Paper towel dispensers stocked', pass: true, category: 'hygiene' },
      { item: 'Trash bins not overflowing', pass: true, category: 'cleanliness' },
      { item: 'No litter on floor', pass: true, category: 'cleanliness' },
      { item: 'Flush sensors working properly', pass: true, category: 'assets' },
      { item: 'Faucets functioning, no leaks', pass: true, category: 'assets' },
      { item: 'Ventilation adequate', pass: true, category: 'safety' },
      { item: 'Lighting fixtures operational', pass: true, category: 'safety' },
      { item: 'Privacy dividers intact', pass: true, category: 'assets' },
    ],
    action_items: [],
    ai_raw_response: 'Facility in excellent condition. All fixtures clean and functional. No issues detected.',
    created_at: new Date(2026, 8, 7, 9, 30, 0).toISOString(),
  });

  // Sept 8, 2026 - DIRTY inspection (dpt1.jpg, dpt2.jpg)
  inspections.push({
    id: 9002,
    tenant_id: 1,
    location_id: 6,
    inspected_by: 'Fatimah Ali',
    inspection_date: new Date(2026, 8, 8, 14, 15, 0).toISOString(), // Sept 8, 2026 2:15 PM
    photos: [
      { url: '/mock/toilet/dpt1.jpg', filename: 'toilet_wide_sept8_dirty.jpg' },
      { url: '/mock/toilet/dpt2.jpg', filename: 'toilet_detail_sept8_dirty.jpg' },
    ],
    location_type_snapshot: 'toilet',
    scores: {
      cleanliness: { score: 18, rating: 'Critical' },
      assets: { score: 55, rating: 'Moderate' },
      safety: { score: 60, rating: 'Good' },
      hygiene: { score: 22, rating: 'Critical' },
    },
    overall_score: 39,
    overall_rating: 'Poor',
    checklist_results: [
      { item: 'Urinals clean, no stains or odour', pass: false, critical: true, category: 'cleanliness', evidence: 'Heavy yellow-brown urine stains inside both urinals, dripping down fronts' },
      { item: 'Toilet bowls clean and flushed', pass: false, critical: true, category: 'cleanliness', evidence: 'Stall end panels show yellowish drip stains and smudges' },
      { item: 'Floor tiles clean, no muddy footprints', pass: false, category: 'cleanliness', evidence: 'Extensive muddy shoe prints, brown stains, and smears across floor tiles' },
      { item: 'Frosted glass partitions free of handprints', pass: false, category: 'cleanliness', evidence: 'Dirty brownish handprints and palm prints covering frosted glass doors' },
      { item: 'Sinks clean, no overflow or debris', pass: false, category: 'cleanliness', evidence: 'Sink overflowing with crumpled paper towels, dirt streaks on outer surface' },
      { item: 'Mirror clean, no smudges', pass: false, category: 'cleanliness', evidence: 'Mirror visibly smudged with cloudy swirl marks and haze' },
      { item: 'Soap dispensers filled and functional', pass: false, category: 'hygiene', evidence: 'Translucent soap bottle with yellowish liquid sitting loosely on basin edge' },
      { item: 'Paper towel dispensers stocked', pass: false, category: 'hygiene', evidence: 'Towels protruding messily from dispenser, overflowing trash below' },
      { item: 'Trash bins not overflowing', pass: false, category: 'cleanliness', evidence: 'Both black waste bins overflowing with crumpled paper, litter scattered around' },
      { item: 'No litter on floor', pass: false, category: 'cleanliness', evidence: 'Scattered litter: orange snack wrapper, plastic water bottle with blue cap, crumpled tissues, green scrap' },
      { item: 'Flush sensors working properly', pass: true, category: 'assets' },
      { item: 'Faucets functioning, no leaks', pass: true, category: 'assets' },
      { item: 'Ventilation adequate', pass: true, category: 'safety' },
      { item: 'Lighting fixtures operational', pass: true, category: 'safety' },
      { item: 'Privacy dividers intact', pass: false, category: 'assets', evidence: 'Divider panel marked with dirty smears and streaks between urinals' },
    ],
    action_items: [],
    ai_raw_response: 'CRITICAL: Facility in severely unsanitary condition. Urinals heavily stained, floor covered in muddy footprints and litter, sinks overflowing with paper towels, mirrors smudged, trash bins overflowing. Immediate deep cleaning required.',
    created_at: new Date(2026, 8, 8, 14, 15, 0).toISOString(),
  });

  // ── Specific hostel inspections with real photos ──
  // Sept 5, 2026 - CLEAN inspection (h1.png)
  inspections.push({
    id: 9003,
    tenant_id: 1,
    location_id: 2,
    inspected_by: 'Siti Nurhaliza',
    inspection_date: new Date(2026, 8, 5, 10, 0, 0).toISOString(), // Sept 5, 2026 10:00 AM
    photos: [
      { url: '/mock/hostel/h1.png', filename: 'hostel_clean_sept5.png' },
    ],
    location_type_snapshot: 'hostel',
    scores: {
      cleanliness: { score: 95, rating: 'Excellent' },
      assets: { score: 92, rating: 'Excellent' },
      safety: { score: 90, rating: 'Excellent' },
    },
    overall_score: 92,
    overall_rating: 'Excellent',
    checklist_results: [
      { item: 'Beds made, bedding clean and tidy', pass: true, category: 'cleanliness', evidence: 'All 4 bunks have mattresses neatly wrapped in plastic, pillows in sealed packaging' },
      { item: 'Floor clean, no clutter or debris', pass: true, category: 'cleanliness', evidence: 'Large gray tile floor completely bare and clean, no items on floor' },
      { item: 'Lockers clean, no damage', pass: true, category: 'assets', evidence: 'Two gray metal lockers centered between beds, clean surfaces, ventilation slits clear' },
      { item: 'Walls clean, no stains or damage', pass: true, category: 'cleanliness', evidence: 'Yellow upper walls and white wainscoting in good condition, no marks or scuffs' },
      { item: 'Bed frames structurally sound', pass: true, category: 'assets', evidence: 'Black metal bunk bed frames stable, safety rails on top bunks intact' },
      { item: 'Windows and lighting functional', pass: true, category: 'safety', evidence: 'Natural daylight entering from right side, bright and well-lit room' },
      { item: 'No personal items left unattended', pass: true, category: 'cleanliness', evidence: 'Room appears newly prepared for occupants, no personal belongings scattered' },
      { item: 'Pillows and mattresses in good condition', pass: true, category: 'assets', evidence: 'All pillows still in sealed retail packaging with orange branding bands' },
      { item: 'No pests or signs of infestation', pass: true, critical: true, category: 'hygiene' },
      { item: 'Ventilation adequate', pass: true, category: 'safety' },
      { item: 'Fire exit accessible', pass: true, critical: true, category: 'safety' },
      { item: 'Electrical outlets safe', pass: true, category: 'safety' },
    ],
    action_items: [],
    ai_raw_response: 'Room in excellent condition. Newly prepared for occupancy - all bedding still in protective wrapping, floor spotless, lockers clean. No issues detected.',
    created_at: new Date(2026, 8, 5, 10, 0, 0).toISOString(),
  });

  // Sept 6, 2026 - MESSY inspection (dh1.jpg)
  inspections.push({
    id: 9004,
    tenant_id: 1,
    location_id: 2,
    inspected_by: 'Siti Nurhaliza',
    inspection_date: new Date(2026, 8, 6, 15, 30, 0).toISOString(), // Sept 6, 2026 3:30 PM
    photos: [
      { url: '/mock/hostel/dh1.jpg', filename: 'hostel_messy_sept6.jpg' },
    ],
    location_type_snapshot: 'hostel',
    scores: {
      cleanliness: { score: 25, rating: 'Poor' },
      assets: { score: 50, rating: 'Moderate' },
      safety: { score: 45, rating: 'Moderate' },
    },
    overall_score: 40,
    overall_rating: 'Poor',
    checklist_results: [
      { item: 'Beds made, bedding clean and tidy', pass: false, category: 'cleanliness', evidence: 'All beds unmade - rumpled blankets, scattered clothing on mattresses, dirty dishes (plates with food residue) placed directly on bottom right bunk' },
      { item: 'Floor clean, no clutter or debris', pass: false, critical: true, category: 'cleanliness', evidence: 'Floor heavily cluttered: 8+ pairs of shoes/sandals scattered, dirty pillow on floor, heaps of clothing, socks, 2 plastic water bottles, crumpled snack bags (yellow/red chip packets), food crumbs and debris throughout' },
      { item: 'Lockers clean, no damage', pass: false, category: 'assets', evidence: 'Locker doors smeared with dirty handprints and marks, stickers and photos stuck to upper doors, items piled on top (books, jacket, mug, cloth)' },
      { item: 'Walls clean, no stains or damage', pass: false, category: 'cleanliness', evidence: 'Yellow upper walls show patchy spots, scuffs, and uneven repaint marks' },
      { item: 'Bed frames structurally sound', pass: true, category: 'assets', evidence: 'Black metal bunk bed frames appear structurally intact despite heavy use' },
      { item: 'Windows and lighting functional', pass: true, category: 'safety', evidence: 'Natural daylight entering room, lighting adequate' },
      { item: 'No personal items left unattended', pass: false, category: 'cleanliness', evidence: 'Excessive personal items scattered everywhere: backpack on floor against locker, laptop bag on top bunk, eyeglasses on mattress, multiple jackets hanging on bed rails, white plastic bags tucked in bunks' },
      { item: 'Pillows and mattresses in good condition', pass: false, category: 'assets', evidence: 'Left bottom pillow stained, right bottom pillow stained; mattress covers wrinkled and disheveled' },
      { item: 'No pests or signs of infestation', pass: false, critical: true, category: 'hygiene', evidence: 'Food debris and crumbs on floor attract pest risk, dirty dishes left on bed' },
      { item: 'Ventilation adequate', pass: true, category: 'safety' },
      { item: 'Fire exit accessible', pass: false, critical: true, category: 'safety', evidence: 'Floor clutter (shoes, bags, clothing) could obstruct evacuation path' },
      { item: 'Electrical outlets safe', pass: false, category: 'safety', evidence: 'White cable/earphones coiled on left bottom bunk mattress, potential fire hazard near bedding' },
    ],
    action_items: [],
    ai_raw_response: 'POOR: Room in severely disorganized and unsanitary condition. Floor covered in shoes, clothing, trash, and food debris. Dirty dishes left on bed. Locker doors marked with handprints. Fire exit potentially blocked by floor clutter. Immediate cleanup and resident education required.',
    created_at: new Date(2026, 8, 6, 15, 30, 0).toISOString(),
  });

  // ── Specific warehouse inspections with real photos ──
  // Sept 9, 2026 - ORDERLY inspection (w1.jpg)
  inspections.push({
    id: 9005,
    tenant_id: 1,
    location_id: 4,
    inspected_by: 'Rajesh Kumar',
    inspection_date: new Date(2026, 8, 9, 8, 0, 0).toISOString(), // Sept 9, 2026 8:00 AM
    photos: [
      { url: '/mock/warehouse/w1.jpg', filename: 'warehouse_orderly_sept9.jpg' },
    ],
    location_type_snapshot: 'warehouse',
    scores: {
      cleanliness: { score: 78, rating: 'Good' },
      assets: { score: 85, rating: 'Excellent' },
      safety: { score: 80, rating: 'Good' },
    },
    overall_score: 81,
    overall_rating: 'Good',
    checklist_results: [
      { item: 'Aisle clear of obstructions', pass: true, critical: true, category: 'safety', evidence: 'Central concrete aisle clear, no items blocking walkway or forklift path' },
      { item: 'Racking structurally sound', pass: true, critical: true, category: 'assets', evidence: 'Orange load beams and teal upright posts in good condition, no visible damage or bending' },
      { item: 'Location labels visible and correct', pass: true, category: 'assets', evidence: 'Pink/magenta labels (124³⁰⁰) and white labels (134³⁵⁰, 134²⁵⁰, 134¹⁵⁰) clearly visible on beams' },
      { item: 'Pallets properly stacked', pass: true, category: 'assets', evidence: 'Cartons neatly stacked on wooden pallets, shrink-wrapped loads stable on upper levels' },
      { item: 'Floor clean, no debris', pass: false, category: 'cleanliness', evidence: 'Concrete floor shows dust, tire/scuff marks, and patchy discoloration but no major debris' },
      { item: 'Fire extinguisher accessible', pass: true, critical: true, category: 'safety', evidence: 'Yellow safety post/guard visible at end of aisle, fire equipment area clear' },
      { item: 'Lighting adequate', pass: true, category: 'safety', evidence: 'Bright diffuse daylight from roof trusses, adequate visibility throughout aisle' },
      { item: 'No damaged boxes or spills', pass: true, category: 'cleanliness', evidence: 'Boxes appear intact, some open flaps but no spills or product damage visible' },
      { item: 'Equipment stored properly', pass: false, category: 'assets', evidence: 'Black step stool/ladder left in aisle near blue cloth-covered table, poles/tools leaning against structure at far end' },
      { item: 'Ventilation adequate', pass: true, category: 'safety', evidence: 'Open warehouse structure with corrugated metal walls provides natural ventilation' },
      { item: 'Box markings legible', pass: true, category: 'assets', evidence: 'Printed codes visible: E150 on upper right cartons, A1054 on lower left, SKU labels present' },
      { item: 'Shrink wrap secure', pass: true, category: 'assets', evidence: 'Upper level pallet loads properly wrapped in clear plastic film' },
    ],
    action_items: [],
    ai_raw_response: 'GOOD: Warehouse in generally orderly condition. Racking structurally sound, location labels visible, pallets properly stacked. Minor issues: floor shows wear marks, step stool left in aisle, tools leaning at far end. Overall well-maintained storage facility.',
    created_at: new Date(2026, 8, 9, 8, 0, 0).toISOString(),
  });

  // Sept 10, 2026 - CLUTTERED inspection (dw1.jpg)
  inspections.push({
    id: 9006,
    tenant_id: 1,
    location_id: 4,
    inspected_by: 'Rajesh Kumar',
    inspection_date: new Date(2026, 8, 10, 14, 0, 0).toISOString(), // Sept 10, 2026 2:00 PM
    photos: [
      { url: '/mock/warehouse/dw1.jpg', filename: 'warehouse_cluttered_sept10.jpg' },
    ],
    location_type_snapshot: 'warehouse',
    scores: {
      cleanliness: { score: 42, rating: 'Moderate' },
      assets: { score: 65, rating: 'Moderate' },
      safety: { score: 48, rating: 'Moderate' },
    },
    overall_score: 52,
    overall_rating: 'Moderate',
    checklist_results: [
      { item: 'Aisle clear of obstructions', pass: false, critical: true, category: 'safety', evidence: 'Table with blue-gray cloth placed mid-aisle, orange cup and small carton on floor nearby, black trash tub in foreground right blocking partial aisle width' },
      { item: 'Racking structurally sound', pass: true, critical: true, category: 'assets', evidence: 'Teal uprights and orange beams appear structurally intact despite heavy loading' },
      { item: 'Location labels visible and correct', pass: true, category: 'assets', evidence: 'Labels visible: 124-500, 116-500 (with arrow), 124-350 on left; 134-550, 124-250 on right beams' },
      { item: 'Pallets properly stacked', pass: false, category: 'assets', evidence: 'Some cartons have open flaps, empty pallets stored on lower rails and floor creating clutter' },
      { item: 'Floor clean, no debris', pass: false, category: 'cleanliness', evidence: 'Concrete floor has dark tire tracks, oil/water staining, scattered debris: white paper scraps, cardboard fragments, wood strips, white plastic strapping bands on right side' },
      { item: 'Fire extinguisher accessible', pass: false, critical: true, category: 'safety', evidence: 'Red object (fire extinguisher) at far end base partially obscured by shelving unit and stacked items' },
      { item: 'Lighting adequate', pass: true, category: 'safety', evidence: 'Diffuse daylight from roofline provides adequate illumination' },
      { item: 'No damaged boxes or spills', pass: false, category: 'cleanliness', evidence: 'Multiple cartons with open flaps exposing contents, potential product exposure risk' },
      { item: 'Equipment stored properly', pass: false, category: 'assets', evidence: 'Work table with cloth and personal items (cup, gloves/bags) left mid-aisle, metal stool beneath, rods/pipes leaning against end shelving' },
      { item: 'Ventilation adequate', pass: true, category: 'safety', evidence: 'Open warehouse structure provides natural ventilation' },
      { item: 'Box markings legible', pass: true, category: 'assets', evidence: 'Codes visible: E150, E160, ET50, AD64, AD84/A094, 2804, 4208 on various cartons' },
      { item: 'Shrink wrap secure', pass: true, category: 'assets', evidence: 'Upper level wrapped loads appear secure' },
      { item: 'Trash receptacles available', pass: false, category: 'cleanliness', evidence: 'Black trash tub filled with crumpled paper and packaging waste in foreground, overflowing' },
      { item: 'End wall area organized', pass: false, category: 'cleanliness', evidence: 'Gray metal shelving at end wall cluttered with open carton, stacked boxes, shoes/parts on top shelf, red canister at base' },
    ],
    action_items: [],
    ai_raw_response: 'MODERATE: Warehouse showing signs of operational clutter. Mid-aisle work table obstructing forklift path, floor debris including tire tracks, paper scraps, and strapping bands. Open cartons exposing contents, overflowing trash tub. Fire extinguisher access partially blocked. Recommend immediate cleanup of aisle obstructions and floor debris, proper storage of work equipment, and waste management review.',
    created_at: new Date(2026, 8, 10, 14, 0, 0).toISOString(),
  });

  // ── Specific factory inspections with real photos ──
  // Sept 9, 2026 - COMPLIANT inspection (f1.png)
  inspections.push({
    id: 9007,
    tenant_id: 1,
    location_id: 1,
    inspected_by: 'Ahmad Razak',
    inspection_date: new Date(2026, 8, 9, 10, 0, 0).toISOString(), // Sept 9, 2026 10:00 AM
    photos: [
      { url: '/mock/factory/f1.png', filename: 'factory_compliant_sept9.png' },
    ],
    location_type_snapshot: 'factory_floor',
    scores: {
      cleanliness: { score: 82, rating: 'Excellent' },
      assets: { score: 88, rating: 'Excellent' },
      safety: { score: 85, rating: 'Excellent' },
      ppe: { score: 90, rating: 'Excellent' },
    },
    overall_score: 86,
    overall_rating: 'Excellent',
    checklist_results: [
      { item: 'Workers wearing required PPE', pass: true, critical: true, category: 'ppe', evidence: 'All workers wearing blue head scarves/hijabs and lime-green high-visibility vests over dark long-sleeved clothing' },
      { item: 'Safety floor markings visible', pass: true, critical: true, category: 'safety', evidence: 'Yellow safety lines clearly marking walkways and work zones on green epoxy floor' },
      { item: 'Workstations organized', pass: true, category: 'assets', evidence: 'Teal workbenches and wheeled carts orderly arranged, components in blue plastic bins and cardboard boxes' },
      { item: 'Aisles clear of obstructions', pass: false, category: 'safety', evidence: 'Low rectangular platform with dark blue top sitting alone in yellow-lined aisle in center foreground - potential trip hazard' },
      { item: 'Fire suppression system visible', pass: true, critical: true, category: 'safety', evidence: 'Red sprinkler/fire-suppression pipes visible crossing ceiling overhead' },
      { item: 'Lighting adequate', pass: true, category: 'safety', evidence: 'Rows of fluorescent tube lights providing bright, even illumination throughout production hall' },
      { item: 'Machine guards in place', pass: true, category: 'safety', evidence: 'Beige machine cabinet with control panel properly enclosed, black electrical control box mounted securely' },
      { item: 'Work instructions posted', pass: true, category: 'assets', evidence: 'White sheets of paper (work instructions/checklists) hanging from overhead rails above each station' },
      { item: 'Floor clean, no spills', pass: true, category: 'cleanliness', evidence: 'Green epoxy floor coating in good condition, patch of bare gray concrete visible but no spills or debris noted' },
      { item: 'Emergency exits accessible', pass: true, critical: true, category: 'safety' },
      { item: 'Electrical panels labeled', pass: true, category: 'assets', evidence: 'Control panels with buttons and indicators visible, properly mounted' },
      { item: 'Cable management safe', pass: true, category: 'safety', evidence: 'Coiled black cable/wire harness bundles stored on carts, not trailing across floor' },
      { item: 'Production displays functional', pass: true, category: 'assets', evidence: 'Red LED digital display boards (andon/production counters) hanging near ceiling, glowing with numerals' },
      { item: 'Ventilation adequate', pass: true, category: 'safety', evidence: 'Open industrial space with high ceiling provides natural ventilation' },
    ],
    action_items: [],
    ai_raw_response: 'EXCELLENT: Factory floor in compliant condition. All workers properly wearing PPE (hijabs + hi-vis vests). Safety floor markings visible, lighting adequate, fire suppression system in place. Minor issue: platform left in aisle creates trip hazard. Overall well-organized production line with proper work instructions posted.',
    created_at: new Date(2026, 8, 9, 10, 0, 0).toISOString(),
  });

  // Sept 10, 2026 - CLUTTERED inspection (df1.jpg)
  inspections.push({
    id: 9008,
    tenant_id: 1,
    location_id: 1,
    inspected_by: 'Ahmad Razak',
    inspection_date: new Date(2026, 8, 10, 15, 0, 0).toISOString(), // Sept 10, 2026 3:00 PM
    photos: [
      { url: '/mock/factory/df1.jpg', filename: 'factory_cluttered_sept10.jpg' },
    ],
    location_type_snapshot: 'factory_floor',
    scores: {
      cleanliness: { score: 38, rating: 'Poor' },
      assets: { score: 62, rating: 'Moderate' },
      safety: { score: 45, rating: 'Moderate' },
      ppe: { score: 85, rating: 'Excellent' },
    },
    overall_score: 58,
    overall_rating: 'Moderate',
    checklist_results: [
      { item: 'Workers wearing required PPE', pass: true, critical: true, category: 'ppe', evidence: 'Workers wearing light-blue hijabs, teal/lime-green shirts, navy aprons/vests; one worker wearing red protective arm sleeves' },
      { item: 'Safety floor markings visible', pass: true, critical: true, category: 'safety', evidence: 'Wide yellow safety lines bordering green epoxy aisle, yellow tape marking boundaries around platforms' },
      { item: 'Workstations organized', pass: false, category: 'assets', evidence: 'Workbenches cluttered with cardboard boxes, white packaging material, stacked product housings; tools scattered on teal platform table (screwdrivers, hex keys, pliers)' },
      { item: 'Aisles clear of obstructions', pass: false, critical: true, category: 'safety', evidence: 'Floor littered with debris: plastic water bottles, work gloves (blue nitrile + gray cloth), crumpled rag, screws/nuts/metal parts, yellow-handled screwdriver, disposable cups, orange snack wrappers, open cardboard box with cups/cans' },
      { item: 'Fire suppression system visible', pass: true, critical: true, category: 'safety', evidence: 'Red fire-suppression piping visible overhead' },
      { item: 'Lighting adequate', pass: true, category: 'safety', evidence: 'Rows of fluorescent tube lights providing bright illumination' },
      { item: 'Machine guards in place', pass: true, category: 'safety', evidence: 'White electrical control cabinet with red rocker switches properly enclosed, black control box with red indicator lamp mounted on teal stand' },
      { item: 'Work instructions posted', pass: true, category: 'assets', evidence: 'White paper documents in plastic sleeves hanging from metal frames above benches' },
      { item: 'Floor clean, no spills', pass: false, critical: true, category: 'cleanliness', evidence: 'Bare gray concrete work zone floor covered with scattered screws, nuts, small metal parts, food wrappers, drink bottles, and work gloves - slip/trip hazard' },
      { item: 'Emergency exits accessible', pass: true, critical: true, category: 'safety' },
      { item: 'Electrical panels labeled', pass: true, category: 'assets', evidence: 'Control cabinets with switches and indicators visible' },
      { item: 'Cable management safe', pass: false, category: 'safety', evidence: 'Yellow coiled spiral cables/air hoses hanging from overhead frames, potential snag hazard; black power cords bundled on carts but some loose on floor' },
      { item: 'Production displays functional', pass: true, category: 'assets', evidence: 'Red LED dot-matrix display boards hanging from ceiling showing numerals' },
      { item: 'Ventilation adequate', pass: true, category: 'safety', evidence: 'Round industrial fans with orange blades clamped overhead at angles, gray drum fans also present' },
      { item: 'Food/drink policy compliance', pass: false, category: 'hygiene', evidence: 'Disposable paper cups (white and maroon), plastic water bottles, orange snack wrappers on production floor - food/drink not permitted in assembly area' },
      { item: 'Tool storage proper', pass: false, category: 'assets', evidence: 'Screwdrivers with red/yellow handles, hex keys, pliers left on teal platform and small table instead of tool racks; yellow-handled screwdriver lying on floor' },
    ],
    action_items: [],
    ai_raw_response: 'MODERATE: Factory floor showing significant housekeeping issues. Floor littered with debris including screws, nuts, water bottles, work gloves, food wrappers, and disposable cups creating slip/trip hazards. Tools left on platform and floor instead of proper storage. Food/drink policy violation observed in assembly area. PPE compliance excellent - all workers properly attired. Recommend immediate floor cleanup, tool organization, and reinforcement of food/drink policy.',
    created_at: new Date(2026, 8, 10, 15, 0, 0).toISOString(),
  });

  // Only keep inspections for the 4 demo locations
  const DEMO_LOCATION_IDS = [1, 2, 4, 6]; // Factory A, Block C Quarters, Warehouse B, Block A Toilets
  const filtered = inspections.filter(i => DEMO_LOCATION_IDS.includes(i.location_id));

  return filtered.sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime());
})();

// ── Mock Action Items (25 items in various states) ───────────────────────────
export const MOCK_ACTION_ITEMS: FacilityActionItem[] = [
  // Action items from Sept 8 dirty toilet inspection
  { id: 100, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'urgent', category: 'cleanliness', description: 'Deep clean urinals - heavy urine stains and odour', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 101, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'urgent', category: 'cleanliness', description: 'Mop and sanitize floor tiles - muddy footprints throughout', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 102, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'high', category: 'cleanliness', description: 'Clean frosted glass partitions - handprints on all stall doors', photo_ref: 2, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 103, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'high', category: 'cleanliness', description: 'Clear sink overflow and wipe down basins', photo_ref: 2, status: 'in_progress', assigned_to: 'Fatimah Ali', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 104, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'high', category: 'hygiene', description: 'Restock soap dispensers and paper towel dispensers', photo_ref: 2, status: 'open', assigned_to: 'Fatimah Ali', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 105, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'medium', category: 'cleanliness', description: 'Empty and replace trash bin liners - both bins overflowing', photo_ref: 1, status: 'resolved', assigned_to: 'Cleaning Team', resolved_at: new Date(2026, 8, 8, 16, 0, 0).toISOString(), resolved_by: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 106, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'medium', category: 'cleanliness', description: 'Remove litter from floor - wrappers, bottles, tissues', photo_ref: 1, status: 'resolved', assigned_to: 'Cleaning Team', resolved_at: new Date(2026, 8, 8, 15, 45, 0).toISOString(), resolved_by: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 107, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'low', category: 'cleanliness', description: 'Wipe mirror clean - cloudy swirl marks and smudges', photo_ref: 2, status: 'open', assigned_to: null, created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  { id: 108, tenant_id: 1, inspection_id: 9002, location_id: 6, priority: 'medium', category: 'assets', description: 'Clean privacy divider between urinals - smears and streaks', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 8, 14, 30, 0).toISOString() },
  // Action items from Sept 6 messy hostel inspection
  { id: 200, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'urgent', category: 'cleanliness', description: 'Clear floor clutter - shoes, clothing, trash, food debris blocking walkway', photo_ref: 1, status: 'open', assigned_to: 'Siti Nurhaliza', created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 201, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'urgent', category: 'hygiene', description: 'Remove dirty dishes from bed - plates with food residue on bottom right bunk', photo_ref: 1, status: 'open', assigned_to: 'Siti Nurhaliza', created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 202, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'high', category: 'cleanliness', description: 'Deep clean locker doors - handprints, stickers, and marks on surfaces', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 203, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'high', category: 'safety', description: 'Clear fire exit path - floor clutter obstructing evacuation route', photo_ref: 1, status: 'in_progress', assigned_to: 'Siti Nurhaliza', created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 204, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'medium', category: 'cleanliness', description: 'Make all beds - replace rumpled blankets, organize bedding', photo_ref: 1, status: 'open', assigned_to: null, created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 205, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'medium', category: 'assets', description: 'Replace stained pillows - left and right bottom bunk pillows soiled', photo_ref: 1, status: 'open', assigned_to: 'Siti Nurhaliza', created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  { id: 206, tenant_id: 1, inspection_id: 9004, location_id: 2, priority: 'low', category: 'safety', description: 'Secure loose cable on bed - earphones coiled on mattress near bedding', photo_ref: 1, status: 'open', assigned_to: null, created_at: new Date(2026, 8, 6, 16, 0, 0).toISOString() },
  // Action items from Sept 10 cluttered warehouse inspection
  { id: 300, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'urgent', category: 'safety', description: 'Remove mid-aisle work table obstructing forklift path', photo_ref: 1, status: 'open', assigned_to: 'Rajesh Kumar', created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 301, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'urgent', category: 'safety', description: 'Clear fire extinguisher access - obscured by shelving and stacked items', photo_ref: 1, status: 'open', assigned_to: 'Rajesh Kumar', created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 302, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'high', category: 'cleanliness', description: 'Sweep floor debris - tire tracks, paper scraps, strapping bands, wood strips', photo_ref: 1, status: 'in_progress', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 303, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'high', category: 'cleanliness', description: 'Empty overflowing trash tub and establish regular waste collection', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 304, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'medium', category: 'assets', description: 'Close open carton flaps to prevent product exposure', photo_ref: 1, status: 'open', assigned_to: null, created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 305, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'medium', category: 'cleanliness', description: 'Organize end wall shelving unit - remove shoes/parts, tidy stacked boxes', photo_ref: 1, status: 'open', assigned_to: 'Rajesh Kumar', created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  { id: 306, tenant_id: 1, inspection_id: 9006, location_id: 4, priority: 'low', category: 'assets', description: 'Store rods/pipes properly - currently leaning against end shelving', photo_ref: 1, status: 'open', assigned_to: null, created_at: new Date(2026, 8, 10, 14, 30, 0).toISOString() },
  // Action items from Sept 10 cluttered factory inspection
  { id: 400, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'urgent', category: 'safety', description: 'Clear floor debris immediately - screws, nuts, bottles, gloves creating slip/trip hazards', photo_ref: 1, status: 'open', assigned_to: 'Ahmad Razak', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 401, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'urgent', category: 'hygiene', description: 'Enforce food/drink policy - remove cups, bottles, snack wrappers from production floor', photo_ref: 1, status: 'open', assigned_to: 'Ahmad Razak', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 402, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'high', category: 'assets', description: 'Organize tools - return screwdrivers, hex keys, pliers to proper tool racks', photo_ref: 1, status: 'in_progress', assigned_to: 'Maintenance', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 403, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'high', category: 'safety', description: 'Secure overhead cables - yellow spiral air hoses hanging low create snag hazard', photo_ref: 1, status: 'open', assigned_to: 'Maintenance', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 404, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'medium', category: 'cleanliness', description: 'Clean workbenches - remove excess packaging material and stacked product housings', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 405, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'medium', category: 'assets', description: 'Remove platform from aisle - teal-legged platform with tools blocking walkway', photo_ref: 1, status: 'open', assigned_to: 'Ahmad Razak', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
  { id: 406, tenant_id: 1, inspection_id: 9008, location_id: 1, priority: 'low', category: 'cleanliness', description: 'Sweep bare concrete area - gray concrete work zone needs regular cleaning schedule', photo_ref: 1, status: 'open', assigned_to: 'Cleaning Team', created_at: new Date(2026, 8, 10, 15, 30, 0).toISOString() },
];

// ── Mock Templates (10 location types with full checklists) ──────────────────
export const MOCK_TEMPLATES: FacilityTemplate[] = [
  {
    id: 1,
    tenant_id: 1,
    location_type: 'factory_floor',
    display_name: 'Factory / Production Floor Inspection',
    scoring_weights: { safety: 0.35, ppe: 0.30, cleanliness: 0.20, assets: 0.15 },
    checklist: [
      { category: 'safety', item: 'Fire extinguisher visible and accessible', critical: true },
      { category: 'safety', item: 'Emergency exit signs illuminated', critical: true },
      { category: 'safety', item: 'Machine guards in place', critical: true },
      { category: 'safety', item: 'No blocked walkways or aisles', critical: false },
      { category: 'safety', item: 'Electrical panels closed and labeled', critical: false },
      { category: 'ppe', item: 'Hard hats worn by all personnel', applies_when: 'people_visible' },
      { category: 'ppe', item: 'Safety shoes worn', applies_when: 'people_visible' },
      { category: 'ppe', item: 'Eye protection where required', applies_when: 'machinery_visible' },
      { category: 'cleanliness', item: 'Floor free of oil/grease/spills', critical: false },
      { category: 'cleanliness', item: 'Workstations organized (5S)', critical: false },
      { category: 'assets', item: 'Tools stored properly', critical: false },
      { category: 'assets', item: 'Safety signage visible', critical: false },
    ],
    expected_assets: ['fire_extinguisher', 'first_aid_kit', 'emergency_exit_sign', 'machine_guards', 'safety_signage'],
    min_photos: 2,
    photo_guidance: 'Take wide shot of production area + close-ups of specific concerns',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    tenant_id: 1,
    location_type: 'hostel',
    display_name: 'Staff Quarters / Hostel Inspection',
    scoring_weights: { cleanliness: 0.35, assets: 0.30, safety: 0.25, hygiene: 0.10 },
    checklist: [
      { category: 'cleanliness', item: 'Floor clean and swept', critical: false },
      { category: 'cleanliness', item: 'Bedding整洁 and odor-free', critical: false },
      { category: 'cleanliness', item: 'No trash accumulation', critical: false },
      { category: 'assets', item: 'Beds/wardrobes in good condition', critical: false },
      { category: 'assets', item: 'Fan/light functional', critical: false },
      { category: 'safety', item: 'Window locks functional', critical: true },
      { category: 'safety', item: 'No exposed wiring', critical: true },
      { category: 'hygiene', item: 'Bathroom mold-free', critical: false },
    ],
    expected_assets: ['bed', 'wardrobe', 'fan', 'curtains', 'window_locks'],
    min_photos: 3,
    photo_guidance: 'Photograph bedroom, bathroom, and kitchen areas',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    tenant_id: 1,
    location_type: 'canteen',
    display_name: 'Canteen / Kitchen Hygiene Inspection',
    scoring_weights: { hygiene: 0.40, safety: 0.25, cleanliness: 0.25, assets: 0.10 },
    checklist: [
      { category: 'hygiene', item: 'Food storage containers sealed', critical: true },
      { category: 'hygiene', item: 'Handwash station stocked', critical: true },
      { category: 'hygiene', item: 'Staff wearing hairnets/gloves', critical: true },
      { category: 'cleanliness', item: 'Counters grease-free', critical: false },
      { category: 'cleanliness', item: 'Floors dry and clean', critical: false },
      { category: 'safety', item: 'Fire extinguisher near stove', critical: true },
      { category: 'safety', item: 'Gas valves closed when not in use', critical: true },
      { category: 'assets', item: 'Exhaust fan functional', critical: false },
    ],
    expected_assets: ['fire_extinguisher', 'exhaust_fan', 'refrigerator', 'handwash_station', 'first_aid_kit'],
    min_photos: 4,
    photo_guidance: 'Capture cooking area, storage, dining area, and handwash station',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    tenant_id: 1,
    location_type: 'toilet',
    display_name: 'Toilet / Washroom Inspection',
    scoring_weights: { hygiene: 0.45, cleanliness: 0.30, assets: 0.15, safety: 0.10 },
    checklist: [
      { category: 'hygiene', item: 'Soap/sanitizer available', critical: true },
      { category: 'hygiene', item: 'Tissue dispensers filled', critical: false },
      { category: 'cleanliness', item: 'Toilet bowls clean and flushed', critical: true },
      { category: 'cleanliness', item: 'Floor tiles dry and non-slip', critical: true },
      { category: 'cleanliness', item: 'No mold/mildew on walls', critical: false },
      { category: 'assets', item: 'Taps functional (no leaks)', critical: false },
      { category: 'assets', item: 'Mirrors clean and intact', critical: false },
      { category: 'safety', item: 'Ventilation fan working', critical: false },
    ],
    expected_assets: ['soap_dispenser', 'tissue_dispenser', 'hand_dryer', 'mirror', 'ventilation_fan'],
    min_photos: 3,
    photo_guidance: 'Photograph entrance, stalls, sinks, and floor conditions',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    tenant_id: 1,
    location_type: 'warehouse',
    display_name: 'Warehouse / Storage Inspection',
    scoring_weights: { safety: 0.40, assets: 0.25, cleanliness: 0.20, ppe: 0.15 },
    checklist: [
      { category: 'safety', item: 'Fire sprinklers unobstructed', critical: true },
      { category: 'safety', item: 'Exit routes clear', critical: true },
      { category: 'safety', item: 'Load limits marked on racks', critical: false },
      { category: 'assets', item: 'Racking undamaged', critical: false },
      { category: 'assets', item: 'Labels/signage visible', critical: false },
      { category: 'cleanliness', item: 'Aisles free of debris', critical: false },
      { category: 'cleanliness', item: 'No pest activity signs', critical: true },
      { category: 'ppe', item: 'High-vis vests worn by forklift operators', applies_when: 'forklift_visible' },
    ],
    expected_assets: ['fire_sprinklers', 'racking', 'labels', 'forklift', 'first_aid_kit'],
    min_photos: 3,
    photo_guidance: 'Wide shot of warehouse + racking close-ups + any damage evidence',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    tenant_id: 1,
    location_type: 'workshop',
    display_name: 'Workshop / Maintenance Bay Inspection',
    scoring_weights: { safety: 0.35, ppe: 0.30, assets: 0.20, cleanliness: 0.15 },
    checklist: [
      { category: 'safety', item: 'Machine guards installed', critical: true },
      { category: 'safety', item: 'Lockout/tagout procedures posted', critical: true },
      { category: 'safety', item: 'Fire extinguisher accessible', critical: true },
      { category: 'ppe', item: 'Gloves/goggles available at stations', critical: true },
      { category: 'ppe', item: 'Aprons worn for chemical handling', applies_when: 'chemicals_visible' },
      { category: 'assets', item: 'Tools organized and labeled', critical: false },
      { category: 'assets', item: 'Ventilation system functional', critical: false },
      { category: 'cleanliness', item: 'Oil/grease spills cleaned', critical: false },
    ],
    expected_assets: ['machine_guards', 'ppe_station', 'tool_cabinet', 'ventilation', 'fire_extinguisher'],
    min_photos: 3,
    photo_guidance: 'Capture workbenches, tool storage, safety equipment, and floor conditions',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    tenant_id: 1,
    location_type: 'parking',
    display_name: 'Parking Area Inspection',
    scoring_weights: { safety: 0.40, assets: 0.30, cleanliness: 0.20, accessibility: 0.10 },
    checklist: [
      { category: 'safety', item: 'Speed bumps intact and visible', critical: false },
      { category: 'safety', item: 'Pedestrian crossings marked', critical: false },
      { category: 'safety', item: 'Emergency lanes unblocked', critical: true },
      { category: 'assets', item: 'Lighting functional (all bulbs)', critical: false },
      { category: 'assets', item: 'CCTV cameras operational', critical: false },
      { category: 'cleanliness', item: 'No litter/debris', critical: false },
      { category: 'cleanliness', item: 'Drainage clear (no standing water)', critical: false },
    ],
    expected_assets: ['lighting', 'cctv_cameras', 'speed_bumps', 'signage', 'bollards'],
    min_photos: 4,
    photo_guidance: 'Capture entrance, rows, lighting poles, drainage points, and any damage',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    tenant_id: 1,
    location_type: 'construction',
    display_name: 'Construction Site Safety Inspection',
    scoring_weights: { safety: 0.45, ppe: 0.35, assets: 0.15, cleanliness: 0.05 },
    checklist: [
      { category: 'safety', item: 'Fall protection systems in place', critical: true },
      { category: 'safety', item: 'Trenches properly shored', critical: true },
      { category: 'safety', item: 'First aid kit on-site', critical: true },
      { category: 'ppe', item: 'All workers wearing hard hats', critical: true },
      { category: 'ppe', item: 'Safety harnesses for heights', critical: true },
      { category: 'ppe', item: 'Steel-toe boots worn', applies_when: 'people_visible' },
      { category: 'assets', item: 'Scaffolding secure and tagged', critical: true },
      { category: 'assets', item: 'Barricades around hazards', critical: false },
    ],
    expected_assets: ['scaffolding', 'barricades', 'first_aid_kit', 'safety_signage', 'fall_protection'],
    min_photos: 5,
    photo_guidance: 'Document entire site perimeter, work zones, safety equipment, and worker PPE compliance',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    tenant_id: 1,
    location_type: 'office',
    display_name: 'Office Space Inspection',
    scoring_weights: { cleanliness: 0.35, assets: 0.30, safety: 0.25, ergonomics: 0.10 },
    checklist: [
      { category: 'cleanliness', item: 'Desks tidy and clutter-free', critical: false },
      { category: 'cleanliness', item: 'Floors vacuumed/mopped', critical: false },
      { category: 'cleanliness', item: 'Bins emptied regularly', critical: false },
      { category: 'assets', item: 'AC/ventilation functional', critical: false },
      { category: 'assets', item: 'Printers/copiers operational', critical: false },
      { category: 'safety', item: 'Emergency exit map posted', critical: true },
      { category: 'safety', item: 'Fire extinguisher accessible', critical: true },
      { category: 'safety', item: 'Cable management under desks', critical: false },
    ],
    expected_assets: ['desks', 'chairs', 'ac_system', 'printer', 'fire_extinguisher', 'exit_map'],
    min_photos: 3,
    photo_guidance: 'Photograph workstation areas, common spaces, and safety equipment locations',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 10,
    tenant_id: 1,
    location_type: 'clinic',
    display_name: 'Clinic / Medical Facility Inspection',
    scoring_weights: { hygiene: 0.45, safety: 0.30, assets: 0.15, cleanliness: 0.10 },
    checklist: [
      { category: 'hygiene', item: 'Sterilization protocols followed', critical: true },
      { category: 'hygiene', item: 'Biohazard bins properly labeled', critical: true },
      { category: 'hygiene', item: 'Hand sanitizer at all stations', critical: true },
      { category: 'safety', item: 'Emergency equipment accessible', critical: true },
      { category: 'safety', item: 'Infection control posters displayed', critical: false },
      { category: 'assets', item: 'Medical equipment calibrated', critical: true },
      { category: 'assets', item: 'Supplies adequately stocked', critical: false },
      { category: 'cleanliness', item: 'Surfaces disinfected between patients', critical: true },
    ],
    expected_assets: ['sterilizer', 'biohazard_bins', 'emergency_equipment', 'medical_supplies', 'sanitizer_stations'],
    min_photos: 4,
    photo_guidance: 'Document treatment rooms, sterilization area, supply storage, and waste disposal',
    is_system_default: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ── Computed Stats (derived from mock data above) ────────────────────────────
export function computeMockStats(): FacilityStats {
  const activeLocations = MOCK_LOCATIONS.filter((l) => l.status === 'active');
  const overdueLocations = activeLocations.filter((loc) => {
    if (!loc.last_inspection_date) return true;
    const freqDays: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
    const daysSince = (Date.now() - new Date(loc.last_inspection_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > (freqDays[loc.inspection_frequency] || 30);
  });

  const avgScore = MOCK_INSPECTIONS.reduce((sum, i) => sum + (i.overall_score || 0), 0) / MOCK_INSPECTIONS.length || 0;
  const openActions = MOCK_ACTION_ITEMS.filter((a) => a.status === 'open' || a.status === 'in_progress').length;
  const criticalAlerts = MOCK_ACTION_ITEMS.filter((a) => a.priority === 'urgent' && (a.status === 'open' || a.status === 'in_progress')).length;

  // Compliance trend (last 6 months aggregated by month)
  const complianceTrend: Array<{ month: string; score: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = m.toLocaleString('default', { month: 'short' });
    const monthInsp = MOCK_INSPECTIONS.filter((insp) => {
      const d = new Date(insp.inspection_date);
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    });
    const monthAvg = monthInsp.length > 0
      ? monthInsp.reduce((sum, insp) => sum + (insp.overall_score || 0), 0) / monthInsp.length
      : 0;
    complianceTrend.push({ month: monthStr, score: Math.round(monthAvg) });
  }

  // Score by type
  const typeScores: Record<string, { sum: number; count: number }> = {};
  MOCK_INSPECTIONS.forEach((insp) => {
    if (!typeScores[insp.location_type_snapshot!]) typeScores[insp.location_type_snapshot!] = { sum: 0, count: 0 };
    typeScores[insp.location_type_snapshot!].sum += insp.overall_score || 0;
    typeScores[insp.location_type_snapshot!].count++;
  });
  const scoreByType = Object.entries(typeScores).map(([type, data]) => ({
    type,
    score: Math.round(data.sum / data.count),
    count: data.count,
  }));

  // Top violations
  const violationCounts: Record<string, number> = {};
  MOCK_INSPECTIONS.forEach((insp) => {
    insp.checklist_results?.forEach((item) => {
      if (!item.pass) {
        violationCounts[item.item] = (violationCounts[item.item] || 0) + 1;
      }
    });
  });
  const topViolations = Object.entries(violationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([item, count]) => ({ item, count: count as number, locations: [] }));

  // Recent inspections (last 6)
  const recentInspections = MOCK_INSPECTIONS.slice(0, 6).map((insp) => ({
    ...insp,
    location_name: MOCK_LOCATIONS.find((l) => l.id === insp.location_id)?.name || `Location #${insp.location_id}`,
  }));

  return {
    total_locations: activeLocations.length,
    avg_score: Math.round(avgScore),
    open_actions: openActions,
    overdue_inspections: overdueLocations.length,
    critical_alerts: criticalAlerts,
    compliance_trend: complianceTrend,
    score_by_type: scoreByType,
    top_violations: topViolations,
    recent_inspections: recentInspections as any,
    locations: activeLocations,
    templates: MOCK_TEMPLATES,
  };
}
