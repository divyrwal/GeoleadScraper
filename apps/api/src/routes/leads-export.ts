import { Router, type Request } from "express";
import { getDb } from "@geolead/db";

export const leadsExportRouter: Router = Router();

function buildFilter(query: Request["query"]) {
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
        // Find leads where social_links is null or missing key platforms
        filter.$or = filter.$or || [];
        (filter.$or as any[]).push(
            { social_links: null },
            { "social_links.instagram": { $exists: false } },
            { "social_links.facebook": { $exists: false } }
        );
    }

    return filter;
}

leadsExportRouter.get("/", async (req, res) => {
    try {
        const filter = buildFilter(req.query);
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

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="geolead-export-${new Date().toISOString().split("T")[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error("Export failed:", error);
        res.status(500).json({ success: false, error: "Export failed" });
    }
});
