/**
 * locations-data.js
 * Centralized location data fetching via GeoLead API.
 */

async function getApiUrl() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiUrl'], (result) => {
            resolve(result.apiUrl || 'http://localhost:4000');
        });
    });
}

export async function fetchCountries() {
    try {
        const apiUrl = await getApiUrl();
        const res = await fetch(`${apiUrl}/api/locations/countries`);
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (e) {
        console.error("[Locations] Error fetching countries:", e);
        return [];
    }
}

export async function fetchStates(countryCode) {
    if (!countryCode) return [];
    
    try {
        const apiUrl = await getApiUrl();
        const res = await fetch(`${apiUrl}/api/locations/countries/${countryCode}/states`);
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (e) {
        console.error("[Locations] Error fetching states:", e);
        return [];
    }
}

/**
 * Cities can also be fetched from our API for specific state context.
 */
export async function fetchCities(countryCode, stateCode) {
    if (!countryCode || !stateCode) return [];
    
    try {
        const apiUrl = await getApiUrl();
        const res = await fetch(`${apiUrl}/api/locations/countries/${countryCode}/states/${stateCode}/cities`);
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (e) {
        console.error("[Locations] Error fetching cities:", e);
        return [];
    }
}
