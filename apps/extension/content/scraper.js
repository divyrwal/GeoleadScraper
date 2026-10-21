/**
 * content/scraper.js
 * The core state-machine orchestrator for sequential lead extraction.
 * Uses incremental scroll + extract (Phase 1 scroll, Phase 2 extract).
 * Every async boundary re-queries the feed for fresh DOM references.
 *
 * v7.2 — Critical fixes for premature zone exit:
 *   FIX 1: extraction_done now sends totalCards (not allLeads.length) as total_found
 *   FIX 2: Removed broken window.location.href recovery (destroys JS context)
 *          → Replaced with DOM-level re-navigation via history API + Escape key
 *   FIX 3: isEndOfList check deferred until scrollStaleCount >= 3
 *          → Prevents false-positive end-of-list detection after back-navigation
 *   FIX 4: Speed parameter wired to extraction delays
 */

window.GeoLeadScraper = {
    // State
    isExtracting: false,
    shouldStop: false,
    activeBounds: null,
    speed: 300, // Default speed (ms), overridable from background

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
     * Implements a 2-phase pipeline: scroll-to-discover, then sliding-window extract.
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
        let totalCards = 0; // Track across try/finally for extraction_done

        // Use configurable speed for delays (min 200ms, max 2000ms)
        const speedDelay = Math.max(200, Math.min(this.speed || 300, 2000));

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

            totalCards = scrollResult.totalLoaded;
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

            // PHASE 2: Sliding-Window Sequential extraction
            GeoLeadUtils.contentLog('INFO', `[PHASE2] Starting sliding-window extraction of ${totalCards} targets`);

            let processedCount = 0;
            let scrollStaleCount = 0;
            let lastProgressTime = Date.now();
            let feedRecoveryAttempts = 0;
            const MAX_FEED_RECOVERIES = 3;

            while (processedCount < totalCards && !this.shouldStop) {
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
                        processed: processedCount,
                        message: `🔍 Processing ${processedCount + 1}/${totalCards}...`
                    });
                    lastProgressTime = Date.now();
                }

                let liveFeed = GeoLeadDOM.getFreshFeed();
                if (!liveFeed) {
                    // FIX 2: DOM-level feed recovery (no page reload that destroys JS state)
                    if (feedRecoveryAttempts < MAX_FEED_RECOVERIES) {
                        feedRecoveryAttempts++;
                        GeoLeadUtils.contentLog('WARN', `[FEED:LOST] Attempting DOM recovery #${feedRecoveryAttempts}...`);
                        GeoLeadUtils.sendMsg({
                            type: "progress", status: "extracting",
                            found: totalCards, scraped: allLeads.length,
                            message: `⚠️ Feed lost — recovering (attempt ${feedRecoveryAttempts})...`
                        });

                        // Strategy 1: Try Escape key to dismiss any overlay/panel
                        document.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true
                        }));
                        await GeoLeadUtils.sleep(1500);

                        liveFeed = GeoLeadDOM.getFreshFeed();
                        if (liveFeed) {
                            GeoLeadUtils.contentLog('INFO', `[FEED:RECOVERED] Escape key restored feed`);
                            consecutiveFailures = 0;
                            continue;
                        }

                        // Strategy 2: Click back button
                        const backResult = await GeoLeadNavigator.goBackToFeed();
                        if (backResult.success) {
                            liveFeed = GeoLeadDOM.getFreshFeed();
                            if (liveFeed) {
                                GeoLeadUtils.contentLog('INFO', `[FEED:RECOVERED] Back navigation restored feed`);
                                consecutiveFailures = 0;
                                continue;
                            }
                        }

                        // Strategy 3: Use history API to go back multiple steps
                        for (let i = 0; i < 3; i++) {
                            window.history.back();
                            await GeoLeadUtils.sleep(1500);
                            liveFeed = GeoLeadDOM.getFreshFeed();
                            if (liveFeed) {
                                GeoLeadUtils.contentLog('INFO', `[FEED:RECOVERED] History back (${i+1}) restored feed`);
                                consecutiveFailures = 0;
                                break;
                            }
                        }
                        if (liveFeed) continue;

                        // Strategy 4: Use search box to re-trigger search (stays on same page)
                        const searchInput = document.querySelector('#searchboxinput');
                        if (searchInput) {
                            searchInput.focus();
                            await GeoLeadUtils.sleep(200);
                            // Press Enter to re-run the search
                            searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                            }));
                            await GeoLeadUtils.sleep(3000);
                            liveFeed = GeoLeadDOM.getFreshFeed();
                            if (liveFeed) {
                                GeoLeadUtils.contentLog('INFO', `[FEED:RECOVERED] Search re-trigger restored feed`);
                                // Re-scroll to load all cards
                                await GeoLeadScroller.scrollToLoadAll(() => {});
                                const freshFeed = GeoLeadDOM.getFreshFeed();
                                if (freshFeed) freshFeed.scrollTop = 0;
                                await GeoLeadUtils.sleep(500);
                                consecutiveFailures = 0;
                                continue;
                            }
                        }

                        GeoLeadUtils.contentLog('ERROR', `[FEED:RECOVERY_FAILED] Strategy ${feedRecoveryAttempts} failed`);
                        continue; // Try again (feedRecoveryAttempts incremented)
                    }

                    GeoLeadUtils.contentLog('WARN', '[FEED:LOST] All recovery attempts exhausted. Ending extraction.');
                    break;
                }

                // Reset feed recovery counter on successful feed access
                feedRecoveryAttempts = 0;

                const cards = Array.from(liveFeed.querySelectorAll(SELECTORS.feed.article[0]));
                
                // Find the first card in the DOM that hasn't been processed yet
                let targetCard = null;
                for (let i = 0; i < cards.length; i++) {
                    const card = cards[i];
                    const basics = GeoLeadExtractors.extractCardBasics(card);
                    if (basics) {
                        const nameKey = GeoLeadUtils.fingerprint(basics.business_name);
                        if (!processedNames.has(nameKey)) {
                            targetCard = card;
                            break;
                        }
                    }
                }

                if (targetCard) {
                    scrollStaleCount = 0;
                    
                    // Scroll target card into view centered
                    targetCard.scrollIntoView({ behavior: 'instant', block: 'center' });
                    await GeoLeadUtils.sleep(150);

                    try {
                        const result = await this._processCardElement(
                            targetCard, processedCount, totalCards, processedNames, processedPlaceIds,
                            searchQuery, allLeads, pendingBatch, BATCH_SIZE, skipCount, speedDelay
                        );

                        if (result.feedLost) {
                            // Don't break — let the feed recovery above handle it
                            consecutiveFailures++;
                            processedCount++;
                            continue;
                        }
                        if (result.extracted || result.partial) {
                            consecutiveFailures = 0;
                            lastProgressTime = Date.now();
                        }
                        if (result.skipped) skipCount++;
                        
                        processedCount++;
                    } catch (err) {
                        GeoLeadUtils.contentLog('ERROR', `[CARD:ERROR] Process failed at element: ${err.message}`);
                        consecutiveFailures++;
                        await GeoLeadNavigator.goBackToFeed();
                        await GeoLeadUtils.sleep(1000);
                        processedCount++; // Increment to prevent stuck loop
                    }
                } else {
                    // All visible cards are already processed. Scroll feed down to load next sliding window
                    GeoLeadUtils.contentLog('INFO', `[PHASE2] All visible cards processed (${processedCount}/${totalCards}). Scrolling for more...`);
                    
                    if (cards.length > 0) {
                        cards[cards.length - 1].scrollIntoView({ behavior: 'instant', block: 'end' });
                    }
                    liveFeed.scrollTop = liveFeed.scrollHeight;
                    
                    await GeoLeadUtils.sleep(800);
                    
                    // Verify if scrolling loaded new cards
                    const newFeed = GeoLeadDOM.getFreshFeed();
                    const newCards = newFeed ? newFeed.querySelectorAll(SELECTORS.feed.article[0]) : [];
                    if (newCards.length === cards.length) {
                        scrollStaleCount++;

                        // FIX 3: Only trust isEndOfList after multiple stale attempts
                        // AND only if we've processed at least 80% of expected cards.
                        // The end-of-list marker from Phase 1 may still be in the DOM
                        // even when we haven't scrolled to the bottom yet.
                        const processedPercent = processedCount / totalCards;
                        const endOfListReached = GeoLeadDOM.isEndOfList(newFeed);

                        if (scrollStaleCount >= 6) {
                            GeoLeadUtils.contentLog('INFO', `[PHASE2] Stale x6 at ${processedCount}/${totalCards}. Stopping.`);
                            break;
                        }
                        
                        if (endOfListReached && scrollStaleCount >= 3 && processedPercent >= 0.8) {
                            GeoLeadUtils.contentLog('INFO', `[PHASE2] End of list confirmed at ${processedCount}/${totalCards} (${Math.round(processedPercent*100)}%).`);
                            break;
                        }

                        if (endOfListReached && processedPercent < 0.8) {
                            // End-of-list marker is visible but we haven't processed enough cards.
                            // This is likely a false positive from Phase 1's scroll.
                            // Try scrolling back to top and re-scrolling to load fresh cards.
                            GeoLeadUtils.contentLog('WARN', `[PHASE2] End-of-list marker visible but only ${processedCount}/${totalCards} processed. Resetting scroll...`);
                            if (newFeed) {
                                newFeed.scrollTop = 0;
                                await GeoLeadUtils.sleep(500);
                                newFeed.scrollTop = newFeed.scrollHeight;
                                await GeoLeadUtils.sleep(800);
                            }
                        }
                    } else {
                        scrollStaleCount = 0;
                    }
                }
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
            // FIX 1: Send totalCards (the Phase 1 discovered count) as total_found,
            // NOT allLeads.length. This is critical for the zone re-entry check
            // in scanner.js to detect short extractions.
            GeoLeadUtils.sendMsg({
                type: "extraction_done",
                total_found: totalCards,        // ← Phase 1 discovered count
                total_scraped: allLeads.length, // ← Actually extracted count
                stopped: this.shouldStop
            });
        }

        return { started: true, total_found: totalCards, total_scraped: allLeads.length };
    },

    // --- Helpers ---

    /**
     * Process a single card: load, extract basics, dedup, click in, extract detail, go back.
     * Returns an object indicating what happened.
     */
    _processCardElement: async function (card, processedCount, totalCards, processedNames, processedPlaceIds, searchQuery, allLeads, pendingBatch, BATCH_SIZE, skipCount, speedDelay) {
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
                processed: processedCount + 1,
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

            await GeoLeadUtils.sleep(speedDelay);
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
            processed: processedCount + 1,
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
            GeoLeadUtils.contentLog('WARN', `[NAV:FAIL] Failed to return to feed at processed index ${processedCount}`);
            await GeoLeadUtils.sleep(2000);
            const recoveredFeed = GeoLeadDOM.getFreshFeed();
            if (!recoveredFeed || recoveredFeed.querySelectorAll(SELECTORS.feed.article[0]).length === 0) {
                GeoLeadUtils.contentLog('ERROR', '[RECOVERY:FAIL] Cannot recover feed.');
                return { feedLost: true };
            }
        }

        // Speed delay (configurable)
        await GeoLeadUtils.sleep(speedDelay);

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
