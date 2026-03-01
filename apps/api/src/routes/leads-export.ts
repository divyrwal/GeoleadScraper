import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsExportRouter: Router = Router();

// GET /api/leads/export
leadsExportRouter.get("/", LeadController.exportLeadsCsv);
