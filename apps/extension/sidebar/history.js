/**
 * sidebar/history.js
 * Chrome storage abstraction for tracking past extractions.
 */

export class HistoryManager {
    constructor(listElementId) {
        this.listElement = document.getElementById(listElementId);
        this.MAX_HISTORY = 10;
    }

    load() {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            this.render(result.scrapeHistory || []);
        });
    }

    save(query, found, scraped, saved) {
        chrome.storage.local.get(['scrapeHistory'], (result) => {
            const history = result.scrapeHistory || [];
            history.unshift({ query, found, scraped, saved, date: new Date().toISOString() });

            const trimmed = history.slice(0, this.MAX_HISTORY);
            chrome.storage.local.set({ scrapeHistory: trimmed }, () => {
                this.render(trimmed);
            });
        });
    }

    render(history) {
        if (!this.listElement) return;

        if (history.length === 0) {
            this.listElement.innerHTML = '<p class="sub-text">No missions yet</p>';
            return;
        }

        this.listElement.innerHTML = history.slice(0, 5).map(h => {
            const date = new Date(h.date);
            const timeStr = date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return `<div class="history-item">
                <div class="history-query">${this.escapeHtml(h.query)}</div>
                <div class="history-meta">${h.saved || h.scraped}/${h.found} extracted · ${timeStr}</div>
            </div>`;
        }).join('');
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
