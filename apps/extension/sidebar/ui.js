/**
 * sidebar/ui.js
 * DOM element references and basic UI logic for the redesigned sidebar.
 */

export class UIManager {
    constructor() {
        this.activeMode = 'single'; // 'single' or 'bulk'

        // Buttons
        this.extractBtn = document.getElementById('extract-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.saveSettingsBtn = document.getElementById('save-settings');

        // Tabs
        this.tabSingle = document.getElementById('tab-single');
        this.tabBulk = document.getElementById('tab-bulk');
        this.viewSingle = document.getElementById('view-single');
        this.viewBulk = document.getElementById('view-bulk');

        // Settings
        this.apiUrlInput = document.getElementById('api-url');
        this.settingsPanel = document.getElementById('settings-panel');

        // Status & Connection
        this.statusDot = document.querySelector('.dot');
        this.statusText = document.querySelector('.status-indicator .text');
        this.pageStatus = document.getElementById('page-status');

        // Progress
        this.progressSection = document.getElementById('progress-section');
        this.progressBar = document.getElementById('progress-bar');
        this.progressMessage = document.getElementById('progress-message');
        this.progressZone = document.getElementById('progress-zone');
        this.progressPercent = document.getElementById('progress-percent');

        // Stats
        this.resultsDiv = document.getElementById('results');
        this.foundCount = document.getElementById('found-count');
        this.scrapedCount = document.getElementById('scraped-count');
        this.savedCount = document.getElementById('saved-count');
        this.dupCount = document.getElementById('dup-count');

        // Single Mode Config
        this.browserQuery = document.getElementById('browser-query');
        this.browserCountry = document.getElementById('browser-country');
        this.browserState = document.getElementById('browser-state');
        this.browserLocation = document.getElementById('browser-location');
        this.browserGridSize = document.getElementById('browser-grid-size');
        this.browserSaveMode = document.getElementById('browser-save-mode');

        // Bulk Mode Config
        this.bulkQueries = document.getElementById('bulk-queries');
        this.bulkParallelTabs = document.getElementById('bulk-parallel-tabs');
        this.bulkSaveMode = document.getElementById('bulk-save-mode');

        // Buffer Explorer
        this.bufferSection = document.getElementById('buffer-section');
        this.bufferCount = document.getElementById('buffer-count');
        this.uploadBufferBtn = document.getElementById('upload-buffer-btn');
        this.downloadBufferBtn = document.getElementById('download-buffer-btn');
        this.viewBufferBtn = document.getElementById('view-buffer-btn');
        this.bufferList = document.getElementById('buffer-list');
        this.bufferItems = document.getElementById('buffer-items');
        this.closeBufferBtn = document.getElementById('close-buffer-btn');

        this.setupTabs();
        this.setupSegmentedControl();
        this.setupSettingsToggle();
        this.setupLocationHierarchy();
    }

    setupTabs() {
        const switchTab = (mode) => {
            this.activeMode = mode;
            this.tabSingle.classList.toggle('active', mode === 'single');
            this.tabBulk.classList.toggle('active', mode === 'bulk');
            this.viewSingle.classList.toggle('hidden', mode !== 'single');
            this.viewBulk.classList.toggle('hidden', mode !== 'bulk');
            
            // Sync current state text
            this.extractBtn.querySelector('.btn-text').textContent = 
                mode === 'bulk' ? "Start Bulk Campaign" : "Start Grid Scan";
        };

        this.tabSingle.addEventListener('click', () => switchTab('single'));
        this.tabBulk.addEventListener('click', () => switchTab('bulk'));
    }

    setupLocationHierarchy() {
        this.browserCountry.addEventListener('change', () => {
            this.browserState.disabled = !this.browserCountry.value;
            if (!this.browserCountry.value) {
                this.browserState.innerHTML = '<option value="">Select State</option>';
            }
        });
    }

    setupSegmentedControl() {
        const setupGroup = (groupId, hiddenId) => {
            const group = document.getElementById(groupId);
            if (!group) return;
            group.addEventListener('click', (e) => {
                const btn = e.target.closest('.seg-btn');
                if (!btn) return;
                group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(hiddenId).value = btn.dataset.value;
                document.getElementById(hiddenId).dispatchEvent(new Event('change', { bubbles: true }));
            });
        };

        setupGroup('browser-grid-size-group', 'browser-grid-size');
        setupGroup('bulk-parallel-group', 'bulk-parallel-tabs');
    }

    setupSettingsToggle() {
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                this.settingsPanel.classList.toggle('hidden');
            });
        }
    }

    setApiStatus(isOnline) {
        if (isOnline) {
            this.statusDot.classList.add('online');
            this.statusDot.classList.remove('offline');
            this.statusText.textContent = "Connected";
        } else {
            this.statusDot.classList.add('offline');
            this.statusDot.classList.remove('online');
            this.statusText.textContent = "Offline";
        }
    }

    setMapsStatus(isOnMaps) {
        if (isOnMaps) {
            this.pageStatus.textContent = "Connected to Google Maps";
            this.pageStatus.classList.add('ready');
        } else {
            this.pageStatus.textContent = "Navigate to Google Maps for auto-mode";
            this.pageStatus.classList.remove('ready');
        }
    }

    updateProgress(found, scraped, percent, zoneText, message) {
        if (found !== undefined) this.foundCount.textContent = found;
        if (scraped !== undefined) this.scrapedCount.textContent = scraped;
        if (percent !== undefined) {
            this.progressBar.style.width = `${Math.min(percent, 100)}%`;
            this.progressPercent.textContent = `${Math.round(percent)}%`;
        }
        if (zoneText) this.progressZone.textContent = zoneText;
        if (message) this.progressMessage.textContent = message;
    }
}
