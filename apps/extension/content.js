/**
 * GeoLead Scraper — Content Script v4
 * 
 * Key change: sends extracted leads via chrome.runtime.sendMessage in real-time
 * batches instead of waiting for the full loop to complete and using sendResponse.
 * This fixes the Chrome timeout issue where sendResponse dies after ~5 minutes.
 */

let isExtracting = false;
let shouldStop = false;
let extractionSpeed = 300; // ms between actions, configurable from popup

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
 * Checks that h1 name matches AND at least one info element is present.
 */
async function waitForDetailPanel(expectedName) {
    const lowerName = expectedName.toLowerCase();
    for (let i = 0; i < 15; i++) {
        await sleep(300);
        const h1 = document.querySelector('h1.DUwDvf');
        if (!h1) continue;
        const panelName = h1.textContent.trim().toLowerCase();
        // Panel loaded for this business
        if (panelName.includes(lowerName) || lowerName.includes(panelName)) {
            await sleep(300); // Let sub-elements render
            return true;
        }
        // Or we detect data elements loaded (name might not match exactly)
        if (document.querySelector('[data-item-id="address"]')
            || document.querySelector('[data-item-id^="phone:tel:"]')) {
            await sleep(300);
            return true;
        }
    }
    return false;
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

    // Review count — strict regex to avoid matching legal buttons
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

    // Phone
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

    return detail;
}

/**
 * Go back to results list and verify it's visible
 */
async function goBackToList() {
    const backBtn = document.querySelector('button[aria-label="Back"]');
    if (backBtn) {
        backBtn.click();
        for (let i = 0; i < 10; i++) {
            await sleep(250);
            const feed = getResultsFeed();
            if (feed && feed.querySelectorAll('div[role="article"]').length > 0) {
                return true;
            }
        }
    }
    await sleep(500);
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
 * Main extraction loop
 */
async function extractAllLeads() {
    if (isExtracting) return { started: false, error: "Already extracting" };

    isExtracting = true;
    shouldStop = false;

    const seenIds = new Set();
    const allLeads = [];
    const pendingBatch = [];
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 5;
    const BATCH_SIZE = 5;
    const searchQuery = getSearchQuery();

    const feed = getResultsFeed();
    if (!feed) {
        isExtracting = false;
        return { started: false, error: "Could not find results panel. Make sure Google Maps search results are visible." };
    }

    sendMsg({ type: "progress", status: "scrolling", found: 0, scraped: 0, message: "Starting extraction..." });

    // --- Phase 1: Scroll to load all results ---
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
        await sleep(1000);

        const endIndicator = feed.querySelector('.HlvSq') || document.querySelector('span.HlvSq');
        if (endIndicator) break;

        sendMsg({ type: "progress", status: "scrolling", found: currentCount, scraped: 0, message: `Scrolling... ${currentCount} listings found` });
    }

    if (shouldStop) {
        isExtracting = false;
        sendMsg({ type: "extraction_done", total_found: lastCardCount, total_scraped: allLeads.length, stopped: true });
        return { started: true, stopped: true };
    }

    // --- Phase 2: Click each card, extract details, send in batches ---
    const allCards = feed.querySelectorAll('div[role="article"]');
    const totalCards = allCards.length;
    let failCount = 0;

    sendMsg({ type: "progress", status: "extracting", found: totalCards, scraped: 0, message: `Extracting details from ${totalCards} listings...` });

    for (let i = 0; i < totalCards; i++) {
        if (shouldStop) break;

        const card = allCards[i];
        const basics = extractCardBasics(card);
        if (!basics) continue;

        if (seenIds.has(basics.google_place_id)) continue;
        seenIds.add(basics.google_place_id);

        // Scroll and click
        card.scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(200);

        const clickTarget = card.querySelector('a.hfpxzc') || card.querySelector('a.hfpx0') || card;
        clickTarget.click();

        // Wait for detail panel
        const loaded = await waitForDetailPanel(basics.business_name);

        let detail = {};
        if (loaded) {
            detail = extractDetailFields();
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
            business_name: detail.business_name || basics.business_name,
            google_rating: detail.google_rating ?? basics.google_rating,
            review_count: detail.review_count ?? basics.review_count,
        };

        allLeads.push(lead);
        pendingBatch.push(lead);

        const hasPhone = !!lead.phone_number;
        sendMsg({
            type: "progress",
            status: "extracting",
            found: totalCards,
            scraped: allLeads.length,
            processed: i + 1,
            message: `${i + 1}/${totalCards} — ${lead.business_name} ${hasPhone ? '📞' : '○'}${loaded ? '' : ' ⚠️'}`
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

        // Go back to list
        const backOk = await goBackToList();
        if (!backOk) {
            await sleep(500);
            const backBtn2 = document.querySelector('button[aria-label="Back"]');
            if (backBtn2) backBtn2.click();
            await sleep(800);
        }
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

    isExtracting = false;

    sendMsg({
        type: "progress",
        status: "done",
        found: totalCards,
        scraped: allLeads.length,
        message: `Done! ${allLeads.length}/${totalCards} extracted. ${failCount > 0 ? `⚠️ ${failCount} partial.` : '✅ All complete.'}`
    });

    sendMsg({
        type: "extraction_done",
        total_found: totalCards,
        total_scraped: allLeads.length,
        stopped: shouldStop
    });

    return { started: true, total_found: totalCards, total_scraped: allLeads.length };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_all" || request.action === "extract") {
        // Accept speed from popup
        if (request.speed) extractionSpeed = request.speed;
        // Return immediately — don't hold the response channel
        sendResponse({ started: true });
        // Run extraction async (results sent via messages)
        extractAllLeads();
        return false;
    }
    if (request.action === "stop") {
        shouldStop = true;
        sendResponse({ stopped: true });
        return false;
    }
});
