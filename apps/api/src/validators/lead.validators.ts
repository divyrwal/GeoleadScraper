import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

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
    leads: z.array(z.object({
        business_name: z.string(),
        google_place_id: z.string().optional(),
        address: z.string().optional(),
        phone_number: z.string().optional(),
        website_url: z.string().url().optional().or(z.literal("")),
        google_rating: z.number().optional(),
        review_count: z.number().optional(),
        category: z.string().optional(),
        location_lat: z.number().optional(),
        location_long: z.number().optional(),
    }).passthrough())
}).strict();

export const bulkUpdateStatusSchema = z.object({
    ids: z.array(objectIdSchema),
    status: z.string()
}).strict();

export const bulkAddTagSchema = z.object({
    ids: z.array(objectIdSchema),
    tag: z.string()
}).strict();

export const bulkDeleteSchema = z.object({
    ids: z.array(objectIdSchema)
}).strict();

export const bulkShortlistSchema = z.object({
    ids: z.array(objectIdSchema),
    note: z.string().optional()
}).strict();

export const updateLeadSchema = z.object({
    lead_status: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    lead_score: z.string().optional(),
    business_type: z.string().optional(),
    is_shortlisted: z.boolean().optional(),
}).strict();

export const contactLogSchema = z.object({
    notes: z.string().min(1)
}).strict();

export const nearbyLeadsQuerySchema = z.object({
    lat: z.string().regex(/^-?\d+(\.\d+)?$/),
    lng: z.string().regex(/^-?\d+(\.\d+)?$/),
    radius: z.string().regex(/^\d+$/).optional(),
    category: z.string().optional()
}).strict();
