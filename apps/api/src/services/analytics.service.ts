import { getDb } from "@geolead/db";

export class AnalyticsService {
    static async getDashboardAnalytics() {
        const db = await getDb();
        const leads = db.collection("leads");

        const scoreDistribution = await leads.aggregate([
            { $group: { _id: "$lead_score", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();

        const categoryBreakdown = await leads.aggregate([
            { $match: { category: { $nin: [null, ""] } } },
            { $group: { _id: "$category", count: { $sum: 1 }, avgRating: { $avg: "$google_rating" } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]).toArray();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const timeline = await leads.aggregate([
            { $match: { created_at: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    count: { $sum: 1 },
                    withPhone: { $sum: { $cond: ["$has_phone", 1, 0] } },
                    withWebsite: { $sum: { $cond: ["$has_website", 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        const searchQueries = await leads.aggregate([
            { $match: { search_query: { $ne: null } } },
            { $group: { _id: "$search_query", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).toArray();

        const scoreHistogram = await leads.aggregate([
            { $match: { lead_score_numeric: { $exists: true, $ne: null } } },
            {
                $bucket: {
                    groupBy: "$lead_score_numeric",
                    boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
                    default: "other",
                    output: { count: { $sum: 1 } }
                }
            }
        ]).toArray();

        const totalLeads = await leads.countDocuments();
        const contactedLeads = await leads.countDocuments({ lead_status: { $in: ["contacted", "follow_up", "qualified", "negotiating", "won"] } });

        return {
            scoreDistribution: scoreDistribution.map(s => ({ label: s._id || "unscored", count: s.count })),
            categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, count: c.count, avgRating: Math.round((c.avgRating || 0) * 10) / 10 })),
            timeline: timeline.map(t => ({ date: t._id, count: t.count, withPhone: t.withPhone, withWebsite: t.withWebsite })),
            searchQueries: searchQueries.map(q => ({ query: q._id, count: q.count })),
            scoreHistogram: scoreHistogram.map(s => ({ range: `${s._id}-${(s._id as number) + 9}`, count: s.count })),
            contactRate: { total: totalLeads, contacted: contactedLeads, rate: totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0 },
        };
    }
}
