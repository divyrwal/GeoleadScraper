import { Router } from "express";
import { getDb, ObjectId } from "@geolead/db";
import type { Lead } from "@geolead/types";

export const leadsDetailRouter: Router = Router();

// GET /api/leads/:id
leadsDetailRouter.get("/:id", async (req, res) => {
    try {
        const db = await getDb();
        const lead = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });
        if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });
        res.json({ success: true, data: { ...lead, id: lead._id.toString() } as unknown as Lead });
    } catch (error) {
        console.error("Get lead failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// PATCH /api/leads/:id
leadsDetailRouter.patch("/:id", async (req, res) => {
    try {
        const allowedFields = ["lead_status", "notes", "tags", "lead_score", "business_type"];
        const update: Record<string, unknown> = { updated_at: new Date() };
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) update[field] = req.body[field];
        }

        const db = await getDb();
        await db.collection("leads").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
        const updated = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });
        if (!updated) return res.status(404).json({ success: false, error: "Lead not found" });
        res.json({ success: true, data: { ...updated, id: updated._id.toString() } as unknown as Lead });
    } catch (error) {
        console.error("Update lead failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
