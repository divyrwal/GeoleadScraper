import { Router } from "express";
import { getDb } from "@geolead/db";

export const scrapeSessionsRouter: Router = Router();

// POST /api/scrape-sessions — record a scrape session
scrapeSessionsRouter.post("/", async (req, res) => {
    try {
        const { search_query, center_lat, center_lng, zoom, total_found, total_saved, duplicates_skipped } = req.body;

        const db = await getDb();
        const session = {
            search_query: search_query || "Unknown",
            center_coordinates: center_lat && center_lng
                ? { type: "Point" as const, coordinates: [center_lng, center_lat] }
                : null,
            center_lat: center_lat || 0,
            center_lng: center_lng || 0,
            zoom: zoom || 12,
            total_found: total_found || 0,
            total_saved: total_saved || 0,
            duplicates_skipped: duplicates_skipped || 0,
            scraped_at: new Date(),
        };

        await db.collection("scrape_sessions").insertOne(session);
        res.json({ success: true, data: session });
    } catch (error) {
        console.error("Record scrape session failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// GET /api/scrape-sessions — list all scrape sessions for map coverage
scrapeSessionsRouter.get("/", async (_req, res) => {
    try {
        const db = await getDb();
        const sessions = await db.collection("scrape_sessions")
            .find({})
            .sort({ scraped_at: -1 })
            .limit(200)
            .toArray();

        const data = sessions.map((s) => ({ ...s, id: s._id.toString() }));
        res.json({ success: true, data });
    } catch (error) {
        console.error("Fetch scrape sessions failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
