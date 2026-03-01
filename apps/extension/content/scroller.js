/**
 * content/scroller.js
 * Dedicated infinite scroll engine for Google Maps results feed.
 * Always re-queries feed references after every await to avoid stale DOM.
 */

window.GeoLeadScroller = {
    /**
     * Scroll the feed to load all available result cards.
     * Uses adaptive wait times, warm-up period, and fresh feed references.
     *
     * @param {Function} onProgress - Callback with (loadedCount) after each scroll
     * @returns {{ totalLoaded: number, reachedEnd: boolean }}
     */
    scrollToLoadAll: async function (onProgress) {
        let lastCardCount = 0;
        let staleCount = 0;
        const MAX_STALE = 8;               // Increased from 6
        let baseDelay = 600;
        let totalCycles = 0;
        const WARMUP_CYCLES = 4;            // Don't count stale during first N cycles

        while (true) {
            totalCycles++;

            // Always get fresh feed reference
            const feed = GeoLeadDOM.getFreshFeed(false); // Don't require articles initially
            if (!feed) {
                GeoLeadUtils.contentLog('WARN', '[SCROLL] Feed not found');
                return { totalLoaded: lastCardCount, reachedEnd: false };
            }

            const cards = feed.querySelectorAll(SELECTORS.feed.article[0]);
            const currentCount = cards.length;

            // Report progress
            if (onProgress && currentCount !== lastCardCount) {
                onProgress(currentCount);
            }

            // Check for end of list — only after warm-up and with cards loaded
            if (currentCount > 0 && totalCycles > WARMUP_CYCLES && GeoLeadDOM.isEndOfList(feed)) {
                GeoLeadUtils.contentLog('INFO', `[SCROLL] End of list detected at ${currentCount} results`);
                return { totalLoaded: currentCount, reachedEnd: true };
            }

            // Check stale count — only after warm-up
            if (currentCount === lastCardCount && totalCycles > WARMUP_CYCLES) {
                staleCount++;
                baseDelay = Math.min(baseDelay + 200, 2000);

                if (staleCount >= MAX_STALE) {
                    GeoLeadUtils.contentLog('INFO', `[SCROLL] Stale for ${MAX_STALE} cycles at ${currentCount} cards`);
                    return { totalLoaded: currentCount, reachedEnd: true };
                }
            } else if (currentCount !== lastCardCount) {
                staleCount = 0;
                baseDelay = 600;
            }

            lastCardCount = currentCount;

            // Scroll: multiple strategies for triggering virtual scroll
            // Strategy A: Scroll last card into view
            if (cards.length > 0) {
                cards[cards.length - 1].scrollIntoView({ behavior: 'instant', block: 'end' });
            }
            // Strategy B: Scroll the container itself
            feed.scrollTop = feed.scrollHeight;
            // Strategy C: Also try parent container (some Maps layouts nest the scroll)
            if (feed.parentElement) {
                feed.parentElement.scrollTop = feed.parentElement.scrollHeight;
            }

            await GeoLeadUtils.sleep(baseDelay);
        }
    },

    /**
     * Scroll to bring a specific card index into view.
     * Loads cards progressively if the target index is beyond current count.
     *
     * @param {number} targetIndex - The card index we need loaded
     * @returns {{ feed: Element|null, cards: Element[] }}
     */
    ensureCardLoaded: async function (targetIndex) {
        let staleCount = 0;
        const MAX_ATTEMPTS = 20;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const feed = GeoLeadDOM.getFreshFeed();
            if (!feed) return { feed: null, cards: [] };

            const cards = Array.from(feed.querySelectorAll(SELECTORS.feed.article[0]));

            if (cards.length > targetIndex) {
                // Scroll the target card into view
                cards[targetIndex].scrollIntoView({ behavior: 'instant', block: 'center' });
                await GeoLeadUtils.sleep(100);
                return { feed, cards };
            }

            // Check end of list
            if (GeoLeadDOM.isEndOfList(feed)) {
                return { feed, cards };
            }

            const prevCount = cards.length;
            feed.scrollTop = feed.scrollHeight;
            if (cards.length > 0) {
                cards[cards.length - 1].scrollIntoView({ behavior: 'instant', block: 'end' });
            }

            await GeoLeadUtils.sleep(500);

            // Re-count after scroll
            const newFeed = GeoLeadDOM.getFreshFeed();
            const newCards = newFeed ? newFeed.querySelectorAll(SELECTORS.feed.article[0]) : [];

            if (newCards.length === prevCount) {
                staleCount++;
                if (staleCount >= 4) {
                    return { feed: newFeed, cards: Array.from(newCards) };
                }
            } else {
                staleCount = 0;
            }
        }

        // Final attempt to return whatever we have
        const { feed, cards } = GeoLeadDOM.getFreshCards();
        return { feed, cards };
    }
};
