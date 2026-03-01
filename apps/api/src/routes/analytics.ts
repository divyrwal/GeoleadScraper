import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";

export const analyticsRouter: Router = Router();

// GET /api/analytics
analyticsRouter.get("/", AnalyticsController.getAnalytics);
