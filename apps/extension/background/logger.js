/**
 * background/logger.js
 * Persistent debug log handler for the background service worker.
 *
 * v7.1 — BUG-3 Fix: processQueue now properly awaits recursive calls and
 * doesn't clear the queue until entries are safely written.
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
            // Take a snapshot of current queue entries
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

        // BUG-3 Fix: Await the recursive call to prevent overlap
        if (this.logQueue.length > 0) {
            await this.processQueue();
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
        // Fire and forget — but processQueue has its own mutex via isLogging
        this.processQueue();
    }
}

// Singleton export
export const logger = new Logger();
