/**
 * content/navigator.js
 * Detail panel navigation — clicking into business details and going back.
 *
 * v6.3 — Patient + Accurate:
 *   - Captures h1 BEFORE click to detect content change (prevents stale data)
 *   - Waits 500ms for hydration before clicking
 *   - On failure: re-scroll to force re-render, then retry
 *   - NEVER navigates away from search page
 */

window.GeoLeadNavigator = {
    /**
     * Click a card to open its detail panel.
     * Captures h1 before click to ensure panel content actually changes.
     *
     * @param {Element} card - The article card element
     * @param {string} expectedName - Expected business name for verification
     * @returns {{ success: boolean, panelLoaded: boolean }}
     */
    clickIntoDetail: async function (card, expectedName) {
        if (!card) return { success: false, panelLoaded: false };

        // Find the clickable link
        const linkEl = card.querySelector('a.hfpxzc') || card.querySelector('a[href*="/maps/place/"]') || card;

        // Capture current h1 BEFORE clicking (to detect stale content)
        const preClickH1 = this._getCurrentH1Text();

        // Scroll card into center of feed and wait for hydration
        card.scrollIntoView({ behavior: 'instant', block: 'center' });
        await GeoLeadUtils.sleep(500);

        // Click naturally
        linkEl.click();
        let panelLoaded = await GeoLeadExtractors.waitForDetailPanel(expectedName, 5000, preClickH1);
        if (panelLoaded) return { success: true, panelLoaded: true };

        // Retry: force re-render — scroll card OUT of view, then BACK
        GeoLeadUtils.contentLog('INFO', `[CLICK] Re-scrolling "${expectedName}"...`);
        const feed = GeoLeadDOM.getFreshFeed();
        if (feed) {
            feed.scrollTop = Math.max(0, feed.scrollTop - 600);
            await GeoLeadUtils.sleep(400);
            card.scrollIntoView({ behavior: 'instant', block: 'center' });
            await GeoLeadUtils.sleep(600);
        }

        // Click again
        linkEl.click();
        panelLoaded = await GeoLeadExtractors.waitForDetailPanel(expectedName, 5000, preClickH1);
        if (panelLoaded) return { success: true, panelLoaded: true };

        // Failed — skip, don't do anything destructive
        GeoLeadUtils.contentLog('WARN', `[CLICK] Skipping "${expectedName}" — panel wouldn't open`);
        return { success: true, panelLoaded: false };
    },

    /**
     * Get the current h1 text (to track changes across panel loads).
     */
    _getCurrentH1Text: function () {
        const h1 = GeoLeadDOM.getDetailPanelTitle();
        return h1 ? h1.textContent.trim() : '';
    },

    /**
     * Navigate back from detail panel to results feed.
     */
    goBackToFeed: async function () {
        // Check if feed is already visible
        const existingFeed = GeoLeadDOM.getFreshFeed();
        if (existingFeed) {
            const cards = existingFeed.querySelectorAll(SELECTORS.feed.article[0]);
            if (cards.length > 0) {
                GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Feed already visible');
                return { success: true };
            }
        }

        // Strategy 1: Click Back button
        const backOk = await this._tryBackButton();
        if (backOk) {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Back button worked');
            return { success: true };
        }

        // Strategy 2: Press Escape
        const escOk = await this._tryEscapeKey();
        if (escOk) {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Escape key worked');
            return { success: true };
        }

        // Strategy 3: history.back()
        const histOk = await this._tryHistoryBack();
        if (histOk) {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] history.back() worked');
            return { success: true };
        }

        // Strategy 4: Panic — find any back-looking button
        const panicOk = await this._tryPanicBack();
        if (panicOk) {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Panic back worked');
            return { success: true };
        }

        GeoLeadUtils.contentLog('ERROR', '[NAV:BACK] All strategies failed');
        return { success: false };
    },

    _tryBackButton: async function () {
        for (const selector of SELECTORS.navigation.back) {
            try {
                const btn = document.querySelector(selector);
                if (btn && btn.offsetParent !== null) {
                    const label = btn.getAttribute('aria-label') || '';
                    if (label.includes('Clear') || label.includes('Directions')) continue;
                    btn.click();
                    const ok = await this._waitForFeedReturn(3000);
                    if (ok) return true;
                }
            } catch (e) { }
        }
        return false;
    },

    _tryEscapeKey: async function () {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true
        }));
        return await this._waitForFeedReturn(3000);
    },

    _tryHistoryBack: async function () {
        window.history.back();
        return await this._waitForFeedReturn(3000);
    },

    _tryPanicBack: async function () {
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            if (label.includes('back') && !label.includes('clear') && !label.includes('direction')) {
                btn.click();
                const ok = await this._waitForFeedReturn(3000);
                if (ok) return true;
            }
        }
        return false;
    },

    _waitForFeedReturn: async function (timeoutMs = 3000) {
        const result = await GeoLeadUtils.waitFor(() => {
            const feed = GeoLeadDOM.getFreshFeed();
            return feed && feed.querySelectorAll(SELECTORS.feed.article[0]).length > 0;
        }, timeoutMs, 200);
        return !!result;
    }
};
