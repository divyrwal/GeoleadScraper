/**
 * GeoLead Scraper — Background Service Worker
 * Relays messages between content script and popup.
 * Also saves leads directly to API as a safety net.
 */

let apiUrl = 'http://localhost:4000';

// Load saved API URL
chrome.storage.local.get(['apiUrl'], (result) => {
    if (result.apiUrl) apiUrl = result.apiUrl;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiUrl) apiUrl = changes.apiUrl.newValue;
});

// Relay messages from content script to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward progress and lead messages to all extension pages (popup)
    if (message.type === 'progress' || message.type === 'leads_batch' || message.type === 'extraction_done') {
        // Broadcast to popup
        chrome.runtime.sendMessage(message).catch(() => { /* popup may be closed */ });
    }

    // When content script sends a batch of leads, save them directly to API
    if (message.type === 'leads_batch' && message.leads) {
        saveLeadsToApi(message.leads, message.search_query);
    }

    return false;
});

async function saveLeadsToApi(leads, searchQuery) {
    try {
        const res = await fetch(`${apiUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads, search_query: searchQuery })
        });
        const result = await res.json();

        // Notify popup of save result
        chrome.runtime.sendMessage({
            type: 'save_result',
            inserted: result.inserted || 0,
            updated: result.updated || 0,
            skipped: result.skipped || 0,
            total: result.total || 0
        }).catch(() => { /* popup may be closed */ });

        console.log(`[GeoLead BG] Saved ${result.inserted} leads, ${result.skipped} skipped`);
    } catch (err) {
        console.error('[GeoLead BG] Failed to save leads:', err);
    }
}
