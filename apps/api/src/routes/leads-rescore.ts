import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsRescoreRouter: Router = Router();

// POST /api/leads/rescore
leadsRescoreRouter.post("/", LeadController.rescoreLeads);
