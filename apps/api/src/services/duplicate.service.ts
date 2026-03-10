import { getDb } from "@geolead/db";

export class DuplicateService {
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

        // Track already grouped leads to avoid overlapping duplicate records visually
        const seenIds = new Set<string>();
        groups.forEach(g => {
            g.leads.forEach((l: any) => seenIds.add(l.id));
        });

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
            const exclusiveLeads = d.leads.filter((l: any) => !seenIds.has(l.id));

            if (exclusiveLeads.length > 1) {
                exclusiveLeads.forEach((l: any) => seenIds.add(l.id));
                groups.push({
                    reason: `Same name + address: ${d._id.name}`,
                    confidence: "high",
                    phone: null as any,
                    leads: exclusiveLeads,
                    count: exclusiveLeads.length,
                });
            }
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
        const seenGroupIds = new Set<string>();

        const processGroup = (group: any) => {
            const exclusiveLeads = group.leads.filter((l: any) => !seenGroupIds.has(l._id.toString()));

            if (exclusiveLeads.length > 1) {
                exclusiveLeads.forEach((l: any) => seenGroupIds.add(l._id.toString()));

                const sortedLeads = exclusiveLeads.sort((a: any, b: any) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    if (dateA !== dateB) return dateA - dateB;
                    return a._id.toString().localeCompare(b._id.toString());
                });

                for (let i = 1; i < sortedLeads.length; i++) {
                    idsToDelete.push(sortedLeads[i]._id);
                }
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
}
