import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsContactRouter: Router = Router();

// POST /api/leads/:id/contact
leadsContactRouter.post("/:id/contact", LeadController.addContactLog);

// GET /api/leads/:id/contact
leadsContactRouter.get("/:id/contact", LeadController.getContactHistory);
