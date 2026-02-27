/**
 * GeoLead Scraper — Sidebar Logic v5.1 (RECON EDITION)
 * 
 * Persistent side panel — stays open while browsing Google Maps.
 * Same logic as popup.js but adapted for sidebar lifecycle.
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
    const terminalSection = document.getElementById('terminal-section');
    const terminalLog = document.getElementById('terminal-log');

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
    const srcLinkedin = document.getElementById('src-linkedin');
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
    let terminalLines = [];
    const MAX_TERMINAL_LINES = 100; // More lines in sidebar mode

    // ═══════════════════════════════════════════════════════
    // ACTIVE TAB — Re-query on focus since sidebar persists
    // ═══════════════════════════════════════════════════════
    async function getActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    let tabData = await getActiveTab();
    let isGoogleMaps = tabData?.url?.includes('google.com/maps');

    // Re-check active tab when sidebar regains focus
    // This handles the case where the user switches tabs while sidebar is open
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            tabData = await getActiveTab();
            isGoogleMaps = tabData?.url?.includes('google.com/maps');
            updatePageStatus();
        }
    });

    // Also listen for tab activation changes
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        tabData = await getActiveTab();
        isGoogleMaps = tabData?.url?.includes('google.com/maps');
        updatePageStatus();
    });

    // Listen for URL changes in the active tab
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
        if (changeInfo.url && tabData && tabId === tabData.id) {
            tabData.url = changeInfo.url;
            isGoogleMaps = tabData.url.includes('google.com/maps');
            updatePageStatus();
        }
    });

    function updatePageStatus() {
        if (browserDeepScan && browserDeepScan.checked) {
            extractBtn.disabled = false;
            pageStatus.textContent = "Ready for Grid Scan deployment";
        } else if (isGoogleMaps) {
            extractBtn.disabled = false;
            pageStatus.textContent = "Target acquired: Google Maps";
        } else {
            extractBtn.disabled = true;
            pageStatus.textContent = "Navigate to Google Maps to begin";
        }
    }

    // ═══════════════════════════════════════════════════════
    // TERMINAL LOG
    // ═══════════════════════════════════════════════════════
    function addTerminalLine(text, type = '') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        terminalLines.push({ text: `[${timestamp}] ${text}`, type });
        if (terminalLines.length > MAX_TERMINAL_LINES) terminalLines.shift();

        terminalLog.innerHTML = terminalLines.map(l =>
            `<div class="log-line ${l.type}">${escapeHtml(l.text)}</div>`
        ).join('');
        terminalLog.scrollTop = terminalLog.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ═══════════════════════════════════════════════════════
    // LOAD SETTINGS
    // ═══════════════════════════════════════════════════════
    chrome.storage.local.get(['apiUrl', 'extractionSpeed', 'browserQuery', 'browserLocation', 'browserDeepScan'], (result) => {
        if (result.apiUrl) apiUrlInput.value = result.apiUrl;
        if (result.extractionSpeed) {
            speedSlider.value = result.extractionSpeed;
            updateSpeedLabel(result.extractionSpeed);
        }
        if (result.browserQuery) browserQuery.value = result.browserQuery;
        if (result.browserLocation) browserLocation.value = result.browserLocation;
        if (result.browserDeepScan) {
            browserDeepScan.checked = true;
            browserGridInputs.classList.remove('hidden');
        }
    });

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
            pageStatus.textContent = "Ready for Grid Scan deployment";
        } else {
            browserGridInputs.classList.add('hidden');
            updatePageStatus();
        }
    });

    // ═══════════════════════════════════════════════════════
    // TAB SWITCHING
    // ═══════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════
    // SPEED CONTROL
    // ═══════════════════════════════════════════════════════
    function updateSpeedLabel(val) {
        const ms = parseInt(val);
        if (ms <= 200) speedValue.textContent = 'TURBO';
        else if (ms <= 400) speedValue.textContent = 'NORMAL';
        else if (ms <= 700) speedValue.textContent = 'CAREFUL';
        else speedValue.textContent = 'STEALTH';
    }

    speedSlider.addEventListener('input', (e) => {
        updateSpeedLabel(e.target.value);
        chrome.storage.local.set({ extractionSpeed: parseInt(e.target.value) });
    });

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

    // ═══════════════════════════════════════════════════════
    // INITIAL STATE
    // ═══════════════════════════════════════════════════════
    updatePageStatus();

    // Check API connection
    try {
        const response = await fetch(`${apiUrlInput.value}/api/health`);
        if (response.ok) {
            statusDot.classList.add('online');
            statusText.textContent = "API Online";
        } else { throw new Error(); }
    } catch (e) {
        statusDot.classList.add('offline');
        statusText.textContent = "API Offline";
    }

    loadHistory();
    addTerminalLine('Sidebar initialized. Standing by...', 'info');

    // ═══════════════════════════════════════════════════════
    // MESSAGE LISTENER
    // ═══════════════════════════════════════════════════════
    chrome.runtime.onMessage.addListener((message) => {
        // Only process messages relayed by background (ignore raw content script broadcasts)
        if ((message.type === 'progress' || message.type === 'extraction_done' || message.type === 'save_result') && !message._fromBg) {
            return; // Skip — this is the raw content script broadcast, wait for the bg-relayed version
        }

        if (message.type === "progress") {
            progressSection.classList.remove('hidden');
            foundCount.textContent = message.found || 0;
            scrapedCount.textContent = message.scraped || 0;
            progressMessage.textContent = message.message || "";

            if (message.message) {
                let logType = '';
                if (message.status === 'done') logType = message.message.includes('❌') ? 'error' : 'success';
                else if (message.status === 'navigating') logType = 'info';
                addTerminalLine(message.message, logType);
            }

            if (message.processed && message.found) {
                const pct = Math.round((message.processed / message.found) * 100);
                progressBar.style.width = `${pct}%`;

                if (extractionStartTime && message.processed > 0) {
                    const elapsed = (Date.now() - extractionStartTime) / 1000;
                    const perItem = elapsed / message.processed;
                    const remaining = (message.found - message.processed) * perItem;
                    const mins = Math.floor(remaining / 60);
                    const secs = Math.floor(remaining % 60);
                    progressEta.textContent = `⏱ ~${mins}m ${secs}s remaining | ${perItem.toFixed(1)}s/target`;
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

            if (message.inserted > 0) {
                addTerminalLine(`💾 Saved ${message.inserted} leads (${message.skipped || 0} dupes filtered)`, 'success');
            }
        }

        if (message.type === "extraction_done") {
            onExtractionComplete(message.total_found, message.total_scraped);
        }
    });

    // ═══════════════════════════════════════════════════════
    // EXTRACTION COMPLETE
    // ═══════════════════════════════════════════════════════
    function onExtractionComplete(found, scraped) {
        extractBtn.classList.remove('hidden');
        extractBtn.disabled = false;
        extractBtn.querySelector('.btn-text').textContent = "▶ Deploy Scanner";
        extractBtn.querySelector('.loader').classList.add('hidden');
        stopBtn.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
        progressBar.style.width = '100%';
        progressEta.textContent = '';
        progressMessage.textContent = '✅ Mission Complete';

        addTerminalLine(`═══ MISSION COMPLETE: ${scraped} targets extracted ═══`, 'success');

        if (found > 0 && tabData) {
            const searchParam = tabData.url?.match(/\/maps\/search\/(.+?)(?:\/|@|$)/);
            const query = searchParam ? decodeURIComponent(searchParam[1].replace(/\+/g, ' ')) : 'Grid Scan';
            saveHistory(query, found || 0, scraped || 0, totalSaved);
        }
    }

    // ═══════════════════════════════════════════════════════
    // EXTRACT BUTTON
    // ═══════════════════════════════════════════════════════
    extractBtn.addEventListener('click', async () => {
        // Re-get fresh tab data since sidebar persists
        tabData = await getActiveTab();
        isGoogleMaps = tabData?.url?.includes('google.com/maps');

        totalSaved = 0;
        totalDuplicates = 0;
        extractionStartTime = Date.now();
        terminalLines = [];
        savedCount.textContent = '0';
        dupCount.textContent = '0';
        foundCount.textContent = '0';
        scrapedCount.textContent = '0';

        extractBtn.disabled = true;
        extractBtn.querySelector('.loader').classList.remove('hidden');
        extractBtn.querySelector('.btn-text').textContent = "Deploying...";
        stopBtn.classList.remove('hidden');
        progressSection.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressMessage.textContent = 'Initializing scanner...';
        progressEta.textContent = '';
        resultsDiv.classList.add('hidden');
        terminalLog.innerHTML = '';

        addTerminalLine('Scanner initialized. Deployment starting...', 'info');

        if (browserDeepScan.checked) {
            const query = browserQuery.value.trim();
            const location = browserLocation.value.trim();
            if (!query || !location) {
                addTerminalLine('ERROR: Missing query or location for Grid Scan.', 'error');
                onExtractionComplete(0, 0);
                return;
            }

            addTerminalLine(`Grid Scan: "${query}" in "${location}"`, 'info');

            chrome.runtime.sendMessage({
                action: "start_grid_scan",
                query, location,
                speed: parseInt(speedSlider.value),
                targetTabId: tabData.id
            }, (response) => {
                if (chrome.runtime.lastError) { /* background handles async */ }
                if (response && response.error) {
                    addTerminalLine(`ERROR: ${response.error}`, 'error');
                    onExtractionComplete(0, 0);
                }
            });
            return;
        }

        if (!isGoogleMaps) {
            addTerminalLine('ERROR: Not on Google Maps. Navigate there first.', 'error');
            onExtractionComplete(0, 0);
            return;
        }

        addTerminalLine('Single page extraction mode', 'info');

        try {
            chrome.tabs.sendMessage(tabData.id, {
                action: "extract_all",
                speed: parseInt(speedSlider.value)
            }, (response) => {
                if (chrome.runtime.lastError) {
                    onExtractionComplete(0, 0);
                    addTerminalLine('Content script not loaded. Refresh the Maps page.', 'error');
                    return;
                }
                if (response && response.error) {
                    onExtractionComplete(0, 0);
                    addTerminalLine(`Error: ${response.error}`, 'error');
                }
            });
        } catch (err) {
            onExtractionComplete(0, 0);
            addTerminalLine(`Fatal error: ${err.message}`, 'error');
        }
    });

    // ═══════════════════════════════════════════════════════
    // AUTOPILOT
    // ═══════════════════════════════════════════════════════
    launchAutopilotBtn.addEventListener('click', async () => {
        const query = autoQuery.value.trim();
        const location = autoLocation.value.trim();
        const maxResults = parseInt(autoMax.value) || 50;

        if (!query || !location) {
            apError.classList.remove('hidden');
            apErrorMsg.textContent = "Fill in both query and location.";
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
                    query, location, sources,
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
        launchAutopilotBtn.querySelector('.btn-text').textContent = "🚀 Launch Autopilot";
    }

    // ═══════════════════════════════════════════════════════
    // STOP / SETTINGS
    // ═══════════════════════════════════════════════════════
    stopBtn.addEventListener('click', async () => {
        tabData = await getActiveTab();
        if (browserDeepScan.checked) {
            chrome.runtime.sendMessage({ action: "stop_grid_scan" });
        } else if (tabData) {
            chrome.tabs.sendMessage(tabData.id, { action: "stop" });
        }
        stopBtn.classList.add('hidden');
        progressMessage.textContent = "⛔ Aborting...";
        addTerminalLine('Abort signal sent. Stopping extraction...', 'error');
    });

    settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        chrome.storage.local.set({ apiUrl: apiUrlInput.value }, () => {
            addTerminalLine('Settings saved.', 'success');
            settingsPanel.classList.add('hidden');
        });
    });

    // ═══════════════════════════════════════════════════════
    // DEBUG LOG — Copy & Clear
    // ═══════════════════════════════════════════════════════
    const copyDebugLogBtn = document.getElementById('copy-debug-log');
    const clearDebugLogBtn = document.getElementById('clear-debug-log');
    const debugCopyStatus = document.getElementById('debug-copy-status');

    if (copyDebugLogBtn) {
        copyDebugLogBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'get_debug_log' }, (response) => {
                if (chrome.runtime.lastError || !response || !response.log) {
                    debugCopyStatus.textContent = '⚠ No log data available';
                    return;
                }
                const log = response.log;
                const formatted = log.map(e => {
                    const time = e.t ? new Date(e.t).toLocaleTimeString('en-US', { hour12: false }) : '??';
                    return `[${time}] [${e.lvl}] [${e.src}] ${e.msg}${e.data ? ` | ${e.data}` : ''}`;
                }).join('\n');

                const header = `=== GeoLead Debug Log (${log.length} entries) ===\nExported: ${new Date().toISOString()}\n\n`;
                navigator.clipboard.writeText(header + formatted).then(() => {
                    debugCopyStatus.textContent = `✅ Copied ${log.length} entries to clipboard!`;
                    setTimeout(() => { debugCopyStatus.textContent = ''; }, 3000);
                }).catch(() => {
                    debugCopyStatus.textContent = '⚠ Clipboard access denied';
                });
            });
        });
    }

    if (clearDebugLogBtn) {
        clearDebugLogBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'clear_debug_log' }, () => {
                debugCopyStatus.textContent = '🗑 Debug log cleared';
                setTimeout(() => { debugCopyStatus.textContent = ''; }, 2000);
            });
        });
    }

    // ═══════════════════════════════════════════════════════
    // SCRAPE HISTORY
    // ═══════════════════════════════════════════════════════
    function loadHistory() {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            renderHistory(result.scrapeHistory || []);
        });
    }

    function saveHistory(query, found, scraped, saved) {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            const history = result.scrapeHistory || [];
            history.unshift({ query, found, scraped, saved, date: new Date().toISOString() });
            chrome.storage.local.set({ scrapeHistory: history.slice(0, 10) }, () => {
                renderHistory(history.slice(0, 10));
            });
        });
    }

    function renderHistory(history) {
        const list = document.getElementById('history-list');
        if (history.length === 0) {
            list.innerHTML = '<p class="sub-text">No missions yet</p>';
            return;
        }
        list.innerHTML = history.slice(0, 5).map(h => {
            const date = new Date(h.date);
            const timeStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `<div class="history-item">
                <div class="history-query">${escapeHtml(h.query)}</div>
                <div class="history-meta">${h.saved || h.scraped}/${h.found} extracted · ${timeStr}</div>
            </div>`;
        }).join('');
    }
});
