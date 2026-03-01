import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsRouter: Router = Router();

// GET /api/leads
leadsRouter.get("/", LeadController.getLeads);

// POST /api/leads
leadsRouter.post("/", LeadController.createLeads);
