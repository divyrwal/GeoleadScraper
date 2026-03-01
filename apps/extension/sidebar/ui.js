/**
 * sidebar/ui.js
 * DOM element references and basic UI logic for the redesigned sidebar.
 */

export class UIManager {
    constructor() {
        // Buttons
        this.extractBtn = document.getElementById('extract-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.saveSettingsBtn = document.getElementById('save-settings');

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

        // Config inputs
        this.browserQuery = document.getElementById('browser-query');
        this.browserLocation = document.getElementById('browser-location');
        this.browserGridSize = document.getElementById('browser-grid-size');

        this.setupSegmentedControl();
        this.setupSettingsToggle();
    }

    setupSegmentedControl() {
        const group = document.getElementById('browser-grid-size-group');
        if (!group) return;

        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg-btn');
            if (!btn) return;

            group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.browserGridSize.value = btn.dataset.value;
            this.browserGridSize.dispatchEvent(new Event('change', { bubbles: true }));
        });
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
            this.pageStatus.textContent = "Navigate to Google Maps to start";
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
