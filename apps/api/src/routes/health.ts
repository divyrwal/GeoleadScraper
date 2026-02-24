import { Router } from "express";
import { getDb } from "@geolead/db";

export const healthRouter: Router = Router();

healthRouter.get("/", async (_req, res) => {
    try {
        const db = await getDb();
        await db.command({ ping: 1 });
        res.json({ success: true, status: "Database connection established", timestamp: new Date().toISOString() });
    } catch (error) {
        console.error("Health check failed:", error);
        res.status(500).json({ success: false, error: "Could not connect to database" });
    }
});
