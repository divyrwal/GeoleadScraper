import { Router } from "express";
import { JobController } from "../controllers/job.controller";

export const advancedSearchRouter: Router = Router();

// POST /api/search/advanced
advancedSearchRouter.post("/advanced", JobController.startAdvancedSearch);

// GET /api/search/stream
advancedSearchRouter.get("/stream", JobController.streamLogs);

// GET /api/search/grid
advancedSearchRouter.get("/grid", JobController.generateGrid);
