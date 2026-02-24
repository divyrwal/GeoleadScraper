import { Router } from "express";
import { getDb } from "@geolead/db";
import { computeLeadScore } from "../lib/scoring";

export const leadsRescoreRouter: Router = Router();

// POST /api/leads/rescore — re-score all existing leads
leadsRescoreRouter.post("/", async (_req, res) => {
    try {
        const db = await getDb();
        const collection = db.collection("leads");
        const leads = await collection.find({}).toArray();

        let updated = 0;
        for (const lead of leads) {
            const result = computeLeadScore(lead as any);
            await collection.updateOne(
                { _id: lead._id },
                {
                    $set: {
                        lead_score: result.label,
                        lead_score_numeric: result.score,
                        score_breakdown: result.breakdown,
                    },
                }
            );
            updated++;
        }

        res.json({ success: true, updated, message: `Re-scored ${updated} leads` });
    } catch (error) {
        console.error("Rescore failed:", error);
        res.status(500).json({ success: false, error: "Failed to re-score leads" });
    }
});
