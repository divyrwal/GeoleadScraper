import { Router } from "express";
import { SystemController } from "../controllers/system.controller";

export const healthRouter: Router = Router();

// GET /api/health
healthRouter.get("/", SystemController.checkHealth);
