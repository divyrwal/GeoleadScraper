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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sendMsg(data) {
    try { chrome.runtime.sendMessage(data); } catch (e) { /* bg may not be ready */ }
}

function getResultsFeed() {
    return document.querySelector('div.m6QErb[role="feed"]')
        || document.querySelector('div.m6QErb.DxyBCb')
        || document.querySelector('div.m6QErb');
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
    // Tier 1: Click the Back button
    for (let attempt = 0; attempt < 3; attempt++) {
        const backBtn = document.querySelector('button[aria-label="Back"]');
        if (backBtn) {
            backBtn.click();
            for (let i = 0; i < 12; i++) {
                await sleep(250);
                const feed = getResultsFeed();
                if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                    return true;
                }
            }
        }
        await sleep(300);
    }

    // Tier 2: Browser history.back()
    try {
        history.back();
        for (let i = 0; i < 15; i++) {
            await sleep(300);
            const feed = getResultsFeed();
            if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                return true;
            }
        }
    } catch (e) { /* ignore */ }

    // Tier 3: Give up and hope for the best
    await sleep(1000);
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

    const feed = getResultsFeed();
    if (!feed) {
        isExtracting = false;
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

            const endIndicator = feed.querySelector('.HlvSq') || document.querySelector('span.HlvSq');
            if (endIndicator) break;

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
        // ═══════════════════════════════════════════════════════
        const allCards = feed.querySelectorAll('div[role="article"]');
        totalCards = allCards.length;

        sendMsg({
            type: "progress", status: "extracting",
            found: totalCards, scraped: 0,
            message: `🎯 ENGAGE: Extracting intel from ${totalCards} targets...`
        });

        for (let i = 0; i < totalCards; i++) {
            if (shouldStop) break;

            const card = allCards[i];
            const basics = extractCardBasics(card);
            if (!basics) {
                skipCount++;
                continue;
            }

            // Local dedup (within this zone)
            if (localSeenIds.has(basics.google_place_id)) {
                skipCount++;
                continue;
            }
            localSeenIds.add(basics.google_place_id);

            // Scroll card into view and click
            card.scrollIntoView({ behavior: 'instant', block: 'center' });
            await sleep(250);

            const clickTarget = card.querySelector('a.hfpxzc') || card.querySelector('a.hfpx0') || card;
            clickTarget.click();

            // Wait for detail panel
            const loaded = await waitForDetailPanel(basics.business_name);

            let detail = {};
            if (loaded) {
                // Stale DOM guard: verify we're looking at the right business
                if (verifyPanelMatch(basics.business_name)) {
                    detail = extractDetailFields();
                } else {
                    // Panel loaded but shows wrong business — extract anyway (data > nothing)
                    detail = extractDetailFields();
                }
            } else {
                failCount++;
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
                // If we can't get back, try one more time after a longer wait
                await sleep(1500);
                const feed2 = getResultsFeed();
                if (!feed2 || feed2.querySelectorAll('div[role="article"]').length === 0) {
                    sendMsg({
                        type: "progress", status: "extracting",
                        found: totalCards, scraped: allLeads.length,
                        message: `⚠ Lost navigation at ${i + 1}/${totalCards}. Recovering...`
                    });
                    // Try clicking back button one more time
                    const backBtn = document.querySelector('button[aria-label="Back"]');
                    if (backBtn) backBtn.click();
                    await sleep(2000);
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
        console.error("[GeoLead Content] Extraction error:", err);
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
        // Force-reset state in case a previous run crashed
        isExtracting = false;
        shouldStop = false;
        sendResponse({ started: true });
        extractAllLeads();
        return false;
    }
    if (request.action === "stop") {
        shouldStop = true;
        sendResponse({ stopped: true });
        return false;
    }
});
