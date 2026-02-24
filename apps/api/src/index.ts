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

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Mount routes
app.use("/api/health", healthRouter);
app.use("/api/stats", statsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/scrape-sessions", scrapeSessionsRouter);
app.use("/api/leads/export", leadsExportRouter);
app.use("/api/leads/nearby", leadsNearbyRouter);
app.use("/api/leads/rescore", leadsRescoreRouter);
app.use("/api/leads/map", leadsMapRouter);
app.use("/api/leads/bulk", leadsBulkRouter);
app.use("/api/leads/duplicates", leadsDuplicatesRouter);
app.use("/api/leads", leadsEnrichRouter);
// Base leads router (catch-all for /api/leads)
app.use("/api/leads", leadsDetailRouter);    // /api/leads/:id, /api/leads/:id (PATCH)
app.use("/api/leads", leadsContactRouter);  // /api/leads/:id/contact
app.use("/api/leads", leadsAnalyzeRouter);  // /api/leads/:id/analyze
app.use("/api/leads", leadsRouter);          // /api/leads (GET, POST)

app.listen(config.api.port, () => {
    console.log(`[GeoLead API] Running on http://localhost:${config.api.port}`);
});
