import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsNearbyRouter: Router = Router();

// GET /api/leads/nearby
leadsNearbyRouter.get("/", LeadController.getNearbyLeads);
