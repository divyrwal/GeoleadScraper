import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { getLeadsQuerySchema, createLeadsBodySchema } from "../validators/lead.validators";

export const leadsRouter: Router = Router();

// GET /api/leads
leadsRouter.get("/", validateRequest(getLeadsQuerySchema, "query"), LeadController.getLeads);

// POST /api/leads
leadsRouter.post("/", validateRequest(createLeadsBodySchema, "body"), LeadController.createLeads);
