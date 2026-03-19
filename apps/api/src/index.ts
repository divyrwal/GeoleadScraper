import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "@geolead/config";
import { healthRouter } from "./routes/health";
import { statsRouter } from "./routes/stats";
import { leadsRouter } from "./routes/leads";
import { leadsExportRouter } from "./routes/leads-export";
import { leadsNearbyRouter } from "./routes/leads-nearby";
import { leadsDetailRouter } from "./routes/leads-detail";
import { leadsContactRouter } from "./routes/leads-contact";
import { leadsAnalyzeRouter } from "./routes/leads-analyze";
import { leadsRescoreRouter } from "./routes/leads-rescore";
import { leadsMapRouter } from "./routes/leads-map";
import { analyticsRouter } from "./routes/analytics";
import { leadsBulkRouter } from "./routes/leads-bulk";
import { leadsDuplicatesRouter } from "./routes/leads-duplicates";
import { scrapeSessionsRouter } from "./routes/scrape-sessions";
import { leadsEnrichRouter } from "./routes/leads-enrich";
import { advancedSearchRouter } from "./routes/advanced-search";
import { leadsAuditRouter } from "./routes/leads-audit";
import { locationsRouter } from "./routes/locations";
import { errorHandler } from "./middlewares/error.middleware";
import { requireAuth } from "./middlewares/auth.middleware";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

const app = express();
app.use(pinoHttp({ logger }));

import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Security Middleware
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (high limit for local CRM usage)
    message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Mount routes
app.use("/api/health", healthRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/stats", requireAuth, statsRouter);
app.use("/api/analytics", requireAuth, analyticsRouter);
app.use("/api/search", requireAuth, advancedSearchRouter);
app.use("/api/scrape-sessions", requireAuth, scrapeSessionsRouter);

app.use("/api/leads/export", requireAuth, leadsExportRouter);
app.use("/api/leads/nearby", requireAuth, leadsNearbyRouter);
app.use("/api/leads/rescore", requireAuth, leadsRescoreRouter);
app.use("/api/leads/map", requireAuth, leadsMapRouter);
app.use("/api/leads/bulk", requireAuth, leadsBulkRouter);
app.use("/api/leads/duplicates", requireAuth, leadsDuplicatesRouter);
app.use("/api/leads", requireAuth, leadsEnrichRouter);
// Base leads router (catch-all for /api/leads)
app.use("/api/leads", requireAuth, leadsDetailRouter);    // /api/leads/:id, /api/leads/:id (PATCH)
app.use("/api/leads", requireAuth, leadsContactRouter);  // /api/leads/:id/contact
app.use("/api/leads", requireAuth, leadsAnalyzeRouter);  // /api/leads/:id/analyze
app.use("/api/leads", requireAuth, leadsAuditRouter);    // /api/leads/:id/audit
app.use("/api/leads", requireAuth, leadsRouter);          // /api/leads (GET, POST)

app.use(errorHandler);

app.listen(config.api.port, () => {
    logger.info(`[GeoLead API] Running on http://localhost:${config.api.port}`);
});
