import { Router } from "express";
import { SystemController } from "../controllers/system.controller";

export const statsRouter: Router = Router();

// GET /api/stats
statsRouter.get("/", SystemController.getStats);
