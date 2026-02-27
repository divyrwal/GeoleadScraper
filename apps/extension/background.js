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

// ═══════════════════════════════════════════════════════
// PERSISTENT DEBUG LOG — stores in chrome.storage for sharing
// ═══════════════════════════════════════════════════════
const MAX_LOG_ENTRIES = 200;

async function debugLog(level, source, message, data = null) {
    const entry = {
        t: new Date().toISOString(),
        lvl: level, // INFO, WARN, ERROR
        src: source, // BG, CONTENT, SIDEBAR
        msg: message,
        ...(data ? { data: JSON.stringify(data).slice(0, 200) } : {})
    };
    try {
        const result = await chrome.storage.local.get(['_debugLog']);
        const log = result._debugLog || [];
        log.push(entry);
        if (log.length > MAX_LOG_ENTRIES) log.splice(0, log.length - MAX_LOG_ENTRIES);
        await chrome.storage.local.set({ _debugLog: log });
    } catch (e) { /* storage full or unavailable */ }
}

// ═══════════════════════════════════════════════════════
// SIDE PANEL — Open sidebar on extension icon click
// ═══════════════════════════════════════════════════════
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

// Grid Scanner State
let gridQueue = [];
let gridTotal = 0;
let currentGridQuery = '';
let currentTargetTabId = null;
let currentExtractionSpeed = 300;
let isGridScanning = false;
let totalGridLeads = 0;
let zoneInjected = false;

// Cross-zone dedup
let globalSeenIds = new Set();
let globalSeenPhones = new Set();
let zoneStartTime = 0;
let currentGridLocation = ''; // Location name for Maps URL
let gridBounds = null; // Bounding box from geocoding for geo-filtering

// Zone watchdog timer
let zoneWatchdogTimer = null;
const ZONE_TIMEOUT_MS = 120000; // Base timeout (scales dynamically with zone size)
let currentZoneTimeout = ZONE_TIMEOUT_MS;

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
function startZoneWatchdog(timeoutMs) {
    clearZoneWatchdog();
    currentZoneTimeout = timeoutMs || ZONE_TIMEOUT_MS;
    zoneWatchdogTimer = setTimeout(() => {
        if (!isGridScanning) return;
        const zoneIndex = gridTotal - gridQueue.length;
        debugLog('WARN', 'BG', `Zone ${zoneIndex}/${gridTotal} timed out after ${currentZoneTimeout / 1000}s. Force-skipping.`);

        chrome.runtime.sendMessage({
            type: "progress",
            status: "navigating",
            message: `⏱ Zone ${zoneIndex}/${gridTotal} timed out. Skipping to next zone...`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });

        nextGridZone();
    }, currentZoneTimeout);
}

/**
 * Reset watchdog on activity (e.g., leads_batch received)
 */
function resetZoneWatchdog() {
    if (zoneWatchdogTimer && isGridScanning) {
        startZoneWatchdog(currentZoneTimeout);
    }
}

