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

// DELETE /api/leads/duplicates — automatically remove duplicates (keep oldest)
leadsDuplicatesRouter.delete("/", async (_req, res) => {
    try {
        const db = await getDb();
        const collection = db.collection("leads");

        // 1. Find leads sharing the same phone number
        const phoneDupes = await collection.aggregate([
            { $match: { phone_number: { $nin: [null, "", undefined] } } },
            {
                $group: {
                    _id: "$phone_number",
                    count: { $sum: 1 },
                    leads: {
                        $push: {
                            _id: "$_id",
                            created_at: "$created_at"
                        }
                    }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        // 2. Find exact name + address matches
        const nameAddressDupes = await collection.aggregate([
            { $match: { business_name: { $ne: null }, address: { $ne: null } } },
            {
                $group: {
                    _id: { name: "$business_name", address: "$address" },
                    count: { $sum: 1 },
                    leads: {
                        $push: {
                            _id: "$_id",
                            created_at: "$created_at"
                        }
                    }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        // 3. Collect IDs to delete
        const idsToDelete: any[] = [];

        // Process a group: sort by date (fallback to ID), keep first, mark rest for deletion
        const processGroup = (group: any) => {
            const sortedLeads = group.leads.sort((a: any, b: any) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB;
                // Fallback to _id comparison if timestamps are missing/identical
                return a._id.toString().localeCompare(b._id.toString());
            });

            // Skip index 0 (keep the oldest), delete the rest
            for (let i = 1; i < sortedLeads.length; i++) {
                idsToDelete.push(sortedLeads[i]._id);
            }
        };

        phoneDupes.forEach(processGroup);
        nameAddressDupes.forEach(processGroup);

        // Deduplicate the IDs to delete (in case a lead matches both phone and name/addr)
        const uniqueIdsToDelete = Array.from(
            new Map(idsToDelete.map(id => [id.toString(), id])).values()
        );

        let deletedCount = 0;
        if (uniqueIdsToDelete.length > 0) {
            const result = await collection.deleteMany({ _id: { $in: uniqueIdsToDelete } });
            deletedCount = result.deletedCount;
            console.log(`[Dedupe] Deleted ${deletedCount} duplicate leads`);
        } else {
            console.log(`[Dedupe] No duplicates found to delete`);
        }

        res.json({ success: true, deletedCount });
    } catch (error) {
        console.error("Delete duplicates error:", error);
        res.status(500).json({ success: false, error: "Failed to remove duplicates" });
    }
});
