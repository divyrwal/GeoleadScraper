/**
 * GeoLead Scraper — Popup Logic v3
 * Features: speed control, ETA, scrape history, message-based architecture
 */

document.addEventListener('DOMContentLoaded', async () => {
    const extractBtn = document.getElementById('extract-btn');
    const stopBtn = document.getElementById('stop-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings');
    const apiUrlInput = document.getElementById('api-url');
    const statusDot = document.querySelector('.dot');
    const statusText = document.querySelector('.status-indicator .text');
    const pageStatus = document.getElementById('page-status');
    const resultsDiv = document.getElementById('results');
    const foundCount = document.getElementById('found-count');
    const scrapedCount = document.getElementById('scraped-count');
    const savedCount = document.getElementById('saved-count');
    const dupCount = document.getElementById('dup-count');
    const settingsPanel = document.getElementById('settings-panel');
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('progress-bar');
    const progressMessage = document.getElementById('progress-message');
    const progressEta = document.getElementById('progress-eta');

    // Tabs
    const tabBrowser = document.getElementById('tab-browser');
    const tabAutopilot = document.getElementById('tab-autopilot');
    const panelBrowser = document.getElementById('panel-browser');
    const panelAutopilot = document.getElementById('panel-autopilot');

    // Autopilot Form Elements
    const autoQuery = document.getElementById('auto-query');
    const autoLocation = document.getElementById('auto-location');
    const autoMax = document.getElementById('auto-max');
    const launchAutopilotBtn = document.getElementById('launch-autopilot-btn');
    const srcGmaps = document.getElementById('src-gmaps');
    const srcJd = document.getElementById('src-jd');
    const srcInstagram = document.getElementById('src-instagram');
    const srcAi = document.getElementById('src-ai');
    const srcDeepScan = document.getElementById('src-deepscan');

    // Browser Scrape Grid Elements
    const browserDeepScan = document.getElementById('browser-deepscan');
    const browserGridInputs = document.getElementById('browser-grid-inputs');
    const browserQuery = document.getElementById('browser-query');
    const browserLocation = document.getElementById('browser-location');

    // Autopilot Status
    const apStatus = document.getElementById('autopilot-status');
    const apError = document.getElementById('autopilot-error');
    const apErrorMsg = document.getElementById('autopilot-error-msg');

    // Speed control
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');

    let totalSaved = 0;
    let totalDuplicates = 0;
    let extractionStartTime = null;

    // Load settings
    chrome.storage.local.get(['apiUrl', 'extractionSpeed'], (result) => {
        if (result.apiUrl) apiUrlInput.value = result.apiUrl;
        if (result.extractionSpeed) {
            speedSlider.value = result.extractionSpeed;
            updateSpeedLabel(result.extractionSpeed);
        }
        if (result.autoMax) autoMax.value = result.autoMax;

        if (result.browserQuery) browserQuery.value = result.browserQuery;
        if (result.browserLocation) browserLocation.value = result.browserLocation;
        if (result.browserDeepScan) {
            browserDeepScan.checked = true;
            browserGridInputs.classList.remove('hidden');
        }
    });

    // Save browser grid form data on change
    const saveBrowserForm = () => {
        chrome.storage.local.set({
            browserQuery: browserQuery.value,
            browserLocation: browserLocation.value,
            browserDeepScan: browserDeepScan.checked
        });
    };
    browserQuery.addEventListener('input', saveBrowserForm);
    browserLocation.addEventListener('input', saveBrowserForm);

    browserDeepScan.addEventListener('change', (e) => {
        saveBrowserForm();
        if (e.target.checked) {
            browserGridInputs.classList.remove('hidden');
            extractBtn.disabled = false;
            pageStatus.textContent = "Ready for Master Queue Grid Scan";
        } else {
            browserGridInputs.classList.add('hidden');
            if (isGoogleMaps) {
                extractBtn.disabled = false;
                pageStatus.textContent = "Ready to extract from Google Maps";
            } else {
                extractBtn.disabled = true;
                pageStatus.textContent = "Please open Google Maps search results";
            }
        }
    });

    // Tab Switching Logic
    function switchTab(tab) {
        if (tab === 'browser') {
            tabBrowser.classList.add('active');
            tabAutopilot.classList.remove('active');
            panelBrowser.classList.remove('hidden');
            panelAutopilot.classList.add('hidden');
        } else {
            tabBrowser.classList.remove('active');
            tabAutopilot.classList.add('active');
            panelBrowser.classList.add('hidden');
            panelAutopilot.classList.remove('hidden');

            // Auto-fill query based on current URL if empty
            if (!autoQuery.value && tabData && tabData.url.includes('google.com/maps')) {
                const searchParam = tabData.url.match(/\/maps\/search\/(.+?)(?:\/|@|$)/);
                if (searchParam) {
                    const fullUrlQuery = decodeURIComponent(searchParam[1].replace(/\+/g, ' '));
                    const parts = fullUrlQuery.split(' in ');
                    if (parts.length > 1) {
                        autoQuery.value = parts[0];
                        autoLocation.value = parts[1];
                    } else {
                        autoQuery.value = fullUrlQuery;
                    }
                }
            }
        }
    }

    tabBrowser.addEventListener('click', () => switchTab('browser'));
    tabAutopilot.addEventListener('click', () => switchTab('autopilot'));

    function updateSpeedLabel(val) {
        const ms = parseInt(val);
        if (ms <= 200) speedValue.textContent = 'Turbo';
        else if (ms <= 400) speedValue.textContent = 'Normal';
        else if (ms <= 700) speedValue.textContent = 'Careful';
        else speedValue.textContent = 'Safe';
    }

    speedSlider.addEventListener('input', (e) => {
        updateSpeedLabel(e.target.value);
        chrome.storage.local.set({ extractionSpeed: parseInt(e.target.value) });
    });

    // Save autopilot form data on change
    const saveAutoForm = () => {
        chrome.storage.local.set({
            autoQuery: autoQuery.value,
            autoLocation: autoLocation.value,
            autoMax: autoMax.value
        });
    };
    autoQuery.addEventListener('input', saveAutoForm);
    autoLocation.addEventListener('input', saveAutoForm);
    autoMax.addEventListener('input', saveAutoForm);

    const [tabData] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isGoogleMaps = tabData?.url?.includes('google.com/maps');

    if (browserDeepScan && browserDeepScan.checked) {
        extractBtn.disabled = false;
        pageStatus.textContent = "Ready for Master Queue Grid Scan";
    } else if (isGoogleMaps) {
        extractBtn.disabled = false;
        pageStatus.textContent = "Ready to extract from Google Maps";
    } else {
        extractBtn.disabled = true;
        pageStatus.textContent = "Please open Google Maps search results";
    }

    // Check API connection
    try {
        const response = await fetch(`${apiUrlInput.value}/api/health`);
        if (response.ok) {
            statusDot.classList.add('online');
            statusText.textContent = "Connected to API";
        } else { throw new Error(); }
    } catch (e) {
        statusDot.classList.add('offline');
        statusText.textContent = "API Offline";
    }

    // Load scrape history
    loadHistory();

    // --- Listen for ALL messages ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "progress") {
            progressSection.classList.remove('hidden');
            foundCount.textContent = message.found || 0;
            scrapedCount.textContent = message.scraped || 0;
            progressMessage.textContent = message.message || "";

            if (message.processed && message.found) {
                const pct = Math.round((message.processed / message.found) * 100);
                progressBar.style.width = `${pct}%`;

                // ETA calculation
                if (extractionStartTime && message.processed > 0) {
                    const elapsed = (Date.now() - extractionStartTime) / 1000;
                    const perItem = elapsed / message.processed;
                    const remaining = (message.found - message.processed) * perItem;
                    const mins = Math.floor(remaining / 60);
                    const secs = Math.floor(remaining % 60);
                    progressEta.textContent = `⏱ ~${mins}m ${secs}s remaining | ${perItem.toFixed(1)}s/lead`;
                }
            }
            if (message.status === "done") {
                onExtractionComplete(message.found, message.scraped);
            }
        }

        if (message.type === "save_result") {
            totalSaved += (message.inserted || 0);
            totalDuplicates += (message.updated || 0) + (message.skipped || 0);
            savedCount.textContent = totalSaved;
            dupCount.textContent = totalDuplicates;
        }

        if (message.type === "extraction_done") {
            onExtractionComplete(message.total_found, message.total_scraped);
        }
    });

    function onExtractionComplete(found, scraped) {
        extractBtn.classList.remove('hidden');
        extractBtn.disabled = false;
        extractBtn.querySelector('.btn-text').textContent = "Extract All Leads";
        extractBtn.querySelector('.loader').classList.add('hidden');
        stopBtn.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
        progressBar.style.width = '100%';
        progressEta.textContent = '';
        progressMessage.textContent = 'Extraction Complete!';

        // Save to history
        if (found > 0) {
            const searchParam = tab.url.match(/\/maps\/search\/(.+?)(?:\/|@|$)/);
            const query = searchParam ? decodeURIComponent(searchParam[1].replace(/\+/g, ' ')) : 'Unknown';
            saveHistory(query, found || 0, scraped || 0, totalSaved);
        }
    }

    extractBtn.addEventListener('click', async () => {
        totalSaved = 0;
        totalDuplicates = 0;
        extractionStartTime = Date.now();
        savedCount.textContent = '0';
        dupCount.textContent = '0';
        foundCount.textContent = '0';
        scrapedCount.textContent = '0';

        extractBtn.disabled = true;
        extractBtn.querySelector('.loader').classList.remove('hidden');
        extractBtn.querySelector('.btn-text').textContent = "Extracting...";
        stopBtn.classList.remove('hidden');
        progressSection.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressMessage.textContent = 'Starting...';
        progressEta.textContent = '';
        resultsDiv.classList.add('hidden');

        if (browserDeepScan.checked) {
            const query = browserQuery.value.trim();
            const location = browserLocation.value.trim();
            if (!query || !location) {
                alert("Please fill in both Search Query and Target Location for Grid Scan.");
                onExtractionComplete(0, 0);
                return;
            }

            // Send to background to initiate the Master Queue
            chrome.runtime.sendMessage({
                action: "start_grid_scan",
                query,
                location,
                speed: parseInt(speedSlider.value),
                targetTabId: tabData.id
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // Could be ignored as background script handles it returning async
                }
                if (response && response.error) {
                    alert(response.error);
                    onExtractionComplete(0, 0);
                }
            });
            return;
        }

        try {
            chrome.tabs.sendMessage(tabData.id, {
                action: "extract_all",
                speed: parseInt(speedSlider.value)
            }, (response) => {
                if (chrome.runtime.lastError) {
                    onExtractionComplete(0, 0);
                    alert("Content script not loaded. Refresh the Google Maps page and try again.");
                    return;
                }
                if (response && response.error) {
                    onExtractionComplete(0, 0);
                    alert(response.error);
                }
            });
        } catch (err) {
            onExtractionComplete(0, 0);
            alert("Error: " + err.message);
        }
    });

    // --- Autopilot Logic ---
    launchAutopilotBtn.addEventListener('click', async () => {
        const query = autoQuery.value.trim();
        const location = autoLocation.value.trim();
        const maxResults = parseInt(autoMax.value) || 50;

        if (!query || !location) {
            apError.classList.remove('hidden');
            apErrorMsg.textContent = "Please fill in both query and location.";
            return;
        }

        apStatus.classList.add('hidden');
        apError.classList.add('hidden');
        launchAutopilotBtn.disabled = true;
        launchAutopilotBtn.querySelector('.loader').classList.remove('hidden');
        launchAutopilotBtn.querySelector('.btn-text').textContent = "Launching...";

        const sources = {
            googleMaps: srcGmaps.checked,
            justDial: srcJd.checked,
            linkedIn: srcLinkedin.checked,
            instagram: srcInstagram.checked
        };

        if (!srcGmaps.checked && !srcJd.checked && !srcLinkedin.checked && !srcInstagram.checked) {
            apError.classList.remove('hidden');
            apErrorMsg.textContent = "Select at least one source.";
            resetAutoBtn();
            return;
        }

        try {
            const response = await fetch(`${apiUrlInput.value}/api/search/advanced`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    location,
                    sources,
                    useLocalAi: srcAi.checked,
                    deepScan: srcDeepScan.checked,
                    maxResults
                })
            });

            const data = await response.json();
            if (response.ok) {
                apStatus.classList.remove('hidden');
            } else {
                apError.classList.remove('hidden');
                apErrorMsg.textContent = data.error || "Failed to start orchestration job.";
            }
        } catch (e) {
            apError.classList.remove('hidden');
            apErrorMsg.textContent = "Cannot connect to backend API server.";
        } finally {
            resetAutoBtn();
        }
    });

    function resetAutoBtn() {
        launchAutopilotBtn.disabled = false;
        launchAutopilotBtn.querySelector('.loader').classList.add('hidden');
        launchAutopilotBtn.querySelector('.btn-text').textContent = "🚀 Launch Autopilot Loop";
    }

    stopBtn.addEventListener('click', () => {
        if (browserDeepScan.checked) {
            chrome.runtime.sendMessage({ action: "stop_grid_scan" });
        } else {
            chrome.tabs.sendMessage(tabData.id, { action: "stop" });
        }
        stopBtn.classList.add('hidden');
        progressMessage.textContent = "Stopping...";
    });

    settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        chrome.storage.local.set({ apiUrl: apiUrlInput.value }, () => {
            alert('Settings saved!');
            settingsPanel.classList.add('hidden');
        });
    });

    // --- Scrape History ---
    function loadHistory() {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            const history = result.scrapeHistory || [];
            renderHistory(history);
        });
    }

    function saveHistory(query, found, scraped, saved) {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            const history = result.scrapeHistory || [];
            history.unshift({
                query,
                found,
                scraped,
                saved,
                date: new Date().toISOString()
            });
            // Keep only last 10
            chrome.storage.local.set({ scrapeHistory: history.slice(0, 10) }, () => {
                renderHistory(history.slice(0, 10));
            });
        });
    }

    function renderHistory(history) {
        const list = document.getElementById('history-list');
        if (history.length === 0) {
            list.innerHTML = '<p class="sub-text">No scrapes yet</p>';
            return;
        }
        list.innerHTML = history.slice(0, 5).map(h => {
            const date = new Date(h.date);
            const timeStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `<div class="history-item">
                <div class="history-query">${h.query}</div>
                <div class="history-meta">${h.saved || h.scraped}/${h.found} saved · ${timeStr}</div>
            </div>`;
        }).join('');
    }
});
