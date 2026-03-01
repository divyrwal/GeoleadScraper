import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsAuditRouter: Router = Router();

// POST /api/leads/:id/audit
leadsAuditRouter.post("/:id/audit", LeadController.auditLead);
