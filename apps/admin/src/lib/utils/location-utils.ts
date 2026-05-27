/**
 * Tier classification for cities.
 * Tier 1: Major metros / hubs
 * Tier 2: Mid-sized cities
 * Tier 3: Smaller urban centers
 */

// Focused on India as per standard tier definitions
export const INDIAN_TIERS: Record<string, string> = {
    "Mumbai": "tier-1",
    "Delhi": "tier-1",
    "Bengaluru": "tier-1",
    "Ahmedabad": "tier-1",
    "Hyderabad": "tier-1",
    "Chennai": "tier-1",
    "Kolkata": "tier-1",
    "Pune": "tier-1",
    
    "Amritsar": "tier-2",
    "Bhopal": "tier-2",
    "Bhubaneswar": "tier-2",
    "Chandigarh": "tier-2",
    "Faridabad": "tier-2",
    "Ghaziabad": "tier-2",
    "Jamshedpur": "tier-2",
    "Jaipur": "tier-2",
    "Kochi": "tier-2",
    "Lucknow": "tier-2",
    "Nagpur": "tier-2",
    "Patna": "tier-2",
    "Raipur": "tier-2",
    "Surat": "tier-2",
    "Thane": "tier-2",
    "Visakhapatnam": "tier-2",
    "Varanasi": "tier-2",
    "Kanpur": "tier-2",
    "Indore": "tier-2",
};

// Global hubs as Tier 1 by default
export const GLOBAL_TIER_1: Record<string, string> = {
    "London": "tier-1",
    "New York City": "tier-1",
    "Paris": "tier-1",
    "Tokyo": "tier-1",
    "Singapore": "tier-1",
    "Dubai": "tier-1",
    "Sydney": "tier-1",
    "Berlin": "tier-1",
    "Toronto": "tier-1",
    "Los Angeles": "tier-1",
};

export function getCityTier(cityName: string, countryCode?: string): string | null {
    if (!cityName) return null;
    
    if (countryCode === "IN") {
        return INDIAN_TIERS[cityName] || "tier-3";
    }
    
    if (GLOBAL_TIER_1[cityName]) return "tier-1";
    
    // Default logic for other countries/cities
    return "tier-3";
}

export const TIER_OPTIONS = [
    { label: "Tier 1 (Major Metros)", value: "tier-1" },
    { label: "Tier 2 (Mid-Sized)", value: "tier-2" },
    { label: "Tier 3 (Emerging)", value: "tier-3" },
];
