import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { getDb } from "@geolead/db";
import { v4 as uuidv4 } from "uuid";
import { scrapeGoogleMapsHeadless } from "./extractors/google-maps";
import { scrapeJustDialHeadless } from "./extractors/justdial";
import { scrapeLinkedInHeadless } from "./extractors/linkedin";
import { scrapeInstagramHeadless } from "./extractors/instagram";
import { validateLeadsWithAI } from "./ai-validator";
import { syncLeadsToCloud } from "./cloud-sync";
import { broadcastLog } from "./job-events";
import { geocodeLocation, generateGridFromBox, type GridZone } from "./grid-engine";

// Add stealth plugin to avoid anti-bot detection
chromium.use(stealth());

export interface SearchConfig {
    query: string;
    location: string;
    radiusKm?: number;
    maxResults?: number; // Added to control exhaustive scraping depth per source
    sources: {
        googleMaps: boolean;
        justDial: boolean;
        linkedIn: boolean;
        instagram: boolean;
    };
    useAiValidation: boolean;
    deepScan?: boolean;
}

export class SearchOrchestrator {
    public readonly jobId: string;
    private config: SearchConfig;

    constructor(config: SearchConfig) {
        this.jobId = uuidv4();
        this.config = config;
    }

    public async execute() {
        broadcastLog(this.jobId, 'info', `Starting job ${this.jobId} for "${this.config.query} in ${this.config.location}"`);

        // 1. Launch a single headless browser instance for all scrapers to share
        const browser = await chromium.launch({
            headless: true, // we will eventually use true in production
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        try {
            let searchZones: { query: string, location: string }[] = [{ query: this.config.query, location: this.config.location }];

            if (this.config.deepScan) {
                broadcastLog(this.jobId, 'info', `Deep Scan Activated. Initializing Grid Engine for "${this.config.location}"...`);
                // 1. Geocode the location
                const geoData = await geocodeLocation(this.config.location, this.jobId);

                if (geoData) {
                    // 2. Generate Grid
                    const gridConfig = generateGridFromBox(geoData.box, this.config.location, 3, this.jobId);

                    // 3. Replace single zone with 9 sub-zones
                    searchZones = gridConfig.map(zone => ({
                        query: this.config.query,
                        location: zone.label // e.g. "Zone 1 near 26.84, 80.94"
                    }));
                } else {
                    broadcastLog(this.jobId, 'warn', `Deep Scan failed to initialize grid. Falling back to standard area search.`);
                }
            }

            // 2. Map scraping tasks based on requested sources
            const tasks: (() => Promise<any>)[] = [];

            // Queue up tasks for ALL zones and ALL selected sources as function generators
            for (const zone of searchZones) {
                if (this.config.sources.googleMaps) tasks.push(() => this.scrapeGoogleMaps(browser, zone.query, zone.location));
                if (this.config.sources.justDial) tasks.push(() => this.scrapeJustDial(browser, zone.query, zone.location));
                if (this.config.sources.linkedIn) tasks.push(() => this.scrapeLinkedIn(browser, zone.query, zone.location));
                if (this.config.sources.instagram) tasks.push(() => this.scrapeInstagram(browser, zone.query, zone.location));
            }

            // 3. Execute tasks with Concurrency Control (Max 3 active headless scrapers)
            broadcastLog(this.jobId, 'info', `Executing ${tasks.length} scraping tasks with a concurrency limit of 3...`);

            const results: PromiseSettledResult<any[]>[] = [];
            const CONCURRENCY_LIMIT = 3;

            for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
                const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
                const chunkPromises = chunk.map(fn => fn());
                const chunkResults = await Promise.allSettled(chunkPromises);
                results.push(...chunkResults);

                if (i + CONCURRENCY_LIMIT < tasks.length) {
                    broadcastLog(this.jobId, 'info', `Completed batch ${i / CONCURRENCY_LIMIT + 1}. Cooling down for 5 seconds...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            // 4. Merge results (stub)
            let rawLeads: any[] = [];
            let successCount = 0;
            let failCount = 0;

            results.forEach((res, index) => {
                const sourceNames = Object.keys(this.config.sources).filter(k => this.config.sources[k as keyof typeof this.config.sources]);
                const sourceName = sourceNames[index % sourceNames.length]; // cyclical matching for grid zones

                if (res.status === 'fulfilled') {
                    successCount++;
                    broadcastLog(this.jobId, 'success', `Task ${index + 1}/${tasks.length} (${sourceName}) completed: ${res.value?.length || 0} leads extracted.`);
                    rawLeads = rawLeads.concat(res.value || []);
                } else {
                    failCount++;
                    broadcastLog(this.jobId, 'error', `Task ${index + 1}/${tasks.length} (${sourceName}) failed: ${res.reason}`);
                }
            });

            broadcastLog(this.jobId, 'info', `Scraping phase completed. Success: ${successCount}, Failed: ${failCount}. Total raw leads: ${rawLeads.length}`);

            // 5. Local AI Data Validation & Categorization pipeline (stub)
            let cleanedLeads = rawLeads;
            if (this.config.useAiValidation && rawLeads.length > 0) {
                broadcastLog(this.jobId, 'info', `Routing ${rawLeads.length} leads through Local AI Pipeline for validation...`);
                cleanedLeads = await this.validateWithAI(rawLeads);
            }

            // 6. DB Insertion
            if (cleanedLeads.length > 0) {
                const db = await getDb();
                broadcastLog(this.jobId, 'info', `Inserting ${cleanedLeads.length} validated leads into Local MongoDB...`);

                // Add tracking metadata 
                const leadsToInsert = cleanedLeads.map(l => ({
                    ...l,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sync_status: "pending"
                }));

                await db.collection("leads").insertMany(leadsToInsert);

                // 7. Push to Cloud SaaS Sync Node
                broadcastLog(this.jobId, 'info', `Triggering Phase 6.1 Cloud Sync...`);
                const syncSuccess = await syncLeadsToCloud(leadsToInsert);

                if (syncSuccess) {
                    // Mark as synced locally
                    const ids = leadsToInsert.map(l => l._id); // Assuming they get _ids on insert, but insertMany mutates objects with _id
                    await db.collection("leads").updateMany(
                        { _id: { $in: leadsToInsert.map(l => l._id) } },
                        { $set: { sync_status: "synced", last_synced_at: new Date().toISOString() } }
                    );
                }
            }

            return {
                jobId: this.jobId,
                totalExtracted: rawLeads.length,
                totalSaved: cleanedLeads.length,
                status: "completed"
            };

        } catch (error: any) {
            broadcastLog(this.jobId, 'error', `Fatal error in job ${this.jobId}: ${error.message}`);
            throw error;
        } finally {
            // Always ensure the browser is closed to prevent memory leaks
            await browser.close();
            broadcastLog(this.jobId, 'info', `Browser resources released.`);
        }
    }

    // --- Extractor Wrappers ---
    private async scrapeGoogleMaps(browser: any, query: string, location: string) {
        return await scrapeGoogleMapsHeadless(browser, query, location, this.config.maxResults, this.jobId);
    }

    private async scrapeJustDial(browser: any, query: string, location: string) {
        return await scrapeJustDialHeadless(browser, query, location, this.config.maxResults, this.jobId);
    }

    private async scrapeLinkedIn(browser: any, query: string, location: string) {
        return await scrapeLinkedInHeadless(browser, query, location, this.config.maxResults, this.jobId);
    }

    private async scrapeInstagram(browser: any, query: string, location: string) {
        return await scrapeInstagramHeadless(browser, query, location, this.config.maxResults, this.jobId);
    }

    // --- AI Validation Stub ---
    private async validateWithAI(rawLeads: any[]) {
        return await validateLeadsWithAI(rawLeads, this.config.query, this.config.location, this.jobId);
    }
}
