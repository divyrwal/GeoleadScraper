import { Router, type Request } from "express";
import { getDb } from "@geolead/db";

export const leadsExportRouter: Router = Router();

function buildFilter(query: Request["query"]) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
        filter.$or = [
            { business_name: { $regex: query.search, $options: "i" } },
            { category: { $regex: query.search, $options: "i" } },
        ];
    }
    if (query.category) filter.category = { $regex: query.category, $options: "i" };
    if (query.status) filter.lead_status = query.status;
    if (query.score) filter.lead_score = query.score;
    if (query.minRating) filter.google_rating = { $gte: parseFloat(query.minRating as string) };
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
