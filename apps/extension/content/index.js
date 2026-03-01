/**
 * content/index.js
 * The main entry point for the content script.
 * Registers Chrome message listeners and triggers the Scraper service.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_all" || request.action === "extract") {

        if (request.bounds) {
            GeoLeadScraper.activeBounds = request.bounds;
            GeoLeadUtils.contentLog(
                'INFO',
                `[INIT] Geo-bounds set: S${request.bounds.south.toFixed(3)} N${request.bounds.north.toFixed(3)} W${request.bounds.west.toFixed(3)} E${request.bounds.east.toFixed(3)}`
            );
        } else {
            GeoLeadScraper.activeBounds = null;
        }

        if (GeoLeadScraper.isExtracting) {
            console.warn("[GeoLead] Ignoring duplicate extract_all — already running.");
            sendResponse({ started: false, error: "Already extracting" });
            return false;
        }

        GeoLeadScraper.shouldStop = false;
        sendResponse({ started: true });

        // Start the extraction loop asynchronously
        GeoLeadScraper.extractAllLeads();
        return false;
    }

    if (request.action === "reset") {
        GeoLeadScraper.isExtracting = false;
        GeoLeadScraper.shouldStop = true;
        GeoLeadUtils.contentLog('INFO', '[RESET] State reset by background (zone transition)');
        sendResponse({ reset: true });
        return false;
    }

    if (request.action === "stop") {
        GeoLeadScraper.shouldStop = true;
        sendResponse({ stopped: true });
        return false;
    }
});
