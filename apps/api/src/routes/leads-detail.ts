import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsDetailRouter: Router = Router();

// GET /api/leads/:id
leadsDetailRouter.get("/:id", LeadController.getLeadById);

// PATCH /api/leads/:id
leadsDetailRouter.patch("/:id", LeadController.updateLead);
