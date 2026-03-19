import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { nearbyLeadsQuerySchema } from "../validators/lead.validators";

export const leadsNearbyRouter: Router = Router();

// GET /api/leads/nearby
leadsNearbyRouter.get("/", validateRequest(nearbyLeadsQuerySchema, "query"), LeadController.getNearbyLeads);
