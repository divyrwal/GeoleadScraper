import { Router } from "express";
import { getDb } from "@geolead/db";
import type { Lead } from "@geolead/types";

export const statsRouter: Router = Router();

statsRouter.get("/", async (_req, res) => {
    try {
        const db = await getDb();
        const leads = db.collection("leads");

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [totalLeads, hotLeads, warmLeads, coldLeads, newThisWeek, contactedCount, withPhone, withWebsite, recentLeadsDocs] =
            await Promise.all([
                leads.countDocuments(),
                leads.countDocuments({ lead_score: "Hot" }),
                leads.countDocuments({ lead_score: "Warm" }),
                leads.countDocuments({ lead_score: "Cold" }),
                leads.countDocuments({ created_at: { $gte: sevenDaysAgo } }),
                leads.countDocuments({ lead_status: "contacted" }),
                leads.countDocuments({ has_phone: true }),
                leads.countDocuments({ has_website: true }),
                leads.find({}).sort({ created_at: -1 }).limit(10).toArray(),
            ]);

        const contactRate = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0;
        const recentLeads = recentLeadsDocs.map((l) => ({ ...l, id: l._id.toString() })) as unknown as Lead[];

        res.json({
            success: true,
            data: { totalLeads, hotLeads, warmLeads, coldLeads, newThisWeek, contactedCount, contactRate, withPhone, withWebsite, recentLeads },
        });
    } catch (error) {
        console.error("Stats fetch failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
