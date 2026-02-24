import { Router } from "express";
import { getDb, ObjectId } from "@geolead/db";
import { analyzeLead } from "@geolead/ai";

export const leadsAnalyzeRouter: Router = Router();

// POST /api/leads/:id/analyze
leadsAnalyzeRouter.post("/:id/analyze", async (req, res) => {
    try {
        const db = await getDb();
        const lead = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });
        if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });

        const analysis = await analyzeLead(lead as any);
        if (!analysis) return res.status(500).json({ success: false, error: "AI analysis failed. Is Ollama running?" });

        await db.collection("leads").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { ai_analysis: analysis, lead_score: analysis.lead_score, updated_at: new Date() } }
        );

        const updated = await db.collection("leads").findOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, data: { ...updated, id: updated?._id.toString() } });
    } catch (error) {
        console.error("Analysis failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
