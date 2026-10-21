/**
 * content/navigator.js
 * Detail panel navigation — clicking into business details and going back.
 *
 * v7.1 — Fixed history stack leak:
 *   - Tracks URL before/after click to detect actual navigation
 *   - goBackToFeed only tries next strategy if URL didn't change (click was ignored)
 *   - If URL changed but feed not visible, waits longer instead of popping more history
 *   - clickIntoDetail no longer double-clicks when first click already navigated
 */

window.GeoLeadNavigator = {
    /**
     * Click a card to open its detail panel.
     * Captures h1 before click to ensure panel content actually changes.
     * v7.1: Won't retry click if first click already navigated (URL changed).
     *
     * @param {Element} card - The article card element
     * @param {string} expectedName - Expected business name for verification
     * @returns {{ success: boolean, panelLoaded: boolean }}
     */
    clickIntoDetail: async function (card, expectedName) {
        if (!card) return { success: false, panelLoaded: false };

        // Find the clickable link
        const linkEl = card.querySelector('a.hfpxzc') || card.querySelector('a[href*="/maps/place/"]') || card;

        // Capture state BEFORE clicking
        const preClickH1 = this._getCurrentH1Text();
        const preClickUrl = window.location.href;

        // Scroll card into center of feed and wait for hydration
        card.scrollIntoView({ behavior: 'instant', block: 'center' });
        await GeoLeadUtils.sleep(500);

        // Click naturally
        linkEl.click();
        let panelLoaded = await GeoLeadExtractors.waitForDetailPanel(expectedName, 5000, preClickH1);
        if (panelLoaded) return { success: true, panelLoaded: true };

        // Check if the first click actually navigated (URL changed)
        const postClickUrl = window.location.href;
        const urlChanged = postClickUrl !== preClickUrl;

        if (urlChanged) {
            // Click DID navigate, but panel didn't pass verification.
            // Don't click again — that would push another history entry.
            // Instead, wait longer for the panel to render.
            GeoLeadUtils.contentLog('INFO', `[CLICK] URL changed but panel not verified for "${expectedName}". Waiting longer...`);
            panelLoaded = await GeoLeadExtractors.waitForDetailPanel(expectedName, 5000, preClickH1);
            if (panelLoaded) return { success: true, panelLoaded: true };

            // Still not loaded — accept whatever panel is showing
            const anyH1 = GeoLeadDOM.queryFirst(['h1.DUwDvf', 'div[role="main"] h1']);
            if (anyH1) {
                const text = anyH1.textContent.trim();
                if (text.length > 2 && text !== preClickH1) {
                    // A different panel loaded — extract from it even if name doesn't match
                    GeoLeadUtils.contentLog('INFO', `[CLICK] Accepting mismatched panel: "${text}" for "${expectedName}"`);
                    await GeoLeadUtils.sleep(500);
                    return { success: true, panelLoaded: true };
                }
            }

            // URL changed but nothing loaded — mark as partial
            GeoLeadUtils.contentLog('WARN', `[CLICK] Skipping "${expectedName}" — URL changed but panel empty`);
            return { success: true, panelLoaded: false };
        }

        // URL did NOT change — the click was ignored. Retry with re-scroll.
        GeoLeadUtils.contentLog('INFO', `[CLICK] Re-scrolling "${expectedName}"...`);
        const feed = GeoLeadDOM.getFreshFeed();
        if (feed) {
            feed.scrollTop = Math.max(0, feed.scrollTop - 600);
            await GeoLeadUtils.sleep(400);
            card.scrollIntoView({ behavior: 'instant', block: 'center' });
            await GeoLeadUtils.sleep(600);
        }

        // Second click (only because URL didn't change on first — so no extra history entry)
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
     * v7.1: Tracks URL changes to prevent popping multiple history entries.
     * Only tries the next strategy if the current one didn't cause navigation.
     */
    goBackToFeed: async function () {
        // Check if feed is already visible (e.g., Maps split-pane view)
        const existingFeed = GeoLeadDOM.getFreshFeed();
        if (existingFeed) {
            const cards = existingFeed.querySelectorAll(SELECTORS.feed.article[0]);
            if (cards.length > 0) {
                GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Feed already visible');
                return { success: true };
            }
        }

        const urlBefore = window.location.href;

        // Strategy 1: Click Back button
        const backResult = await this._tryBackButton(urlBefore);
        if (backResult === 'feed_found') {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Back button worked');
            return { success: true };
        }
        if (backResult === 'navigated_no_feed') {
            // URL changed but feed not visible yet — wait longer, DON'T try more strategies
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Back button navigated, waiting for feed...');
            const ok = await this._waitForFeedReturn(5000);
            if (ok) return { success: true };
            // Feed still not found after extended wait — this is a real problem
            GeoLeadUtils.contentLog('WARN', '[NAV:BACK] Feed not found after extended wait');
            return { success: false };
        }

        // Strategy 2: Press Escape (only try if Strategy 1 didn't navigate)
        const escResult = await this._tryEscapeKey(urlBefore);
        if (escResult === 'feed_found') {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] Escape key worked');
            return { success: true };
        }
        if (escResult === 'navigated_no_feed') {
            const ok = await this._waitForFeedReturn(5000);
            if (ok) return { success: true };
            return { success: false };
        }

        // Strategy 3: history.back() (only if nothing else navigated)
        const histResult = await this._tryHistoryBack(urlBefore);
        if (histResult === 'feed_found') {
            GeoLeadUtils.contentLog('INFO', '[NAV:BACK] history.back() worked');
            return { success: true };
        }
        if (histResult === 'navigated_no_feed') {
            const ok = await this._waitForFeedReturn(5000);
            if (ok) return { success: true };
            return { success: false };
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

    /**
     * Try back button. Returns 'feed_found', 'navigated_no_feed', or 'no_effect'.
     */
    _tryBackButton: async function (urlBefore) {
        for (const selector of SELECTORS.navigation.back) {
            try {
                const btn = document.querySelector(selector);
                if (btn && btn.offsetParent !== null) {
                    const label = btn.getAttribute('aria-label') || '';
                    if (label.includes('Clear') || label.includes('Directions')) continue;
                    btn.click();
                    const ok = await this._waitForFeedReturn(3000);
                    if (ok) return 'feed_found';
                    // Check if URL changed (navigation happened but feed not visible)
                    if (window.location.href !== urlBefore) return 'navigated_no_feed';
                }
            } catch (e) { }
        }
        return 'no_effect';
    },

    /**
     * Try Escape key. Returns 'feed_found', 'navigated_no_feed', or 'no_effect'.
     */
    _tryEscapeKey: async function (urlBefore) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true
        }));
        const ok = await this._waitForFeedReturn(3000);
        if (ok) return 'feed_found';
        if (window.location.href !== urlBefore) return 'navigated_no_feed';
        return 'no_effect';
    },

    /**
     * Try history.back(). Returns 'feed_found', 'navigated_no_feed', or 'no_effect'.
     */
    _tryHistoryBack: async function (urlBefore) {
        window.history.back();
        const ok = await this._waitForFeedReturn(3000);
        if (ok) return 'feed_found';
        if (window.location.href !== urlBefore) return 'navigated_no_feed';
        return 'no_effect';
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
