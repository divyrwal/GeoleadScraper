import { getDb } from "@geolead/db";
import { config } from "@geolead/config";
import type { Lead, PaginationMeta } from "@geolead/types";
import { computeLeadScore } from "../lib/scoring";
import { auditWebsite } from "../lib/website-auditor";
import { generateWebAuditPitch } from "../lib/ai-validator";
import { analyzeLead as aiAnalyzeLead } from "@geolead/ai";
import { enrichLead as libEnrichLead } from "../lib/enricher";

export class LeadService {
    static buildFilter(query: any) {
        const filter: Record<string, unknown> = {};
        if (query.search) {
            filter.$or = [
                { business_name: { $regex: query.search, $options: "i" } },
                { category: { $regex: query.search, $options: "i" } },
                { address: { $regex: query.search, $options: "i" } },
            ];
        }
        if (query.city) {
            const cityRegex = { $regex: query.city, $options: "i" };
            const cityOr = [
                { address: cityRegex },
                { plus_code: cityRegex },
                { search_query: cityRegex }
            ];
            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: cityOr }];
                delete filter.$or;
            } else {
                filter.$or = cityOr;
            }
        }
        if (query.category) filter.category = { $regex: query.category, $options: "i" };
        if (query.status) filter.lead_status = query.status;
        if (query.score) filter.lead_score = query.score;

        // Ratings & Reviews
        if (query.minRating || query.maxRating) {
            filter.google_rating = {};
            if (query.minRating) (filter.google_rating as any).$gte = parseFloat(query.minRating as string);
            if (query.maxRating) (filter.google_rating as any).$lte = parseFloat(query.maxRating as string);
        }
        if (query.minReviews) filter.review_count = { $gte: parseInt(query.minReviews as string) };

        // Standard Booleans
        if (query.hasPhone === "true") filter.has_phone = true;
        if (query.hasPhone === "false") filter.has_phone = { $ne: true };
        if (query.hasWebsite === "true") filter.has_website = true;
        if (query.hasWebsite === "false") filter.has_website = { $ne: true };
        if (query.hasEmail === "true") filter.email = { $nin: [null, ""] };
        if (query.hasEmail === "false") filter.$or = [{ email: null }, { email: "" }];

        // Pitch Target Booleans
        if (query.missingWebsite === "true") filter.has_website = { $ne: true };
        if (query.missingSocials === "true") {
            filter.$or = filter.$or || [];
            (filter.$or as any[]).push(
                { social_links: null },
                { "social_links.instagram": { $exists: false } },
                { "social_links.facebook": { $exists: false } }
            );
        }

        if (query.isShortlisted === "true") {
            filter.is_shortlisted = true;
        }

        return filter;
    }

    static async getLeads(queryParams: any): Promise<{ data: Lead[]; pagination: PaginationMeta }> {
        const page = Math.max(1, parseInt(queryParams.page || "1"));
        const pageSize = Math.min(100, Math.max(1, parseInt(queryParams.pageSize || String(config.app.pageSize))));
        const skip = (page - 1) * pageSize;
        const filter = this.buildFilter(queryParams);

        const db = await getDb();
        const collection = db.collection("leads");
        const [docs, total] = await Promise.all([
            collection.find(filter).sort({ created_at: -1 }).skip(skip).limit(pageSize).toArray(),
            collection.countDocuments(filter),
        ]);

        const data = docs.map((l) => ({ ...l, id: l._id.toString() })) as unknown as Lead[];
        const pagination: PaginationMeta = { total, page, pageSize, totalPages: Math.ceil(total / pageSize) };

        return { data, pagination };
    }

    static async bulkInsertOrUpdate(leads: any[], searchQuery?: string) {
        const db = await getDb();
        const collection = db.collection("leads");
        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        for (const lead of leads) {
            const filter = lead.google_place_id && !lead.google_place_id.startsWith("gen_")
                ? { google_place_id: lead.google_place_id }
                : lead.business_name && lead.address
                    ? { business_name: lead.business_name, address: lead.address }
                    : lead.phone_number
                        ? { phone_number: lead.phone_number }
                        : null;

            const doc: Record<string, unknown> = {
                ...lead,
                search_query: searchQuery || lead.search_query || null,
                has_phone: !!lead.phone_number,
                has_website: !!lead.website_url,
                service_options: lead.service_options || [],
                location_coordinates: lead.location_lat && lead.location_long
                    ? { type: "Point" as const, coordinates: [lead.location_long, lead.location_lat] }
                    : null,
                updated_at: new Date(),
            };

            const scoreResult = computeLeadScore(lead);
            doc.lead_score = scoreResult.label;
            doc.lead_score_numeric = scoreResult.score;
            doc.score_breakdown = scoreResult.breakdown;

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
                if (err?.code === 11000) skipped++;
                else {
                    console.error("Lead insert error:", err.message);
                    skipped++;
                }
            }
        }

        return { inserted, updated, skipped, total: leads.length };
    }

    static async getLeadById(id: string): Promise<Lead> {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const lead = await db.collection("leads").findOne({ _id: new ObjectId(id) });
        if (!lead) throw new Error("Lead not found");
        return { ...lead, id: lead._id.toString() } as unknown as Lead;
    }

    static async updateLead(id: string, updateData: any): Promise<Lead> {
        const allowedFields = ["lead_status", "notes", "tags", "lead_score", "business_type", "is_shortlisted"];
        const update: Record<string, unknown> = { updated_at: new Date() };
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) update[field] = updateData[field];
        }

        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        await db.collection("leads").updateOne({ _id: new ObjectId(id) }, { $set: update });
        const updated = await db.collection("leads").findOne({ _id: new ObjectId(id) });
        if (!updated) throw new Error("Lead not found");
        return { ...updated, id: updated._id.toString() } as unknown as Lead;
    }

    static async addContactLog(leadId: string, notes: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(leadId);

        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");

        await db.collection("contact_logs").insertOne({ lead_id: leadId, notes, contacted_at: new Date() });
        await db.collection("leads").updateOne(
            { _id: objId },
            { $set: { lead_status: "contacted", last_contacted_at: new Date(), updated_at: new Date() }, $inc: { contact_count: 1 } }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: objId });
        const history = await db.collection("contact_logs").find({ lead_id: leadId }).sort({ contacted_at: -1 }).toArray();

        return {
            lead: { ...updatedLead, id: updatedLead?._id.toString() },
            contactHistory: history.map((h) => ({ ...h, id: h._id.toString() })),
        };
    }

    static async getContactHistory(leadId: string) {
        const db = await getDb();
        const history = await db.collection("contact_logs").find({ lead_id: leadId }).sort({ contacted_at: -1 }).toArray();
        return history.map((h) => ({ ...h, id: h._id.toString() }));
    }

    static async auditLead(id: string, includeAi: boolean) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);

        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");
        if (!lead.website_url) throw new Error("Lead has no website URL to audit");

        const auditData = await auditWebsite(lead.website_url as string);
        if (!auditData) throw new Error("Failed to audit website (might be down or blocking bots)");

        let pitchData = null;
        if (includeAi) {
            pitchData = await generateWebAuditPitch(auditData.title, auditData.meta_description, auditData.headings);
        }

        const website_audit = {
            audited_at: new Date().toISOString(),
            tech_stack: auditData.tech_stack,
            has_ssl: auditData.has_ssl,
            domain_creation_date: auditData.domain_creation_date,
            title: auditData.title,
            meta_description: auditData.meta_description,
            headings: auditData.headings,
            ai_flaws: pitchData?.flaws || [],
            ai_pitch: pitchData?.pitch || null,
        };

        await db.collection("leads").updateOne(
            { _id: objId },
            { $set: { website_audit, updated_at: new Date().toISOString() } }
        );

        const updatedLead = await db.collection("leads").findOne({ _id: objId });
        return { ...updatedLead, id: updatedLead?._id.toString() } as unknown as Lead;
    }

    static async analyzeLead(id: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);
        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");

        const analysis = await aiAnalyzeLead(lead as any);
        if (!analysis) throw new Error("AI analysis failed. Is Ollama running?");

        await db.collection("leads").updateOne(
            { _id: objId },
            { $set: { ai_analysis: analysis, lead_score: analysis.lead_score, updated_at: new Date() } }
        );

        const updated = await db.collection("leads").findOne({ _id: objId });
        return { ...updated, id: updated?._id.toString() } as unknown as Lead;
    }

    static async rescoreAllLeads() {
        const db = await getDb();
        const collection = db.collection("leads");
        const leads = await collection.find({}).toArray();

        let updated = 0;
        for (const lead of leads) {
            const result = computeLeadScore(lead as any);
            await collection.updateOne(
                { _id: lead._id },
                {
                    $set: {
                        lead_score: result.label,
                        lead_score_numeric: result.score,
                        score_breakdown: result.breakdown,
                    },
                }
            );
            updated++;
        }
        return updated;
    }

    static async bulkUpdateStatus(ids: string[], status: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objectIds = ids.map(id => new ObjectId(id));

        const result = await db.collection("leads").updateMany(
            { _id: { $in: objectIds } },
            { $set: { lead_status: status, updated_at: new Date() } }
        );
        return result.modifiedCount;
    }

    static async bulkAddTag(ids: string[], tag: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objectIds = ids.map(id => new ObjectId(id));

        const result = await db.collection("leads").updateMany(
            { _id: { $in: objectIds } },
            { $addToSet: { tags: tag }, $set: { updated_at: new Date() } }
        );
        return result.modifiedCount;
    }

    static async bulkDelete(ids: string[]) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objectIds = ids.map(id => new ObjectId(id));

        const result = await db.collection("leads").deleteMany({ _id: { $in: objectIds } });
        return result.deletedCount;
    }

    static async bulkShortlist(ids: string[], note?: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objectIds = ids.map(id => new ObjectId(id));

        const updateSet: any = { is_shortlisted: true, updated_at: new Date() };

        let result;
        if (note) {
            // If they provided a bulk note, append it to existing notes using aggregation-style update
            // Currently, updateMany with a pipeline is trickier, so we'll just query and update individually for safety,
            // or we could overwrite. Let's just update each to append to the existing notes cleanly.
            const leads = await db.collection("leads").find({ _id: { $in: objectIds } }).toArray();
            let modified = 0;
            for (const lead of leads) {
                const currentNote = lead.notes || "";
                const newNote = currentNote ? `${currentNote}\n--- Shortlist Note ---\n${note}` : note;
                const r = await db.collection("leads").updateOne(
                    { _id: lead._id },
                    { $set: { ...updateSet, notes: newNote } }
                );
                modified += r.modifiedCount;
            }
            return modified;
        } else {
            result = await db.collection("leads").updateMany(
                { _id: { $in: objectIds } },
                { $set: updateSet }
            );
            return result.modifiedCount;
        }
    }

    static async bulkRescore(ids?: string[]) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
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
        return updated;
    }

    static async getExportCsv(queryParams: any) {
        const filter = this.buildFilter(queryParams);
        const db = await getDb();
        const docs = await db.collection("leads").find(filter).sort({ created_at: -1 }).toArray();

        const headers = [
            "Business Name", "Category", "Rating", "Reviews", "Phone",
            "Email", "Website", "Address", "Score", "Status",
            "Contact Count", "Last Contacted", "Created At",
        ];

        const rows = docs.map((lead) => [
            `"${(lead.business_name || "").replace(/"/g, '""')}"`,
            `"${(lead.category || "").replace(/"/g, '""')}"`,
            lead.google_rating ?? "",
            lead.review_count ?? "",
            `"${(lead.phone_number || "").replace(/"/g, '""')}"`,
            `"${(lead.email || "").replace(/"/g, '""')}"`,
            `"${(lead.website_url || "").replace(/"/g, '""')}"`,
            `"${(lead.address || "").replace(/"/g, '""')}"`,
            lead.lead_score || "",
            lead.lead_status || "",
            lead.contact_count ?? 0,
            lead.last_contacted_at || "",
            lead.created_at || "",
        ].join(","));

        return [headers.join(","), ...rows].join("\n");
    }

    static async getMapData(queryParams: any) {
        const db = await getDb();
        const collection = db.collection("leads");

        const filter: Record<string, unknown> = {
            location_lat: { $ne: 0 },
            location_long: { $ne: 0 },
        };

        if (queryParams.score) filter.lead_score = queryParams.score;
        if (queryParams.category) filter.category = { $regex: queryParams.category, $options: "i" };
        if (queryParams.hasPhone === "true") filter.has_phone = true;
        if (queryParams.status) filter.lead_status = queryParams.status;

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

        return leads.map((l: any) => ({
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
    }

    static async getNearbyLeads(lat: number, lng: number, radiusMs: number, category?: string) {
        const db = await getDb();
        const pipeline: object[] = [
            { $geoNear: { near: { type: "Point", coordinates: [lng, lat] }, distanceField: "distance_meters", maxDistance: radiusMs, spherical: true } },
        ];
        if (category) pipeline.push({ $match: { category: { $regex: category, $options: "i" } } });
        pipeline.push({ $limit: 100 });

        const docs = await db.collection("leads").aggregate(pipeline).toArray();
        return docs.map((l) => ({ ...l, id: l._id.toString() })) as unknown as Lead[];
    }

    static async getDuplicates() {
        const db = await getDb();
        const collection = db.collection("leads");

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

        return {
            data: groups,
            totalGroups: groups.length,
            totalDuplicateLeads: groups.reduce((s, g) => s + g.count, 0),
        };
    }

    static async deleteDuplicates() {
        const db = await getDb();
        const collection = db.collection("leads");

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

        const idsToDelete: any[] = [];

        const processGroup = (group: any) => {
            const sortedLeads = group.leads.sort((a: any, b: any) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB;
                return a._id.toString().localeCompare(b._id.toString());
            });

            for (let i = 1; i < sortedLeads.length; i++) {
                idsToDelete.push(sortedLeads[i]._id);
            }
        };

        phoneDupes.forEach(processGroup);
        nameAddressDupes.forEach(processGroup);

        const uniqueIdsToDelete = Array.from(
            new Map(idsToDelete.map(id => [id.toString(), id])).values()
        );

        if (uniqueIdsToDelete.length > 0) {
            const result = await collection.deleteMany({ _id: { $in: uniqueIdsToDelete } });
            return result.deletedCount;
        }

        return 0;
    }

    static async enrichLead(id: string) {
        const db = await getDb();
        // @ts-ignore
        const { ObjectId } = await import("@geolead/db");
        const objId = new ObjectId(id);

        const lead = await db.collection("leads").findOne({ _id: objId });
        if (!lead) throw new Error("Lead not found");
        if (!lead.website_url) throw new Error("Lead has no website URL to enrich");

        const enrichmentData = await libEnrichLead(lead.website_url as string);

        const updateData = {
            ...enrichmentData,
            enriched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection("leads").updateOne({ _id: lead._id }, { $set: updateData });

        const updatedLead = await db.collection("leads").findOne({ _id: lead._id });
        return { ...updatedLead, id: updatedLead?._id.toString() } as unknown as Lead;
    }

    static async batchEnrichLeads() {
        const db = await getDb();

        const leadsToEnrich = await db.collection("leads").find({
            website_url: { $nin: [null, ""] },
            $or: [
                { email: null },
                { email: "" },
                { enriched_at: null }
            ]
        }).limit(50).toArray();

        console.log(`Starting batch enrichment for ${leadsToEnrich.length} leads...`);

        for (const lead of leadsToEnrich) {
            if (!lead.website_url) continue;

            try {
                const enrichmentData = await libEnrichLead(lead.website_url as string);

                await db.collection("leads").updateOne(
                    { _id: lead._id },
                    {
                        $set: {
                            ...enrichmentData,
                            enriched_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    }
                );
            } catch (err) {
                console.error(`Failed to enrich batch item ${lead._id}:`, err);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log("Batch enrichment complete.");
    }
}
