import { getDb } from "@geolead/db";
import type { Lead } from "@geolead/types";
import { enrichLead as libEnrichLead } from "../lib/enricher";
import { Queue, Worker } from "bullmq";
import { logger } from "../lib/logger";
import IORedis from "ioredis";

// Suppress raw Redis connection errors failing aggressively
const connection = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
        // Stop retrying if we can't connect immediately on boot (fallback enabled)
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
    }
};

// Queue configuration
export const enrichmentQueue = new Queue("enrichmentQueue", { connection });

// Catch unhandled connection errors from the Queue itself
enrichmentQueue.on('error', (err: any) => {
    if (err.code !== 'ECONNREFUSED') {
        // Suppress ECONNREFUSED spam
    }
});

// Initialize Worker
let worker: Worker | null = null;
try {
    worker = new Worker("enrichmentQueue", async (job) => {
        const { leadId, url } = job.data;
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");

        try {
            const enrichmentData = await libEnrichLead(url);
            await db.collection("leads").updateOne(
                { _id: new ObjectId(leadId) },
                {
                    $set: {
                        ...enrichmentData,
                        enriched_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                }
            );
            return { success: true };
        } catch (error: any) {
            logger.error({ err: error }, `Enrichment failed for lead ${leadId}`);
            throw error;
        }
    }, { connection });

    worker.on('failed', (job, err) => {
        logger.error(`[EnrichmentService] Job ${job?.id} failed with error ${err.message}`);
    });

    worker.on('error', (err: any) => {
        if (err.code !== 'ECONNREFUSED') {
            logger.error(`[EnrichmentWorker] Critical error: ${err.message}`);
        }
    });
} catch (error) {
    logger.warn("Redis not available. BullMQ Enrichment Worker is disabled.");
}

export class EnrichmentService {
    static async enrichLead(id: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);

        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");
        if (!lead.website_url) throw new Error("Lead has no website URL to enrich");

        const enrichmentData = await libEnrichLead(lead.website_url as string);

        const updateData = {
            ...enrichmentData,
            enriched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection("leads").updateOne({ _id: lead._id }, { $set: updateData });

        const updatedLead = await db.collection("leads").findOne({ _id: lead._id });
        return { ...updatedLead, id: updatedLead?._id.toString() } as unknown as Lead;
    }

    static async batchEnrichLeads() {
        const db = await getDb();

        const leadsToEnrich = await db.collection("leads").find({
            website_url: { $nin: [null, ""] },
            $or: [
                { email: null },
                { email: "" },
                { enriched_at: null }
            ]
        }).limit(50).toArray();

        logger.info(`Starting batch enrichment queue for ${leadsToEnrich.length} leads...`);

        for (const lead of leadsToEnrich) {
            if (!lead.website_url) continue;

            try {
                // If user doesn't have Redis running, jobs will buffer. 
                // We add it to the BullMQ queue instead of awaiting synchronously.
                await enrichmentQueue.add("enrichLead", { leadId: lead._id.toString(), url: lead.website_url });
            } catch (err: any) {
                logger.error({ err, leadId: lead._id }, "Failed to queue enrichment");

                // Fallback for CRM running locally WITHOUT Redis
                logger.warn("Queue failed (likely no Redis). Performing inline fallback.");
                const enrichmentData = await libEnrichLead(lead.website_url as string);
                await db.collection("leads").updateOne(
                    { _id: lead._id },
                    {
                        $set: {
                            ...enrichmentData,
                            enriched_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    }
                );
            }
        }

        logger.info("Batch enrichment queue dispatched.");
    }
}
