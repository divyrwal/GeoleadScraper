/**
 * GeoLead Scraper — Background Service Worker
 * Relays messages between content script and popup.
 * Also saves leads directly to API as a safety net.
 */

let apiUrl = 'http://localhost:4000';

// Grid Scanner State
let gridQueue = [];
let gridTotal = 0;
let currentGridQuery = '';
let currentTargetTabId = null;
let currentExtractionSpeed = 300;
let isGridScanning = false;
let totalGridLeads = 0;

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

        // Add accumulated grid totals to progress updates so the popup doesn't reset to 0
        if (message.type === 'progress' && isGridScanning) {
            if (message.found !== undefined) message.found += totalGridLeads;
            if (message.scraped !== undefined) message.scraped += totalGridLeads;
        }

        // Intercept extraction_done during a grid scan so the popup UI doesn't close prematurely
        if (message.type === 'extraction_done' && isGridScanning) {
            totalGridLeads += message.total_scraped || 0;
            if (message.stopped) {
                isGridScanning = false;
                gridQueue = [];
                chrome.runtime.sendMessage(message).catch(() => { });
            } else {
                setTimeout(() => nextGridZone(), 1500); // Trigger next zone
            }
        } else {
            // Broadcast to popup
            chrome.runtime.sendMessage(message).catch(() => { /* popup may be closed */ });
        }
    }

    // When content script sends a batch of leads, save them directly to API
    if (message.type === 'leads_batch' && message.leads) {
        saveLeadsToApi(message.leads, message.search_query);
    }

    if (message.action === 'start_grid_scan') {
        startGridScan(message.query, message.location, message.speed, message.targetTabId)
            .catch(err => {
                chrome.runtime.sendMessage({ type: "progress", status: "done", message: `Error: ${err.message}` }).catch(() => { });
                chrome.runtime.sendMessage({ type: "extraction_done", total_found: 0, total_scraped: 0 }).catch(() => { });
            });
        sendResponse({ started: true });
        return true;
    }

    if (message.action === 'stop_grid_scan') {
        isGridScanning = false;
        gridQueue = [];
        chrome.tabs.sendMessage(currentTargetTabId, { action: "stop" });
        return true;
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

async function startGridScan(query, location, speed, tabId) {
    if (isGridScanning) throw new Error("A grid scan is already in progress.");
    isGridScanning = true;
    gridQueue = [];
    currentGridQuery = query;
    currentTargetTabId = tabId;
    currentExtractionSpeed = speed;
    totalGridLeads = 0;

    chrome.runtime.sendMessage({
        type: "progress",
        status: "starting",
        message: `API: Calculating exact geographic coordinates for ${location}...`,
        found: 0, scraped: 0
    }).catch(() => { });

    const res = await fetch(`${apiUrl}/api/search/grid?location=${encodeURIComponent(location)}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
        isGridScanning = false;
        throw new Error(data.error || "Failed to generate grid.");
    }

    gridQueue = data.grid;
    gridTotal = gridQueue.length;

    nextGridZone();
}

function nextGridZone() {
    if (!isGridScanning) return;

    if (gridQueue.length === 0) {
        isGridScanning = false;
        chrome.runtime.sendMessage({
            type: "progress",
            status: "done",
            message: `Grid Complete! Master Queue extracted ${totalGridLeads} total leads.`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });
        chrome.runtime.sendMessage({ type: "extraction_done", total_found: totalGridLeads, total_scraped: totalGridLeads }).catch(() => { });
        return;
    }

    const zone = gridQueue.shift();
    const zoneIndex = gridTotal - gridQueue.length;

    chrome.runtime.sendMessage({
        type: "progress",
        status: "navigating",
        message: `[Zone ${zoneIndex}/${gridTotal}] Navigating to Maps ${zone.label}...`,
        found: totalGridLeads, scraped: totalGridLeads
    }).catch(() => { });

    const lat = zone.lat.toFixed(6);
    const lng = zone.lng.toFixed(6);
    // 14z implies a city-level zoom appropriate for grid searching
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(currentGridQuery)}/@${lat},${lng},14z`;

    chrome.tabs.update(currentTargetTabId, { url: mapsUrl });
}

// Detect when the tab finishes navigating to the new Grids zone
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isGridScanning && tabId === currentTargetTabId && changeInfo.status === 'complete') {
        const zoneIndex = gridTotal - gridQueue.length;
        chrome.runtime.sendMessage({
            type: "progress",
            message: `[Zone ${zoneIndex}/${gridTotal}] Maps loaded. Starting extraction in 5s...`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });

        // Add an extra 5 seconds to ensure Google Maps JS finishes rendering the feed
        setTimeout(() => {
            if (!isGridScanning) return;
            chrome.tabs.sendMessage(tabId, { action: "extract_all", speed: currentExtractionSpeed }, (response) => {
                if (chrome.runtime.lastError) {
                    // If the content script hasn't fully injected yet, try once more
                    setTimeout(() => {
                        if (!isGridScanning) return;
                        chrome.tabs.sendMessage(tabId, { action: "extract_all", speed: currentExtractionSpeed });
                    }, 3000);
                }
            });
        }, 5000);
    }
});
