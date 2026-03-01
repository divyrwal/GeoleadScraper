import { getDb } from "@geolead/db";
import type { Lead } from "@geolead/types";

export class SystemService {
    static async checkHealth() {
        const db = await getDb();
        await db.command({ ping: 1 });
        return { status: "Database connection established", timestamp: new Date().toISOString() };
    }

    static async getStats() {
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

        return { totalLeads, hotLeads, warmLeads, coldLeads, newThisWeek, contactedCount, contactRate, withPhone, withWebsite, recentLeads };
    }

    static async recordScrapeSession(params: any) {
        const { search_query, center_lat, center_lng, zoom, total_found, total_saved, duplicates_skipped } = params;

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
        return session;
    }

    static async getScrapeSessions() {
        const db = await getDb();
        const sessions = await db.collection("scrape_sessions")
            .find({})
            .sort({ scraped_at: -1 })
            .limit(200)
            .toArray();

        return sessions.map((s) => ({ ...s, id: s._id.toString() }));
    }
}
