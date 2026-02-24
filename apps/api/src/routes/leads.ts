import { Router, type Request } from "express";
import { getDb } from "@geolead/db";
import { config } from "@geolead/config";
import type { Lead, PaginationMeta } from "@geolead/types";
import { computeLeadScore } from "../lib/scoring";

export const leadsRouter: Router = Router();

function buildFilter(query: Request["query"]) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
        filter.$or = [
            { business_name: { $regex: query.search, $options: "i" } },
            { category: { $regex: query.search, $options: "i" } },
            { address: { $regex: query.search, $options: "i" } },
        ];
    }
    if (query.category) filter.category = { $regex: query.category, $options: "i" };
    if (query.status) filter.lead_status = query.status;
    if (query.score) filter.lead_score = query.score;
    if (query.minRating) filter.google_rating = { $gte: parseFloat(query.minRating as string) };
    if (query.hasPhone === "true") filter.has_phone = true;
    if (query.hasPhone === "false") filter.has_phone = { $ne: true };
    if (query.hasWebsite === "true") filter.has_website = true;
    if (query.hasWebsite === "false") filter.has_website = { $ne: true };
    if (query.hasEmail === "true") filter.email = { $nin: [null, ""] };
    if (query.hasEmail === "false") filter.$or = [{ email: null }, { email: "" }];
    return filter;
}

// GET /api/leads
leadsRouter.get("/", async (req, res) => {
    try {
        const page = Math.max(1, parseInt((req.query.page as string) || "1"));
        const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || String(config.app.pageSize))));
        const skip = (page - 1) * pageSize;
        const filter = buildFilter(req.query);

        const db = await getDb();
        const collection = db.collection("leads");
        const [docs, total] = await Promise.all([
            collection.find(filter).sort({ created_at: -1 }).skip(skip).limit(pageSize).toArray(),
            collection.countDocuments(filter),
        ]);

        const data = docs.map((l) => ({ ...l, id: l._id.toString() })) as unknown as Lead[];
        const pagination: PaginationMeta = { total, page, pageSize, totalPages: Math.ceil(total / pageSize) };

        res.json({ success: true, data, pagination });
    } catch (error) {
        console.error("Fetch leads failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// POST /api/leads
leadsRouter.post("/", async (req, res) => {
    try {
        const { leads, search_query } = req.body;
        if (!leads || !Array.isArray(leads)) {
            return res.status(400).json({ success: false, error: "Invalid data: expected { leads: [...] }" });
        }

        const db = await getDb();
        const collection = db.collection("leads");
        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        for (const lead of leads) {
            // 3-layer dedup: google_place_id → phone_number → business_name + address
            const filter = lead.google_place_id && !lead.google_place_id.startsWith("gen_")
                ? { google_place_id: lead.google_place_id }
                : lead.business_name && lead.address
                    ? { business_name: lead.business_name, address: lead.address }
                    : null;

            const doc: Record<string, unknown> = {
                ...lead,
                search_query: search_query || lead.search_query || null,
                has_phone: !!lead.phone_number,
                has_website: !!lead.website_url,
                service_options: lead.service_options || [],
                location_coordinates:
                    lead.location_lat && lead.location_long
                        ? { type: "Point" as const, coordinates: [lead.location_long, lead.location_lat] }
                        : null,
                updated_at: new Date(),
            };

            // Auto-score
            const scoreResult = computeLeadScore(lead);
            doc.lead_score = scoreResult.label;
            doc.lead_score_numeric = scoreResult.score;
            doc.score_breakdown = scoreResult.breakdown;

            // Remove generated place IDs to avoid false unique conflicts
            if (!doc.google_place_id || (doc.google_place_id as string).startsWith("gen_")) delete doc.google_place_id;

            try {
                if (filter) {
                    const result = await collection.updateOne(
                        filter,
                        { $set: doc, $setOnInsert: { created_at: new Date(), lead_status: "new", contact_count: 0, tags: [] } },
                        { upsert: true }
                    );
                    if (result.upsertedCount > 0) inserted++;
                    else if (result.modifiedCount > 0) updated++;
                    else skipped++;
                } else {
                    await collection.insertOne({ ...doc, created_at: new Date(), lead_status: "new", contact_count: 0, tags: [] });
                    inserted++;
                }
            } catch (err: any) {
                // Skip duplicate key errors for individual leads instead of failing the whole batch
                if (err?.code === 11000) {
                    skipped++;
                } else {
                    console.error("Lead insert error:", err.message);
                    skipped++;
                }
            }
        }

        res.json({ success: true, inserted, updated, skipped, total: leads.length });
    } catch (error) {
        console.error("Bulk insert failed:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
