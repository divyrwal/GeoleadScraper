/**
 * background/index.js
 * The main entry point for the background service worker.
 */

import { logger } from './logger.js';
import { scanner } from './scanner.js';

// Open sidebar on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Log Relay
    if (message.type === 'debug_log_entry') {
        logger.log(message.level, message.source, message.message, message.data);
        return false;
    }

    // 2. Worker Progress Relay
    if (message.type === 'progress' || message.type === 'extraction_done') {
        if (scanner.isScanning && sender.tab) {
            const worker = Array.from(scanner.workers.values()).find(w => w.tabId === sender.tab.id);
            if (worker) {
                message.workerId = worker.id;
                message._fromBg = true;
                
                // Trigger next zone if done
                if (message.status === 'done' || message.type === 'extraction_done') {
                    worker.handleZoneDone(message);
                }
            }
        }
        
        // Only relay progress messages to sidebar — NOT extraction_done from content scripts.
        // The CampaignManager's finishCampaign() sends its own extraction_done when ALL zones are done.
        if (message._fromBg && message.type === 'progress') {
            chrome.runtime.sendMessage(message).catch(() => { });
        }
        return false;
    }

    // 3. Leads Relay
    if (message.type === 'leads_batch' && message.leads) {
        if (scanner.isScanning && sender.tab) {
            const worker = Array.from(scanner.workers.values()).find(w => w.tabId === sender.tab.id);
            if (worker) worker.handleLeadsBatch(message.leads);
        }
    }

    // 4. Action Handlers
    if (message.action === 'start_grid_scan') {
        // Legacy Support for single tab mode (treated as 1-tab campaign)
        scanner.startBulk([message.query], message.location, message.gridSize || 3, 1, message.saveMode)
        .catch(err => {
            chrome.runtime.sendMessage({ type: "progress", _fromBg: true, status: "error", message: `❌ Error: ${err.message}` });
        });
        sendResponse({ started: true });
        return true;
    }

    if (message.action === 'start_campaign') {
        logger.log('INFO', 'BG', `Campaign started: ${message.queries.length} queries, ${message.maxTabs} tabs`);
        scanner.startBulk(message.queries, message.location, message.gridSize || 3, message.maxTabs || 3, message.saveMode)
        .catch(err => {
            chrome.runtime.sendMessage({ type: "progress", _fromBg: true, status: "error", message: `❌ Campaign Error: ${err.message}` });
        });
        sendResponse({ started: true });
        return true;
    }

    if (message.action === 'stop_grid_scan') {
        scanner.stop();
        return false;
    }

    if (message.action === 'get_buffer') {
        const leads = message.full ? scanner.bufferedLeads : scanner.bufferedLeads.slice(-20);
        sendResponse({ success: true, leads, total: scanner.bufferedLeads.length });
        return false;
    }

    if (message.action === 'manual_flush') {
        (async () => {
            try {
                if (scanner.bufferedLeads.length === 0) {
                    sendResponse({ success: false, error: 'Buffer is empty' });
                    return;
                }
                const batchSize = 100;
                for (let i = 0; i < scanner.bufferedLeads.length; i += batchSize) {
                    await scanner.saveToApi(scanner.bufferedLeads.slice(i, i + batchSize), "Manual Upload");
                }
                const count = scanner.bufferedLeads.length;
                scanner.bufferedLeads = [];
                sendResponse({ success: true, uploaded: count });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true; // Keep message channel open for async sendResponse
    }

    if (message.action === 'get_debug_log') {
        chrome.storage.local.get(['_debugLog'], (result) => {
            sendResponse({ log: result._debugLog || [] });
        });
        return true; // Keep message channel open for async sendResponse
    }

    if (message.action === 'clear_debug_log') {
        chrome.storage.local.remove('_debugLog', () => {
            sendResponse({ cleared: true });
        });
        return true; // Keep message channel open for async sendResponse
    }

    return false;
});

// Multi-Tab Injection Listener with faster response
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!scanner.isScanning) return;

    const worker = Array.from(scanner.workers.values()).find(w => w.tabId === tabId);
    if (!worker) return;

    // Check for both 'complete' status OR URL change to maps
    if (changeInfo.status === 'complete' || (changeInfo.url && changeInfo.url.includes('google.com/maps'))) {
        if (worker.zoneInjected) return;
        
        // Final guard: only inject if we are actually at our target URL
        if (!tab.url || !tab.url.includes('google.com/maps/search/')) return;

        worker.zoneInjected = true;
        logger.log('INFO', `Worker ${worker.id}`, `Tab ${tabId} ready. Dispatching...`);

        // Small grace period for Maps internal redirect/vortex
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: "reset" }).catch(() => {});
            
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                    action: "extract_all",
                    speed: worker.speed,
                    workerId: worker.id
                }).catch(err => {
                    logger.log('WARN', `Worker ${worker.id}`, `Injection failed (tab busy): ${err.message}`);
                    worker.zoneInjected = false; // Retry on next update
                });
            }, 1000); // Reduced delay from 5000 to 1000
        }, 1500);
    }
});
