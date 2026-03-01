/**
 * sidebar/scraper.js
 * Scraper process controller linking UI to background service workers.
 * v7.0 — No tabs, no autopilot. Always grid scan mode.
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
    }

    async startExtraction() {
        await this.state.checkActiveTab();

        this.state.totalSaved = 0;
        this.state.totalDuplicates = 0;
        this.state.extractionStartTime = Date.now();
        this.term.clear();

        // Reset counters
        this.ui.savedCount.textContent = '0';
        this.ui.dupCount.textContent = '0';
        this.ui.foundCount.textContent = '0';
        this.ui.scrapedCount.textContent = '0';

        // UI state: scanning
        this.ui.extractBtn.disabled = true;
        this.ui.extractBtn.classList.add('scanning');
        this.ui.extractBtn.querySelector('.btn-text').textContent = "Scanning...";
        this.ui.stopBtn.classList.remove('hidden');
        this.ui.progressSection.classList.remove('hidden');
        this.ui.progressBar.style.width = '0%';
        this.ui.progressPercent.textContent = '0%';
        this.ui.progressMessage.textContent = 'Initializing scanner...';
        this.ui.resultsDiv.classList.remove('hidden');

        const query = this.ui.browserQuery.value.trim();
        const location = this.ui.browserLocation.value.trim();

        // Grid scan mode (primary)
        if (query && location) {
            this.term.add(`Grid Scan: "${query}" in "${location}"`, 'info');

            chrome.runtime.sendMessage({
                action: "start_grid_scan",
                query, location,
                gridSize: parseInt(this.ui.browserGridSize.value) || 3,
                targetTabId: this.state.tabData.id
            }, (response) => {
                if (chrome.runtime.lastError) { /* bg async */ }
                if (response && response.error) {
                    this.term.add(`ERROR: ${response.error}`, 'error');
                    this.onComplete(0, 0);
                }
            });
            return;
        }

        // Single page fallback
        if (!this.state.isGoogleMaps) {
            this.term.add('Enter a query + location, or navigate to Google Maps', 'error');
            this.onComplete(0, 0);
            return;
        }

        this.term.add('Single page extraction...', 'info');
        try {
            chrome.tabs.sendMessage(this.state.tabData.id, {
                action: "extract_all"
            }, (response) => {
                if (chrome.runtime.lastError) {
                    this.onComplete(0, 0);
                    this.term.add('Content script not loaded. Refresh Maps.', 'error');
                    return;
                }
                if (response && response.error) {
                    this.onComplete(0, 0);
                    this.term.add(`Error: ${response.error}`, 'error');
                }
            });
        } catch (err) {
            this.onComplete(0, 0);
            this.term.add(`Fatal: ${err.message}`, 'error');
        }
    }

    async stopExtraction() {
        await this.state.checkActiveTab();

        // Always try both stop methods
        chrome.runtime.sendMessage({ action: "stop_grid_scan" });
        if (this.state.tabData) {
            chrome.tabs.sendMessage(this.state.tabData.id, { action: "stop" });
        }

        this.ui.stopBtn.classList.add('hidden');
        this.ui.progressMessage.textContent = "⛔ Stopping...";
        this.term.add('Stop signal sent.', 'error');
    }

    handleMessage(message) {
        // Only process messages from background (tagged with _fromBg)
        if ((message.type === 'progress' || message.type === 'extraction_done' || message.type === 'save_result') && !message._fromBg) {
            return;
        }

        if (message.type === "progress") {
            this.ui.progressSection.classList.remove('hidden');
            this.ui.resultsDiv.classList.remove('hidden');
            this.ui.foundCount.textContent = message.found || 0;
            this.ui.scrapedCount.textContent = message.scraped || 0;
            this.ui.progressMessage.textContent = message.message || "";

            // Extract zone info from message
            const zoneMatch = message.message?.match(/\[Zone (\d+)\/(\d+)\]/);
            if (zoneMatch) {
                this.ui.progressZone.textContent = `Zone ${zoneMatch[1]} / ${zoneMatch[2]}`;
            }

            // Log to terminal
            if (message.message && message.status !== 'searching' && message.status !== 'scrolling') {
                let logType = '';
                if (message.status === 'done') logType = message.message.includes('❌') ? 'error' : 'success';
                else if (message.status === 'navigating') logType = 'info';
                this.term.add(message.message, logType);
            }

            // Progress bar
            if (message.processed && message.found) {
                const pct = Math.round((message.processed / message.found) * 100);
                this.ui.progressBar.style.width = `${pct}%`;
                this.ui.progressPercent.textContent = `${pct}%`;
            }

            if (message.status === "done") {
                this.onComplete(message.found, message.scraped);
            }
        }

        if (message.type === "save_result") {
            this.state.totalSaved += (message.inserted || 0);
            this.state.totalDuplicates += (message.updated || 0) + (message.skipped || 0);
            this.ui.savedCount.textContent = this.state.totalSaved;
            this.ui.dupCount.textContent = this.state.totalDuplicates;

            if (message.inserted > 0) {
                this.term.add(`💾 Saved ${message.inserted} leads`, 'success');
            }
        }

        if (message.type === "extraction_done") {
            this.onComplete(message.total_found, message.total_scraped);
        }
    }

    onComplete(found, scraped) {
        this.ui.extractBtn.classList.remove('scanning');
        this.ui.extractBtn.disabled = false;
        this.ui.extractBtn.querySelector('.btn-text').textContent = "Start Grid Scan";
        this.ui.stopBtn.classList.add('hidden');
        this.ui.progressBar.style.width = '100%';
        this.ui.progressPercent.textContent = '100%';
        this.ui.progressMessage.textContent = '✅ Scan Complete';

        this.term.add(`✅ Complete: ${scraped} leads extracted`, 'success');
    }
}
