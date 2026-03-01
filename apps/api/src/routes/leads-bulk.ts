import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";

export const leadsBulkRouter: Router = Router();

// POST /api/leads/bulk/status
leadsBulkRouter.post("/status", LeadController.bulkUpdateStatus);

// POST /api/leads/bulk/tag
leadsBulkRouter.post("/tag", LeadController.bulkAddTag);

// POST /api/leads/bulk/delete
leadsBulkRouter.post("/delete", LeadController.bulkDelete);

// POST /api/leads/bulk/rescore
leadsBulkRouter.post("/rescore", LeadController.bulkRescore);
