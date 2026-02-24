import { Router } from "express";
import { getDb } from "@geolead/db";

export const leadsMapRouter: Router = Router();

// GET /api/leads/map — lightweight lead data for map rendering (no pagination)
leadsMapRouter.get("/", async (req, res) => {
    try {
        const db = await getDb();
        const collection = db.collection("leads");

        const filter: Record<string, unknown> = {
            location_lat: { $ne: 0 },
            location_long: { $ne: 0 },
        };

        if (req.query.score) filter.lead_score = req.query.score;
        if (req.query.category) filter.category = { $regex: req.query.category, $options: "i" };
        if (req.query.hasPhone === "true") filter.has_phone = true;
        if (req.query.status) filter.lead_status = req.query.status;

        const leads = await collection.find(filter, {
            projection: {
                business_name: 1,
                category: 1,
                google_rating: 1,
                phone_number: 1,
                has_phone: 1,
                lead_score: 1,
                lead_score_numeric: 1,
                lead_status: 1,
                location_lat: 1,
                location_long: 1,
            }
        }).toArray();

        const data = leads.map(l => ({
            id: l._id.toString(),
            business_name: l.business_name,
            category: l.category,
            google_rating: l.google_rating,
            phone_number: l.phone_number,
            has_phone: l.has_phone,
            lead_score: l.lead_score,
            lead_score_numeric: l.lead_score_numeric,
            lead_status: l.lead_status,
            lat: l.location_lat,
            lng: l.location_long,
        }));

        res.json({ success: true, data, total: data.length });
    } catch (error) {
        console.error("Map data error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch map data" });
    }
});
