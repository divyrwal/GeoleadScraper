import type { Request, Response } from "express";
import { SystemService } from "../services/system.service";

export class SystemController {
    static async checkHealth(_req: Request, res: Response) {
        try {
            const data = await SystemService.checkHealth();
            res.json({ success: true, ...data });
        } catch (error) {
            console.error("Health check failed:", error);
            res.status(500).json({ success: false, error: "Could not connect to database" });
        }
    }

    static async getStats(_req: Request, res: Response) {
        try {
            const data = await SystemService.getStats();
            res.json({ success: true, data });
        } catch (error) {
            console.error("Stats fetch failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async recordScrapeSession(req: Request, res: Response) {
        try {
            const data = await SystemService.recordScrapeSession(req.body);
            res.json({ success: true, data });
        } catch (error) {
            console.error("Record scrape session failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    static async getScrapeSessions(_req: Request, res: Response) {
        try {
            const data = await SystemService.getScrapeSessions();
            res.json({ success: true, data });
        } catch (error) {
            console.error("Fetch scrape sessions failed:", error);
            res.status(500).json({ success: false, error: "Internal server error" });
        }
    }
}
