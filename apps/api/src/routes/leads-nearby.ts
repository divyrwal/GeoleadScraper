import { Router } from "express";
import { getDb } from "@geolead/db";
import type { Lead } from "@geolead/types";

export const leadsNearbyRouter: Router = Router();

leadsNearbyRouter.get("/", async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radius = parseInt((req.query.radius as string) || "5000");
        const category = req.query.category as string | undefined;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: "lat and lng are required" });
        }

        const db = await getDb();
        const pipeline: object[] = [
            { $geoNear: { near: { type: "Point", coordinates: [lng, lat] }, distanceField: "distance_meters", maxDistance: radius, spherical: true } },
        ];
        if (category) pipeline.push({ $match: { category: { $regex: category, $options: "i" } } });
        pipeline.push({ $limit: 100 });

        const docs = await db.collection("leads").aggregate(pipeline).toArray();
        const data = docs.map((l) => ({ ...l, id: l._id.toString() })) as unknown as Lead[];

        res.json({ success: true, data });
    } catch (error) {
        console.error("Nearby search failed:", error);
        res.status(500).json({ success: false, error: "Nearby search failed" });
    }
});
