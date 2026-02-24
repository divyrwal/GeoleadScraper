import { MongoClient, Db } from "mongodb";
import { config } from "@geolead/config";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let indexesCreated = false;

export async function getDb(): Promise<Db> {
    if (cachedDb) return cachedDb;

    const client = new MongoClient(config.db.uri);
    await client.connect();

    cachedClient = client;
    cachedDb = client.db(config.db.name);

    if (!indexesCreated) {
        const leads = cachedDb.collection("leads");

        // Drop old unique indexes on phone_number (phone isn't a reliable dedup key)
        try { await leads.dropIndex("phone_number_1"); } catch { /* may not exist */ }
        try { await leads.dropIndex("google_place_id_1"); } catch { /* may not exist */ }

        await Promise.all([
            // Phone: regular index for filtering (NOT unique — businesses can share phones)
            leads.createIndex({ phone_number: 1 }),
            leads.createIndex(
                { google_place_id: 1 },
                { unique: true, partialFilterExpression: { google_place_id: { $type: "string" } } }
            ),
            leads.createIndex({ lead_status: 1 }),
            leads.createIndex({ lead_score: 1 }),
            leads.createIndex({ category: 1 }),
            leads.createIndex({ created_at: -1 }),
            leads.createIndex({ has_phone: 1 }),
            leads.createIndex({ has_website: 1 }),
            leads.createIndex({ location_coordinates: "2dsphere" }),
            // Compound index for name+address dedup fallback
            leads.createIndex({ business_name: 1, address: 1 }),
        ]);

        const contactLogs = cachedDb.collection("contact_logs");
        await contactLogs.createIndex({ lead_id: 1 });
        await contactLogs.createIndex({ contacted_at: -1 });

        const scrapeSessions = cachedDb.collection("scrape_sessions");
        await scrapeSessions.createIndex({ center_coordinates: "2dsphere" });
        await scrapeSessions.createIndex({ scraped_at: -1 });

        // --- One-time data migrations ---

        // 1. Fix old leads that have "name" instead of "business_name"
        await leads.updateMany(
            { name: { $exists: true }, business_name: { $exists: false } },
            [{ $set: { business_name: "$name" } }]
        );
        // Also fix leads where business_name is null but name exists
        await leads.updateMany(
            { name: { $exists: true }, business_name: null },
            [{ $set: { business_name: "$name" } }]
        );

        // 2. Compute has_phone / has_website for leads missing those flags
        await leads.updateMany(
            { has_phone: { $exists: false } },
            [{ $set: { has_phone: { $cond: [{ $and: [{ $ne: ["$phone_number", null] }, { $ne: ["$phone_number", ""] }] }, true, false] } } }]
        );
        await leads.updateMany(
            { has_website: { $exists: false } },
            [{ $set: { has_website: { $cond: [{ $and: [{ $ne: ["$website_url", null] }, { $ne: ["$website_url", ""] }] }, true, false] } } }]
        );

        console.log("[GeoLead DB] Indexes and migrations complete.");
        indexesCreated = true;
    }

    return cachedDb;
}

export { ObjectId, type Filter, type Document as MongoDocument } from "mongodb";
