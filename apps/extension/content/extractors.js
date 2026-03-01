/**
 * content/extractors.js
 * Data extraction from Google Maps cards and detail panels.
 * Uses SELECTORS registry with multi-fallback querying.
 */

window.GeoLeadExtractors = {
    /**
     * Extract basic info from a search result card (without opening detail panel).
     * @param {Element} card - A div[role="article"] element
     * @returns {Object|null}
     */
    extractCardBasics: function (card) {
        if (!card) return null;

        // --- Business Name (multi-strategy) ---
        let name = null;

        // Strategy 1: Known class selectors
        for (const sel of SELECTORS.card.name) {
            try {
                const el = card.querySelector(sel);
                if (el) {
                    // For links, use aria-label as name
                    if (el.tagName === 'A') {
                        name = el.getAttribute('aria-label');
                    } else {
                        name = el.textContent;
                    }
                    if (name) {
                        name = name.trim();
                        break;
                    }
                }
            } catch (e) { }
        }

        if (!name || name.length < 2) return null;

        // Reject generic page-chrome names
        if (this._isGenericName(name)) return null;

        // --- Rating ---
        let rating = null;
        const ratingEl = card.querySelector(SELECTORS.card.rating[0]);
        if (ratingEl) {
            rating = parseFloat(ratingEl.textContent);
            if (isNaN(rating)) rating = null;
        }

        // --- Review Count ---
        let reviewCount = null;
        const reviewsEl = card.querySelector(SELECTORS.card.reviews[0]);
        if (reviewsEl) {
            reviewCount = parseInt(reviewsEl.textContent.replace(/\D/g, ''));
            if (isNaN(reviewCount)) reviewCount = null;
        }

        // --- Link, Coordinates, Place ID ---
        let lat = 0, lng = 0, placeId = '';
        let linkEl = null;
        for (const sel of SELECTORS.card.link) {
            try {
                linkEl = card.querySelector(sel);
                if (linkEl) break;
            } catch (e) { }
        }

        if (linkEl) {
            const url = linkEl.href || '';

            // Coordinates from URL
            const coordMatch = url.match(/!3d([-.\d]+)!4d([-.\d]+)/);
            if (coordMatch) {
                lat = parseFloat(coordMatch[1]);
                lng = parseFloat(coordMatch[2]);
            }

            // Place ID — hex format
            const hexMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/);
            if (hexMatch) {
                placeId = hexMatch[1];
            }

            // Place ID — ChIJ format
            if (!placeId) {
                const chijMatch = url.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
                if (chijMatch) placeId = chijMatch[1];
            }
        }

        // Fallback place ID
        if (!placeId) {
            placeId = `gen_${name.replace(/\s+/g, '_').toLowerCase()}_${lat}_${lng}`;
        }

        return {
            business_name: name,
            google_rating: rating,
            review_count: reviewCount,
            location_lat: lat,
            location_long: lng,
            google_place_id: placeId
        };
    },

    /**
     * Wait for the detail panel to load.
     * Tracks h1 before click — requires it to CHANGE to avoid reading stale content.
     *
     * @param {string} expectedName - Business name to verify
     * @param {number} timeoutMs - Max wait time
     * @param {string} [previousH1] - h1 text before the click (for change detection)
     * @returns {boolean}
     */
    waitForDetailPanel: async function (expectedName, timeoutMs = 5000, previousH1 = '') {
        const urlBefore = window.location.href;
        const expectedFp = GeoLeadUtils.fingerprint(expectedName);

        const result = await GeoLeadUtils.waitFor(() => {
            const currentUrl = window.location.href;
            const urlChanged = currentUrl !== urlBefore && currentUrl.includes('/maps/place/');

            const h1 = GeoLeadDOM.getDetailPanelTitle();
            if (!h1) return false;

            const panelName = h1.textContent.trim();
            if (panelName.length <= 2 || this._isGenericName(panelName)) return false;

            // Key check: h1 must have CHANGED from what it was before the click
            if (previousH1 && panelName === previousH1) return false;

            if (urlChanged) {
                // URL changed AND h1 changed — panel is definitely loaded
                return true;
            }

            // No URL change — require name match
            const panelFp = GeoLeadUtils.fingerprint(panelName);
            if (panelFp === expectedFp) return true;
            if (panelFp.includes(expectedFp) || expectedFp.includes(panelFp)) return true;
            if (GeoLeadUtils.diceCoefficient(panelName, expectedName) > 0.4) return true;

            return false;
        }, timeoutMs, 200);

        if (result) {
            // Wait for detail content (phone, address, etc.) to fully render
            await GeoLeadUtils.sleep(500);
            return true;
        }

        // Fallback: accept if h1.DUwDvf has changed from previous
        const anyH1 = GeoLeadDOM.queryFirst(['h1.DUwDvf', 'div[role="main"] h1']);
        if (anyH1) {
            const text = anyH1.textContent.trim();
            if (text.length > 2 && !this._isGenericName(text) && text !== previousH1) {
                await GeoLeadUtils.sleep(500);
                return true;
            }
        }

        return false;
    },

    /**
     * Check if a name is generic junk (not a real business name).
     */
    _isGenericName: function (name) {
        if (!name) return true;
        const lower = name.toLowerCase().trim();
        const genericNames = [
            'results', 'search results', 'google maps', 'map',
            'loading', 'directions', 'nearby', 'explore'
        ];
        return genericNames.includes(lower);
    },

    /**
     * Extract all available fields from the currently open detail panel.
     * @returns {Object}
     */
    extractDetailFields: function () {
        const detail = {};

        // Business Name — validate it's not generic junk
        const nameEl = GeoLeadDOM.getDetailPanelTitle();
        if (nameEl) {
            const rawName = nameEl.textContent.trim();
            if (rawName.length > 2 && !this._isGenericName(rawName)) {
                detail.business_name = rawName;
            }
        }

        // Category
        const categoryEl = GeoLeadDOM.queryFirst(SELECTORS.detail.category);
        detail.category = categoryEl ? categoryEl.textContent.trim() : null;

        // Rating (from detail panel)
        const ratingEl = GeoLeadDOM.queryFirst(SELECTORS.detail.ratingDetail);
        if (ratingEl) {
            const r = parseFloat(ratingEl.textContent);
            if (!isNaN(r)) detail.google_rating = r;
        }

        // Review Count
        detail.review_count = this._extractReviewCount();

        // Address
        detail.address = this._extractFieldText(SELECTORS.detail.address, SELECTORS.detail.addressText);

        // Phone Number
        detail.phone_number = this._extractPhone();

        // Website
        detail.website_url = this._extractWebsite();

        // Plus Code
        detail.plus_code = this._extractFieldText(SELECTORS.detail.plusCode, SELECTORS.detail.addressText);

        // Price Level
        const priceEl = GeoLeadDOM.queryFirst(SELECTORS.detail.priceLevel);
        detail.price_level = priceEl
            ? (priceEl.getAttribute('aria-label') || '').replace('Price: ', '').trim() || null
            : null;

        // Opening Hours
        detail.opening_hours = this._extractHours();

        // Service Options
        detail.service_options = this._extractServiceOptions();

        // Description
        const descEl = GeoLeadDOM.queryFirst(SELECTORS.detail.description);
        detail.description = descEl ? descEl.textContent.trim() : null;

        // Social Media Links
        detail.social_links = this._extractSocialLinks();

        // Current URL
        detail.google_maps_url = window.location.href;

        return detail;
    },

    // --- Private helpers ---

    _extractReviewCount: function () {
        const allButtons = GeoLeadDOM.queryAll(SELECTORS.detail.reviewCount);
        for (const btn of allButtons) {
            const label = btn.getAttribute('aria-label') || '';
            const match = label.match(/^([\d,]+)\s+reviews?$/i);
            if (match) {
                return parseInt(match[1].replace(/,/g, ''));
            }
        }
        return null;
    },

    _extractFieldText: function (containerSelectors, textSelectors) {
        const container = GeoLeadDOM.queryFirst(containerSelectors);
        if (!container) return null;

        // Try known text element selectors
        for (const sel of (textSelectors || SELECTORS.detail.addressText)) {
            const textEl = container.querySelector(sel);
            if (textEl) {
                const text = textEl.textContent.trim();
                if (text.length > 2) return text;
            }
        }

        // Fallback: aria-label
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.length > 3) return ariaLabel;

        return null;
    },

    _extractPhone: function () {
        // Strategy 1: data-item-id phone element
        const phoneEl = GeoLeadDOM.queryFirst([SELECTORS.detail.phone[0]]);
        if (phoneEl) {
            // Try text content
            for (const sel of SELECTORS.detail.addressText) {
                const textEl = phoneEl.querySelector(sel);
                if (textEl) {
                    const text = textEl.textContent.trim();
                    if (text.length > 5) return text;
                }
            }
            // Try aria-label
            const ariaLabel = phoneEl.getAttribute('aria-label') || '';
            const cleaned = ariaLabel.replace(/^Phone:\s*/i, '').trim();
            if (cleaned.length > 5) return cleaned;
        }

        // Strategy 2: tel: link
        const telLink = GeoLeadDOM.queryFirst(['a[href^="tel:"]']);
        if (telLink) {
            return telLink.getAttribute('href').replace('tel:', '').trim();
        }

        // Strategy 3: Search all aria-labels for phone patterns
        const allButtons = document.querySelectorAll('button[aria-label], a[aria-label]');
        for (const el of allButtons) {
            const label = el.getAttribute('aria-label') || '';
            if (/phone|call/i.test(label)) {
                const phoneMatch = label.match(/[\d\s+()-]{7,}/);
                if (phoneMatch) return phoneMatch[0].trim();
            }
        }

        return null;
    },

    _extractWebsite: function () {
        // Strategy 1: authority link
        const authorityEl = GeoLeadDOM.queryFirst([SELECTORS.detail.website[0]]);
        if (authorityEl) return authorityEl.getAttribute('href') || null;

        // Strategy 2: tooltip-based link
        const tooltipEl = GeoLeadDOM.queryFirst([SELECTORS.detail.website[1]]);
        if (tooltipEl) return tooltipEl.getAttribute('href') || null;

        // Strategy 3: Any external link that's not Google
        const allLinks = document.querySelectorAll('a[href]');
        for (const link of allLinks) {
            const href = link.getAttribute('href') || '';
            if (
                href.startsWith('http') &&
                !href.includes('google.com') &&
                !href.includes('goo.gl') &&
                !href.includes('maps.app') &&
                GeoLeadDOM.isVisible(link)
            ) {
                // Extra check: link should be in the detail panel area
                const parent = link.closest('[role="main"], .m6QErb, .bJzME');
                if (parent) return href;
            }
        }

        return null;
    },

    _extractHours: function () {
        const hoursEl = GeoLeadDOM.queryFirst(SELECTORS.detail.hours);
        if (!hoursEl) return null;

        // Try the closest element with aria-label
        const labeled = hoursEl.closest('[aria-label]');
        if (labeled) {
            const ariaLabel = labeled.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.length > 5) return ariaLabel;
        }

        return hoursEl.textContent.trim() || null;
    },

    _extractServiceOptions: function () {
        const serviceEls = GeoLeadDOM.queryAll(SELECTORS.detail.serviceOptions);
        const options = [];
        for (const el of serviceEls) {
            const label = el.getAttribute('aria-label') || el.textContent.trim();
            if (label && !options.includes(label)) options.push(label);
        }
        return options;
    },

    _extractSocialLinks: function () {
        const links = {};
        for (const selector of SELECTORS.detail.socialLinks) {
            const el = GeoLeadDOM.queryFirst([selector]);
            if (el) {
                const href = el.getAttribute('href') || '';
                if (href.includes('facebook.com')) links.facebook = href;
                else if (href.includes('instagram.com')) links.instagram = href;
                else if (href.includes('linkedin.com')) links.linkedin = href;
                else if (href.includes('twitter.com')) links.twitter = href;
                else if (href.includes('youtube.com')) links.youtube = href;
            }
        }
        return Object.keys(links).length > 0 ? links : null;
    }
};
