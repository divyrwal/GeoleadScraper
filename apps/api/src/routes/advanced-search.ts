import { Router } from "express";
import { SearchOrchestrator, type SearchConfig } from "../lib/orchestrator";
import { jobEvents } from "../lib/job-events";
import { geocodeLocation, generateGridFromBox } from "../lib/grid-engine";

export const advancedSearchRouter: Router = Router();

// Store active jobs in memory for basic tracking (in a real app, use Redis/MongoDB for job state)
const activeJobs = new Map<string, any>();

// POST /api/search/advanced
advancedSearchRouter.post("/advanced", async (req, res) => {
    try {
        const { query, location, radiusKm, maxResults, sources, useAiValidation, deepScan } = req.body;

        if (!query || !location) {
            return res.status(400).json({ success: false, error: "Query and location are required." });
        }

        const config: SearchConfig = {
            query,
            location,
            radiusKm: radiusKm || 10,
            maxResults: maxResults || 50, // Default to 50 leads per source
            sources: sources || {
                googleMaps: true,
                justDial: false,
                linkedIn: false,
                instagram: false
            },
            useAiValidation: useAiValidation ?? true,
            deepScan: deepScan === true
        };

        const orchestrator = new SearchOrchestrator(config);

        // Execute the job in the background to prevent request timeout (since scraping + AI takes a long time)
        const jobPromise = orchestrator.execute().then(result => {
            activeJobs.set(result.jobId, result);
        }).catch(error => {
            // In a real scenario, we'd have a way to query the orchestrator instance for job ID before it fails,
            // or we assign the job ID before execute(). Wait, SearchOrchestrator generates it internally.
            // Let's refactor slightly: the orchestrator can expose its ID.
            console.error("Background Orchestrator Job Failed:", error);
        });

        // We return the jobId immediately so the client can optionally track it
        res.status(202).json({
            success: true,
            jobId: orchestrator.jobId,
            message: "Advanced Search Job Queued. Check server logs for progress."
        });

    } catch (error: any) {
        console.error("Failed to enqueue advanced search:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to start advanced search" });
    }
});

// GET /api/search/stream
// Server-Sent Events (SSE) endpoint for real-time job tracking
advancedSearchRouter.get("/stream", (req, res) => {
    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send an initial connected message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream Connected' })}\n\n`);

    // Replay recent history for newly connected clients in a single batch event
    const recentLogs = jobEvents.getRecentLogs();
    if (recentLogs.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'log_history', logs: recentLogs })}\n\n`);
    }

    // Listener function
    const onLog = (logEntry: any) => {
        // Send data formatted as SSE
        res.write(`data: ${JSON.stringify({ type: 'log', ...logEntry })}\n\n`);
    };

    // Attach listener
    jobEvents.on("log", onLog);

    // Clean up when client closes connection
    req.on("close", () => {
        jobEvents.off("log", onLog);
        res.end();
    });
});

// GET /api/search/grid
// Returns a set of geographic zones (grid) for a given location to power the Extension's Deep Scan
advancedSearchRouter.get("/grid", async (req, res) => {
    try {
        const { location } = req.query;
        if (!location || typeof location !== 'string') {
            return res.status(400).json({ success: false, error: "Location query parameter is required." });
        }

        const jobId = `grid_${Date.now()}`;

        // 1. Geocode location
        const geoData = await geocodeLocation(location, jobId);
        if (!geoData) {
            return res.status(404).json({ success: false, error: `Could not find geographic coordinates for "${location}".` });
        }

        // 2. Generate a 3x3 grid
        const gridZones = generateGridFromBox(geoData.box, location, 3, jobId);

        // 3. Return coordinates + bounds for the Extension
        res.status(200).json({
            success: true,
            location: location,
            bounds: geoData.box, // Original bounding box for geo-filtering
            grid: gridZones.map(zone => ({
                lat: zone.center.lat,
                lng: zone.center.lng,
                label: zone.label
            }))
        });

    } catch (error: any) {
        console.error("Failed to generate grid:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
