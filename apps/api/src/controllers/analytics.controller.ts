import type { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
    static async getAnalytics(_req: Request, res: Response) {
        try {
            const data = await AnalyticsService.getDashboardAnalytics();
            res.json({ success: true, data });
        } catch (error) {
            console.error("Analytics error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch analytics" });
        }
    }
}
