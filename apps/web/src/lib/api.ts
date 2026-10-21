// Standalone In-Memory API Client for the GeoLead Web Application
// Runs 100% in-browser with zero external backend or database API requirements.

import type { Lead, DashboardStats, ContactLog, PaginationMeta, LeadFilter } from "@geolead/types";

export const API_URL = "";

// Initial in-memory mock dataset of enriched local business leads
const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-1",
    business_name: "Apex Dental & Orthodontics",
    category: "Dentist",
    google_rating: 4.9,
    review_count: 342,
    address: "742 Evergreen Terrace, Suite 101, Austin, TX",
    phone_number: "+1 (512) 555-0192",
    website_url: "https://apexdental-austin.com",
    plus_code: "8624+8F Austin, Texas",
    price_level: "$$",
    opening_hours: "Mon-Fri: 8:00 AM – 6:00 PM",
    service_options: ["Online appointments", "On-site services"],
    description: "Full service family dentistry and modern clear aligners.",
    google_place_id: "ChIJ_apex_dental_01",
    location_lat: 30.2672,
    location_long: -97.7431,
    location_coordinates: { type: "Point", coordinates: [-97.7431, 30.2672] },
    has_phone: true,
    has_website: true,
    lead_score: "hot",
    lead_score_numeric: 96,
    score_breakdown: { phone: 25, website: 25, reviews: 26, rating: 20 },
    email: "contact@apexdental-austin.com",
    social_links: {
      instagram: "https://instagram.com/apexdental",
      facebook: "https://facebook.com/apexdental",
      linkedin: "https://linkedin.com/company/apexdental"
    },
    enriched_at: "2026-10-18T10:30:00.000Z",
    website_audit: {
      audited_at: "2026-10-18T10:30:00.000Z",
      tech_stack: ["WordPress", "Google Analytics", "Yoast SEO"],
      has_ssl: true,
      domain_creation_date: "2018-04-12",
      title: "Apex Dental Austin | Modern Smiles",
      meta_description: "Top rated family dentist in Austin TX.",
      headings: ["Welcome to Apex Dental", "Our Services"],
      ai_flaws: ["Missing modern online booking widget", "Slow mobile page speed"],
      ai_pitch: "Offer automated patient booking reminder workflows and local SEO boost."
    },
    search_query: "Dentists in Austin TX",
    lead_status: "new",
    ai_analysis: {
      pitch: "Highlight automated patient SMS review collection and local map pack dominance.",
      quality_score: 96,
      pain_points: ["Manual patient phone scheduling", "Competitors ranking higher on Google Maps"],
      lead_score: "hot"
    },
    notes: "High-ticket practice. Owner Dr. Mitchell receptive to growth solutions.",
    tags: ["High-value", "Medical", "Austin"],
    is_shortlisted: true,
    last_contacted_at: null,
    contact_count: 0,
    created_at: "2026-10-18T10:00:00.000Z",
    updated_at: "2026-10-18T10:30:00.000Z"
  },
  {
    id: "lead-2",
    business_name: "Urban Canine Pet Spa & Hotel",
    category: "Pet Groomer",
    google_rating: 4.8,
    review_count: 215,
    address: "1204 South Congress Ave, Austin, TX",
    phone_number: "+1 (512) 555-8831",
    website_url: "https://urbancanineatx.com",
    plus_code: "8613+2X Austin, Texas",
    price_level: "$$",
    opening_hours: "Tue-Sat: 7:30 AM – 7:00 PM",
    service_options: ["Walk-ins", "Appointment required"],
    description: "Luxury dog grooming, day care, and boutique boarding.",
    google_place_id: "ChIJ_urban_canine_02",
    location_lat: 30.2503,
    location_long: -97.7495,
    location_coordinates: { type: "Point", coordinates: [-97.7495, 30.2503] },
    has_phone: true,
    has_website: true,
    lead_score: "hot",
    lead_score_numeric: 92,
    score_breakdown: { phone: 25, website: 25, reviews: 22, rating: 20 },
    email: "hello@urbancanineatx.com",
    social_links: {
      instagram: "https://instagram.com/urbancanineatx",
      facebook: "https://facebook.com/urbancanineatx"
    },
    enriched_at: "2026-10-19T14:15:00.000Z",
    website_audit: {
      audited_at: "2026-10-19T14:15:00.000Z",
      tech_stack: ["Squarespace", "Stripe"],
      has_ssl: true,
      domain_creation_date: "2020-01-15",
      title: "Urban Canine ATX Dog Grooming",
      meta_description: "Premier pet grooming and spa in South Congress.",
      headings: ["Pamper Your Pup", "Boarding Services"],
      ai_flaws: ["No automatic recurring grooming subscriptions"],
      ai_pitch: "Introduce monthly VIP dog grooming recurring membership plans."
    },
    search_query: "Pet Grooming in Austin TX",
    lead_status: "contacted",
    ai_analysis: {
      pitch: "Pitch membership retention software for grooming salons.",
      quality_score: 92,
      pain_points: ["Weekend booking overflow", "No online recurring payment system"],
      lead_score: "hot"
    },
    notes: "Spoke with manager Sarah. Sent deck on recurring subscription setup.",
    tags: ["Pets", "Retail", "Subscription Opportunity"],
    is_shortlisted: true,
    last_contacted_at: "2026-10-20T11:00:00.000Z",
    contact_count: 1,
    created_at: "2026-10-19T14:00:00.000Z",
    updated_at: "2026-10-20T11:00:00.000Z"
  },
  {
    id: "lead-3",
    business_name: "Summit Ridge Roofing & Solar",
    category: "Roofing Contractor",
    google_rating: 4.7,
    review_count: 178,
    address: "4509 Freidrich Ln, Austin, TX",
    phone_number: "+1 (512) 555-4421",
    website_url: "https://summitridgeroofing.com",
    plus_code: "8633+9P Austin, Texas",
    price_level: "$$$",
    opening_hours: "Mon-Sat: 7:00 AM – 7:00 PM",
    service_options: ["Free estimates", "Insurance claims assistance"],
    description: "Residential and commercial storm restoration and roofing specialists.",
    google_place_id: "ChIJ_summit_ridge_03",
    location_lat: 30.2215,
    location_long: -97.7490,
    location_coordinates: { type: "Point", coordinates: [-97.7490, 30.2215] },
    has_phone: true,
    has_website: true,
    lead_score: "hot",
    lead_score_numeric: 94,
    score_breakdown: { phone: 25, website: 25, reviews: 24, rating: 20 },
    email: "estimates@summitridgeroofing.com",
    social_links: {
      facebook: "https://facebook.com/summitridgeroofing"
    },
    enriched_at: "2026-10-19T16:00:00.000Z",
    website_audit: {
      audited_at: "2026-10-19T16:00:00.000Z",
      tech_stack: ["Webflow", "HubSpot", "Google Tag Manager"],
      has_ssl: true,
      domain_creation_date: "2019-08-20",
      title: "Summit Ridge Roofing Austin TX",
      meta_description: "Storm restoration and residential roof replacements in Austin.",
      headings: ["Quality Roofing Built To Last"],
      ai_flaws: ["Lead form lacks instant SMS dispatch"],
      ai_pitch: "Speed-to-lead automation: connect storm insurance inquiries with reps in under 60 seconds."
    },
    search_query: "Roofing Contractors Austin",
    lead_status: "in-progress",
    ai_analysis: {
      pitch: "High margin business. Offer immediate lead response speed-to-lead system.",
      quality_score: 94,
      pain_points: ["Losing storm leads to competitors who call faster"],
      lead_score: "hot"
    },
    notes: "Meeting booked for Thursday with owner Tom.",
    tags: ["Home Services", "High-Ticket", "Solar"],
    is_shortlisted: false,
    last_contacted_at: "2026-10-20T16:30:00.000Z",
    contact_count: 2,
    created_at: "2026-10-19T15:45:00.000Z",
    updated_at: "2026-10-20T16:30:00.000Z"
  },
  {
    id: "lead-4",
    business_name: "Iron & Oak Fitness Club",
    category: "Gym",
    google_rating: 4.9,
    review_count: 489,
    address: "3100 E 4th St, Austin, TX",
    phone_number: "+1 (512) 555-7712",
    website_url: "https://ironandoakatx.com",
    plus_code: "8627+4J Austin, Texas",
    price_level: "$$",
    opening_hours: "Open 24 hours",
    service_options: ["Personal training", "Showers", "Sauna"],
    description: "24/7 community strength and conditioning facility in East Austin.",
    google_place_id: "ChIJ_iron_oak_04",
    location_lat: 30.2589,
    location_long: -97.7082,
    location_coordinates: { type: "Point", coordinates: [-97.7082, 30.2589] },
    has_phone: true,
    has_website: true,
    lead_score: "warm",
    lead_score_numeric: 88,
    score_breakdown: { phone: 25, website: 25, reviews: 20, rating: 18 },
    email: "info@ironandoakatx.com",
    social_links: {
      instagram: "https://instagram.com/ironandoakatx"
    },
    enriched_at: "2026-10-20T09:00:00.000Z",
    website_audit: null,
    search_query: "Gyms in Austin TX",
    lead_status: "new",
    ai_analysis: null,
    notes: "Active social presence. May need lead reactivation campaign for cancelled members.",
    tags: ["Fitness", "East Austin"],
    is_shortlisted: false,
    last_contacted_at: null,
    contact_count: 0,
    created_at: "2026-10-20T08:30:00.000Z",
    updated_at: "2026-10-20T09:00:00.000Z"
  },
  {
    id: "lead-5",
    business_name: "Blue Horizon Plumbing Co",
    category: "Plumber",
    google_rating: 4.6,
    review_count: 94,
    address: "8801 Research Blvd, Austin, TX",
    phone_number: "+1 (512) 555-3211",
    website_url: null,
    plus_code: "8696+7M Austin, Texas",
    price_level: "$$",
    opening_hours: "24/7 Emergency Service",
    service_options: ["Emergency repairs", "Drain cleaning"],
    description: "Licensed master plumbers serving Greater Austin.",
    google_place_id: "ChIJ_blue_horizon_05",
    location_lat: 30.3644,
    location_long: -97.7142,
    location_coordinates: { type: "Point", coordinates: [-97.7142, 30.3644] },
    has_phone: true,
    has_website: false,
    lead_score: "hot",
    lead_score_numeric: 91,
    score_breakdown: { phone: 30, website: 0, reviews: 35, rating: 26 },
    email: null,
    social_links: null,
    enriched_at: null,
    website_audit: null,
    search_query: "Plumbers in Austin TX",
    lead_status: "new",
    ai_analysis: {
      pitch: "High-intent service missing website. Pitch a turnkey conversion-focused website and local SEO.",
      quality_score: 91,
      pain_points: ["No website for customer credibility", "Losing leads to competitors with online booking"],
      lead_score: "hot"
    },
    notes: "Prime candidate for website creation and Google Business Profile optimization.",
    tags: ["Missing Website", "High Potential", "Plumbing"],
    is_shortlisted: true,
    last_contacted_at: null,
    contact_count: 0,
    created_at: "2026-10-20T12:00:00.000Z",
    updated_at: "2026-10-20T12:00:00.000Z"
  },
  {
    id: "lead-6",
    business_name: "La Bella Trattoria & Pizzeria",
    category: "Italian Restaurant",
    google_rating: 4.5,
    review_count: 512,
    address: "500 W 6th St, Austin, TX",
    phone_number: "+1 (512) 555-9080",
    website_url: "https://labellaatx.com",
    plus_code: "8624+4C Austin, Texas",
    price_level: "$$",
    opening_hours: "Daily: 11:30 AM – 10:00 PM",
    service_options: ["Dine-in", "Takeout", "Delivery"],
    description: "Authentic wood-fired Neapolitan pizza and handmade pasta.",
    google_place_id: "ChIJ_la_bella_06",
    location_lat: 30.2691,
    location_long: -97.7478,
    location_coordinates: { type: "Point", coordinates: [-97.7478, 30.2691] },
    has_phone: true,
    has_website: true,
    lead_score: "warm",
    lead_score_numeric: 84,
    score_breakdown: { phone: 25, website: 25, reviews: 20, rating: 14 },
    email: "info@labellaatx.com",
    social_links: {
      instagram: "https://instagram.com/labellaatx",
      facebook: "https://facebook.com/labellaatx"
    },
    enriched_at: "2026-10-20T15:00:00.000Z",
    website_audit: null,
    search_query: "Restaurants in Downtown Austin",
    lead_status: "new",
    ai_analysis: null,
    notes: "High volume downtown spot.",
    tags: ["Restaurant", "Downtown"],
    is_shortlisted: false,
    last_contacted_at: null,
    contact_count: 0,
    created_at: "2026-10-20T14:30:00.000Z",
    updated_at: "2026-10-20T15:00:00.000Z"
  }
];

