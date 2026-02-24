import { Router } from "express";
import { getDb } from "@geolead/db";

export const leadsDuplicatesRouter: Router = Router();

// GET /api/leads/duplicates — find potential duplicate leads
leadsDuplicatesRouter.get("/", async (_req, res) => {
    try {
        const db = await getDb();
        const collection = db.collection("leads");

        // Find leads sharing the same phone number
        const phoneDupes = await collection.aggregate([
            { $match: { phone_number: { $nin: [null, "", undefined] } } },
            {
                $group: {
                    _id: "$phone_number",
                    count: { $sum: 1 },
                    leads: {
                        $push: {
                            id: { $toString: "$_id" },
                            business_name: "$business_name",
                            category: "$category",
                            address: "$address",
                            google_rating: "$google_rating",
                            lead_score: "$lead_score",
                            google_place_id: "$google_place_id",
                            created_at: "$created_at"
                        }
                    }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 50 }
        ]).toArray();

        const groups = phoneDupes.map(d => ({
            reason: `Same phone: ${d._id}`,
            confidence: "high" as const,
            phone: d._id,
            leads: d.leads,
            count: d.count,
        }));

        // Also find exact name + address matches
        const nameAddressDupes = await collection.aggregate([
            { $match: { business_name: { $ne: null }, address: { $ne: null } } },
            {
                $group: {
                    _id: { name: "$business_name", address: "$address" },
                    count: { $sum: 1 },
                    leads: {
                        $push: {
                            id: { $toString: "$_id" },
                            business_name: "$business_name",
                            category: "$category",
                            phone_number: "$phone_number",
                            google_rating: "$google_rating",
                            lead_score: "$lead_score",
                            google_place_id: "$google_place_id",
                            created_at: "$created_at"
                        }
                    }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 50 }
        ]).toArray();

        nameAddressDupes.forEach(d => {
            groups.push({
                reason: `Same name + address: ${d._id.name}`,
                confidence: "high",
                phone: null as any,
                leads: d.leads,
                count: d.count,
            });
        });

        res.json({
            success: true,
            data: groups,
            totalGroups: groups.length,
            totalDuplicateLeads: groups.reduce((s, g) => s + g.count, 0),
        });
    } catch (error) {
        console.error("Duplicates error:", error);
        res.status(500).json({ success: false, error: "Failed to detect duplicates" });
    }
});
