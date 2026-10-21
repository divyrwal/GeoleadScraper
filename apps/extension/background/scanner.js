/**
 * background/scanner.js
 * Multi-Tab Grid Scanning Orchestrator
 *
 * v7.1 — Fixes:
 *   - BUG-13 Fix A: Zone re-entry when extraction < 50% of found
 *   - BUG-7: Use getLastFocused() instead of getCurrent() for tab creation
 *   - BUG-10: Read API key from chrome.storage.local (not hardcoded config)
 *   - SMELL-4: Retry with backoff on API save failure (up to 3 retries)
 *   - R2: Persist buffered leads to chrome.storage.local for crash safety
 */

import { logger } from './logger.js';
import { config } from '../config.js';

export class GridWorker {
    constructor(workerId, apiUrl, apiKey, onProgress, onDone, onLeads) {
        this.id = workerId;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.onProgress = onProgress;
        this.onDone = onDone;
        this.onLeads = onLeads;

        this.isScanning = false;
        this.queue = [];
        this.totalZones = 0;
        this.currentQuery = '';
        this.currentLocation = '';
        this.tabId = null;
        this.speed = 300;
        this.saveMode = false;
        this.zoneInjected = false;
        this.zoneStartTime = 0;

        // BUG-13 Fix A: Zone re-entry tracking
        this._currentZoneUrl = '';
        this._currentZone = null;
        this._retriedCurrentZone = false;

        // Watchdogs
        this.zoneWatchdogTimer = null;
        this.activityWatchdogTimer = null;
        this.lastActivityTime = Date.now();
        this.ZONE_TIMEOUT_MS = 120000;
        this.ACTIVITY_TIMEOUT_MS = 90000;
    }

