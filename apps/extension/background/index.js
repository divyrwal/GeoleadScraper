/**
 * background/index.js
 * The main entry point for the background service worker.
 */

import { logger } from './logger.js';
import { scanner } from './scanner.js';

// Open sidebar on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle debug log entries from content script
    if (message.type === 'debug_log_entry') {
        logger.log(message.level, message.source, message.message, message.data);
        return false;
    }

    // Forward progress and lead messages to sidebar
    if (message.type === 'progress' || message.type === 'leads_batch' || message.type === 'extraction_done') {
        scanner.lastActivityTime = Date.now();

        if (message.type === 'progress' && scanner.isScanning) {
            if (message.found !== undefined) message.found += scanner.totalLeads;
            if (message.scraped !== undefined) message.scraped += scanner.totalLeads;

            const zoneIndex = scanner.totalZones - scanner.queue.length;
            if (message.message && !message.message.includes('[Zone')) {
                message.message = `[Zone ${zoneIndex}/${scanner.totalZones}] ${message.message}`;
            }

            if (message.status === 'extracting' && message.found > 0) {
                const perCardTimeout = 5000;
                const dynamicTimeout = Math.max(message.found * perCardTimeout, scanner.ZONE_TIMEOUT_MS);
                if (dynamicTimeout > scanner.currentZoneTimeout) {
                    logger.log('INFO', 'BG', `Scaling zone watchdog to ${dynamicTimeout / 1000}s for ${message.found} targets`);
                    scanner.startZoneWatchdog(dynamicTimeout);
                }
            }
        }

        // Tag so sidebar knows this is the authoritative relay
        message._fromBg = true;
        // Detect zone completion: content sends type:'progress' + status:'done'
        const isExtractionDone =
            (message.type === 'extraction_done') ||
            (message.type === 'progress' && message.status === 'done');

        if (isExtractionDone && scanner.isScanning) {
            // Normalize field names for handleExtractionDone
            scanner.handleExtractionDone({
                total_found: message.total_found || message.found || 0,
                total_scraped: message.total_scraped || message.scraped || 0,
                stopped: message.stopped || false,
                message: message.message
            });
        } else {
            chrome.runtime.sendMessage(message).catch(() => { });
        }
    }

    if (message.type === 'leads_batch' && message.leads) {
        scanner.handleLeadsBatch(message);
    }

    if (message.action === 'start_grid_scan') {
        logger.log('INFO', 'BG', `Grid scan requested: q="${message.query}", loc="${message.location}", grid=${message.gridSize || 3}x${message.gridSize || 3}, speed=${message.speed}, tab=${message.targetTabId}`);
        scanner.startScan(message.query, message.location, message.speed, message.targetTabId, message.gridSize || 3)
            .catch(err => {
                logger.log('ERROR', 'BG', `Grid scan failed: ${err.message}`);
                chrome.runtime.sendMessage({ type: "progress", status: "done", message: `❌ Error: ${err.message}` }).catch(() => { });
                chrome.runtime.sendMessage({ type: "extraction_done", total_found: 0, total_scraped: 0 }).catch(() => { });
            });
        sendResponse({ started: true });
        return true;
    }

    if (message.action === 'stop_grid_scan') {
        scanner.stop();
        return false;
    }

    if (message.action === 'clear_dedup_cache') {
        scanner.globalSeenIds.clear();
        logger.log('INFO', 'BG', 'Dedup cache cleared');
        sendResponse({ cleared: true, message: "Dedup cache cleared." });
        return false;
    }

    if (message.action === 'get_debug_log') {
        chrome.storage.local.get(['_debugLog'], (result) => {
            sendResponse({ log: result._debugLog || [] });
        });
        return true;
    }

    if (message.action === 'clear_debug_log') {
        chrome.storage.local.set({ _debugLog: [] });
        sendResponse({ cleared: true });
        return false;
    }

    return false;
});

// Tab Navigation Listener for Grid Scanning
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (scanner.isScanning && tabId === scanner.currentTargetTabId && changeInfo.status === 'complete' && !scanner.zoneInjected) {
        scanner.zoneInjected = true;
        const zoneIndex = scanner.totalZones - scanner.queue.length;

        chrome.runtime.sendMessage({
            type: "progress",
            message: `[Zone ${zoneIndex}/${scanner.totalZones}] 🗺 Maps loaded. Deploying scraper in 5s...`,
            found: scanner.totalLeads, scraped: scanner.totalLeads
        }).catch(() => { });

        setTimeout(() => {
            if (!scanner.isScanning) return;

            chrome.tabs.sendMessage(tabId, { action: "reset" }, () => {
                if (chrome.runtime.lastError) { /* content script not ready yet */ }
            });

            setTimeout(() => {
                if (!scanner.isScanning) return;
                chrome.tabs.sendMessage(tabId, {
                    action: "extract_all",
                    speed: scanner.extractionSpeed,
                    bounds: scanner.gridBounds || null
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        logger.log('WARN', 'BG', `Zone ${zoneIndex} inject failed, retrying in 3s...`);
                        setTimeout(() => {
                            if (!scanner.isScanning) return;
                            chrome.tabs.sendMessage(tabId, {
                                action: "extract_all",
                                speed: scanner.extractionSpeed,
                                bounds: scanner.gridBounds || null
                            }, (retryResponse) => {
                                if (chrome.runtime.lastError) {
                                    logger.log('ERROR', 'BG', `Zone ${zoneIndex} inject failed after retry. Skipping.`);
                                    chrome.runtime.sendMessage({
                                        type: "progress", _fromBg: true, status: "navigating",
                                        message: `[Zone ${zoneIndex}/${scanner.totalZones}] ⚠ Failed to inject. Skipping zone...`,
                                        found: scanner.totalLeads, scraped: scanner.totalLeads
                                    }).catch(() => { });
                                    setTimeout(() => scanner.nextZone(), 1500);
                                }
                            });
                        }, 3000);
                    }
                });
            }, 500);
        }, 5000);
    }
});
