import { Router } from "express";
import { LeadController } from "../controllers/lead.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { bulkUpdateStatusSchema, bulkAddTagSchema, bulkDeleteSchema, bulkShortlistSchema, bulkDeleteSchema as bulkRescoreSchema } from "../validators/lead.validators";

export const leadsBulkRouter: Router = Router();

// POST /api/leads/bulk/status
leadsBulkRouter.post("/status", validateRequest(bulkUpdateStatusSchema, "body"), LeadController.bulkUpdateStatus);

// POST /api/leads/bulk/tag
leadsBulkRouter.post("/tag", validateRequest(bulkAddTagSchema, "body"), LeadController.bulkAddTag);

// POST /api/leads/bulk/delete
leadsBulkRouter.post("/delete", validateRequest(bulkDeleteSchema, "body"), LeadController.bulkDelete);

// POST /api/leads/bulk/shortlist
leadsBulkRouter.post("/shortlist", validateRequest(bulkShortlistSchema, "body"), LeadController.bulkShortlist);

// POST /api/leads/bulk/rescore
leadsBulkRouter.post("/rescore", validateRequest(bulkRescoreSchema, "body"), LeadController.bulkRescore);
