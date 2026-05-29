/**
 * background/scanner.js
 * Multi-Tab Grid Scanning Orchestrator
 */

import { logger } from './logger.js';
import { config } from '../config.js';

export class GridWorker {
    constructor(workerId, apiUrl, onProgress, onDone, onLeads) {
        this.id = workerId;
        this.apiUrl = apiUrl;
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
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Grid fetch failed");

            this.queue = data.grid;
            this.totalZones = this.queue.length;

            // 2. Create tab now that we are ready
            const currentWin = await chrome.windows.getCurrent();
            const tab = await chrome.tabs.create({
                active: false,
                url: 'about:blank',
                windowId: currentWin.id
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
        chrome.storage.local.get(['apiUrl'], (result) => {
            const stored = (result.apiUrl || '').trim();
            // Reject stale Vercel URL — use config default instead
            if (stored && !stored.includes('geolead-scraper-api.vercel.app')) {
                this.apiUrl = stored;
            } else if (stored) {
                // Auto-migrate: overwrite stale URL in storage
                chrome.storage.local.set({ apiUrl: config.apiUrl });
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
        });
    }

    async startBulk(queries, location, gridSize, maxTabs = 3, saveMode = false) {
        if (this.isScanning) throw new Error("A campaign is already running.");

        this.isScanning = true;
        this.queue = queries.map(q => ({ query: q, location, gridSize }));
        this.maxWorkers = maxTabs;
        this.saveMode = saveMode;
        this.totalLeads = 0;
        this.totalSaved = 0;
        this.totalDupes = 0;
        this.bufferedLeads = [];
        this.globalSeenIds.clear();
        this.globalSeenPhones.clear();

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
        } else if (uniqueLeads.length > 0) {
            await this.saveToApi(uniqueLeads, query);
        }
    }

    async saveToApi(leads, query) {
        try {
            const res = await fetch(`${this.apiUrl}/api/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({ leads, search_query: query })
            });
            const result = await res.json();
            if (!res.ok) {
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
            logger.log('ERROR', 'CAMPAIGN', `Save failed: ${err.message}`);
            chrome.runtime.sendMessage({
                type: "progress",
                _fromBg: true,
                status: "error",
                message: `❌ Database Upload Failed: ${err.message}`
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
