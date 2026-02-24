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
    });

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

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isGoogleMaps = tab?.url?.includes('google.com/maps');

    if (isGoogleMaps) {
        extractBtn.disabled = false;
        pageStatus.textContent = "Ready to extract from Google Maps";
    } else {
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

        try {
            chrome.tabs.sendMessage(tab.id, {
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

    stopBtn.addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { action: "stop" });
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
