import { Router } from "express";
import { getDb } from "@geolead/db";
import { ObjectId } from "mongodb";
import { computeLeadScore } from "../lib/scoring";

export const leadsBulkRouter: Router = Router();

// POST /api/leads/bulk/status — change status for multiple leads
leadsBulkRouter.post("/status", async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || !status) {
            return res.status(400).json({ success: false, error: "ids and status required" });
        }

        const db = await getDb();
        const objectIds = ids.map((id: string) => new ObjectId(id));
        const result = await db.collection("leads").updateMany(
            { _id: { $in: objectIds } },
            { $set: { lead_status: status, updated_at: new Date() } }
        );

        res.json({ success: true, modified: result.modifiedCount });
    } catch (error) {
        console.error("Bulk status error:", error);
        res.status(500).json({ success: false, error: "Bulk status update failed" });
    }
});

// POST /api/leads/bulk/tag — add tag to multiple leads
leadsBulkRouter.post("/tag", async (req, res) => {
    try {
        const { ids, tag } = req.body;
        if (!ids || !Array.isArray(ids) || !tag) {
            return res.status(400).json({ success: false, error: "ids and tag required" });
        }

        const db = await getDb();
        const objectIds = ids.map((id: string) => new ObjectId(id));
        const result = await db.collection("leads").updateMany(
            { _id: { $in: objectIds } },
            { $addToSet: { tags: tag }, $set: { updated_at: new Date() } }
        );

        res.json({ success: true, modified: result.modifiedCount });
    } catch (error) {
        console.error("Bulk tag error:", error);
        res.status(500).json({ success: false, error: "Bulk tag failed" });
    }
});

// POST /api/leads/bulk/delete — delete multiple leads
leadsBulkRouter.post("/delete", async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: "ids required" });
        }

        const db = await getDb();
        const objectIds = ids.map((id: string) => new ObjectId(id));
        const result = await db.collection("leads").deleteMany({ _id: { $in: objectIds } });

        res.json({ success: true, deleted: result.deletedCount });
    } catch (error) {
        console.error("Bulk delete error:", error);
        res.status(500).json({ success: false, error: "Bulk delete failed" });
    }
});

// POST /api/leads/bulk/rescore — rescore specific leads
leadsBulkRouter.post("/rescore", async (req, res) => {
    try {
        const { ids } = req.body;
        const db = await getDb();
        const collection = db.collection("leads");

        let filter: Record<string, unknown> = {};
        if (ids && Array.isArray(ids)) {
            filter = { _id: { $in: ids.map((id: string) => new ObjectId(id)) } };
        }

        const leads = await collection.find(filter).toArray();
        let updated = 0;

        for (const lead of leads) {
            const result = computeLeadScore(lead as any);
            await collection.updateOne(
                { _id: lead._id },
                { $set: { lead_score: result.label, lead_score_numeric: result.score, score_breakdown: result.breakdown } }
            );
            updated++;
        }

        res.json({ success: true, updated });
    } catch (error) {
        console.error("Bulk rescore error:", error);
        res.status(500).json({ success: false, error: "Bulk rescore failed" });
    }
});
