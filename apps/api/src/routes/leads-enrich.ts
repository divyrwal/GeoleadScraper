import { Router } from "express";
import { getDb } from "@geolead/db";
import { ObjectId } from "mongodb";
import { enrichLead } from "../lib/enricher";

export const leadsEnrichRouter: Router = Router();

// POST /api/leads/:id/enrich
leadsEnrichRouter.post("/:id/enrich", async (req, res) => {
    try {
        const db = await getDb();
        const lead = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });

        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }

        if (!lead.website_url) {
            return res.status(400).json({ success: false, error: "Lead has no website URL to enrich" });
        }

        const enrichmentData = await enrichLead(lead.website_url);

        const updateData = {
            ...enrichmentData,
            enriched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection("leads").updateOne(
            { _id: lead._id },
            { $set: updateData }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: lead._id });

        res.json({ success: true, data: updatedLead });
    } catch (error: any) {
        console.error("Failed to enrich lead:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to enrich lead" });
    }
});

// POST /api/leads/enrich/batch
leadsEnrichRouter.post("/enrich/batch", async (req, res) => {
    // Return immediately for background processing
    res.json({ success: true, message: "Batch enrichment started in background" });

    // Background process
    (async () => {
        try {
            const db = await getDb();

            // Find leads with website but no email
            const leadsToEnrich = await db.collection("leads").find({
                website_url: { $nin: [null, ""] },
                $or: [
                    { email: null },
                    { email: "" },
                    { enriched_at: null }
                ]
            }).limit(50).toArray(); // Process in chunks of 50 to avoid long-running lockups

            console.log(`Starting batch enrichment for ${leadsToEnrich.length} leads...`);

            for (const lead of leadsToEnrich) {
                if (!lead.website_url) continue;

                try {
                    const enrichmentData = await enrichLead(lead.website_url);

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
                } catch (err) {
                    console.error(`Failed to enrich batch item ${lead._id}:`, err);
                }

                // Throttle between requests (2 seconds) to avoid spamming target servers
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            console.log("Batch enrichment complete.");
        } catch (error) {
            console.error("Batch enrichment failed:", error);
        }
    })();
});
