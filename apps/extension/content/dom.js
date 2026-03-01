/**
 * content/dom.js
 * DOM manipulation and querying helpers with multi-fallback strategy.
 * Uses SELECTORS registry and never caches feed references across async boundaries.
 */

window.GeoLeadDOM = {
    /**
     * Check if an element is truly visible in the viewport.
     */
    isVisible: function (el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            (el.offsetParent !== null || style.position === 'fixed') &&
            el.offsetHeight > 0
        );
    },

    /**
     * Try each selector in an array, return first VISIBLE match.
     * @param {string[]} selectorArray - Array of CSS selectors to try in order
     * @param {Element} root - Root element to query within (default: document)
     * @returns {Element|null}
     */
    queryFirst: function (selectorArray, root = document) {
        if (!Array.isArray(selectorArray)) selectorArray = [selectorArray];
        for (const selector of selectorArray) {
            try {
                const elements = root.querySelectorAll(selector);
                for (const el of elements) {
                    if (this.isVisible(el)) return el;
                }
            } catch (e) {
                // Invalid selector, skip
            }
        }
        return null;
    },

    /**
     * Return all VISIBLE matches across all selectors (deduped).
     * @param {string[]} selectorArray - Array of CSS selectors
     * @param {Element} root - Root element to query within (default: document)
     * @returns {Element[]}
     */
    queryAll: function (selectorArray, root = document) {
        if (!Array.isArray(selectorArray)) selectorArray = [selectorArray];
        const seen = new Set();
        const results = [];
        for (const selector of selectorArray) {
            try {
                const elements = root.querySelectorAll(selector);
                for (const el of elements) {
                    if (!seen.has(el) && this.isVisible(el)) {
                        seen.add(el);
                        results.push(el);
                    }
                }
            } catch (e) {
                // Invalid selector, skip
            }
        }
        return results;
    },

    /**
     * Get a FRESH reference to the results feed container.
     * CRITICAL: Never cache this across await boundaries — Google Maps
     * destroys and recreates the feed during detail panel navigation.
     *
     * @param {boolean} requireArticles - If true, only return feed if it has articles
     * @returns {Element|null}
     */
    getFreshFeed: function (requireArticles = true) {
        const candidates = [];
        for (const selector of SELECTORS.feed.container) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    candidates.push(el);
                }
            } catch (e) { }
        }

        // Prefer feed with articles
        for (const feed of candidates) {
            const articles = feed.querySelectorAll(SELECTORS.feed.article[0]);
            if (articles.length > 0) return feed;
        }

        return requireArticles ? null : (candidates[0] || null);
    },

    /**
     * Get the detail panel's business name heading (multi-strategy).
     * @returns {Element|null}
     */
    getDetailPanelTitle: function () {
        return this.queryFirst(SELECTORS.detail.panelName);
    },

    /**
     * Get all article cards from a fresh feed reference.
     * @returns {{ feed: Element|null, cards: NodeList }}
     */
    getFreshCards: function () {
        const feed = this.getFreshFeed();
        if (!feed) return { feed: null, cards: [] };
        const cards = feed.querySelectorAll(SELECTORS.feed.article[0]);
        return { feed, cards: Array.from(cards) };
    },

    /**
     * Check if the end-of-list indicator is present in the feed.
     * @param {Element} feed - Feed element to check
     * @returns {boolean}
     */
    isEndOfList: function (feed) {
        if (!feed) return false;

        // Only use explicit end-of-list markers — NOT scroll position alone.
        // Scroll position at bottom is a false positive when feed hasn't fully loaded.
        for (const selector of SELECTORS.feed.endOfList) {
            try {
                // Search within the feed's scrollable parent, not just the feed itself
                const searchRoots = [feed, feed.parentElement, document];
                for (const root of searchRoots) {
                    if (!root) continue;
                    const el = root.querySelector(selector);
                    if (el && this.isVisible(el)) {
                        const text = (el.textContent || '').toLowerCase();
                        if (
                            el.classList.contains('HlvSq') ||
                            el.classList.contains('PbZDve') ||
                            text.includes('end of the list') ||
                            text.includes('no more results') ||
                            text.includes("you've reached the end")
                        ) {
                            return true;
                        }
                    }
                }
            } catch (e) { }
        }

        return false;
    }
};
