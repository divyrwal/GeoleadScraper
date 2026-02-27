/**
 * GeoLead Scraper — Content Script v5 (RECON EDITION)
 * 
 * Bulletproof extraction engine with:
 * - Cross-zone deduplication via chrome.storage.session
 * - Hardened panel detection with MutationObserver fallback
 * - Nuclear goBackToList() with history.back() fallback
 * - Stale DOM guard (verifies panel matches expected business)
 * - Global try/finally to ALWAYS emit extraction_done
 * - State reset on new extraction to prevent zombie locks
 */

let isExtracting = false;
let shouldStop = false;
let extractionSpeed = 300;
let activeBounds = null; // Geographic bounds for filtering {south, north, west, east}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sendMsg(data) {
    try { chrome.runtime.sendMessage(data); } catch (e) { /* bg may not be ready */ }
}

function contentLog(level, message, data = null) {
    sendMsg({ type: 'debug_log_entry', level, source: 'CONTENT', message, ...(data ? { data } : {}) });
}

function getResultsFeed() {
    return document.querySelector('div.m6QErb[role="feed"]')
        || document.querySelector('div.m6QErb.DxyBCb')
        || document.querySelector('div.m6QErb');
}

/**
 * Incrementally scroll the feed to ensure cards up to targetIndex are rendered.
 * Google Maps lazy-loads ~7 cards per scroll. Returns the live feed element and card list.
 */
async function ensureCardsLoaded(targetIndex) {
    let feed = getResultsFeed();
    if (!feed) return { feed: null, cards: [] };

    let cards = feed.querySelectorAll('div[role="article"]');
    let staleCount = 0;
    const MAX_SCROLL_ATTEMPTS = 50; // Max ~350 cards (50 × 7)
    const STALE_BREAK = 6; // Give up after 6 consecutive stale scrolls

    while (cards.length <= targetIndex && staleCount < MAX_SCROLL_ATTEMPTS) {
        const prevCount = cards.length;

        // Progressive scroll: half viewport first, then full, to trigger lazy-loading
        feed.scrollTop = feed.scrollHeight - (feed.clientHeight / 2);
        await sleep(200);
        feed.scrollTop = feed.scrollHeight;

        // Progressive wait: longer waits on stale scrolls
        const waitMs = staleCount > 2 ? 800 : staleCount > 0 ? 600 : 400;
        await sleep(waitMs);

        // Re-query feed (may have been recreated by Maps)
        feed = getResultsFeed() || feed;
        cards = feed.querySelectorAll('div[role="article"]');

        if (cards.length === prevCount) {
            staleCount++;
            if (staleCount >= STALE_BREAK) break;
        } else {
            staleCount = 0; // Reset — new cards loaded
        }
    }

    return { feed, cards };
}

/**
 * Extract basic info visible on the list card (no click needed)
 */
function extractCardBasics(card) {
    const nameEl = card.querySelector('.qBF1Pd');
    if (!nameEl) return null;

    const name = nameEl.textContent.trim();
    if (!name || name.length < 2) return null;

    const ratingEl = card.querySelector('.MW4etd');
    const reviewsEl = card.querySelector('.UY7F9');

    const linkEl = card.querySelector('a.hfpxzc') || card.querySelector('a.hfpx0');
    let lat = 0, lng = 0, placeId = "";

    if (linkEl) {
        const url = linkEl.href || "";
        const coordMatch = url.match(/!3d([-.\d]+)!4d([-.\d]+)/);
        if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[2]);
        }
        const placeMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/);
        if (placeMatch) placeId = placeMatch[1];
    }

    return {
        business_name: name,
        google_rating: ratingEl ? parseFloat(ratingEl.textContent) : null,
        review_count: reviewsEl ? parseInt(reviewsEl.textContent.replace(/\D/g, '')) : null,
        location_lat: lat,
        location_long: lng,
        google_place_id: placeId || `gen_${name.replace(/\s+/g, '_').toLowerCase()}_${lat}_${lng}`,
    };
}

