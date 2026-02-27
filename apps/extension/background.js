/**
 * GeoLead Scraper — Background Service Worker v5 (RECON EDITION)
 * 
 * Resilient Grid Queue with:
 * - 120-second zone timeout watchdog (auto-skip on hang)
 * - Cross-zone deduplication (filter duplicate leads across zones)
 * - Tab crash recovery
 * - Per-zone stats tracking
 * - Robust message relay
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

// Cross-zone dedup
let globalSeenIds = new Set();

// Zone watchdog timer
let zoneWatchdogTimer = null;
const ZONE_TIMEOUT_MS = 120000; // 2 minutes per zone max

// Per-zone stats
let zoneStats = [];

// Load saved API URL
chrome.storage.local.get(['apiUrl'], (result) => {
    if (result.apiUrl) apiUrl = result.apiUrl;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiUrl) apiUrl = changes.apiUrl.newValue;
});

/**
 * Clear the zone watchdog timer
 */
function clearZoneWatchdog() {
    if (zoneWatchdogTimer) {
        clearTimeout(zoneWatchdogTimer);
        zoneWatchdogTimer = null;
    }
}

/**
 * Start a watchdog timer for the current zone.
 * If extraction_done is not received within ZONE_TIMEOUT_MS, force-skip.
 */
function startZoneWatchdog() {
    clearZoneWatchdog();
    zoneWatchdogTimer = setTimeout(() => {
        if (!isGridScanning) return;
        const zoneIndex = gridTotal - gridQueue.length;
        console.warn(`[GeoLead BG] Zone ${zoneIndex}/${gridTotal} timed out after ${ZONE_TIMEOUT_MS / 1000}s. Force-skipping.`);

        chrome.runtime.sendMessage({
            type: "progress",
            status: "navigating",
            message: `⏱ Zone ${zoneIndex}/${gridTotal} timed out. Skipping to next zone...`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });

        nextGridZone();
    }, ZONE_TIMEOUT_MS);
}

// ═══════════════════════════════════════════════════════
// MESSAGE RELAY
// ═══════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward progress and lead messages to popup
    if (message.type === 'progress' || message.type === 'leads_batch' || message.type === 'extraction_done') {

        // Add accumulated grid totals to progress updates
        if (message.type === 'progress' && isGridScanning) {
            if (message.found !== undefined) message.found += totalGridLeads;
            if (message.scraped !== undefined) message.scraped += totalGridLeads;

            // Prefix zone info to message
            const zoneIndex = gridTotal - gridQueue.length;
            if (message.message && !message.message.startsWith('[Zone')) {
                message.message = `[Zone ${zoneIndex}/${gridTotal}] ${message.message}`;
            }
        }

        // Intercept extraction_done during a grid scan
        if (message.type === 'extraction_done' && isGridScanning) {
            clearZoneWatchdog();
            totalGridLeads += message.total_scraped || 0;

            const zoneIndex = gridTotal - gridQueue.length;
            zoneStats.push({
                zone: zoneIndex,
                found: message.total_found || 0,
                scraped: message.total_scraped || 0
            });

            if (message.stopped) {
                // User manually stopped
                isGridScanning = false;
                gridQueue = [];
                globalSeenIds.clear();
                chrome.runtime.sendMessage(message).catch(() => { });
            } else {
                // Move to next zone after a 2s breather
                setTimeout(() => nextGridZone(), 2000);
            }
        } else {
            // Broadcast to popup
            chrome.runtime.sendMessage(message).catch(() => { /* popup may be closed */ });
        }
    }

    // When content script sends a batch of leads, deduplicate and save
    if (message.type === 'leads_batch' && message.leads) {
        // Cross-zone dedup: filter out leads already seen in previous zones
        const uniqueLeads = message.leads.filter(lead => {
            if (globalSeenIds.has(lead.google_place_id)) {
                return false; // Already scraped in a previous zone
            }
            globalSeenIds.add(lead.google_place_id);
            return true;
        });

        const dupCount = message.leads.length - uniqueLeads.length;
        if (dupCount > 0) {
            console.log(`[GeoLead BG] Filtered ${dupCount} cross-zone duplicates`);
        }

        if (uniqueLeads.length > 0) {
            saveLeadsToApi(uniqueLeads, message.search_query);
        }
    }

    if (message.action === 'start_grid_scan') {
        startGridScan(message.query, message.location, message.speed, message.targetTabId)
            .catch(err => {
                chrome.runtime.sendMessage({ type: "progress", status: "done", message: `❌ Error: ${err.message}` }).catch(() => { });
                chrome.runtime.sendMessage({ type: "extraction_done", total_found: 0, total_scraped: 0 }).catch(() => { });
            });
        sendResponse({ started: true });
        return true;
    }

    if (message.action === 'stop_grid_scan') {
        isGridScanning = false;
        gridQueue = [];
        clearZoneWatchdog();
        globalSeenIds.clear();
        if (currentTargetTabId) {
            chrome.tabs.sendMessage(currentTargetTabId, { action: "stop" }).catch(() => { });
        }
        return true;
    }

    if (message.action === 'clear_dedup_cache') {
        globalSeenIds.clear();
        sendResponse({ cleared: true, message: "Dedup cache cleared." });
        return false;
    }

    return false;
});

