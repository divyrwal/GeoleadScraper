import type { Request, Response } from "express";
import { JobService } from "../services/job.service";
import { jobEvents } from "../lib/job-events";

export class JobController {
    static async startAdvancedSearch(req: Request, res: Response) {
        try {
            const jobId = JobService.queueAdvancedSearch(req.body);
            res.status(202).json({
                success: true,
                jobId,
                message: "Advanced Search Job Queued. Check server logs for progress."
            });
        } catch (error: any) {
            console.error("Failed to enqueue advanced search:", error);
            const status = error.message.includes("required") ? 400 : 500;
            res.status(status).json({ success: false, error: error.message || "Failed to start advanced search" });
        }
    }

    static streamLogs(req: Request, res: Response) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream Connected' })}\n\n`);

        const recentLogs = jobEvents.getRecentLogs();
        if (recentLogs.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'log_history', logs: recentLogs })}\n\n`);
        }

        const onLog = (logEntry: any) => {
            res.write(`data: ${JSON.stringify({ type: 'log', ...logEntry })}\n\n`);
        };

        jobEvents.on("log", onLog);

        req.on("close", () => {
            jobEvents.off("log", onLog);
            res.end();
        });
    }

    static async generateGrid(req: Request, res: Response) {
        try {
            const data = await JobService.generateGrid(req.query.location as string, req.query.gridSize as string | undefined);
            res.status(200).json({ success: true, ...data });
        } catch (error: any) {
            console.error("Failed to generate grid:", error);
            const status = error.message.includes("required") || error.message.includes("Could not find") ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }
}
