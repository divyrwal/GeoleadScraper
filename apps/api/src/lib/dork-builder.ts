export type DorkIntent = 'company' | 'decision_maker' | 'contact_info';

export interface DorkParams {
    intent: DorkIntent;
    query: string;
    location?: string;
    targetSite?: 'linkedin.com/company' | 'linkedin.com/in' | 'instagram.com';
}

/**
 * Builds a structured Google Dork query based on the extraction intent.
 */
export function buildGoogleDork(params: DorkParams): string {
    const { intent, query, location, targetSite } = params;

    // Base formatting
    const safeQuery = query ? `"${query}"` : '';
    const safeLocation = location ? `"${location}"` : '';
    const site = targetSite ? `site:${targetSite}` : '';

    switch (intent) {
        case 'company':
            // E.g., site:linkedin.com/company "Software Agency" "Delhi"
            return `${site} ${safeQuery} ${safeLocation}`.trim();

        case 'decision_maker':
            // E.g., site:linkedin.com/in ("Founder" OR "CEO" OR "Director") "Tech Corp"
            const titles = `("Founder" OR "CEO" OR "Director" OR "Owner" OR "Co-Founder" OR "Managing Director")`;
            return `${site} ${titles} ${safeQuery} ${safeLocation}`.trim();

        case 'contact_info':
            // E.g., site:instagram.com "Plumbers" "London" ("@gmail.com" OR "@yahoo.com" OR "wa.me" OR "+44")
            const contactSignals = `("@gmail.com" OR "@yahoo.com" OR "@hotmail.com" OR "@outlook.com" OR "wa.me" OR "api.whatsapp.com")`;
            return `${site} ${safeQuery} ${safeLocation} ${contactSignals}`.trim();

        default:
            return `${site} ${safeQuery} ${safeLocation}`.trim();
    }
}
