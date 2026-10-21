/**
 * sidebar/scraper.js
 * Scraper process controller linking UI to background service workers.
 * Multi-tab / Bulk Queue support.
 */

export class ScraperController {
    constructor(uiManager, terminal, appState) {
        this.ui = uiManager;
        this.term = terminal;
        this.state = appState;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.ui.extractBtn.addEventListener('click', () => this.startExtraction());
        this.ui.stopBtn.addEventListener('click', () => this.stopExtraction());

        chrome.runtime.onMessage.addListener((message) => this.handleMessage(message));

        // Debug log buttons
        const copyBtn = document.getElementById('copy-debug-log');
        const clearBtn = document.getElementById('clear-debug-log');
        const statusEl = document.getElementById('debug-copy-status');

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'get_debug_log' }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.log) {
                        statusEl.textContent = '⚠ No log data';
                        return;
                    }
                    const log = response.log;
                    const formatted = log.map(e => {
                        const time = e.t ? new Date(e.t).toLocaleTimeString('en-US', { hour12: false }) : '??';
                        return `[${time}] [${e.lvl}] [${e.src}] ${e.msg}${e.data ? ` | ${e.data}` : ''}`;
                    }).join('\n');

                    const header = `=== GeoLead Debug Log (${log.length} entries) ===\nExported: ${new Date().toISOString()}\n\n`;
                    navigator.clipboard.writeText(header + formatted).then(() => {
                        statusEl.textContent = `✅ ${log.length} entries copied!`;
                        setTimeout(() => { statusEl.textContent = ''; }, 3000);
                    }).catch(() => {
                        statusEl.textContent = '⚠ Clipboard denied';
                    });
                });
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'clear_debug_log' }, () => {
                    statusEl.textContent = '🗑 Cleared';
                    setTimeout(() => { statusEl.textContent = ''; }, 2000);
                });
            });
        }

        // Buffer Actions
        this.ui.uploadBufferBtn.addEventListener('click', () => this.manualFlush());
        this.ui.downloadBufferBtn.addEventListener('click', () => this.downloadBuffer());
        this.ui.viewBufferBtn.addEventListener('click', () => this.toggleBufferView());
        this.ui.closeBufferBtn.addEventListener('click', () => this.ui.bufferList.classList.add('hidden'));

        // Clear Bulk
        const clearBulkBtn = document.getElementById('clear-bulk-queries');
        if (clearBulkBtn) {
            clearBulkBtn.addEventListener('click', () => {
                this.ui.bulkQueries.value = '';
                this.term.add('🗑 Queue cleared', 'info');
            });
        }

        // SMELL-6: Only poll buffer when needed (start/stop dynamically)
        this._bufferInterval = null;
        this._startBufferPolling();
    }

    _startBufferPolling() {
        if (this._bufferInterval) return;
        this._bufferInterval = setInterval(() => this.updateBufferStatus(), 2000);
    }

    _stopBufferPolling() {
        if (this._bufferInterval) {
            clearInterval(this._bufferInterval);
            this._bufferInterval = null;
        }
    }

    updateBufferStatus() {
        if (!this.ui.browserSaveMode.checked && !this.ui.bulkSaveMode.checked) {
            this.ui.bufferSection.classList.add('hidden');
            return;
        }

        this.ui.bufferSection.classList.remove('hidden');
        chrome.runtime.sendMessage({ action: 'get_buffer' }, (response) => {
            if (response && response.success) {
                this.ui.bufferCount.textContent = `${response.total} leads`;
                if (this.lastBufferTotal !== response.total && !this.ui.bufferList.classList.contains('hidden')) {
                    this.renderBuffer(response.leads);
                }
                this.lastBufferTotal = response.total;
            }
        });
    }

    manualFlush() {
        this.term.add('☁️ Manual upload triggered...', 'info');
        chrome.runtime.sendMessage({ action: 'manual_flush' }, (response) => {
            if (response && response.success) {
                this.term.add('✅ Manual upload complete', 'success');
            } else {
                this.term.add(`❌ Manual upload failed: ${response?.error || 'Unknown error'}`, 'error');
            }
        });
    }

    downloadBuffer() {
        this.term.add('📥 Preparing file download...', 'info');
        chrome.runtime.sendMessage({ action: 'get_buffer', full: true }, (response) => {
            if (!response || !response.success || !response.leads || response.leads.length === 0) {
                this.term.add('⚠ Buffer is empty', 'warn');
                return;
            }

            const data = {
                leads: response.leads,
                exported_at: new Date().toISOString(),
                total: response.leads.length
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = url;
            a.download = `geoleads_export_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            this.term.add(`✅ Downloaded ${response.leads.length} leads as JSON`, 'success');
        });
    }

    toggleBufferView() {
        const isHidden = this.ui.bufferList.classList.toggle('hidden');
        if (!isHidden) {
            chrome.runtime.sendMessage({ action: 'get_buffer' }, (response) => {
                if (response && response.success) {
                    this.renderBuffer(response.leads);
                }
            });
        }
    }

    // S3: HTML escape to prevent XSS from business names
    _escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    renderBuffer(leads) {
        this.ui.bufferItems.innerHTML = '';
        if (!leads || leads.length === 0) {
            this.ui.bufferItems.innerHTML = '<div class="buffer-item"><span class="buffer-item-name">No leads buffered yet</span></div>';
            return;
        }

        const displayLeads = [...leads];
        displayLeads.reverse().forEach(lead => {
            const div = document.createElement('div');
            div.className = 'buffer-item';
            // S3: Escape all user-supplied data to prevent XSS
            const safeName = this._escapeHtml(lead.business_name || 'Unknown');
            const safeAddr = this._escapeHtml(lead.address || '');
            const safePhone = lead.phone_number ? ` • ${this._escapeHtml(lead.phone_number)}` : '';
            div.innerHTML = `
                <span class="buffer-item-name">${safeName}</span>
                <span class="buffer-item-loc">${safeAddr}${safePhone}</span>
            `;
            this.ui.bufferItems.appendChild(div);
        });
    }

    async startExtraction() {
        this.state.totalSaved = 0;
        this.state.totalDuplicates = 0;
        this.term.clear();

        // Common UI resetting
        this.ui.savedCount.textContent = '0';
        this.ui.dupCount.textContent = '0';
        this.ui.foundCount.textContent = '0';
        this.ui.scrapedCount.textContent = '0';
        this.ui.extractBtn.disabled = true;
        this.ui.extractBtn.classList.add('scanning');
        this.ui.stopBtn.classList.remove('hidden');
        this.ui.progressSection.classList.remove('hidden');
        this.ui.resultsDiv.classList.remove('hidden');

        if (this.ui.activeMode === 'bulk') {
            this.startBulkCampaign();
        } else {
            this.startSingleScan();
        }
    }

    async startBulkCampaign() {
        const queryText = this.ui.bulkQueries.value.trim();
        if (!queryText) {
            this.term.add("❌ Error: No queries provided for bulk mode.", "error");
            this.onComplete(0, 0);
            return;
        }

        const queries = queryText.split('\n').map(q => q.trim()).filter(q => q);
        const maxTabs = parseInt(this.ui.bulkParallelTabs.value) || 2;
        // BUG-9: Invert the checked value — checked=true now means "Direct/Live" (saveMode=false)
        const saveMode = !this.ui.bulkSaveMode.checked;

        // BUG-1: Build location from the single-mode fields (fallback for queries without embedded location)
        const country = this.ui.browserCountry.options[this.ui.browserCountry.selectedIndex]?.text || '';
        const state = this.ui.browserState.options[this.ui.browserState.selectedIndex]?.text || '';
        const city = this.ui.browserLocation.value.trim();
        let bulkLocation = '';
        if (city) bulkLocation += city;
        if (state && state !== 'Select State') bulkLocation += (bulkLocation ? ', ' : '') + state;
        if (country && country !== 'Select Country') bulkLocation += (bulkLocation ? ', ' : '') + country;

        // BUG-2: Read gridSize from the single-mode UI instead of hardcoding 3
        const gridSize = parseInt(this.ui.browserGridSize.value) || 3;

        this.term.add(`🚀 Campaign Started: ${queries.length} queries across ${maxTabs} tabs...`, "info");
        if (bulkLocation) this.term.add(`📍 Default location: ${bulkLocation}`, 'info');
        this.ui.progressMessage.textContent = "Deploying workers...";

        chrome.runtime.sendMessage({
            action: "start_campaign",
            queries,
            location: bulkLocation,
            maxTabs,
            saveMode,
            gridSize
        });
    }

    async startSingleScan() {
        await this.state.checkActiveTab();
        const query = this.ui.browserQuery.value.trim();
        const country = this.ui.browserCountry.options[this.ui.browserCountry.selectedIndex]?.text || '';
        const state = this.ui.browserState.options[this.ui.browserState.selectedIndex]?.text || '';
        const city = this.ui.browserLocation.value.trim();

        let combinedLocation = "";
        if (city) combinedLocation += city;
        if (state && state !== "Select State") combinedLocation += (combinedLocation ? ", " : "") + state;
        if (country && country !== "Select Country") combinedLocation += (combinedLocation ? ", " : "") + country;
        
        const locationStr = combinedLocation || "";

        if (!query) {
            this.term.add("❌ Error: Query is required.", "error");
            this.onComplete(0, 0);
            return;
        }

        this.term.add(`Grid Scan: "${query}" in "${locationStr}"`, 'info');
        chrome.runtime.sendMessage({
            action: "start_grid_scan",
            query, 
            location: locationStr,
            gridSize: parseInt(this.ui.browserGridSize.value) || 3,
            saveMode: this.ui.browserSaveMode.checked,
            targetTabId: this.state.tabData.id
        });
    }

    async stopExtraction() {
        chrome.runtime.sendMessage({ action: "stop_grid_scan" });
        this.ui.stopBtn.classList.add('hidden');
        this.ui.progressMessage.textContent = "⛔ Stopping...";
        this.term.add('Stop signal sent.', 'error');
    }

    handleMessage(message) {
        if (!message._fromBg) return;

        if (message.type === "progress") {
            this.ui.progressSection.classList.remove('hidden');
            this.ui.resultsDiv.classList.remove('hidden');
            
            // Stats sync
            if (message.found !== undefined) this.ui.foundCount.textContent = message.found;
            if (message.scraped !== undefined) this.ui.scrapedCount.textContent = message.scraped;
            if (message.saved !== undefined) this.ui.savedCount.textContent = message.saved;
            if (message.dupes !== undefined) this.ui.dupCount.textContent = message.dupes;
            
            this.ui.progressMessage.textContent = message.message || "";

            // Worker-specific logging with smaller font or tag
            if (message.message) {
                const prefix = message.workerId ? `[Worker ${message.workerId.slice(-4)}] ` : "";
                this.term.add(prefix + message.message, message.status === 'error' ? 'error' : 'info');
            }

            // Zone-level progress display
            if (message.zoneIndex !== undefined && message.totalZones !== undefined) {
                this.ui.progressZone.textContent = `Zone ${message.zoneIndex} / ${message.totalZones}`;
                
                // In single mode, zone progress updates the main progress bar
                if (!message.campaignTotal || message.campaignTotal <= 0) {
                    const pct = Math.max(0, Math.min(100, Math.round(((message.zoneIndex - 1) / message.totalZones) * 100)));
                    this.ui.progressBar.style.width = `${pct}%`;
                    this.ui.progressPercent.textContent = `${pct}%`;
                }
            }

            if (message.campaignTotal > 0) {
                // Bulk mode progress: based on queries completed
                const completed = message.campaignTotal - message.campaignQueue - 1; 
                const pct = Math.max(0, Math.round((completed / message.campaignTotal) * 100));
                this.ui.progressBar.style.width = `${pct}%`;
                this.ui.progressPercent.textContent = `${pct}%`;
                
                // Show aggregate campaign stats
                this.ui.foundCount.textContent = message.campaignFound || 0;
                this.ui.scrapedCount.textContent = message.campaignFound || 0;
                if (message.campaignSaved !== undefined) this.ui.savedCount.textContent = message.campaignSaved;
                if (message.campaignDupes !== undefined) this.ui.dupCount.textContent = message.campaignDupes;
            } else if (message.processed && message.found) {
                // Fallback / card progress (non-zone)
                const pct = Math.round((message.processed / message.found) * 100);
                this.ui.progressBar.style.width = `${pct}%`;
                this.ui.progressPercent.textContent = `${pct}%`;
            }
        }

        if (message.type === "extraction_done") {
            // BUG-11: Pass real found value instead of always 0
            this.onComplete(message.total_found || message.total_scraped || 0, message.total_scraped);
        }
    }

    onComplete(found, scraped) {
        this.ui.extractBtn.classList.remove('scanning');
        this.ui.extractBtn.disabled = false;
        this.ui.extractBtn.querySelector('.btn-text').textContent = 
            this.ui.activeMode === 'bulk' ? "Start Bulk Campaign" : "Start Grid Scan";
        this.ui.stopBtn.classList.add('hidden');
        this.ui.progressMessage.textContent = '✅ Mission Complete';
        this.ui.progressBar.style.width = `100%`;
        this.ui.progressPercent.textContent = `100%`;
        this.term.add(`✅ Complete: ${scraped} leads gathered.`, 'success');
    }
}
