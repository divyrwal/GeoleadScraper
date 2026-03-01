import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsDuplicatesRouter: Router = Router();

// GET /api/leads/duplicates
leadsDuplicatesRouter.get("/", LeadController.getDuplicates);

// DELETE /api/leads/duplicates
leadsDuplicatesRouter.delete("/", LeadController.deleteDuplicates);
