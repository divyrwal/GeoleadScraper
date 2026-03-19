import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { contactLogSchema } from "../validators/lead.validators";

export const leadsContactRouter: Router = Router();

// POST /api/leads/:id/contact
leadsContactRouter.post("/:id/contact", validateRequest(contactLogSchema, "body"), LeadController.addContactLog);

// GET /api/leads/:id/contact
leadsContactRouter.get("/:id/contact", LeadController.getContactHistory);