// ═══════════════════════════════════════════════════════
// MESSAGE RELAY
// ═══════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle debug log entries from content script
    if (message.type === 'debug_log_entry') {
        debugLog(message.level, message.source, message.message, message.data);
        return false;
    }

    // Forward progress and lead messages to sidebar
    if (message.type === 'progress' || message.type === 'leads_batch' || message.type === 'extraction_done') {

        // Add accumulated grid totals to progress updates
        if (message.type === 'progress' && isGridScanning) {
            if (message.found !== undefined) message.found += totalGridLeads;
            if (message.scraped !== undefined) message.scraped += totalGridLeads;

            // Prefix zone info to message (only if not already prefixed)
            const zoneIndex = gridTotal - gridQueue.length;
            if (message.message && !message.message.includes('[Zone')) {
                message.message = `[Zone ${zoneIndex}/${gridTotal}] ${message.message}`;
            }

            // When extraction starts, scale the watchdog based on found count
            if (message.status === 'extracting' && message.found > 0) {
                const perCardTimeout = 5000; // 5s per card
                const dynamicTimeout = Math.max(message.found * perCardTimeout, ZONE_TIMEOUT_MS);
                if (dynamicTimeout > currentZoneTimeout) {
                    debugLog('INFO', 'BG', `Scaling zone watchdog to ${dynamicTimeout / 1000}s for ${message.found} targets`);
                    startZoneWatchdog(dynamicTimeout);
                }
            }
        }

        // Tag so sidebar knows this is the authoritative relay (not raw content broadcast)
        message._fromBg = true;

        // Intercept extraction_done during a grid scan
        if (message.type === 'extraction_done' && isGridScanning) {
            clearZoneWatchdog();
            totalGridLeads += message.total_scraped || 0;

            const zoneIndex = gridTotal - gridQueue.length;
            const zoneDuration = zoneStartTime ? Math.round((Date.now() - zoneStartTime) / 1000) : 0;
            debugLog('INFO', 'BG', `Zone ${zoneIndex} done in ${zoneDuration}s: found=${message.total_found}, scraped=${message.total_scraped}, stopped=${message.stopped}`);
            zoneStats.push({
                zone: zoneIndex,
                found: message.total_found || 0,
                scraped: message.total_scraped || 0
            });

            if (message.stopped) {
                isGridScanning = false;
                gridQueue = [];
                globalSeenIds.clear();
                chrome.runtime.sendMessage(message).catch(() => { });
            } else {
                // Move to next zone after a 2s breather
                setTimeout(() => nextGridZone(), 2000);
            }
        } else {
            // Relay to sidebar
            chrome.runtime.sendMessage(message).catch(() => { });
        }
    }

    // When content script sends a batch of leads, deduplicate and save
    if (message.type === 'leads_batch' && message.leads) {
        // Cross-zone dedup: filter out leads already seen in previous zones
        const uniqueLeads = message.leads.filter(lead => {
            // Place ID dedup
            if (lead.google_place_id && !lead.google_place_id.startsWith('gen_') && globalSeenIds.has(lead.google_place_id)) {
                return false;
            }
            // Phone dedup (catches same business from overlapping zones with different generated IDs)
            if (lead.phone_number && globalSeenPhones.has(lead.phone_number)) {
                return false;
            }
            if (lead.google_place_id) globalSeenIds.add(lead.google_place_id);
            if (lead.phone_number) globalSeenPhones.add(lead.phone_number);
            return true;
        });

        const dupCount = message.leads.length - uniqueLeads.length;
        if (dupCount > 0) {
            debugLog('INFO', 'BG', `Filtered ${dupCount} cross-zone dupes from batch of ${message.leads.length}`);
        }

        // Reset watchdog on activity — scraper is still working
        resetZoneWatchdog();

        if (uniqueLeads.length > 0) {
            saveLeadsToApi(uniqueLeads, message.search_query);
        }
    }

    if (message.action === 'start_grid_scan') {
        debugLog('INFO', 'BG', `Grid scan requested: q="${message.query}", loc="${message.location}", speed=${message.speed}, tab=${message.targetTabId}`);
        startGridScan(message.query, message.location, message.speed, message.targetTabId)
            .catch(err => {
                debugLog('ERROR', 'BG', `Grid scan failed: ${err.message}`);
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
        debugLog('INFO', 'BG', 'Dedup cache cleared');
        sendResponse({ cleared: true, message: "Dedup cache cleared." });
        return false;
    }

    if (message.action === 'get_debug_log') {
        chrome.storage.local.get(['_debugLog'], (result) => {
            sendResponse({ log: result._debugLog || [] });
        });
        return true; // async sendResponse
    }

    if (message.action === 'clear_debug_log') {
        chrome.storage.local.set({ _debugLog: [] });
        sendResponse({ cleared: true });
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
            _fromBg: true,
            inserted: result.inserted || 0,
            updated: result.updated || 0,
            skipped: result.skipped || 0,
            total: result.total || 0
        }).catch(() => { });

        debugLog('INFO', 'BG', `API save: ${result.inserted} inserted, ${result.skipped} skipped, ${result.updated} updated`);
    } catch (err) {
        debugLog('ERROR', 'BG', `API save failed: ${err.message}`, { url: apiUrl });
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
    globalSeenPhones.clear();
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
    currentGridLocation = location;
    gridBounds = data.bounds || null; // Bounding box from geocoding

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
            _fromBg: true,
            status: "done",
            message: `✅ GRID COMPLETE: ${totalGridLeads} unique leads from ${gridTotal} zones. [${zoneSummary}]`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });
        chrome.runtime.sendMessage({
            type: "extraction_done",
            _fromBg: true,
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
    // Include location in the search query to restrict results geographically
    const searchTerm = currentGridLocation
        ? `${currentGridQuery} in ${currentGridLocation}`
        : currentGridQuery;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/@${lat},${lng},14z`;

    zoneInjected = false;
    zoneStartTime = Date.now();
    chrome.tabs.update(currentTargetTabId, { url: mapsUrl });

    startZoneWatchdog(ZONE_TIMEOUT_MS); // Start with base timeout, scales when extraction begins
}

// ═══════════════════════════════════════════════════════
// TAB NAVIGATION LISTENER
// ═══════════════════════════════════════════════════════
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only react to the FIRST 'complete' event per zone (Google Maps SPA fires many)
    if (isGridScanning && tabId === currentTargetTabId && changeInfo.status === 'complete' && !zoneInjected) {
        zoneInjected = true; // Lock — no more injections for this zone
        const zoneIndex = gridTotal - gridQueue.length;

        chrome.runtime.sendMessage({
            type: "progress",
            message: `[Zone ${zoneIndex}/${gridTotal}] 🗺 Maps loaded. Deploying scraper in 5s...`,
            found: totalGridLeads, scraped: totalGridLeads
        }).catch(() => { });

        // Wait 5s for Google Maps JS to finish rendering
        setTimeout(() => {
            if (!isGridScanning) return;

            // Force-reset content script in case previous zone's isExtracting is stuck
            chrome.tabs.sendMessage(tabId, { action: "reset" }, () => {
                if (chrome.runtime.lastError) { /* content script not ready yet */ }
            });

            // Small delay after reset, then start extraction
            setTimeout(() => {
                if (!isGridScanning) return;
                chrome.tabs.sendMessage(tabId, {
                    action: "extract_all",
                    speed: currentExtractionSpeed,
                    bounds: gridBounds || null // Pass geographic bounds for filtering
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        debugLog('WARN', 'BG', `Zone ${zoneIndex} inject failed, retrying in 3s...`);
                        setTimeout(() => {
                            if (!isGridScanning) return;
                            chrome.tabs.sendMessage(tabId, {
                                action: "extract_all",
                                speed: currentExtractionSpeed,
                                bounds: gridBounds || null
                            }, (retryResponse) => {
                                if (chrome.runtime.lastError) {
                                    debugLog('ERROR', 'BG', `Zone ${zoneIndex} inject failed after retry. Skipping.`);
                                    chrome.runtime.sendMessage({
                                        type: "progress", _fromBg: true, status: "navigating",
                                        message: `[Zone ${zoneIndex}/${gridTotal}] ⚠ Failed to inject. Skipping zone...`,
                                        found: totalGridLeads, scraped: totalGridLeads
                                    }).catch(() => { });
                                    setTimeout(() => nextGridZone(), 1500);
                                }
                            });
                        }, 3000);
                    }
                });
            }, 500);
        }, 5000);
    }
});
