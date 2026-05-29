/**
 * config.js
 * Centralized configuration for the GeoLead extension.
 * This acts as a single source of truth for API and dashboard URLs.
 */

export const config = {
    // The local API endpoint (change to Vercel URL for production)
    apiUrl: 'http://localhost:4000',

    // The local production dashboard URL
    dashboardUrl: 'http://localhost:3000/leads',

    // The API key for authentication
    apiKey: 'fallback-secret-for-local-crm'
};
