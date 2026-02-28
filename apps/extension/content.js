/**
 * GeoLead Scraper — Content Script v7 (SEQUENTIAL EDITION)
 * 
 * Simple, deterministic extraction:
 * - Phase 1: Scroll to discover all results
 * - Phase 2: Iterate by index (card 0, 1, 2...), fast-skip dupes by name
 * - No complex search logic, no deep scroll searches
 * - Every operation wrapped in try-catch with heartbeat
 */

let isExtracting = false;
let shouldStop = false;
let extractionSpeed = 300;
let activeBounds = null;

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

// ═══════════════════════════════════════════════════════
// SCROLL HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Scroll the feed until at least `targetCount` article cards are rendered.
 * Returns the current card count. Max wait ~8 seconds.
 */
async function scrollFeedToIndex(feed, targetCount) {
    let cards = feed.querySelectorAll('div[role="article"]');
    if (cards.length >= targetCount) return cards.length;

    let staleCount = 0;
    for (let i = 0; i < 15; i++) {
        const prevCount = cards.length;
        feed.scrollTop = feed.scrollHeight;
        await sleep(400);

        feed = getResultsFeed() || feed;
        cards = feed.querySelectorAll('div[role="article"]');

        if (cards.length >= targetCount) return cards.length;

        if (cards.length === prevCount) {
            staleCount++;
            if (staleCount >= 4) return cards.length; // Can't load more
        } else {
            staleCount = 0;
        }
    }
    return cards.length;
}

/**
 * Scroll feed to top and wait for cards to appear.
 */
