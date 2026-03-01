import { Router } from "express";
import { SystemController } from "../controllers/system.controller";

export const scrapeSessionsRouter: Router = Router();

// POST /api/scrape-sessions
scrapeSessionsRouter.post("/", SystemController.recordScrapeSession);

// GET /api/scrape-sessions
scrapeSessionsRouter.get("/", SystemController.getScrapeSessions);
