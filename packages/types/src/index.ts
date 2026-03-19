// Shared type definitions for the GeoLead application

export interface Lead {
    id: string;
    _id?: string;
    business_name: string;
    category: string | null;
    google_rating: number | null;
    review_count: number | null;
    address: string | null;
    phone_number: string | null;
    website_url: string | null;
    plus_code: string | null;
    price_level: string | null;
    opening_hours: string | null;
    service_options: string[];
    description: string | null;
    google_place_id: string;
    location_lat: number;
    location_long: number;
    location_coordinates: {
        type: "Point";
        coordinates: [number, number]; // [longitude, latitude]
    } | null;
    // Computed flags
    has_phone: boolean;
    has_website: boolean;
    // Scoring
    lead_score: string | null;          // "hot" | "warm" | "cold"
    lead_score_numeric: number | null;  // 0-100
    score_breakdown: Record<string, number> | null;
    // Enrichment
    email: string | null;
    social_links: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        twitter?: string;
    } | null;
    enriched_at: string | null;
    // Web Audit
    website_audit: {
        audited_at: string;
        tech_stack: string[];
        has_ssl: boolean;
        domain_creation_date: string | null;
        title: string | null;
        meta_description: string | null;
        headings: string[];
        ai_flaws: string[];
        ai_pitch: string | null;
    } | null;
    // CRM fields
    search_query: string | null;
    lead_status: string;
    ai_analysis: AiAnalysis | null;
    notes: string | null;
    tags: string[];
    is_shortlisted?: boolean;
    last_contacted_at: string | null;
    contact_count: number;
    created_at: string;
    updated_at: string;
}

export interface AiAnalysis {
    pitch: string;
    quality_score: number;
    pain_points: string[];
    lead_score: string;
}

export interface ContactLog {
    id: string;
    lead_id: string;
    notes: string;
    contacted_at: string;
}

export interface LeadFilter {
    search?: string;
    category?: string;
    status?: string;
    score?: string;
    minRating?: number;
    maxRating?: number;
    minReviews?: number;
    hasPhone?: boolean;
    hasWebsite?: boolean;
    hasEmail?: boolean;
    missingWebsite?: boolean;
    missingSocials?: boolean;
    country?: string;
    state?: string;
    city?: string;
    tier?: string;
    isShortlisted?: boolean;
}

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: PaginationMeta;
}

export interface DashboardStats {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    newThisWeek: number;
    contactedCount: number;
    contactRate: number;
    withPhone: number;
    withWebsite: number;
    recentLeads: Lead[];
}
