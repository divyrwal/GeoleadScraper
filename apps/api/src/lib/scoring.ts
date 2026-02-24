/**
 * Lead Auto-Scoring Engine
 * Rule-based scoring 0-100 → hot / warm / cold buckets
 */

export interface ScoreResult {
    score: number;
    label: "hot" | "warm" | "cold";
    breakdown: Record<string, number>;
}

export function computeLeadScore(lead: {
    phone_number?: string | null;
    website_url?: string | null;
    address?: string | null;
    google_rating?: number | null;
    review_count?: number | null;
    description?: string | null;
    opening_hours?: string | null;
    service_options?: string[];
    email?: string | null;
}): ScoreResult {
    const breakdown: Record<string, number> = {};
    let score = 0;

    // Has phone (+25)
    if (lead.phone_number) {
        breakdown.phone = 25;
        score += 25;
    }

    // Has website (+20)
    if (lead.website_url) {
        breakdown.website = 20;
        score += 20;
    }

    // Has address (+10)
    if (lead.address) {
        breakdown.address = 10;
        score += 10;
    }

    // Rating >= 4.0 (+15)
    if (lead.google_rating && lead.google_rating >= 4.0) {
        breakdown.rating = 15;
        score += 15;
    }

    // Reviews >= 50 (+10)
    if (lead.review_count && lead.review_count >= 50) {
        breakdown.reviews = 10;
        score += 10;
    }

    // Reviews >= 200 (+5 bonus)
    if (lead.review_count && lead.review_count >= 200) {
        breakdown.reviews_bonus = 5;
        score += 5;
    }

    // Has description (+5)
    if (lead.description) {
        breakdown.description = 5;
        score += 5;
    }

    // Has opening hours (+5)
    if (lead.opening_hours) {
        breakdown.hours = 5;
        score += 5;
    }

    // Has service options (+5)
    if (lead.service_options && lead.service_options.length > 0) {
        breakdown.services = 5;
        score += 5;
    }

    // Determine label
    const label: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

    return { score, label, breakdown };
}
