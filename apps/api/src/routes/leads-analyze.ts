import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsAnalyzeRouter: Router = Router();

// POST /api/leads/:id/analyze
leadsAnalyzeRouter.post("/:id/analyze", LeadController.analyzeLead);