    async start(query, location, speed, gridSize, saveMode) {
        this.isScanning = true;
        this.currentQuery = query;
        this.currentLocation = location;
        this.speed = speed;
        this.saveMode = saveMode;

        // 1. Fetch Grid First
        try {
            const res = await fetch(`${this.apiUrl}/api/search/grid?location=${encodeURIComponent(location)}&gridSize=${gridSize}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Grid fetch failed");

            this.queue = data.grid;
            this.totalZones = this.queue.length;

            // BUG-7: Use getLastFocused instead of getCurrent for reliable window ID
            let windowId;
            try {
                const win = await chrome.windows.getLastFocused();
                windowId = win?.id;
            } catch (e) {
                // Fallback: let Chrome pick the window
                windowId = undefined;
            }

            const tab = await chrome.tabs.create({
                active: false,
                url: 'about:blank',
                ...(windowId ? { windowId } : {})
            });
            this.tabId = tab.id;
            logger.log('INFO', `Worker ${this.id}`, `Created tab ${this.tabId}. Starting zones...`);

            this.nextZone();
        } catch (err) {
            logger.log('ERROR', `Worker ${this.id}`, `Startup failed: ${err.message}`);
            this.onProgress(this.id, { status: "error", message: `❌ [Worker ${this.id}] Startup Failed: ${err.message}` });
            this.stop();
        }
    }

    async nextZone() {
        this.clearWatchdogs();
        if (!this.isScanning || this.queue.length === 0) {
            this.onDone(this.id);
            return;
        }

        const zone = this.queue.shift();
        const zoneIndex = this.totalZones - this.queue.length;

        // BUG-13 Fix A: Save current zone for potential re-entry
        this._currentZone = zone;
        this._retriedCurrentZone = false;

        this.onProgress(this.id, {
            status: "navigating",
            message: `[Zone ${zoneIndex}/${this.totalZones}] 📍 Worker ${this.id} -> ${zone.label}`,
            zoneIndex,
            totalZones: this.totalZones,
            zoneLabel: zone.label
        });

        const query = this.currentLocation
            ? `${this.currentQuery} in ${this.currentLocation}`
            : this.currentQuery;

        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${zone.lat},${zone.lng},14z`;
        this._currentZoneUrl = mapsUrl;
        this.zoneInjected = false;
        this.zoneStartTime = Date.now();
        chrome.tabs.update(this.tabId, { url: mapsUrl });

        this.startWatchdogs();
    }

    startWatchdogs() {
        this.lastActivityTime = Date.now();
        this.zoneWatchdogTimer = setTimeout(() => {
            logger.log('WARN', `Worker ${this.id}`, `Zone timeout. Skipping.`);
            this.nextZone();
        }, this.ZONE_TIMEOUT_MS);

        this.activityWatchdogTimer = setInterval(() => {
            const idle = Date.now() - this.lastActivityTime;
            if (idle > this.ACTIVITY_TIMEOUT_MS) {
                logger.log('WARN', `Worker ${this.id}`, `Inactivity detected (${idle}ms). skipping.`);
                this.nextZone();
            }
        }, 15000);
    }

    clearWatchdogs() {
        if (this.zoneWatchdogTimer) clearTimeout(this.zoneWatchdogTimer);
        if (this.activityWatchdogTimer) clearInterval(this.activityWatchdogTimer);
        this.zoneWatchdogTimer = null;
        this.activityWatchdogTimer = null;
    }

    stop() {
        this.isScanning = false;
        this.clearWatchdogs();
        if (this.tabId) {
            chrome.tabs.remove(this.tabId).catch(() => { });
            this.tabId = null;
        }
    }

    handleLeadsBatch(leads) {
        this.lastActivityTime = Date.now();
        // Must handle the async result to avoid silently losing leads
        Promise.resolve(this.onLeads(this.id, leads, this.currentQuery)).catch(err => {
            console.error(`[Worker ${this.id}] Lead handling error:`, err);
        });
    }

    handleZoneDone(message) {
        // Guard against duplicate "done" messages for the same zone
        const now = Date.now();
        if (this._lastDoneTime && (now - this._lastDoneTime) < 2000) return;
        this._lastDoneTime = now;

        // BUG-13 Fix A: Zone re-entry on short extraction
        // Content script sends TWO "done" messages with DIFFERENT field names:
        //   1. progress/done: { found: N, scraped: M }
        //   2. extraction_done: { total_found: N, total_scraped: M }
        // Read from both to ensure we get the actual values.
        const extracted = message.total_scraped || message.scraped || 0;
        const found = message.total_found || message.found || 0;
        if (found > 20 && extracted < found * 0.5 && !this._retriedCurrentZone && this._currentZoneUrl) {
            this._retriedCurrentZone = true;
            logger.log('WARN', `Worker ${this.id}`, `Short zone: ${extracted}/${found}. Re-entering zone...`);
            this.onProgress(this.id, {
                status: "navigating",
                message: `⚠️ Only ${extracted}/${found} extracted. Re-entering zone...`
            });
            // Re-navigate to the same zone URL
            this.zoneInjected = false;
            this.zoneStartTime = Date.now();
            chrome.tabs.update(this.tabId, { url: this._currentZoneUrl });
            this.startWatchdogs();
            return;
        }

        this.onProgress(this.id, {
            status: "navigating",
            message: `✓ Zone extraction complete. Checking next...`
        });

        setTimeout(() => this.nextZone(), 1000);
    }
}

export class CampaignManager {
    constructor() {
        this.apiUrl = config.apiUrl;
        this.apiKey = config.apiKey;
        this.isScanning = false;
        this.queue = []; // Array of {query, location, gridSize}
        this.workers = new Map(); // workerId -> GridWorker
        this.maxWorkers = 3;

        this.totalLeads = 0;
        this.totalSaved = 0;
        this.totalDupes = 0;
        this.bufferedLeads = [];
        this.saveMode = false;
        this.globalSeenIds = new Set();
        this.globalSeenPhones = new Set();

        this.initStorage();
    }

    initStorage() {
        chrome.storage.local.get(['apiUrl', 'apiKey', '_bufferedLeads'], (result) => {
            const stored = (result.apiUrl || '').trim();
            // Reject stale Vercel URL — use config default instead
            if (stored && !stored.includes('geolead-scraper-api.vercel.app')) {
                this.apiUrl = stored;
            } else if (stored) {
                // Auto-migrate: overwrite stale URL in storage
                chrome.storage.local.set({ apiUrl: config.apiUrl });
            }

            // BUG-10: Load API key from storage if available
            if (result.apiKey) {
                this.apiKey = result.apiKey;
            }

            // R2: Restore buffered leads from storage (crash safety)
            if (result._bufferedLeads && Array.isArray(result._bufferedLeads) && result._bufferedLeads.length > 0) {
                this.bufferedLeads = result._bufferedLeads;
                logger.log('INFO', 'CAMPAIGN', `Restored ${this.bufferedLeads.length} buffered leads from storage`);
            }

            logger.log('INFO', 'CAMPAIGN', `API URL: ${this.apiUrl}`);
        });
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.apiUrl && changes.apiUrl.newValue) {
                const newUrl = changes.apiUrl.newValue.trim();
                if (newUrl && !newUrl.includes('geolead-scraper-api.vercel.app')) {
                    this.apiUrl = newUrl;
                    logger.log('INFO', 'CAMPAIGN', `API URL updated: ${this.apiUrl}`);
                }
            }
            // BUG-10: Listen for API key changes
            if (changes.apiKey && changes.apiKey.newValue) {
                this.apiKey = changes.apiKey.newValue;
                logger.log('INFO', 'CAMPAIGN', `API Key updated`);
            }
        });
    }

    async startBulk(queries, location, gridSize, maxTabs = 3, saveMode = false, targetTabId = null) {
        if (this.isScanning) throw new Error("A campaign is already running.");

        this.isScanning = true;
        this.queue = queries.map(q => ({ query: q, location, gridSize }));
        this.maxWorkers = maxTabs;
        this.saveMode = saveMode;
        this.targetTabId = targetTabId; // BUG-12: Store for first worker to reuse
        this.totalLeads = 0;
        this.totalSaved = 0;
        this.totalDupes = 0;
        this.bufferedLeads = [];
        this.globalSeenIds.clear();
        this.globalSeenPhones.clear();

        // R2: Clear persisted buffer on fresh campaign
        chrome.storage.local.remove('_bufferedLeads');

        logger.log('INFO', 'CAMPAIGN', `Starting bulk campaign: ${queries.length} queries, ${maxTabs} tabs.`);
        this.fillWorkers();
    }

    fillWorkers() {
        if (!this.isScanning) return;

        while (this.workers.size < this.maxWorkers && this.queue.length > 0) {
            const task = this.queue.shift();
            const workerId = Date.now() + Math.random().toString(36).substr(2, 5);

            const worker = new GridWorker(
                workerId,
                this.apiUrl,
                this.apiKey, // BUG-10: Pass API key to worker
                (wid, msg) => this.relayProgress(wid, msg),
                (wid) => this.handleWorkerDone(wid),
                (wid, leads, q) => this.handleLeads(wid, leads, q)
            );

            this.workers.set(workerId, worker);
            worker.start(task.query, task.location, 300, task.gridSize, this.saveMode);
        }

        if (this.workers.size === 0 && this.queue.length === 0) {
            setTimeout(() => this.finishCampaign(), 500);
        }
    }

    handleWorkerDone(workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.stop();
            this.workers.delete(workerId);
        }
        this.fillWorkers();
    }

    relayProgress(workerId, msg) {
        msg.type = 'progress'; // Required for sidebar handleMessage to process it
        msg._fromBg = true;
        msg.workerId = workerId;

        // Inject global campaign stats
        msg.campaignFound = this.totalLeads;
        msg.campaignSaved = this.totalSaved;
        msg.campaignDupes = this.totalDupes;
        msg.campaignQueue = this.queue.length;
        msg.campaignTotal = this.queue.length + this.workers.size;

        chrome.runtime.sendMessage(msg).catch(() => { });
    }

    async handleLeads(workerId, leads, query) {
        const uniqueLeads = leads.filter(lead => {
            const id = lead.google_place_id;
            const phone = lead.phone_number;
            if (id && !id.startsWith('gen_') && this.globalSeenIds.has(id)) return false;
            if (phone && this.globalSeenPhones.has(phone)) return false;
            if (id) this.globalSeenIds.add(id);
            if (phone) this.globalSeenPhones.add(phone);
            return true;
        });

        this.totalLeads += uniqueLeads.length;
        if (this.saveMode) {
            this.bufferedLeads.push(...uniqueLeads);
            // R2: Persist buffer to storage periodically (every 10 leads)
            if (this.bufferedLeads.length % 10 < uniqueLeads.length) {
                this._persistBuffer();
            }
        } else if (uniqueLeads.length > 0) {
            await this.saveToApi(uniqueLeads, query);
        }
    }

    // R2: Persist buffer to chrome.storage.local for crash safety
    _persistBuffer() {
        try {
            chrome.storage.local.set({ _bufferedLeads: this.bufferedLeads });
        } catch (e) {
            logger.log('WARN', 'CAMPAIGN', `Failed to persist buffer: ${e.message}`);
        }
    }

    // SMELL-4: Retry with exponential backoff on API save failure
    async saveToApi(leads, query, retryCount = 0) {
        const MAX_RETRIES = 3;
        try {
            const res = await fetch(`${this.apiUrl}/api/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ leads, search_query: query })
            });
            const result = await res.json();

            if (!res.ok) {
                // Handle specific status codes
                if (res.status === 429 && retryCount < MAX_RETRIES) {
                    // Rate limited — wait and retry
                    const delay = Math.pow(2, retryCount) * 2000;
                    logger.log('WARN', 'CAMPAIGN', `Rate limited (429). Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    return this.saveToApi(leads, query, retryCount + 1);
                }

                const detailsStr = (result.error === "Validation failed" && result.details && Array.isArray(result.details))
                    ? `: ${result.details.map(d => `${d.path.join('.')}: ${d.message}`).join(', ')}`
                    : '';
                throw new Error((result.error || `HTTP ${res.status}`) + detailsStr);
            }
            this.totalSaved += (result.inserted || 0);
            this.totalDupes += (result.updated || 0) + (result.skipped || 0);

            // Relay save stats to sidebar
            chrome.runtime.sendMessage({
                type: "progress",
                _fromBg: true,
                status: "saving",
                saved: this.totalSaved,
                dupes: this.totalDupes,
                message: `💾 Saved ${result.inserted || 0} new, ${result.updated || 0} updated, ${result.skipped || 0} skipped`
            }).catch(() => { });
        } catch (err) {
            if (retryCount < MAX_RETRIES) {
                const delay = Math.pow(2, retryCount) * 1000;
                logger.log('WARN', 'CAMPAIGN', `Save failed (attempt ${retryCount + 1}/${MAX_RETRIES}): ${err.message}. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                return this.saveToApi(leads, query, retryCount + 1);
            }

            logger.log('ERROR', 'CAMPAIGN', `Save failed after ${MAX_RETRIES} retries: ${err.message}`);

            // SMELL-4: On final failure, buffer leads locally instead of losing them
            this.bufferedLeads.push(...leads);
            this._persistBuffer();

            chrome.runtime.sendMessage({
                type: "progress",
                _fromBg: true,
                status: "error",
                message: `❌ Upload Failed (buffered ${leads.length} leads locally): ${err.message}`
            }).catch(() => { });
        }
    }

    async finishCampaign() {
        this.isScanning = false;
        if (this.saveMode && this.bufferedLeads.length > 0) {
            // Upload chunks
            const batchSize = 100;
            for (let i = 0; i < this.bufferedLeads.length; i += batchSize) {
                await this.saveToApi(this.bufferedLeads.slice(i, i + batchSize), "Bulk Campaign");
            }
        }

        // R2: Clear persisted buffer after successful upload
        chrome.storage.local.remove('_bufferedLeads');

        logger.log('INFO', 'CAMPAIGN', `Campaign finished. Total unique: ${this.totalLeads}`);
        chrome.runtime.sendMessage({ type: "extraction_done", _fromBg: true, total_scraped: this.totalLeads }).catch(() => { });
    }

    stop() {
        this.isScanning = false;
        this.queue = [];
        for (const worker of this.workers.values()) {
            worker.stop();
        }
        this.workers.clear();
    }
}

export const scanner = new CampaignManager();
