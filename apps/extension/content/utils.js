/**
 * content/utils.js
 * Generic utilities, logging, and messaging for the content script.
 */

window.GeoLeadUtils = {
    /**
     * Promise-based sleep.
     */
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Send a message to the background service worker.
     * Silently catches errors when background is not ready.
     */
    sendMsg: function (data) {
        try {
            chrome.runtime.sendMessage(data);
        } catch (e) {
            // background may not be ready
        }
    },

    /**
     * Structured logging via background debug system.
     */
    contentLog: function (level, message, data = null) {
        this.sendMsg({
            type: 'debug_log_entry',
            level,
            source: 'CONTENT',
            message,
            ...(data ? { data } : {})
        });
    },

    /**
     * Retry an async function with delay between attempts.
     * @param {Function} fn - Async function to attempt
     * @param {number} maxRetries - Max number of retries (default 3)
     * @param {number} delayMs - Delay between retries in ms (default 500)
     * @returns {*} Result of fn, or null if all retries fail
     */
    retryAsync: async function (fn, maxRetries = 3, delayMs = 500) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await fn();
                if (result !== null && result !== undefined) return result;
            } catch (e) {
                // continue to next attempt
            }
            if (i < maxRetries - 1) await this.sleep(delayMs);
        }
        return null;
    },

    /**
     * Polls a condition function until it returns truthy or timeout.
     * @param {Function} conditionFn - Sync or async function returning truthy/falsy
     * @param {number} timeoutMs - Total timeout (default 8000)
     * @param {number} intervalMs - Polling interval (default 300)
     * @returns {*} The truthy result, or null on timeout
     */
    waitFor: async function (conditionFn, timeoutMs = 8000, intervalMs = 300) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            try {
                const result = await conditionFn();
                if (result) return result;
            } catch (e) {
                // continue polling
            }
            await this.sleep(intervalMs);
        }
        return null;
    },

    /**
     * Normalize a string into a lowercase fingerprint for dedup.
     * Strips punctuation, collapses whitespace, lowercases.
     */
    fingerprint: function (str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Dice coefficient for fuzzy string similarity (0-1).
     * Used for matching business names that may differ slightly.
     */
    diceCoefficient: function (a, b) {
        if (!a || !b) return 0;
        a = this.fingerprint(a);
        b = this.fingerprint(b);
        if (a === b) return 1;
        if (a.length < 2 || b.length < 2) return 0;

        const bigrams = new Map();
        for (let i = 0; i < a.length - 1; i++) {
            const bigram = a.substring(i, i + 2);
            bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
        }

        let intersection = 0;
        for (let i = 0; i < b.length - 1; i++) {
            const bigram = b.substring(i, i + 2);
            const count = bigrams.get(bigram) || 0;
            if (count > 0) {
                bigrams.set(bigram, count - 1);
                intersection++;
            }
        }

        return (2.0 * intersection) / (a.length - 1 + b.length - 1);
    }
};
