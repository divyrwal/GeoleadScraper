/**
 * sidebar/state.js
 * High-level orchestration for sidebar UI workflows.
 * v7.0 — Simplified: no tabs, no autopilot, always grid scan mode.
 */

import { config } from '../config.js';
export class AppState {
    constructor(uiManager, terminal) {
        this.ui = uiManager;
        this.term = terminal;

        this.totalSaved = 0;
        this.totalDuplicates = 0;
        this.extractionStartTime = null;
        this.tabData = null;
        this.isGoogleMaps = false;

        this.init();
    }

    async init() {
        await this.checkActiveTab();

        chrome.storage.local.get(['apiUrl', 'browserQuery', 'browserLocation', 'browserGridSize', 'browserSaveMode'], (result) => {
            // Migrate stale API URL: if stored URL is the old Vercel URL or empty, use config default
            const storedUrl = result.apiUrl || '';
            if (!storedUrl || storedUrl.includes('geolead-scraper-api.vercel.app')) {
                // Write the correct config URL to storage so background worker picks it up
                chrome.storage.local.set({ apiUrl: config.apiUrl });
                this.ui.apiUrlInput.value = config.apiUrl;
            } else {
                this.ui.apiUrlInput.value = storedUrl;
            }

            if (result.browserQuery) this.ui.browserQuery.value = result.browserQuery;
            if (result.browserLocation) this.ui.browserLocation.value = result.browserLocation;
            if (result.browserSaveMode !== undefined) this.ui.browserSaveMode.checked = result.browserSaveMode;
            if (result.browserGridSize) {
                this.ui.browserGridSize.value = result.browserGridSize;
                // Restore active button
                const group = document.getElementById('browser-grid-size-group');
                if (group) {
                    group.querySelectorAll('.seg-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.value === result.browserGridSize);
                    });
                }
            }

            this.checkApiHealth();
        });

        this.term.add('Ready.', 'info');
        this.setupEventListeners();
    }

    async checkApiHealth() {
        try {
            const response = await fetch(`${this.ui.apiUrlInput.value}/api/health`);
            this.ui.setApiStatus(response.ok);
        } catch (e) {
            this.ui.setApiStatus(false);
        }
    }

    async checkActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.tabData = tab;
        this.isGoogleMaps = tab?.url?.includes('google.com/maps');
        this.updatePageStatus();
    }

    updatePageStatus() {
        // Always enable — grid scan handles its own Maps navigation
        this.ui.extractBtn.disabled = false;
        if (this.isGoogleMaps) {
            this.ui.setMapsStatus(true);
        } else {
            this.ui.setMapsStatus(false);
        }
    }

    setupEventListeners() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) await this.checkActiveTab();
        });

        chrome.tabs.onActivated.addListener(async () => await this.checkActiveTab());

        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
            if (changeInfo.url && this.tabData && tabId === this.tabData.id) {
                this.tabData.url = changeInfo.url;
                this.isGoogleMaps = this.tabData.url.includes('google.com/maps');
                this.updatePageStatus();
            }
        });

        // Save config on change
        const saveConfig = () => {
            chrome.storage.local.set({
                browserQuery: this.ui.browserQuery.value,
                browserLocation: this.ui.browserLocation.value,
                browserGridSize: this.ui.browserGridSize.value,
                browserSaveMode: this.ui.browserSaveMode.checked
            });
        };

        this.ui.browserQuery.addEventListener('input', saveConfig);
        this.ui.browserLocation.addEventListener('input', saveConfig);
        this.ui.browserGridSize.addEventListener('change', saveConfig);
        this.ui.browserSaveMode.addEventListener('change', saveConfig);

        // Settings save
        this.ui.saveSettingsBtn.addEventListener('click', () => {
            chrome.storage.local.set({ apiUrl: this.ui.apiUrlInput.value }, () => {
                this.term.add('Settings saved.', 'success');
                this.ui.settingsPanel.classList.add('hidden');
                this.checkApiHealth();
            });
        });
    }
}