async function scrollReset(feed) {
    feed.scrollTop = 0;
    await sleep(600);
    const cards = feed.querySelectorAll('div[role="article"]');
    if (cards.length >= 3) return true;

    // Wait a bit more
    for (let i = 0; i < 5; i++) {
        await sleep(400);
        const f = getResultsFeed();
        if (f && f.querySelectorAll('div[role="article"]').length >= 3) return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════
// CARD DATA EXTRACTION
// ═══════════════════════════════════════════════════════

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
        const coordMatch = url.match(/!3d([-.\\d]+)!4d([-.\\d]+)/);
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
 */
async function waitForDetailPanel(expectedName) {
    const lowerName = expectedName.toLowerCase().trim();

    for (let i = 0; i < 20; i++) {
        await sleep(300);
        const h1 = document.querySelector('h1.DUwDvf');
        if (!h1) continue;

        const panelName = h1.textContent.trim().toLowerCase();
        if (panelName.includes(lowerName) || lowerName.includes(panelName)) {
            await sleep(400);
            return true;
        }

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

    const nameEl = document.querySelector('h1.DUwDvf');
    if (nameEl) detail.business_name = nameEl.textContent.trim();

    const categoryEl = document.querySelector('button.DkEaL');
    detail.category = categoryEl ? categoryEl.textContent.trim() : null;

    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
    if (ratingEl) detail.google_rating = parseFloat(ratingEl.textContent);

    const allButtons = document.querySelectorAll('button[aria-label]');
    for (const btn of allButtons) {
        const label = btn.getAttribute('aria-label') || '';
        const match = label.match(/^([\d,]+)\s+reviews?$/i);
        if (match) {
            detail.review_count = parseInt(match[1].replace(/,/g, ''));
            break;
        }
    }

    const addressEl = document.querySelector('[data-item-id="address"]');
    if (addressEl) {
        const textEl = addressEl.querySelector('.Io6YTe');
        detail.address = textEl ? textEl.textContent.trim() : null;
    }

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

    const websiteEl = document.querySelector('a[data-item-id="authority"]');
    if (websiteEl) detail.website_url = websiteEl.getAttribute('href') || null;

    const plusCodeEl = document.querySelector('[data-item-id="oloc"]');
    if (plusCodeEl) {
        const textEl = plusCodeEl.querySelector('.Io6YTe');
        detail.plus_code = textEl ? textEl.textContent.trim() : null;
    }

    const priceEl = document.querySelector('span[aria-label*="Price"]');
    detail.price_level = priceEl ? priceEl.getAttribute('aria-label').replace('Price: ', '').trim() : null;

    const hoursEl = document.querySelector('.t39EBf') || document.querySelector('.OMl5r');
    if (hoursEl) {
        const ariaLabel = hoursEl.closest('[aria-label]')?.getAttribute('aria-label');
        detail.opening_hours = ariaLabel || hoursEl.textContent.trim();
    } else {
        detail.opening_hours = null;
    }

    const serviceEls = document.querySelectorAll('.LTs0Rc');
    detail.service_options = [];
    for (const el of serviceEls) {
        const label = el.getAttribute('aria-label') || el.textContent.trim();
        if (label) detail.service_options.push(label);
    }

    const descEl = document.querySelector('.PYvSYb span') || document.querySelector('.WeS02d');
    detail.description = descEl ? descEl.textContent.trim() : null;

    detail.google_maps_url = window.location.href;

    return detail;
}

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════

/**
 * Go back to results list — hardened with 3-tier fallback
 */
async function goBackToList() {
    // Pre-check: if feed is already visible and no detail panel
    const existingFeed = getResultsFeed();
    if (existingFeed && existingFeed.querySelectorAll('div[role="article"]').length > 0) {
        const backBtn = document.querySelector('button[aria-label="Back"]') || document.querySelector('button[aria-label="back"]');
        if (!backBtn) return true;
    }

    // Tier 1: Click Back or Close button
    const backSelectors = [
        'button[aria-label="Back"]',
        'button[aria-label="back"]',
        'button[jsaction*="back"]',
        'button.hYkMEe',
        'button[aria-label="Close"]',
        'button[data-value="Back"]'
    ];
    for (const sel of backSelectors) {
        const backBtn = document.querySelector(sel);
        if (backBtn && backBtn.offsetParent !== null) { // ensure visible
            backBtn.click();
            for (let i = 0; i < 10; i++) {
                await sleep(300);
                const feed = getResultsFeed();
                if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                    if (!document.querySelector('button[aria-label="Back"]')) {
                        return true;
                    }
                }
            }
            break;
        }
    }

    // Tier 2: Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    await sleep(800);
    const feed3 = getResultsFeed();
    if (feed3 && feed3.querySelectorAll('div[role="article"]').length > 0 && !document.querySelector('button[aria-label="Back"]')) {
        return true;
    }

    contentLog('ERROR', '[BACK:FAIL] All tiers failed');
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
 * Check if a lead's coordinates fall within the active geographic bounds.
 */
function isWithinBounds(lat, lng) {
    if (!activeBounds || (!lat && !lng)) return true;
    if (lat === 0 && lng === 0) return true;

    const latRange = activeBounds.north - activeBounds.south;
    const lngRange = activeBounds.east - activeBounds.west;
    const tolerance = 0.15;

    return (
        lat >= activeBounds.south - (latRange * tolerance) &&
        lat <= activeBounds.north + (latRange * tolerance) &&
        lng >= activeBounds.west - (lngRange * tolerance) &&
        lng <= activeBounds.east + (lngRange * tolerance)
    );
}

// ═══════════════════════════════════════════════════════
// MAIN EXTRACTION — SEQUENTIAL INDEX-BASED
// ═══════════════════════════════════════════════════════
async function extractAllLeads() {
    if (isExtracting) {
        sendMsg({ type: "progress", status: "done", message: "Already extracting. Please wait.", found: 0, scraped: 0 });
        return { started: false, error: "Already extracting" };
    }

    isExtracting = true;
    shouldStop = false;

    const processedNames = new Set();
    const processedPlaceIds = new Set();
    const allLeads = [];
    const pendingBatch = [];
    const BATCH_SIZE = 5;
    const searchQuery = getSearchQuery();
    let failCount = 0;
    let skipCount = 0;
    let totalCards = 0;
    let consecutiveFailures = 0;

    let feed = getResultsFeed();
    if (!feed) {
        isExtracting = false;
        contentLog('ERROR', '[INIT:FAIL] No results feed found');
        sendMsg({ type: "progress", status: "done", message: "No results feed found.", found: 0, scraped: 0 });
        sendMsg({ type: "extraction_done", total_found: 0, total_scraped: 0, stopped: false });
        return { started: false, error: "No results feed." };
    }

    sendMsg({ type: "progress", status: "scrolling", found: 0, scraped: 0, message: "🔍 RECON: Scanning results feed..." });

    try {
        // ═══════════════════════════════════════════════════════
        // PHASE 1: SCROLL TO LOAD ALL RESULTS
        // ═══════════════════════════════════════════════════════
        let lastCardCount = 0;
        let scrollAttempts = 0;
        const MAX_SCROLL = 8;

        while (!shouldStop) {
            const cards = feed.querySelectorAll('div[role="article"]');
            const currentCount = cards.length;

            if (currentCount === lastCardCount) {
                scrollAttempts++;
                if (scrollAttempts >= MAX_SCROLL) break;
            } else {
                scrollAttempts = 0;
            }

            lastCardCount = currentCount;
            feed.scrollTop = feed.scrollHeight;
            await sleep(800);

            // Check for end-of-list indicator
            const endIndicator = feed.querySelector('.HlvSq')
                || document.querySelector('span.HlvSq')
                || feed.querySelector('.PbZDve');
            if (endIndicator) {
                contentLog('INFO', `[PHASE1] End of list at ${currentCount} results`);
                break;
            }

            sendMsg({
                type: "progress", status: "scrolling",
                found: currentCount, scraped: 0,
                message: `🔍 RECON: ${currentCount} targets located...`
            });
        }

        if (shouldStop) {
            sendMsg({ type: "progress", status: "done", message: "⛔ Aborted.", found: lastCardCount, scraped: 0 });
            return { started: true, stopped: true };
        }

        totalCards = lastCardCount;
        contentLog('INFO', `[PHASE2] Starting sequential extraction of ${totalCards} targets`);

        sendMsg({
            type: "progress", status: "extracting",
            found: totalCards, scraped: 0,
            message: `🎯 ENGAGE: Extracting intel from ${totalCards} targets...`
        });

        // ═══════════════════════════════════════════════════════
        // PHASE 2: SEQUENTIAL INDEX-BASED EXTRACTION
        // ═══════════════════════════════════════════════════════

        // Scroll back to top to start from card 0
        feed.scrollTop = 0;
        await sleep(500);

        let cardIndex = 0;
        let lastProgressTime = Date.now();

        while (cardIndex < totalCards && !shouldStop) {
            // Circuit breaker: 5 consecutive click failures
            if (consecutiveFailures >= 5) {
                contentLog('ERROR', `[CIRCUIT_BREAK] ${consecutiveFailures} consecutive failures. Ending zone.`);
                break;
            }

            // Heartbeat: send status every 10 seconds even during scrolling
            if (Date.now() - lastProgressTime > 10000) {
                sendMsg({
                    type: "progress", status: "extracting",
                    found: totalCards, scraped: allLeads.length,
                    processed: cardIndex,
                    message: `🔍 Processing card ${cardIndex + 1}/${totalCards}...`
                });
                lastProgressTime = Date.now();
            }

            try {
                // 1. Ensure the card at this index is rendered
                feed = getResultsFeed();
                if (!feed) {
                    contentLog('ERROR', '[FEED:LOST] Feed element disappeared');
                    break;
                }

                // Scroll to make card visible
                await scrollFeedToIndex(feed, cardIndex + 1);
                feed = getResultsFeed() || feed;
                let cards = feed.querySelectorAll('div[role="article"]');

                if (cardIndex >= cards.length) {
                    // Can't scroll far enough — we've reached the end of what's loadable
                    contentLog('INFO', `[PHASE2:END] Only ${cards.length} cards loadable, needed ${cardIndex + 1}. Ending.`);
                    break;
                }

                const card = cards[cardIndex];
                if (!card) {
                    cardIndex++;
                    continue;
                }

                // 2. Read card basics (no click needed)
                const basics = extractCardBasics(card);
                if (!basics) {
                    cardIndex++;
                    continue;
                }

                const nameKey = basics.business_name.toLowerCase().trim();

                // 3. FAST NAME SKIP — no click, no panel, instant
                if (processedNames.has(nameKey)) {
                    cardIndex++;
                    continue;
                }

                // 4. Place ID dedup
                if (basics.google_place_id && !basics.google_place_id.startsWith('gen_') && processedPlaceIds.has(basics.google_place_id)) {
                    processedNames.add(nameKey);
                    skipCount++;
                    cardIndex++;
                    continue;
                }

                // 5. Geographic bounds filter
                if (!isWithinBounds(basics.location_lat, basics.location_long)) {
                    processedNames.add(nameKey);
                    skipCount++;
                    cardIndex++;
                    continue;
                }

                // Mark as processed
                processedNames.add(nameKey);
                if (basics.google_place_id) processedPlaceIds.add(basics.google_place_id);

                // 6. CLICK THE CARD — scroll into view first
                card.scrollIntoView({ behavior: 'instant', block: 'center' });
                await sleep(200);

                const clickTarget = card.querySelector('a.hfpxzc')
                    || card.querySelector('a.hfpx0')
                    || card.querySelector('div.lI9IFe')
                    || card;
                clickTarget.click();

                // 7. WAIT FOR PANEL
                let loaded = await waitForDetailPanel(basics.business_name);

                // Retry once
                if (!loaded) {
                    contentLog('WARN', `[CLICK:RETRY] Panel didn't load for ${basics.business_name}`);
                    card.scrollIntoView({ behavior: 'instant', block: 'center' });
                    await sleep(300);
                    clickTarget.click();
                    loaded = await waitForDetailPanel(basics.business_name);
                }

                // 8. EXTRACT DATA
                let detail = {};
                if (loaded) {
                    detail = extractDetailFields();
                    consecutiveFailures = 0;
                    contentLog('INFO', `[CLICK:OK] ${basics.business_name} — panel loaded`);
                } else {
                    failCount++;
                    consecutiveFailures++;
                    contentLog('WARN', `[CLICK:FAIL] ${basics.business_name} — panel failed (consecutive: ${consecutiveFailures})`);
                }

                // Merge card + detail data
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
                lastProgressTime = Date.now();

                const hasPhone = !!lead.phone_number;
                const statusIcon = hasPhone ? '📞' : '○';

                sendMsg({
                    type: "progress", status: "extracting",
                    found: totalCards, scraped: allLeads.length,
                    processed: cardIndex + 1,
                    message: `[${allLeads.length}/${totalCards}] ✓ ${lead.business_name} ${statusIcon}`
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

                // 9. GO BACK TO LIST
                const backOk = await goBackToList();
                if (!backOk) {
                    consecutiveFailures++;
                    contentLog('WARN', `[BACK:FAIL] Lost nav after ${basics.business_name} (consecutive: ${consecutiveFailures})`);
                    // Try emergency recovery
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                    await sleep(2000);
                    const recoveredFeed = getResultsFeed();
                    if (!recoveredFeed || recoveredFeed.querySelectorAll('div[role="article"]').length === 0) {
                        contentLog('ERROR', '[RECOVERY:FAIL] Cannot recover feed. Ending zone.');
                        break;
                    }
                } else {
                    if (consecutiveFailures > 0 && loaded) consecutiveFailures = 0;
                }

                // Brief stabilization
                await sleep(Math.max(extractionSpeed - 200, 50));

            } catch (cardErr) {
                contentLog('ERROR', `[CARD:ERROR] Card ${cardIndex}: ${cardErr.message}`);
                consecutiveFailures++;
                if (consecutiveFailures >= 5) break;
            }

            cardIndex++;
        }

        // Send remaining batch
        if (pendingBatch.length > 0) {
            sendMsg({
                type: "leads_batch",
                leads: [...pendingBatch],
                search_query: searchQuery,
                batch_number: Math.floor(allLeads.length / BATCH_SIZE) + 1
            });
            pendingBatch.length = 0;
        }

        const unreachable = Math.max(0, totalCards - cardIndex);
        const summary = `✅ ZONE COMPLETE: ${allLeads.length} extracted, ${skipCount} skipped`
            + (unreachable > 0 ? `, ${unreachable} unreachable` : '')
            + (failCount > 0 ? ` | ${failCount} partial` : '') + '.';

        contentLog('INFO', `[DONE] ${summary}`);
        sendMsg({
            type: "progress", status: "done",
            found: totalCards, scraped: allLeads.length,
            message: summary
        });

    } catch (err) {
        contentLog('ERROR', `[CRASH] ${err.message}`, { stack: err.stack?.slice(0, 500) });
        sendMsg({
            type: "progress", status: "done",
            message: `❌ ABORT: ${err.message}`,
            found: totalCards, scraped: allLeads.length
        });
    } finally {
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

        if (request.bounds) {
            activeBounds = request.bounds;
            contentLog('INFO', `[INIT] Geo-bounds set: S${request.bounds.south.toFixed(3)} N${request.bounds.north.toFixed(3)} W${request.bounds.west.toFixed(3)} E${request.bounds.east.toFixed(3)}`);
        } else {
            activeBounds = null;
        }

        if (isExtracting) {
            console.warn("[GeoLead] Ignoring duplicate extract_all — already running.");
            sendResponse({ started: false, error: "Already extracting" });
            return false;
        }

        shouldStop = false;
        sendResponse({ started: true });
        extractAllLeads();
        return false;
    }
    if (request.action === "reset") {
        isExtracting = false;
        shouldStop = true;
        contentLog('INFO', '[RESET] State reset by background (zone transition)');
        sendResponse({ reset: true });
        return false;
    }
    if (request.action === "stop") {
        shouldStop = true;
        sendResponse({ stopped: true });
        return false;
    }
});
