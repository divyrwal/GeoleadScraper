/**
 * background/scanner.js
 * Grid Scanning Orchestrator
 */

import { logger } from './logger.js';

export class GridScanner {
    constructor() {
        this.apiUrl = 'http://localhost:4000';

        // Scan State
        this.isScanning = false;
        this.queue = [];
        this.totalZones = 0;
        this.currentQuery = '';
        this.currentTargetTabId = null;
        this.extractionSpeed = 300;
        this.totalLeads = 0;
        this.zoneInjected = false;

        // Dedup
        this.globalSeenIds = new Set();
        this.globalSeenPhones = new Set();
        this.zoneStartTime = 0;
        this.currentLocation = '';
        this.gridBounds = null;

        // Watchdog & Stats
        this.zoneWatchdogTimer = null;
        this.ZONE_TIMEOUT_MS = 120000;
        this.currentZoneTimeout = this.ZONE_TIMEOUT_MS;

        this.activityWatchdogTimer = null;
        this.lastActivityTime = Date.now();
        this.ACTIVITY_TIMEOUT_MS = 90000;

        this.zoneStats = [];

        this.initStorage();
    }

    initStorage() {
        chrome.storage.local.get(['apiUrl'], (result) => {
            if (result.apiUrl) this.apiUrl = result.apiUrl;
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes.apiUrl) this.apiUrl = changes.apiUrl.newValue;
        });
    }

    // --- Watchdogs ---

    startActivityWatchdog() {
        this.clearActivityWatchdog();
        this.lastActivityTime = Date.now();

        this.activityWatchdogTimer = setInterval(() => {
            if (!this.isScanning) {
                this.clearActivityWatchdog();
                return;
            }

            const elapsed = Math.round((Date.now() - this.lastActivityTime) / 1000);

            if (elapsed >= this.ACTIVITY_TIMEOUT_MS / 1000) {
                const zoneIndex = this.totalZones - this.queue.length;
                logger.log('WARN', 'BG', `Zone ${zoneIndex} stalled — no activity for ${elapsed}s. Force-skipping.`);

                chrome.runtime.sendMessage({
                    type: 'progress', _fromBg: true, status: 'navigating',
                    message: `⚠ Zone ${zoneIndex} stalled (${elapsed}s idle). Skipping...`,
                    found: this.totalLeads, scraped: this.totalLeads
                }).catch(() => { });

                this.clearActivityWatchdog();

                if (this.currentTargetTabId) {
                    chrome.tabs.sendMessage(this.currentTargetTabId, { action: 'stop' }).catch(() => { });
                }
                setTimeout(() => this.nextZone(), 1000);

            } else if (elapsed >= 45) {
                logger.log('WARN', 'BG', `Zone activity warning: ${elapsed}s since last leads_batch`);
            }
        }, 15000);
    }

    clearActivityWatchdog() {
        if (this.activityWatchdogTimer) {
            clearInterval(this.activityWatchdogTimer);
            this.activityWatchdogTimer = null;
        }
    }

    clearZoneWatchdog() {
        if (this.zoneWatchdogTimer) {
            clearTimeout(this.zoneWatchdogTimer);
            this.zoneWatchdogTimer = null;
        }
    }

    startZoneWatchdog(timeoutMs) {
        this.clearZoneWatchdog();
        this.currentZoneTimeout = timeoutMs || this.ZONE_TIMEOUT_MS;

        this.zoneWatchdogTimer = setTimeout(() => {
            if (!this.isScanning) return;
            const zoneIndex = this.totalZones - this.queue.length;
            logger.log('WARN', 'BG', `Zone ${zoneIndex}/${this.totalZones} timed out after ${this.currentZoneTimeout / 1000}s. Force-skipping.`);

            chrome.runtime.sendMessage({
                type: "progress",
                status: "navigating",
                message: `⏱ Zone ${zoneIndex}/${this.totalZones} timed out. Skipping to next zone...`,
                found: this.totalLeads, scraped: this.totalLeads
            }).catch(() => { });

            this.nextZone();
        }, this.currentZoneTimeout);
    }

    resetZoneWatchdog() {
        if (this.zoneWatchdogTimer && this.isScanning) {
            this.startZoneWatchdog(this.currentZoneTimeout);
        }
    }

    // --- API & Saves ---

    async saveLeads(leads, searchQuery) {
        try {
            const res = await fetch(`${this.apiUrl}/api/leads`, {
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

            logger.log('INFO', 'BG', `API save: ${result.inserted} inserted, ${result.skipped} skipped, ${result.updated} updated`);
        } catch (err) {
            logger.log('ERROR', 'BG', `API save failed: ${err.message}`, { url: this.apiUrl });
        }
    }

    // --- Core Operations ---

    async startScan(query, location, speed, tabId, gridSize = 3) {
        if (this.isScanning) throw new Error("A grid scan is already in progress.");

        this.isScanning = true;
        this.queue = [];
        this.currentQuery = query;
        this.currentTargetTabId = tabId;
        this.extractionSpeed = speed;
        this.totalLeads = 0;
        this.globalSeenPhones.clear();
        this.globalSeenIds.clear();
        this.zoneStats = [];

        chrome.runtime.sendMessage({
            type: "progress",
            status: "starting",
            message: `🌐 RECON: Calculating ${gridSize}×${gridSize} geographic grid for "${location}"...`,
            found: 0, scraped: 0
        }).catch(() => { });

        const res = await fetch(`${this.apiUrl}/api/search/grid?location=${encodeURIComponent(location)}&gridSize=${gridSize}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
            this.isScanning = false;
            throw new Error(data.error || "Failed to generate grid.");
        }

        this.queue = data.grid;
        this.totalZones = this.queue.length;
        this.currentLocation = location;
        this.gridBounds = data.bounds || null;

        chrome.runtime.sendMessage({
            type: "progress",
            status: "navigating",
            message: `🗺 Grid locked: ${this.totalZones} zones identified. Deploying scanner...`,
            found: 0, scraped: 0
        }).catch(() => { });

        this.nextZone();
    }

    nextZone() {
        this.clearZoneWatchdog();

        if (!this.isScanning) return;

        if (this.queue.length === 0) {
            this.isScanning = false;
            this.globalSeenIds.clear();

            const zoneSummary = this.zoneStats.map(z => `Z${z.zone}: ${z.scraped}`).join(' | ');

            chrome.runtime.sendMessage({
                type: "progress",
                _fromBg: true,
                status: "done",
                message: `✅ GRID COMPLETE: ${this.totalLeads} unique leads from ${this.totalZones} zones. [${zoneSummary}]`,
                found: this.totalLeads, scraped: this.totalLeads
            }).catch(() => { });

            chrome.runtime.sendMessage({
                type: "extraction_done",
                _fromBg: true,
                total_found: this.totalLeads,
                total_scraped: this.totalLeads
            }).catch(() => { });

            return;
        }

        const zone = this.queue.shift();
        const zoneIndex = this.totalZones - this.queue.length;

        chrome.runtime.sendMessage({
            type: "progress",
            status: "navigating",
            message: `[Zone ${zoneIndex}/${this.totalZones}] 📍 Navigating to ${zone.label}...`,
            found: this.totalLeads, scraped: this.totalLeads
        }).catch(() => { });

        const lat = zone.lat.toFixed(6);
        const lng = zone.lng.toFixed(6);

        const searchTerm = this.currentLocation
            ? `${this.currentQuery} in ${this.currentLocation}`
            : this.currentQuery;

        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}/@${lat},${lng},14z`;

        this.zoneInjected = false;
        this.zoneStartTime = Date.now();
        chrome.tabs.update(this.currentTargetTabId, { url: mapsUrl });

        this.startZoneWatchdog(this.ZONE_TIMEOUT_MS);
        this.startActivityWatchdog();
    }

    stop() {
        this.isScanning = false;
        this.queue = [];
        this.clearZoneWatchdog();
        this.clearActivityWatchdog();
        this.globalSeenIds.clear();

        if (this.currentTargetTabId) {
            chrome.tabs.sendMessage(this.currentTargetTabId, { action: "stop" }).catch(() => { });
        }
    }

    // --- Message Handlers ---

    handleExtractionDone(message) {
        // Guard against double calls — Chrome broadcasts to all extension contexts
        const now = Date.now();
        if (this._lastDoneTime && (now - this._lastDoneTime) < 5000) {
            return; // Ignore duplicate within 5 seconds
        }
        this._lastDoneTime = now;

        this.clearZoneWatchdog();
        this.clearActivityWatchdog();
        this.totalLeads += message.total_scraped || 0;

        const zoneIndex = this.totalZones - this.queue.length;
        const zoneDuration = this.zoneStartTime ? Math.round((Date.now() - this.zoneStartTime) / 1000) : 0;

        logger.log('INFO', 'BG', `Zone ${zoneIndex} done in ${zoneDuration}s: found=${message.total_found}, scraped=${message.total_scraped}, stopped=${message.stopped}`);

        this.zoneStats.push({
            zone: zoneIndex,
            found: message.total_found || 0,
            scraped: message.total_scraped || 0
        });

        if (message.stopped) {
            this.isScanning = false;
            this.queue = [];
            this.globalSeenIds.clear();
            chrome.runtime.sendMessage(message).catch(() => { });
        } else {
            setTimeout(() => this.nextZone(), 2000);
        }
    }

    handleLeadsBatch(message) {
        const uniqueLeads = message.leads.filter(lead => {
            if (lead.google_place_id && !lead.google_place_id.startsWith('gen_') && this.globalSeenIds.has(lead.google_place_id)) {
                return false;
            }
            if (lead.phone_number && this.globalSeenPhones.has(lead.phone_number)) {
                return false;
            }
            if (lead.google_place_id) this.globalSeenIds.add(lead.google_place_id);
            if (lead.phone_number) this.globalSeenPhones.add(lead.phone_number);
            return true;
        });

        const dupCount = message.leads.length - uniqueLeads.length;
        if (dupCount > 0) {
            logger.log('INFO', 'BG', `Filtered ${dupCount} cross-zone dupes from batch of ${message.leads.length}`);
        }

        this.resetZoneWatchdog();
        this.lastActivityTime = Date.now();

        if (uniqueLeads.length > 0) {
            this.saveLeads(uniqueLeads, message.search_query);
        }
    }
}

export const scanner = new GridScanner();