// In-memory leads store
let leadsStore: Lead[] = [...INITIAL_LEADS];
let contactLogsStore: ContactLog[] = [
  {
    id: "log-1",
    lead_id: "lead-2",
    notes: "Initial outreach email sent regarding pet booking workflows.",
    contacted_at: "2026-10-20T11:00:00.000Z"
  },
  {
    id: "log-2",
    lead_id: "lead-3",
    notes: "Connected with owner on phone. Scheduled follow-up demonstration.",
    contacted_at: "2026-10-20T16:30:00.000Z"
  }
];

export const api = {
  // Stats
  getStats: async () => {
    const totalLeads = leadsStore.length;
    const hotLeads = leadsStore.filter(l => l.lead_score === "hot").length;
    const warmLeads = leadsStore.filter(l => l.lead_score === "warm").length;
    const coldLeads = leadsStore.filter(l => l.lead_score === "cold").length;
    const withPhone = leadsStore.filter(l => Boolean(l.phone_number)).length;
    const withWebsite = leadsStore.filter(l => Boolean(l.website_url)).length;
    const contactedCount = leadsStore.filter(l => l.lead_status === "contacted" || l.lead_status === "in-progress").length;
    const contactRate = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0;

    const data: DashboardStats = {
      totalLeads: 1248 + totalLeads,
      hotLeads: 412 + hotLeads,
      warmLeads: 536 + warmLeads,
      coldLeads: 300 + coldLeads,
      newThisWeek: 148,
      contactedCount: 320 + contactedCount,
      contactRate: 26,
      withPhone: 1080 + withPhone,
      withWebsite: 890 + withWebsite,
      recentLeads: leadsStore.slice(0, 5)
    };

    return { success: true, data };
  },

  // Leads
  getLeads: async (params?: Record<string, string>) => {
    let filtered = [...leadsStore];

    if (params) {
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(l => 
          l.business_name.toLowerCase().includes(q) ||
          (l.category && l.category.toLowerCase().includes(q)) ||
          (l.address && l.address.toLowerCase().includes(q))
        );
      }
      if (params.category && params.category !== "all") {
        filtered = filtered.filter(l => l.category?.toLowerCase() === params.category.toLowerCase());
      }
      if (params.status && params.status !== "all") {
        filtered = filtered.filter(l => l.lead_status === params.status);
      }
      if (params.score && params.score !== "all") {
        filtered = filtered.filter(l => l.lead_score === params.score);
      }
      if (params.hasPhone === "true") {
        filtered = filtered.filter(l => Boolean(l.phone_number));
      }
      if (params.hasWebsite === "true") {
        filtered = filtered.filter(l => Boolean(l.website_url));
      }
      if (params.isShortlisted === "true") {
        filtered = filtered.filter(l => l.is_shortlisted);
      }
    }

    const page = params?.page ? parseInt(params.page, 10) : 1;
    const pageSize = params?.pageSize ? parseInt(params.pageSize, 10) : 25;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const pagination: PaginationMeta = {
      total,
      page,
      pageSize,
      totalPages
    };

    return {
      success: true,
      data: paginated,
      pagination
    };
  },

  createLeads: async (newLeads: any[]) => {
    const formatted: Lead[] = newLeads.map((item, index) => ({
      id: `lead-${Date.now()}-${index}`,
      business_name: item.business_name || item.name || "Unnamed Prospect",
      category: item.category || "Local Business",
      google_rating: item.google_rating ?? item.rating ?? 4.5,
      review_count: item.review_count ?? item.reviews ?? 50,
      address: item.address || "Austin, TX",
      phone_number: item.phone_number || item.phone || null,
      website_url: item.website_url || item.website || null,
      plus_code: null,
      price_level: "$$",
      opening_hours: "Mon-Fri: 9:00 AM – 5:00 PM",
      service_options: [],
      description: null,
      google_place_id: `mock_place_${Date.now()}_${index}`,
      location_lat: 30.2672 + (Math.random() - 0.5) * 0.1,
      location_long: -97.7431 + (Math.random() - 0.5) * 0.1,
      location_coordinates: null,
      has_phone: Boolean(item.phone_number || item.phone),
      has_website: Boolean(item.website_url || item.website),
      lead_score: "warm",
      lead_score_numeric: 85,
      score_breakdown: null,
      email: item.email || null,
      social_links: null,
      enriched_at: null,
      website_audit: null,
      search_query: "Local Business Search",
      lead_status: "new",
      ai_analysis: null,
      notes: null,
      tags: ["Imported"],
      is_shortlisted: false,
      last_contacted_at: null,
      contact_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    leadsStore = [...formatted, ...leadsStore];
    return { success: true, inserted: formatted.length, updated: 0 };
  },

  // Lead detail
  getLead: async (id: string) => {
    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    return { success: true, data: lead };
  },

  updateLead: async (id: string, data: Record<string, unknown>) => {
    leadsStore = leadsStore.map(l => (l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l));
    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    return { success: true, data: lead };
  },

  // Contact
  logContact: async (id: string, notes: string) => {
    const newLog: ContactLog = {
      id: `log-${Date.now()}`,
      lead_id: id,
      notes,
      contacted_at: new Date().toISOString()
    };
    contactLogsStore.unshift(newLog);

    leadsStore = leadsStore.map(l => {
      if (l.id === id) {
        return {
          ...l,
          lead_status: "contacted",
          contact_count: l.contact_count + 1,
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return l;
    });

    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    const contactHistory = contactLogsStore.filter(c => c.lead_id === id);

    return { success: true, data: { lead, contactHistory } };
  },

  getContactHistory: async (id: string) => {
    const contactHistory = contactLogsStore.filter(c => c.lead_id === id);
    return { success: true, data: contactHistory };
  },

  // Analyze
  analyzeLead: async (id: string) => {
    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    const updatedLead: Lead = {
      ...lead,
      ai_analysis: {
        pitch: `Target outreach tailored for ${lead.business_name}: emphasize local competitor gap analysis and review automation.`,
        quality_score: 95,
        pain_points: [
          "Missed caller recovery needed",
          "Website conversion optimization opportunity",
          "High average review rating ready to be leveraged for Google Ads"
        ],
        lead_score: "hot"
      },
      lead_score: "hot",
      lead_score_numeric: 95,
      updated_at: new Date().toISOString()
    };
    leadsStore = leadsStore.map(l => (l.id === id ? updatedLead : l));
    return { success: true, data: updatedLead };
  },

  // Nearby
  getNearby: async (lat: number, lng: number, radius: number) => {
    return { success: true, data: leadsStore.slice(0, 4) };
  },

  // Export
  getExportUrl: (_params?: Record<string, string>) => {
    return "#";
  },

  // Scrape Sessions (map coverage)
  getScrapeSessions: async () => {
    return {
      success: true,
      data: [
        {
          id: "session-1",
          search_query: "Dentists Austin TX",
          center_lat: 30.2672,
          center_lng: -97.7431,
          zoom: 13,
          total_found: 84,
          total_saved: 78,
          duplicates_skipped: 6,
          scraped_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: "session-2",
          search_query: "Pet Groomers Austin TX",
          center_lat: 30.2503,
          center_lng: -97.7495,
          zoom: 14,
          total_found: 62,
          total_saved: 58,
          duplicates_skipped: 4,
          scraped_at: new Date(Date.now() - 3600000 * 5).toISOString()
        }
      ]
    };
  },

  // Analytics
  getAnalytics: async () => {
    return {
      success: true,
      data: {
        byCategory: [
          { category: "Dentist", count: 34 },
          { category: "Pet Groomer", count: 28 },
          { category: "Roofing Contractor", count: 22 },
          { category: "Gym", count: 18 },
          { category: "Plumber", count: 15 }
        ],
        byStatus: [
          { status: "new", count: 85 },
          { status: "contacted", count: 24 },
          { status: "in-progress", count: 12 },
          { status: "closed", count: 6 }
        ],
        byScore: [
          { score: "Hot (90-100)", count: 48 },
          { score: "Warm (70-89)", count: 56 },
          { score: "Cold (<70)", count: 23 }
        ],
        timeline: [
          { date: "Day 1", count: 18 },
          { date: "Day 2", count: 32 },
          { date: "Day 3", count: 45 },
          { date: "Day 4", count: 28 },
          { date: "Day 5", count: 54 }
        ]
      }
    };
  },

  // Map data (lightweight)
  getMapLeads: async (params?: Record<string, string>) => {
    const data = leadsStore.map(l => ({
      id: l.id,
      business_name: l.business_name,
      category: l.category,
      lat: l.location_lat,
      lng: l.location_long,
      rating: l.google_rating,
      reviews: l.review_count,
      score: l.lead_score,
      phone: l.phone_number
    }));
    return { success: true, data, total: data.length };
  },

  // Bulk operations
  bulkStatus: async (ids: string[], status: string) => {
    leadsStore = leadsStore.map(l => (ids.includes(l.id) ? { ...l, lead_status: status } : l));
    return { success: true, modified: ids.length };
  },

  bulkTag: async (ids: string[], tag: string) => {
    leadsStore = leadsStore.map(l => (ids.includes(l.id) ? { ...l, tags: Array.from(new Set([...l.tags, tag])) } : l));
    return { success: true, modified: ids.length };
  },

  bulkShortlist: async (ids: string[], note?: string) => {
    leadsStore = leadsStore.map(l => (ids.includes(l.id) ? { ...l, is_shortlisted: true } : l));
    return { success: true, updated: ids.length };
  },

  bulkDelete: async (ids: string[]) => {
    leadsStore = leadsStore.filter(l => !ids.includes(l.id));
    return { success: true, deleted: ids.length };
  },

  rescoreAll: async () => {
    return { success: true, updated: leadsStore.length };
  },

  getDuplicates: async <T = any>() => {
    const mockDuplicates = [
      {
        key: "+1 (512) 555-0192",
        type: "phone",
        phone: "+1 (512) 555-0192",
        reason: "Identical phone number match",
        confidence: 0.98,
        count: 2,
        leads: [leadsStore[0], { ...leadsStore[0], id: "lead-dup-1", business_name: "Apex Dental South" }]
      }
    ];
    return {
      success: true,
      data: mockDuplicates as unknown as T[],
      totalGroups: 1,
      totalDuplicateLeads: 2
    };
  },

  removeDuplicates: async (_params?: any) => {
    return { success: true, deletedCount: 1 };
  },

  // Enrichment
  enrichLead: async (id: string) => {
    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    return { success: true, data: lead };
  },

  enrichBatchLeads: async () => {
    return { success: true, message: "Enrichment completed for batch." };
  },

  // Web Audit
  auditLeadWebsite: async (id: string, _includeAi: boolean = false) => {
    const lead = leadsStore.find(l => l.id === id) || leadsStore[0];
    return { success: true, data: lead };
  },

  // Advanced Search & Request Data
  startAdvancedSearch: async (params: {
    query: string;
    location: string;
    radiusKm?: number;
    maxResults?: number;
  }) => {
    return {
      success: true,
      jobId: `job-${Date.now()}`,
      message: `Simulated search queued for '${params.query}' in '${params.location}'.`
    };
  }
};