// ═══════════════════════════════════════════════════════
// API SAVE
// ═══════════════════════════════════════════════════════
async function saveLeadsToApi(leads, searchQuery) {
    try {
        const res = await fetch(`${apiUrl}/api/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads, search_query: searchQuery })
        });
        const result = await res.json();

        chrome.runtime.sendMessage({
            type: 'save_result',
            inserted: result.inserted || 0,
            updated: result.updated || 0,
            skipped: result.skipped || 0,
            total: result.total || 0
        }).catch(() => { });

        console.log(`[GeoLead BG] Saved ${result.inserted} leads, ${result.skipped} skipped`);
    } catch (err) {
        console.error('[GeoLead BG] Failed to save leads:', err);
    }
}

// ═══════════════════════════════════════════════════════
// GRID SCAN ORCHESTRATOR
// ═══════════════════════════════════════════════════════
async function startGridScan(query, location, speed, tabId) {
    if (isGridScanning) throw new Error("A grid scan is already in progress.");
    isGridScanning = true;
    gridQueue = [];
    currentGridQuery = query;
    currentTargetTabId = tabId;
    currentExtractionSpeed = speed;
    totalGridLeads = 0;
    globalSeenIds.clear();
    zoneStats = [];

    chrome.runtime.sendMessage({
        type: "progress",
        status: "starting",
        message: `🌐 RECON: Calculating geographic grid for "${location}"...`,
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

    chrome.runtime.sendMessage({
        type: "progress",
        status: "navigating",
        message: `🗺 Grid locked: ${gridTotal} zones identified. Deploying scanner...`,
        found: 0, scraped: 0
    }).catch(() => { });

    nextGridZone();
}

function nextGridZone() {
    clearZoneWatchdog();

    if (!isGridScanning) return;

    if (gridQueue.length === 0) {
        isGridScanning = false;
        globalSeenIds.clear();

        // Build zone summary
        const zoneSummary = zoneStats.map(z => `Z${z.zone}: ${z.scraped}`).join(' | ');

        chrome.runtime.sendMessage({
            type: "progress",
            status: "done",
            message: `✅ GRID COMPLETE: ${totalGridLeads} unique leads from ${gridTotal} zones. [${zoneSummary}]`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });
        chrome.runtime.sendMessage({
            type: "extraction_done",
            total_found: totalGridLeads,
            total_scraped: totalGridLeads
        }).catch(() => { });
        return;
    }

    const zone = gridQueue.shift();
    const zoneIndex = gridTotal - gridQueue.length;

    chrome.runtime.sendMessage({
        type: "progress",
        status: "navigating",
        message: `[Zone ${zoneIndex}/${gridTotal}] 📍 Navigating to ${zone.label}...`,
        found: totalGridLeads, scraped: totalGridLeads
    }).catch(() => { });

    const lat = zone.lat.toFixed(6);
    const lng = zone.lng.toFixed(6);
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(currentGridQuery)}/@${lat},${lng},14z`;

    chrome.tabs.update(currentTargetTabId, { url: mapsUrl });

    // Start the watchdog — if this zone doesn't complete in 120s, auto-skip
    startZoneWatchdog();
}

// ═══════════════════════════════════════════════════════
// TAB NAVIGATION LISTENER
// ═══════════════════════════════════════════════════════
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isGridScanning && tabId === currentTargetTabId && changeInfo.status === 'complete') {
        const zoneIndex = gridTotal - gridQueue.length;
        chrome.runtime.sendMessage({
            type: "progress",
            message: `[Zone ${zoneIndex}/${gridTotal}] 🗺 Maps loaded. Deploying scraper in 5s...`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });

        // Wait 5s for Google Maps JS to finish rendering
        setTimeout(() => {
            if (!isGridScanning) return;
            chrome.tabs.sendMessage(tabId, { action: "extract_all", speed: currentExtractionSpeed }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[GeoLead BG] First inject attempt failed, retrying in 3s...");
                    setTimeout(() => {
                        if (!isGridScanning) return;
                        chrome.tabs.sendMessage(tabId, { action: "extract_all", speed: currentExtractionSpeed }, (retryResponse) => {
                            if (chrome.runtime.lastError) {
                                console.error("[GeoLead BG] Zone failed to inject. Skipping.");
                                chrome.runtime.sendMessage({
                                    type: "progress", status: "navigating",
                                    message: `[Zone ${zoneIndex}/${gridTotal}] ⚠ Failed to inject. Skipping zone...`,
                                    found: totalGridLeads, scraped: totalGridLeads
                                }).catch(() => { });
                                // Skip to next zone
                                setTimeout(() => nextGridZone(), 1500);
                            }
                        });
                    }, 3000);
                }
            });
        }, 5000);
    }
});
