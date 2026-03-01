import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsMapRouter: Router = Router();

// GET /api/leads/map
leadsMapRouter.get("/", LeadController.getMapData);
