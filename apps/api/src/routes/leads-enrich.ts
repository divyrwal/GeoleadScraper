import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsEnrichRouter: Router = Router();

// POST /api/leads/enrich/batch (Order matters, must be before /:id)
leadsEnrichRouter.post("/enrich/batch", LeadController.batchEnrichLeads);

// POST /api/leads/:id/enrich
leadsEnrichRouter.post("/:id/enrich", LeadController.enrichLead);
