import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { updateLeadSchema } from "../validators/lead.validators";

export const leadsDetailRouter: Router = Router();

// GET /api/leads/:id
leadsDetailRouter.get("/:id", LeadController.getLeadById);

// PATCH /api/leads/:id
leadsDetailRouter.patch("/:id", validateRequest(updateLeadSchema, "body"), LeadController.updateLead);