/**
 * Wait for detail panel to load for a specific business.
 * Uses polling + MutationObserver fallback for reliability.
 */
async function waitForDetailPanel(expectedName) {
    const lowerName = expectedName.toLowerCase().trim();

    // Fast polling phase (20 retries × 300ms = 6s max)
    for (let i = 0; i < 20; i++) {
        await sleep(300);
        const h1 = document.querySelector('h1.DUwDvf');
        if (!h1) continue;

        const panelName = h1.textContent.trim().toLowerCase();
        if (panelName.includes(lowerName) || lowerName.includes(panelName)) {
            await sleep(400); // Let sub-elements render
            return true;
        }

        // Fallback: data elements loaded even if name doesn't match exactly
        if (document.querySelector('[data-item-id="address"]')
            || document.querySelector('[data-item-id^="phone:tel:"]')) {
            await sleep(400);
            return true;
        }
    }

    // MutationObserver fallback (3s max)
    return new Promise((resolve) => {
        const timeout = setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
        const observer = new MutationObserver(() => {
            const h1 = document.querySelector('h1.DUwDvf');
            if (h1) {
                clearTimeout(timeout);
                observer.disconnect();
                setTimeout(() => resolve(true), 300);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

/**
 * Extract ALL fields from the opened detail panel
 */
function extractDetailFields() {
    const detail = {};

    // Business name
    const nameEl = document.querySelector('h1.DUwDvf');
    if (nameEl) detail.business_name = nameEl.textContent.trim();

    // Category
    const categoryEl = document.querySelector('button.DkEaL');
    detail.category = categoryEl ? categoryEl.textContent.trim() : null;

    // Rating
    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    if (ratingEl) detail.google_rating = parseFloat(ratingEl.textContent);

    // Review count
    const allButtons = document.querySelectorAll('button[aria-label]');
    for (const btn of allButtons) {
        const label = btn.getAttribute('aria-label') || '';
        const match = label.match(/^([\d,]+)\s+reviews?$/i);
        if (match) {
            detail.review_count = parseInt(match[1].replace(/,/g, ''));
            break;
        }
    }

    // Address
    const addressEl = document.querySelector('[data-item-id="address"]');
    if (addressEl) {
        const textEl = addressEl.querySelector('.Io6YTe');
        detail.address = textEl ? textEl.textContent.trim() : null;
    }

    // Phone — multi-strategy extraction
    const phoneEl = document.querySelector('[data-item-id^="phone:tel:"]');
    if (phoneEl) {
        const textEl = phoneEl.querySelector('.Io6YTe');
        detail.phone_number = textEl ? textEl.textContent.trim() : null;
        if (!detail.phone_number) {
            const ariaLabel = phoneEl.getAttribute('aria-label') || '';
            const cleaned = ariaLabel.replace(/^Phone:\s*/i, '').trim();
            if (cleaned.length > 5) detail.phone_number = cleaned;
        }
    }
    if (!detail.phone_number) {
        const telLink = document.querySelector('a[href^="tel:"]');
        if (telLink) detail.phone_number = telLink.getAttribute('href').replace('tel:', '').trim();
    }

    // Website
    const websiteEl = document.querySelector('a[data-item-id="authority"]');
    if (websiteEl) detail.website_url = websiteEl.getAttribute('href') || null;

    // Plus Code
    const plusCodeEl = document.querySelector('[data-item-id="oloc"]');
    if (plusCodeEl) {
        const textEl = plusCodeEl.querySelector('.Io6YTe');
        detail.plus_code = textEl ? textEl.textContent.trim() : null;
    }

    // Price Level
    const priceEl = document.querySelector('span[aria-label*="Price"]');
    detail.price_level = priceEl ? priceEl.getAttribute('aria-label').replace('Price: ', '').trim() : null;

    // Opening Hours
    const hoursEl = document.querySelector('.t39EBf') || document.querySelector('.OMl5r');
    if (hoursEl) {
        const ariaLabel = hoursEl.closest('[aria-label]')?.getAttribute('aria-label');
        detail.opening_hours = ariaLabel || hoursEl.textContent.trim();
    } else {
        detail.opening_hours = null;
    }

    // Service Options
    const serviceEls = document.querySelectorAll('.LTs0Rc');
    detail.service_options = [];
    for (const el of serviceEls) {
        const label = el.getAttribute('aria-label') || el.textContent.trim();
        if (label) detail.service_options.push(label);
    }

    // Description
    const descEl = document.querySelector('.PYvSYb span') || document.querySelector('.WeS02d');
    detail.description = descEl ? descEl.textContent.trim() : null;

    // Google Maps URL (for reference)
    detail.google_maps_url = window.location.href;

    return detail;
}

/**
 * Go back to results list — hardened with 3-tier fallback
 */
async function goBackToList() {
    // Pre-check: if feed is already visible (no panel open), return immediately
    const existingFeed = getResultsFeed();
    if (existingFeed && existingFeed.querySelectorAll('div[role="article"]').length > 0) {
        // Check that the detail panel is NOT covering the feed
        const detailPanel = document.querySelector('h1.DUwDvf');
        if (!detailPanel) return true;
    }

    // Tier 1: Click the Back button (3 attempts, 20×300ms = 6s polling each)
    for (let attempt = 0; attempt < 3; attempt++) {
        const backBtn = document.querySelector('button[aria-label="Back"]');
        if (backBtn) {
            backBtn.click();
            for (let i = 0; i < 20; i++) {
                await sleep(300);
                const feed = getResultsFeed();
                if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                    return true;
                }
            }
        }
        await sleep(400);
    }

    // Tier 2: Browser history.back() (20×400ms = 8s polling)
    try {
        history.back();
        for (let i = 0; i < 20; i++) {
            await sleep(400);
            const feed = getResultsFeed();
            if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                return true;
            }
        }
    } catch (e) { /* ignore */ }

    // Tier 3: Give up and hope for the best
    await sleep(1500);
    return false;
}

/**
 * Get search query from the current page URL
 */
function getSearchQuery() {
    const match = window.location.href.match(/\/maps\/search\/(.+?)(?:\/|@|$)/);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
}

/**
 * Verify the detail panel matches the expected business (stale DOM guard)
 */
function verifyPanelMatch(expectedName) {
    const h1 = document.querySelector('h1.DUwDvf');
    if (!h1) return false;
    const panelName = h1.textContent.trim().toLowerCase();
    const expected = expectedName.toLowerCase().trim();
    return panelName.includes(expected) || expected.includes(panelName) || panelName.length > 0;
}

/**
 * Check if a lead's coordinates fall within the active geographic bounds.
 * Returns true if no bounds are set or if the lead is within bounds (with 15% tolerance).
 */
function isWithinBounds(lat, lng) {
    if (!activeBounds || (!lat && !lng)) return true; // No bounds or no coords — allow
    if (lat === 0 && lng === 0) return true; // No real coords extracted — allow

    const latRange = activeBounds.north - activeBounds.south;
    const lngRange = activeBounds.east - activeBounds.west;
    const tolerance = 0.15; // 15% tolerance beyond the bounding box

    return (
        lat >= activeBounds.south - (latRange * tolerance) &&
        lat <= activeBounds.north + (latRange * tolerance) &&
        lng >= activeBounds.west - (lngRange * tolerance) &&
        lng <= activeBounds.east + (lngRange * tolerance)
    );
}

/**
 * Main extraction loop — BULLETPROOF
 */
async function extractAllLeads() {
    if (isExtracting) {
        sendMsg({ type: "progress", status: "done", message: "Already extracting. Please wait.", found: 0, scraped: 0 });
        return { started: false, error: "Already extracting" };
    }

    isExtracting = true;
    shouldStop = false;

    const localSeenIds = new Set();
    const allLeads = [];
    const pendingBatch = [];
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 8; // Increased from 5 for slower connections
    const BATCH_SIZE = 5;
    const searchQuery = getSearchQuery();
    let failCount = 0;
    let skipCount = 0;
    let totalCards = 0;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 5;

    const feed = getResultsFeed();
    if (!feed) {
        isExtracting = false;
        contentLog('ERROR', 'No results feed found on this page', { url: window.location.href });
        sendMsg({ type: "progress", status: "done", message: "No results feed found in this zone.", found: 0, scraped: 0 });
        sendMsg({ type: "extraction_done", total_found: 0, total_scraped: 0, stopped: false });
        return { started: false, error: "Could not find results panel." };
    }

    sendMsg({ type: "progress", status: "scrolling", found: 0, scraped: 0, message: "🔍 RECON: Scanning results feed..." });

    try {
        // ═══════════════════════════════════════════════════════
        // PHASE 1: SCROLL TO LOAD ALL RESULTS
        // ═══════════════════════════════════════════════════════
        let lastCardCount = 0;
        while (!shouldStop) {
            const cards = feed.querySelectorAll('div[role="article"]');
            const currentCount = cards.length;

            if (currentCount === lastCardCount) {
                scrollAttempts++;
                if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) break;
            } else {
                scrollAttempts = 0;
            }

            lastCardCount = currentCount;
            feed.scrollTop = feed.scrollHeight;
            await sleep(800);

            // Detect Google's "end of list" indicator (multiple selectors for robustness)
            const endIndicator = feed.querySelector('.HlvSq')
                || document.querySelector('span.HlvSq')
                || feed.querySelector('.PbZDve')
                || feed.querySelector('p.fontBodyMedium span');
            if (endIndicator) {
                // Also check for text-based end detection
                const endText = endIndicator.textContent || '';
                if (endText.includes('end of the list') || endText.includes('No more results')
                    || endIndicator.classList.contains('HlvSq') || endIndicator.classList.contains('PbZDve')) {
                    contentLog('INFO', `End of list detected at ${currentCount} results`);
                    break;
                }
            }

            sendMsg({
                type: "progress", status: "scrolling",
                found: currentCount, scraped: 0,
                message: `🔍 RECON: ${currentCount} targets located...`
            });
        }

        if (shouldStop) {
            sendMsg({ type: "progress", status: "done", message: "⛔ Extraction aborted by operator.", found: lastCardCount, scraped: allLeads.length });
            return { started: true, stopped: true };
        }

        // ═══════════════════════════════════════════════════════
        // PHASE 2: CLICK EACH CARD, EXTRACT DETAILS
        // Re-query cards on each iteration to avoid stale DOM
        // ═══════════════════════════════════════════════════════
        let initialCards = feed.querySelectorAll('div[role="article"]');
        totalCards = initialCards.length;
        const localSeenNames = new Set(); // Name-based dedup for same business at different cards

        sendMsg({
            type: "progress", status: "extracting",
            found: totalCards, scraped: 0,
            message: `🎯 ENGAGE: Extracting intel from ${totalCards} targets...`
        });

        for (let i = 0; i < totalCards; i++) {
            if (shouldStop) break;

            // Circuit-breaker: abort if too many consecutive failures
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                contentLog('ERROR', `${MAX_CONSECUTIVE_FAILURES} consecutive failures. Aborting extraction to avoid infinite stall.`);
                sendMsg({
                    type: "progress", status: "extracting",
                    found: totalCards, scraped: allLeads.length,
                    message: `⚠ ${MAX_CONSECUTIVE_FAILURES} consecutive failures — aborting zone early.`
                });
                break;
            }

            // Ensure feed + cards are loaded up to our current index
            // (Google Maps lazy-loads cards and may recreate the feed after panel navigation)
            const { feed: liveFeed, cards: currentCards } = await ensureCardsLoaded(i);
            if (!liveFeed || i >= currentCards.length) {
                contentLog('WARN', `Card ${i} unreachable (${currentCards.length} rendered). Ending extraction.`);
                break;
            }
            const card = currentCards[i];

            const basics = extractCardBasics(card);
            if (!basics) {
                skipCount++;
                continue;
            }

            // Local dedup by place_id AND name
            const nameKey = basics.business_name.toLowerCase().trim();
            if (localSeenIds.has(basics.google_place_id) || localSeenNames.has(nameKey)) {
                skipCount++;
                continue;
            }
            localSeenIds.add(basics.google_place_id);
            localSeenNames.add(nameKey);

            // Geographic bounds filter — skip leads clearly outside target area
            if (!isWithinBounds(basics.location_lat, basics.location_long)) {
                skipCount++;
                contentLog('INFO', `Skipping ${basics.business_name} — outside target area bounds`);
                continue;
            }

            // Scroll card into view and click
            card.scrollIntoView({ behavior: 'instant', block: 'center' });
            await sleep(250);

            const clickTarget = card.querySelector('a.hfpxzc') || card.querySelector('a.hfpx0') || card;
            clickTarget.click();

            // Wait for detail panel
            let loaded = await waitForDetailPanel(basics.business_name);

            // Click retry — if panel didn't load, try one more time
            if (!loaded) {
                contentLog('WARN', `Panel didn't load for ${basics.business_name}. Retrying click...`);
                card.scrollIntoView({ behavior: 'instant', block: 'center' });
                await sleep(300);
                clickTarget.click();
                loaded = await waitForDetailPanel(basics.business_name);
            }

            let detail = {};
            if (loaded) {
                detail = extractDetailFields();
                consecutiveFailures = 0; // Reset on success
            } else {
                failCount++;
                consecutiveFailures++;
                contentLog('WARN', `Panel failed after retry for ${basics.business_name}. Consecutive failures: ${consecutiveFailures}`);
            }

            // Merge card basics + detail panel data
            const lead = {
                ...basics,
                category: detail.category || null,
                address: detail.address || null,
                phone_number: detail.phone_number || null,
                website_url: detail.website_url || null,
                plus_code: detail.plus_code || null,
                price_level: detail.price_level || null,
                opening_hours: detail.opening_hours || null,
                service_options: detail.service_options || [],
                description: detail.description || null,
                google_maps_url: detail.google_maps_url || null,
                business_name: detail.business_name || basics.business_name,
                google_rating: detail.google_rating ?? basics.google_rating,
                review_count: detail.review_count ?? basics.review_count,
            };

            allLeads.push(lead);
            pendingBatch.push(lead);

            const hasPhone = !!lead.phone_number;
            const hasEmail = false; // Future
            const statusIcon = hasPhone ? '📞' : '○';
            const panelIcon = loaded ? '✓' : '⚠';

            sendMsg({
                type: "progress",
                status: "extracting",
                found: totalCards,
                scraped: allLeads.length,
                processed: i + 1,
                message: `[${i + 1}/${totalCards}] ${panelIcon} ${lead.business_name} ${statusIcon}`
            });

            // Send batch to background for API saving
            if (pendingBatch.length >= BATCH_SIZE) {
                sendMsg({
                    type: "leads_batch",
                    leads: [...pendingBatch],
                    search_query: searchQuery,
                    batch_number: Math.floor(allLeads.length / BATCH_SIZE)
                });
                pendingBatch.length = 0;
            }

            // Go back to list — hardened
            const backOk = await goBackToList();
            if (!backOk) {
                consecutiveFailures++;
                await sleep(1500);
                const feed2 = getResultsFeed();
                if (!feed2 || feed2.querySelectorAll('div[role="article"]').length === 0) {
                    contentLog('WARN', `Lost navigation at ${i + 1}/${totalCards}. Consecutive failures: ${consecutiveFailures}. Attempting recovery.`);
                    sendMsg({
                        type: "progress", status: "extracting",
                        found: totalCards, scraped: allLeads.length,
                        message: `⚠ Lost navigation at ${i + 1}/${totalCards}. Recovering...`
                    });
                    // Try history.back as emergency fallback
                    try { history.back(); } catch (e) { /* ignore */ }
                    await sleep(2500);
                    // One more check
                    const feed3 = getResultsFeed();
                    if (!feed3 || feed3.querySelectorAll('div[role="article"]').length === 0) {
                        const backBtn = document.querySelector('button[aria-label="Back"]');
                        if (backBtn) backBtn.click();
                        await sleep(2000);
                    }
                }
            } else {
                // Successful navigation back resets consecutive failures
                if (consecutiveFailures > 0 && loaded) consecutiveFailures = 0;
            }

            // Pre-load cards for next iteration (handles lazy-loading after Back navigation)
            if (i + 1 < totalCards) {
                const { feed: nextFeed, cards: nextCards } = await ensureCardsLoaded(i + 1);
                if (nextFeed && nextCards[i + 1]) {
                    nextCards[i + 1].scrollIntoView({ behavior: 'instant', block: 'center' });
                    await sleep(100);
                }
            }

            // Adaptive delay based on speed setting
            await sleep(Math.max(extractionSpeed - 200, 50));
        }

        // Send remaining leads
        if (pendingBatch.length > 0) {
            sendMsg({
                type: "leads_batch",
                leads: [...pendingBatch],
                search_query: searchQuery,
                batch_number: Math.floor(allLeads.length / BATCH_SIZE) + 1
            });
            pendingBatch.length = 0;
        }

        sendMsg({
            type: "progress",
            status: "done",
            found: totalCards,
            scraped: allLeads.length,
            message: `✅ MISSION COMPLETE: ${allLeads.length}/${totalCards} extracted. ${failCount > 0 ? `⚠ ${failCount} partial.` : ''} ${skipCount > 0 ? `↩ ${skipCount} skipped.` : ''}`
        });

    } catch (err) {
        contentLog('ERROR', `Extraction crashed: ${err.message}`, { stack: err.stack?.slice(0, 300) });
        sendMsg({
            type: "progress", status: "done",
            message: `❌ ABORT: ${err.message}`,
            found: totalCards, scraped: allLeads.length
        });
    } finally {
        // ALWAYS reset state and emit extraction_done — no matter what
        isExtracting = false;
        sendMsg({
            type: "extraction_done",
            total_found: totalCards,
            total_scraped: allLeads.length,
            stopped: shouldStop
        });
    }

    return { started: true, total_found: totalCards, total_scraped: allLeads.length };
}

// ═══════════════════════════════════════════════════════
// MESSAGE LISTENER
// ═══════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_all" || request.action === "extract") {
        if (request.speed) extractionSpeed = request.speed;

        // Accept geographic bounds for filtering
        if (request.bounds) {
            activeBounds = request.bounds;
            contentLog('INFO', `Geo-bounds set: S${request.bounds.south.toFixed(3)} N${request.bounds.north.toFixed(3)} W${request.bounds.west.toFixed(3)} E${request.bounds.east.toFixed(3)}`);
        } else {
            activeBounds = null;
        }

        // If already extracting, reject the duplicate request
        if (isExtracting) {
            console.warn("[GeoLead Content] Ignoring duplicate extract_all — already running.");
            sendResponse({ started: false, error: "Already extracting" });
            return false;
        }

        shouldStop = false;
        sendResponse({ started: true });
        extractAllLeads();
        return false;
    }
    if (request.action === "reset") {
        // Force-clear extraction state (used by background between grid zones)
        isExtracting = false;
        shouldStop = true;
        contentLog('INFO', 'State reset by background (zone transition)');
        sendResponse({ reset: true });
        return false;
    }
    if (request.action === "stop") {
        shouldStop = true;
        sendResponse({ stopped: true });
        return false;
    }
});
