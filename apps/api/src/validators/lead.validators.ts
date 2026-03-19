import { z } from "zod";

export const getLeadsQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    hasWebsite: z.enum(["true", "false", ""]).optional(),
    hasPhone: z.enum(["true", "false", ""]).optional(),
    hasEmail: z.enum(["true", "false", ""]).optional(),
    hasSocials: z.enum(["true", "false", ""]).optional(),
    minScore: z.string().regex(/^\d+$/).optional(),
    maxScore: z.string().regex(/^\d+$/).optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    tier: z.string().optional(),
    category: z.string().optional(),
    minRating: z.string().optional(),
    minReviews: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc", "1", "-1", ""]).optional(),
    source: z.string().optional()
}).strict();

export const createLeadsBodySchema = z.object({
    search_query: z.string().optional(),
    leads: z.array(z.record(z.string(), z.any()))
}).strict();

export const bulkUpdateStatusSchema = z.object({
    ids: z.array(z.string()),
    status: z.string()
}).strict();

export const bulkAddTagSchema = z.object({
    ids: z.array(z.string()),
    tag: z.string()
}).strict();

export const bulkDeleteSchema = z.object({
    ids: z.array(z.string())
}).strict();

export const bulkShortlistSchema = z.object({
    ids: z.array(z.string()),
    note: z.string().optional()
}).strict();

export const updateLeadSchema = z.record(z.string(), z.any()); // Could be more strict but handles patching fields currently
