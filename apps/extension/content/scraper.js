/**
 * content/scraper.js
 * The core state-machine orchestrator for sequential lead extraction.
 * Uses incremental scroll + extract (no 2-phase approach).
 * Every async boundary re-queries the feed for fresh DOM references.
 */

window.GeoLeadScraper = {
    // State
    isExtracting: false,
    shouldStop: false,

    activeBounds: null,

    // --- Public API ---

    getSearchQuery: function () {
        const match = window.location.href.match(/\/maps\/search\/(.+?)(?:\/|@|$)/);
        return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
    },

    isWithinBounds: function (lat, lng) {
        if (!this.activeBounds || (!lat && !lng)) return true;
        if (lat === 0 && lng === 0) return true;

        const latRange = this.activeBounds.north - this.activeBounds.south;
        const lngRange = this.activeBounds.east - this.activeBounds.west;
        const tolerance = 0.15;

        return (
            lat >= this.activeBounds.south - (latRange * tolerance) &&
            lat <= this.activeBounds.north + (latRange * tolerance) &&
            lng >= this.activeBounds.west - (lngRange * tolerance) &&
            lng <= this.activeBounds.east + (lngRange * tolerance)
        );
    },

    /**
     * Main extraction entry point.
     * Implements an incremental scroll + extract pipeline.
     */
    extractAllLeads: async function () {
        if (this.isExtracting) {
            GeoLeadUtils.sendMsg({
                type: "progress", status: "done",
                message: "Already extracting. Please wait.", found: 0, scraped: 0
            });
            return { started: false, error: "Already extracting" };
        }

        this.isExtracting = true;
        this.shouldStop = false;

        const processedNames = new Set();
        const processedPlaceIds = new Set();
        const allLeads = [];
        const pendingBatch = [];
        const BATCH_SIZE = 5;
        const searchQuery = this.getSearchQuery();
        let failCount = 0;
        let consecutiveFailures = 0;
        let skipCount = 0;

        // Verify feed exists
        let feed = GeoLeadDOM.getFreshFeed();
        if (!feed) {
            this.isExtracting = false;
            GeoLeadUtils.contentLog('ERROR', '[INIT] No results feed found');
            GeoLeadUtils.sendMsg({ type: "progress", status: "done", message: "No results feed found.", found: 0, scraped: 0 });
            GeoLeadUtils.sendMsg({ type: "extraction_done", total_found: 0, total_scraped: 0, stopped: false });
            return { started: false, error: "No results feed." };
        }

        GeoLeadUtils.sendMsg({
            type: "progress", status: "scrolling", found: 0, scraped: 0,
            message: "🔍 Scanning results feed..."
        });

        try {
            // PHASE 1: Scroll to discover all results
            GeoLeadUtils.contentLog('INFO', '[PHASE1] Scrolling to load all results...');

            const scrollResult = await GeoLeadScroller.scrollToLoadAll((count) => {
                if (this.shouldStop) return;
                GeoLeadUtils.sendMsg({
                    type: "progress", status: "scrolling",
                    found: count, scraped: 0,
                    message: `🔍 ${count} targets located...`
                });
            });

            if (this.shouldStop) {
                this._emitDone(scrollResult.totalLoaded, 0, true);
                return { started: true, stopped: true };
            }

            const totalCards = scrollResult.totalLoaded;
            GeoLeadUtils.contentLog('INFO', `[PHASE1] Scroll complete: ${totalCards} cards loaded, reachedEnd=${scrollResult.reachedEnd}`);

            // Scroll back to top before extraction
            feed = GeoLeadDOM.getFreshFeed();
            if (feed) {
                feed.scrollTop = 0;
                await GeoLeadUtils.sleep(500);
            }

            GeoLeadUtils.sendMsg({
                type: "progress", status: "extracting",
                found: totalCards, scraped: 0,
                message: `🎯 Extracting intel from ${totalCards} targets...`
            });

            // PHASE 2: Sequential extraction
            GeoLeadUtils.contentLog('INFO', `[PHASE2] Starting extraction of ${totalCards} targets`);

            let cardIndex = 0;
            let lastProgressTime = Date.now();

            while (cardIndex < totalCards && !this.shouldStop) {
                // Circuit breaker — only for feed-level failures
                if (consecutiveFailures >= 8) {
                    GeoLeadUtils.contentLog('ERROR', `[CIRCUIT_BREAK] ${consecutiveFailures} consecutive feed-level failures`);
                    break;
                }

                // Periodic progress update
                if (Date.now() - lastProgressTime > 8000) {
                    GeoLeadUtils.sendMsg({
                        type: "progress", status: "extracting",
                        found: totalCards, scraped: allLeads.length,
                        processed: cardIndex,
                        message: `🔍 Processing ${cardIndex + 1}/${totalCards}...`
                    });
                    lastProgressTime = Date.now();
                }

                try {
                    const result = await this._processCard(
                        cardIndex, totalCards, processedNames, processedPlaceIds,
                        searchQuery, allLeads, pendingBatch, BATCH_SIZE, skipCount
                    );

                    if (result.feedLost || result.reachedEnd) break;
                    if (result.extracted || result.partial) {
                        consecutiveFailures = 0;
                        lastProgressTime = Date.now();
                    }
                    if (result.skipped) skipCount++;

                } catch (err) {
                    GeoLeadUtils.contentLog('ERROR', `[CARD:ERROR] Card ${cardIndex}: ${err.message}`);
                    consecutiveFailures++;
                    await GeoLeadNavigator.goBackToFeed();
                    await GeoLeadUtils.sleep(1000);
                }

                cardIndex++;
            }

            // Flush remaining batch
            if (pendingBatch.length > 0) {
                GeoLeadUtils.sendMsg({
                    type: "leads_batch",
                    leads: [...pendingBatch],
                    search_query: searchQuery,
                    batch_number: Math.floor(allLeads.length / BATCH_SIZE) + 1
                });
                pendingBatch.length = 0;
            }

            this._emitDone(totalCards, allLeads.length, this.shouldStop, failCount, skipCount);

        } catch (err) {
            GeoLeadUtils.contentLog('ERROR', `[CRASH] ${err.message}`, { stack: err.stack?.slice(0, 500) });
            GeoLeadUtils.sendMsg({
                type: "progress", status: "done",
                message: `❌ Error: ${err.message}`,
                found: 0, scraped: allLeads.length
            });
        } finally {
            this.isExtracting = false;
            GeoLeadUtils.sendMsg({
                type: "extraction_done",
                total_found: allLeads.length,
                total_scraped: allLeads.length,
                stopped: this.shouldStop
            });
        }

        return { started: true, total_found: allLeads.length, total_scraped: allLeads.length };
    },

    // --- Helpers ---

    /**
     * Process a single card: load, extract basics, dedup, click in, extract detail, go back.
     * Returns an object indicating what happened.
     */
    _processCard: async function (cardIndex, totalCards, processedNames, processedPlaceIds, searchQuery, allLeads, pendingBatch, BATCH_SIZE, skipCount) {
        // Ensure card is loaded
        const { feed: liveFeed, cards } = await GeoLeadScroller.ensureCardLoaded(cardIndex);

        if (!liveFeed) {
            GeoLeadUtils.contentLog('WARN', `[FEED:LOST] Feed lost at card ${cardIndex}`);
            return { feedLost: true };
        }

        if (cardIndex >= cards.length) {
            GeoLeadUtils.contentLog('INFO', `[END] Reached end at card ${cardIndex} (${cards.length} rendered)`);
            return { reachedEnd: true };
        }

        const card = cards[cardIndex];
        if (!card) return { skipped: false };

        // Extract card basics
        const basics = GeoLeadExtractors.extractCardBasics(card);
        if (!basics) return { skipped: false };

        const nameKey = GeoLeadUtils.fingerprint(basics.business_name);

        // Dedup by name
        if (processedNames.has(nameKey)) return { skipped: false };

        // Dedup by place ID
        if (basics.google_place_id && !basics.google_place_id.startsWith('gen_') && processedPlaceIds.has(basics.google_place_id)) {
            processedNames.add(nameKey);
            return { skipped: true };
        }

        // Bounds check
        if (!this.isWithinBounds(basics.location_lat, basics.location_long)) {
            processedNames.add(nameKey);
            return { skipped: true };
        }

        processedNames.add(nameKey);
        if (basics.google_place_id) processedPlaceIds.add(basics.google_place_id);

        // Click into detail panel
        const { panelLoaded } = await GeoLeadNavigator.clickIntoDetail(card, basics.business_name);

        let detail = {};
        if (panelLoaded) {
            detail = GeoLeadExtractors.extractDetailFields();
            GeoLeadUtils.contentLog('INFO', `[OK] ${basics.business_name}`);
        } else {
            GeoLeadUtils.contentLog('WARN', `[PARTIAL] ${basics.business_name} — card data only`);
            // Navigate back before continuing
            await GeoLeadNavigator.goBackToFeed();
            await GeoLeadUtils.sleep(800);

            // Save partial lead with card basics only
            const partialLead = {
                ...basics,
                category: null, address: null, phone_number: null,
                website_url: null, plus_code: null, price_level: null,
                opening_hours: null, service_options: [], description: null,
                social_links: null, google_maps_url: null,
            };
            allLeads.push(partialLead);
            pendingBatch.push(partialLead);

            GeoLeadUtils.sendMsg({
                type: "progress", status: "extracting",
                found: totalCards, scraped: allLeads.length,
                processed: cardIndex + 1,
                message: `[${allLeads.length}] ~ ${basics.business_name} (partial)`
            });

            if (pendingBatch.length >= BATCH_SIZE) {
                GeoLeadUtils.sendMsg({
                    type: "leads_batch", leads: [...pendingBatch],
                    search_query: searchQuery,
                    batch_number: Math.floor(allLeads.length / BATCH_SIZE)
                });
                pendingBatch.length = 0;
            }

            await GeoLeadUtils.sleep(500);
            return { partial: true };
        }

        // Merge card basics + detail into lead
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
            social_links: detail.social_links || null,
            google_maps_url: detail.google_maps_url || null,
            business_name: (detail.business_name && detail.business_name !== basics.business_name)
                ? detail.business_name
                : basics.business_name,
            google_rating: detail.google_rating ?? basics.google_rating,
            review_count: detail.review_count ?? basics.review_count,
        };

        allLeads.push(lead);
        pendingBatch.push(lead);

        const hasPhone = !!lead.phone_number;
        const statusIcon = hasPhone ? '📞' : '○';

        GeoLeadUtils.sendMsg({
            type: "progress", status: "extracting",
            found: totalCards, scraped: allLeads.length,
            processed: cardIndex + 1,
            message: `[${allLeads.length}] ✓ ${lead.business_name} ${statusIcon}`
        });

        // Send batch
        if (pendingBatch.length >= BATCH_SIZE) {
            GeoLeadUtils.sendMsg({
                type: "leads_batch",
                leads: [...pendingBatch],
                search_query: searchQuery,
                batch_number: Math.floor(allLeads.length / BATCH_SIZE)
            });
            pendingBatch.length = 0;
        }

        // Navigate back to feed
        const { success: backOk } = await GeoLeadNavigator.goBackToFeed();
        if (!backOk) {
            GeoLeadUtils.contentLog('WARN', `[NAV:FAIL] Failed to return to feed at index ${cardIndex}`);
            await GeoLeadUtils.sleep(2000);
            const recoveredFeed = GeoLeadDOM.getFreshFeed();
            if (!recoveredFeed || recoveredFeed.querySelectorAll(SELECTORS.feed.article[0]).length === 0) {
                GeoLeadUtils.contentLog('ERROR', '[RECOVERY:FAIL] Cannot recover feed.');
                return { feedLost: true };
            }
        }

        // Speed delay
        await GeoLeadUtils.sleep(600);

        return { extracted: true };
    },

    _emitDone: function (found, scraped, stopped = false, failed = 0, skipped = 0) {
        const summary = stopped
            ? `⛔ Stopped. ${scraped} extracted.`
            : `✅ Complete: ${scraped} extracted, ${skipped} skipped` + (failed > 0 ? ` | ${failed} partial` : '');

        GeoLeadUtils.contentLog('INFO', `[DONE] ${summary}`);
        GeoLeadUtils.sendMsg({
            type: "progress", status: "done",
            found: Math.max(found, scraped), scraped,
            message: summary
        });
    }
};
