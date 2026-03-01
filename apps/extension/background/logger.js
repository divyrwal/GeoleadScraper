/**
 * background/logger.js
 * Persistent debug log handler for the background service worker.
 */

export class Logger {
    constructor(maxEntries = 200) {
        this.maxEntries = maxEntries;
        this.logQueue = [];
        this.isLogging = false;
    }

    async processQueue() {
        if (this.isLogging || this.logQueue.length === 0) return;
        this.isLogging = true;

        try {
            const entries = [...this.logQueue];
            this.logQueue = [];

            const result = await chrome.storage.local.get(['_debugLog']);
            const log = result._debugLog || [];

            log.push(...entries);
            if (log.length > this.maxEntries) {
                log.splice(0, log.length - this.maxEntries);
            }

            await chrome.storage.local.set({ _debugLog: log });
        } catch (e) {
            /* storage full or unavailable */
        }

        this.isLogging = false;

        if (this.logQueue.length > 0) {
            this.processQueue();
        }
    }

    log(level, source, message, data = null) {
        const entry = {
            t: new Date().toISOString(),
            lvl: level,
            src: source,
            msg: message,
            ...(data ? { data: JSON.stringify(data).slice(0, 200) } : {})
        };

        this.logQueue.push(entry);
        this.processQueue();
    }
}

// Singleton export
export const logger = new Logger();
